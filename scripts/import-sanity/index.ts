#!/usr/bin/env tsx

import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse";
import { hasSanityConfig, sanityClient, sanityWriteClient } from "@/lib/sanity/client";
import { buildImagePrompt } from "@/lib/prompts/image-adapter";
import { generateImage } from "@/scripts/pipeline-ia/imagen";
import { toSanityDoc } from "./mapper";
import type {
  ImportReport,
  ImportReportItem,
  LinhaEnriquecida,
} from "./types";

interface CliOptions {
  csvPath?: string;
  latest: boolean;
  limit?: number;
  dryRun: boolean;
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
      "Uso: pnpm import-sanity <csv> [--limit N] [--dry-run] | pnpm import-sanity --latest [...]",
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

function parseNullableDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIntRequired(value: string, field: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Campo numérico inválido: ${field}`);
  }
  return parsed;
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
          idade_min: parseIntRequired(record.idade_min ?? "", "idade_min"),
          idade_max: parseIntRequired(record.idade_max ?? "", "idade_max"),
          duracao_min: parseNullableInt(record.duracao_min ?? ""),
          preco_centavos: parseNullableInt(record.preco_centavos ?? ""),
          link_compra: record.link_compra ?? "",
          partner: record.partner as LinhaEnriquecida["partner"],
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
          ai_generated: (record.ai_generated ?? "false") === "true",
          ai_model: (record.ai_model ?? "").trim() || null,
          pipeline_failed: (record.pipeline_failed ?? "false") === "true",
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

/**
 * Gera imagem via Gemini e faz upload como asset no Sanity.
 * Idempotente: pula se o draft já tiver campo foto definido.
 * Em caso de falha, loga image_gen_failed: true e mantém placeholder SVG.
 */
async function generateAndAttachImage(
  linha: LinhaEnriquecida,
  draftId: string,
): Promise<{ failed: boolean; error?: string }> {
  // Verifica idempotência: pula se foto já existe no draft
  // Drafts exigem cliente autenticado — usa sanityWriteClient
  const existingDoc = await sanityWriteClient.getDocument(draftId);
  if (existingDoc?.foto) {
    console.log(`  ↩ imagem já existe, pulando geração (${linha.slug})`);
    return { failed: false };
  }

  const prompt = buildImagePrompt(linha.nome, linha.categoria, linha.descricao);

  console.log(`  🎨 gerando imagem para ${linha.slug}...`);
  const result = await generateImage(prompt);

  if (result.failed || !result.imageBuffer) {
    console.log(`  ✗ image_gen_failed: ${result.error}`);
    return { failed: true, error: result.error };
  }

  try {
    // Upload do buffer como asset no Sanity
    const asset = await sanityWriteClient.assets.upload(
      "image",
      result.imageBuffer,
      {
        filename: `${linha.slug}.png`,
        contentType: result.mimeType,
      },
    );

    // Patch do draft com referência ao asset e alt text
    await sanityWriteClient
      .patch(draftId)
      .set({
        foto: {
          _type: "image",
          asset: { _type: "reference", _ref: asset._id },
          alt: `Ilustração de ${linha.nome}`,
        },
      })
      .commit();

    console.log(`  ✓ imagem anexada ao draft (${asset._id})`);
    return { failed: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.log(`  ✗ falha no upload/patch: ${message}`);
    return { failed: true, error: message };
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

  const allRows = await readEnrichedCSV(csvPath);
  const rows = options.limit ? allRows.slice(0, options.limit) : allRows;

  const items: ImportReportItem[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let imagesGenerated = 0;
  let imagesFailed = 0;

  console.log(
    `Import Sanity: ${rows.length}/${allRows.length} linhas de ${csvPath}${options.dryRun ? " [DRY-RUN]" : ""}`,
  );

  for (let index = 0; index < rows.length; index += 1) {
    const linha = rows[index];
    const draftId = `drafts.atracao-${linha.slug}`;
    const publishedId = `atracao-${linha.slug}`;

    try {
      // Drafts só são visíveis para clientes autenticados — usa sanityWriteClient
      const existingDraft = await sanityWriteClient.getDocument(draftId);

      // Publicados são públicos — sanityClient é suficiente
      const existingPublished = !existingDraft
        ? await sanityClient.getDocument(publishedId)
        : null;

      if (existingPublished) {
        // Não toca em documentos publicados automaticamente — requer revisão humana
        skipped += 1;
        items.push({
          slug: linha.slug,
          status: "skipped",
          reason: "published_existe",
        });
        console.log(`⊘ [${index + 1}/${rows.length}] ${linha.slug} (published_existe — pulado)`);
        continue;
      }

      if (options.dryRun) {
        const dryStatus = existingDraft ? "updated" : "created";
        if (existingDraft) {
          updated += 1;
        } else {
          created += 1;
        }
        items.push({ slug: linha.slug, status: dryStatus, reason: "dry_run" });
        console.log(`[DRY] [${index + 1}/${rows.length}] ${dryStatus === "updated" ? "atualizaria" : "criaria"} draft ${linha.slug}`);
        continue;
      }

      const doc = toSanityDoc(linha);
      let actionLabel: string;

      if (existingDraft) {
        // Draft existe com texto placeholder — faz patch nos campos de texto,
        // preservando foto e qualquer outro campo não gerenciado pela pipeline.
        const { _id, _type, ...patchFields } = doc;
        await sanityWriteClient
          .patch(draftId)
          .set(patchFields)
          .commit();
        updated += 1;
        actionLabel = "atualizado";
        console.log(`↻ [${index + 1}/${rows.length}] ${linha.slug} (draft atualizado)`);
      } else {
        await sanityWriteClient.create(doc);
        created += 1;
        actionLabel = "criado";
        console.log(`✓ [${index + 1}/${rows.length}] criado draft ${linha.slug}`);
      }

      // Gera e anexa imagem — idempotente: pula se foto já existe no draft
      const imageResult = await generateAndAttachImage(linha, draftId);
      const reportItem: ImportReportItem = {
        slug: linha.slug,
        status: existingDraft ? "updated" : "created",
        image_gen_failed: imageResult.failed,
        image_gen_error: imageResult.error,
      };

      if (imageResult.failed) {
        imagesFailed += 1;
      } else {
        imagesGenerated += 1;
      }

      items.push(reportItem);
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      items.push({ slug: linha.slug, status: "error", reason: message });
      console.log(`✗ [${index + 1}/${rows.length}] ${linha.slug} (${message})`);
    }
  }

  const finishedAt = new Date().toISOString();
  const report: ImportReport = {
    total: rows.length,
    created,
    updated,
    skipped,
    errors,
    images_generated: imagesGenerated,
    images_failed: imagesFailed,
    items,
    source_csv: csvPath,
    started_at: startedAt,
    finished_at: finishedAt,
  };

  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });
  const reportPath = join(
    outputDir,
    `import-report-${timestampForFilename(startedAt)}.json`,
  );
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nResumo");
  console.log(`Total: ${report.total}`);
  console.log(`Criados: ${report.created}`);
  console.log(`Atualizados: ${report.updated}`);
  console.log(`Skipped (publicados): ${report.skipped}`);
  console.log(`Erros: ${report.errors}`);
  console.log(`Imagens geradas: ${report.images_generated}`);
  console.log(`Imagens falhas: ${report.images_failed}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
