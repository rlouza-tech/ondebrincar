#!/usr/bin/env tsx

import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { loadEnvLocal } from "../associate-imagens/env";
import type { LinhaEnriquecida } from "../pipeline-ia/types";

loadEnvLocal();

interface CliOptions {
  csvPath?: string;
  latest: boolean;
  limit?: number;
  dryRun: boolean;
}

interface PatchReportItem {
  slug: string;
  status: "patched" | "skipped" | "error";
  reason?: string;
}

interface PatchReport {
  total: number;
  patched: number;
  skipped: number;
  errors: number;
  items: PatchReportItem[];
  source_csv: string;
  started_at: string;
  finished_at: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { latest: false, dryRun: false };
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
      "Uso: pnpm update-drafts-programacao <csv> [--limit N] [--dry-run] | pnpm update-drafts-programacao --latest [...]",
    );
  }

  if (options.latest && options.csvPath) {
    throw new Error("Use --latest OU informe o caminho do CSV, não ambos");
  }

  return options;
}

function parseNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseIntRequired(value: string, field: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Campo numérico inválido: ${field}`);
  }
  return parsed;
}

function parseNullableDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function readEnrichedCSV(path: string): Promise<LinhaEnriquecida[]> {
  return new Promise((resolve, reject) => {
    const rows: LinhaEnriquecida[] = [];

    createReadStream(path)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (record: Record<string, string>) => {
        const abstainRaw = record.abstain_reasons ?? "";
        rows.push({
          nome: record.nome ?? "",
          slug: record.slug ?? "",
          categoria: record.categoria as LinhaEnriquecida["categoria"],
          idade_min: parseNullableInt(record.idade_min ?? ""),
          idade_max: parseNullableInt(record.idade_max ?? ""),
          duracao_min: parseNullableInt(record.duracao_min ?? ""),
          preco_centavos: parseNullableInt(record.preco_centavos ?? ""),
          link_compra: record.link_compra ?? "",
          origem: record.origem as LinhaEnriquecida["origem"],
          bairro: record.bairro ?? "",
          indoor_outdoor: record.indoor_outdoor as LinhaEnriquecida["indoor_outdoor"],
          status: "operando",
          descricao: record.descricao ?? "",
          mini_review: record.mini_review ?? "",
          tipo_programacao: record.tipo_programacao as LinhaEnriquecida["tipo_programacao"],
          programacao_texto: record.programacao_texto ?? "",
          proxima_data: parseNullableDate(record.proxima_data ?? ""),
          foto_url: record.foto_url ?? "",
          review_status: record.review_status as LinhaEnriquecida["review_status"],
          abstain_reasons: abstainRaw
            ? abstainRaw.split("|").filter(Boolean)
            : [],
          confidence: parseIntRequired(record.confidence ?? "", "confidence"),
          processed_at: record.processed_at ?? "",
          source_url: record.source_url ?? "",
        });
      })
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
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

function draftHasProgramacao(doc: Record<string, unknown> | null): boolean {
  if (!doc) {
    return false;
  }
  const texto = doc.programacao_texto;
  return typeof texto === "string" && texto.trim().length > 0;
}

function buildPatchPayload(row: LinhaEnriquecida): Record<string, string> {
  const payload: Record<string, string> = {
    tipo_programacao: row.tipo_programacao,
    programacao_texto: row.programacao_texto,
  };

  if (row.proxima_data !== null) {
    payload.proxima_data = row.proxima_data;
  }

  return payload;
}

async function main() {
  const options = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  if (!process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório — leitura/patch de drafts exige token)");
  }

  const startedAt = new Date().toISOString();
  const csvPath = options.latest
    ? await resolveLatestCsv()
    : join(process.cwd(), options.csvPath!);

  const allRows = await readEnrichedCSV(csvPath);
  const rows = options.limit ? allRows.slice(0, options.limit) : allRows;
  const items: PatchReportItem[] = [];
  let patched = 0;
  let skipped = 0;
  let errors = 0;

  console.log(
    `Update drafts programação: ${rows.length}/${allRows.length} linhas de ${csvPath}${options.dryRun ? " [DRY-RUN]" : ""}`,
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const draftId = `drafts.atracao-${row.slug}`;

    try {
      const draft = (await sanityWriteClient.getDocument(draftId)) as Record<
        string,
        unknown
      > | null;

      if (!draft) {
        skipped += 1;
        items.push({ slug: row.slug, status: "skipped", reason: "draft_inexistente" });
        console.log(`⊘ [${index + 1}/${rows.length}] ${row.slug} (draft_inexistente)`);
        continue;
      }

      if (draftHasProgramacao(draft)) {
        skipped += 1;
        items.push({ slug: row.slug, status: "skipped", reason: "programacao_existe" });
        console.log(`⊘ [${index + 1}/${rows.length}] ${row.slug} (programacao_existe)`);
        continue;
      }

      if (options.dryRun) {
        patched += 1;
        items.push({ slug: row.slug, status: "patched", reason: "dry_run" });
        console.log(`[DRY] [${index + 1}/${rows.length}] patcharia programação ${row.slug}`);
        continue;
      }

      await sanityWriteClient.patch(draftId).set(buildPatchPayload(row)).commit();
      patched += 1;
      items.push({ slug: row.slug, status: "patched" });
      console.log(`✓ [${index + 1}/${rows.length}] programação atualizada ${row.slug}`);
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      items.push({ slug: row.slug, status: "error", reason: message });
      console.log(`✗ [${index + 1}/${rows.length}] ${row.slug} (${message})`);
    }
  }

  const finishedAt = new Date().toISOString();
  const report: PatchReport = {
    total: rows.length,
    patched,
    skipped,
    errors,
    items,
    source_csv: csvPath,
    started_at: startedAt,
    finished_at: finishedAt,
  };

  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });
  const reportPath = join(
    outputDir,
    `update-drafts-programacao-report-${timestampForFilename(startedAt)}.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nResumo");
  console.log(`Total: ${report.total}`);
  console.log(`Atualizados: ${report.patched}`);
  console.log(`Skipped: ${report.skipped}`);
  console.log(`Erros: ${report.errors}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
