#!/usr/bin/env tsx

import { stat } from "node:fs/promises";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasSanityConfig, sanityClient, sanityWriteClient } from "@/lib/sanity/client";
import { buildFotoAlt } from "./alt";
import { readEnrichedRows } from "./csv";
import { loadEnvLocal } from "./env";
import {
  collectSizeWarnings,
  findImageForSlug,
  optimizeImageToWebp,
} from "./images";
import { draftHasFoto, uploadFotoToDraft } from "./sanity";
import type { AssociateReport, AssociateReportItem } from "./types";
import { loadVenueBySlug } from "./venue-map";

loadEnvLocal();

interface CliOptions {
  csvPath?: string;
  latest: boolean;
  limit?: number;
  dryRun: boolean;
  imagensDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = {
    latest: false,
    dryRun: false,
    imagensDir: join(process.cwd(), "data", "input", "imagens"),
  };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--latest") {
      options.latest = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--limit") {
      const parsed = Number.parseInt(next ?? "", 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        throw new Error("--limit precisa ser um número inteiro positivo");
      }
      options.limit = parsed;
      index += 1;
    } else if (arg === "--imagens-dir") {
      if (!next) {
        throw new Error("--imagens-dir requer um caminho");
      }
      options.imagensDir = join(process.cwd(), next);
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.csvPath = positional[0];
  }

  if (!options.latest && !options.csvPath) {
    throw new Error(
      "Uso: pnpm associate-imagens <csv> [--limit N] [--dry-run] [--imagens-dir path] | pnpm associate-imagens --latest [...]",
    );
  }

  if (options.latest && options.csvPath) {
    throw new Error("Use --latest OU informe o caminho do CSV, não ambos");
  }

  return options;
}

async function resolveLatestCsv(): Promise<string> {
  const outputDir = join(process.cwd(), "data", "output");
  const entries = await readdir(outputDir);
  const candidates: Array<{ path: string; mtimeMs: number }> = [];

  for (let index = 0; index < entries.length; index += 1) {
    const name = entries[index];
    if (!name.startsWith("planilha-enriquecida-") || !name.endsWith(".csv")) {
      continue;
    }
    const filePath = join(outputDir, name);
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      candidates.push({ path: filePath, mtimeMs: fileStat.mtimeMs });
    }
  }

  if (candidates.length === 0) {
    throw new Error("Nenhum planilha-enriquecida-*.csv encontrado em data/output/");
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].path;
}

function timestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

function logWarnings(slug: string, warnings: string[]): void {
  for (let index = 0; index < warnings.length; index += 1) {
    console.log(`⚠ ${slug}: ${warnings[index]}`);
  }
}

async function main() {
  const options = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  if (!process.env.SANITY_API_TOKEN && !options.dryRun) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório fora de --dry-run)");
  }

  const startedAt = new Date().toISOString();
  const csvPath = options.latest
    ? await resolveLatestCsv()
    : join(process.cwd(), options.csvPath!);

  const [allRows, venueBySlug] = await Promise.all([
    readEnrichedRows(csvPath),
    loadVenueBySlug(),
  ]);

  const rows = options.limit ? allRows.slice(0, options.limit) : allRows;
  const items: AssociateReportItem[] = [];
  let attached = 0;
  let skipped = 0;
  let errors = 0;
  let warningsCount = 0;

  console.log(
    `Associate imagens: ${rows.length}/${allRows.length} linhas | imagens: ${options.imagensDir}${options.dryRun ? " [DRY-RUN]" : ""}`,
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const venue = venueBySlug.get(row.slug) ?? row.venue;
    row.venue = venue;

    const imagePath = await findImageForSlug(options.imagensDir, row.slug);
    if (!imagePath) {
      skipped += 1;
      items.push({ slug: row.slug, status: "skipped", reason: "imagem_nao_encontrada" });
      continue;
    }

    const draftId = `drafts.atracao-${row.slug}`;

    try {
      const draft = (await sanityClient.getDocument(draftId)) as Record<
        string,
        unknown
      > | null;

      if (!draft) {
        skipped += 1;
        items.push({ slug: row.slug, status: "skipped", reason: "draft_inexistente" });
        console.log(`⊘ [${index + 1}/${rows.length}] ${row.slug} (draft_inexistente)`);
        continue;
      }

      if (draftHasFoto(draft)) {
        skipped += 1;
        items.push({ slug: row.slug, status: "skipped", reason: "foto_existe" });
        console.log(`⊘ [${index + 1}/${rows.length}] ${row.slug} (foto_existe)`);
        continue;
      }

      const fileStat = await stat(imagePath);
      const warnings = collectSizeWarnings(fileStat.size);
      if (warnings.length > 0) {
        warningsCount += warnings.length;
        logWarnings(row.slug, warnings);
      }

      const alt = buildFotoAlt(row.nome, venue, row.bairro);

      if (options.dryRun) {
        attached += 1;
        items.push({
          slug: row.slug,
          status: "attached",
          reason: "dry_run",
          warnings: warnings.length > 0 ? warnings : undefined,
        });
        console.log(`[DRY] [${index + 1}/${rows.length}] anexaria foto ${row.slug}`);
        continue;
      }

      const optimized = await optimizeImageToWebp(imagePath);
      await uploadFotoToDraft(
        sanityWriteClient,
        draftId,
        optimized,
        `${row.slug}.webp`,
        alt,
      );

      attached += 1;
      items.push({
        slug: row.slug,
        status: "attached",
        warnings: warnings.length > 0 ? warnings : undefined,
      });
      console.log(`✓ [${index + 1}/${rows.length}] foto anexada ${row.slug}`);
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      items.push({ slug: row.slug, status: "error", reason: message });
      console.log(`✗ [${index + 1}/${rows.length}] ${row.slug} (${message})`);
    }
  }

  const finishedAt = new Date().toISOString();
  const report: AssociateReport = {
    total: rows.length,
    attached,
    skipped,
    errors,
    warnings_count: warningsCount,
    items,
    source_csv: csvPath,
    imagens_dir: options.imagensDir,
    started_at: startedAt,
    finished_at: finishedAt,
  };

  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });
  const reportPath = join(
    outputDir,
    `associate-imagens-report-${timestampForFilename(startedAt)}.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nResumo");
  console.log(`Total: ${report.total}`);
  console.log(`Anexadas: ${report.attached}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Erros: ${report.errors}`);
  console.log(`Warnings: ${report.warnings_count}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
