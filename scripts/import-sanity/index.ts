#!/usr/bin/env tsx

import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "csv-parse";
import { hasSanityConfig, sanityClient, sanityWriteClient } from "@/lib/sanity/client";
import { buildImagePrompt, buildImagePromptAnonymous } from "@/lib/prompts/image-adapter";
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
  source?: "sympla" | "clubinho" | "manual" | "uhuu" | "ecovilla";
  execute: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { latest: false, dryRun: false, execute: false };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--latest") {
      options.latest = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--source") {
      if (
        next !== "sympla" &&
        next !== "clubinho" &&
        next !== "manual" &&
        next !== "uhuu" &&
        next !== "ecovilla"
      ) {
        throw new Error(`--source aceita "sympla", "clubinho", "manual", "uhuu" ou "ecovilla"`);
      }
      options.source = next as "sympla" | "clubinho" | "manual" | "uhuu" | "ecovilla";
      index += 1;
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

  if (
    options.source === "sympla" ||
    options.source === "clubinho" ||
    options.source === "manual" ||
    options.source === "uhuu" ||
    options.source === "ecovilla"
  ) {
    // Com --source sympla/clubinho/manual/uhuu/ecovilla, o CSV é resolvido automaticamente via --latest.
    // É necessário passar --dry-run (preview) OU --execute (import real).
    if (!options.dryRun && !options.execute) {
      throw new Error(
        `Com --source ${options.source} é obrigatório passar --dry-run (preview) ou --execute (import real).\n` +
        `  Preview:  pnpm import-sanity --source ${options.source} --dry-run\n` +
        `  Executar: pnpm import-sanity --source ${options.source} --execute`,
      );
    }
    // --source sympla/clubinho/manual/uhuu/ecovilla sempre usa o CSV mais recente
    options.latest = true;
  } else {
    if (!options.latest && !options.csvPath) {
      throw new Error(
        "Uso: pnpm import-sanity <csv> [--limit N] [--dry-run] | pnpm import-sanity --latest [...]",
      );
    }

    if (options.latest && options.csvPath) {
      throw new Error("Use --latest OU informe o caminho do CSV, não ambos");
    }
  }

  return options;
}

/**
 * Busca todos os slugs já existentes no Sanity (published + drafts).
 * Usa o cliente autenticado para ver os drafts.
 * Retorna um Set de slugs (strings) para lookup O(1).
 */
export async function fetchExistingSlugs(): Promise<Set<string>> {
  const docs = await sanityWriteClient.fetch<Array<{ slug?: { current?: string } }>>(
    `*[_type == "atracao"]{slug}`,
  );
  const slugs = new Set<string>();
  for (const doc of docs) {
    const s = doc.slug?.current;
    if (s) slugs.add(s);
  }
  return slugs;
}

/**
 * Busca slugs da lista negra permanente (status = "rejeitado").
 * Fichas rejeitadas são ignoradas silenciosamente — sem criar novo documento.
 */
export async function fetchRejectedSlugs(): Promise<Set<string>> {
  const docs = await sanityWriteClient.fetch<Array<{ slug?: { current?: string } }>>(
    `*[_type == "atracao" && status == "rejeitado"]{slug}`,
  );
  const slugs = new Set<string>();
  for (const doc of docs) {
    const s = doc.slug?.current;
    if (s) slugs.add(s);
  }
  return slugs;
}

/**
 * Filtra linhas, retornando apenas as cujo slug não existe no Set.
 */
export function filterNewRows(
  rows: LinhaEnriquecida[],
  existingSlugs: Set<string>,
): { newRows: LinhaEnriquecida[]; ignoredCount: number } {
  const newRows = rows.filter((r) => !existingSlugs.has(r.slug));
  return { newRows, ignoredCount: rows.length - newRows.length };
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

export async function readEnrichedCSV(path: string): Promise<LinhaEnriquecida[]> {
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
          endereco: record.endereco?.trim() || undefined,
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
 *
 * Fluxo de fallback:
 *   1. Tenta gerar com prompt primário via buildImagePrompt (o nome da atração
 *      nunca é renderizado como texto na imagem).
 *   2. Se falhar (ex: recusa por IP protegido), tenta com prompt anônimo
 *      via buildImagePromptAnonymous.
 *   3. Se ambos falharem, loga image_gen_failed: true e mantém placeholder.
 *
 * Exportada para permitir testes unitários.
 */
export async function generateAndAttachImage(
  linha: LinhaEnriquecida,
  draftId: string,
): Promise<{ failed: boolean; fallback: boolean; error?: string }> {
  // Verifica idempotência: pula se foto já existe no draft
  // Drafts exigem cliente autenticado — usa sanityWriteClient
  const existingDoc = await sanityWriteClient.getDocument(draftId);
  if (existingDoc?.foto) {
    console.log(`  ↩ imagem já existe, pulando geração (${linha.slug})`);
    return { failed: false, fallback: false };
  }

  const primaryPrompt = buildImagePrompt(linha.nome, linha.categoria, linha.descricao);

  console.log(`  🎨 gerando imagem para ${linha.slug}...`);
  let result = await generateImage(primaryPrompt);
  let usedFallback = false;

  if (result.failed || !result.imageBuffer) {
    console.log(`  ⚠ image_gen_primary_failed: ${result.error} — tentando fallback anônimo...`);
    const anonymousPrompt = buildImagePromptAnonymous(linha.categoria, linha.descricao);
    result = await generateImage(anonymousPrompt);
    usedFallback = true;
  }

  if (result.failed || !result.imageBuffer) {
    console.log(`  ✗ image_gen_failed (primary + fallback): ${result.error}`);
    return { failed: true, fallback: usedFallback, error: result.error };
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

    if (usedFallback) {
      console.log(`  ✓ imagem (fallback anônimo) anexada ao draft (${asset._id})`);
    } else {
      console.log(`  ✓ imagem anexada ao draft (${asset._id})`);
    }
    return { failed: false, fallback: usedFallback };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.log(`  ✗ falha no upload/patch: ${message}`);
    return { failed: true, fallback: usedFallback, error: message };
  }
}

async function main() {
  const options = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const isSymplaExecute = options.source === "sympla" && options.execute && !options.dryRun;
  const isClubinhoExecute = options.source === "clubinho" && options.execute && !options.dryRun;
  const isManualExecute = options.source === "manual" && options.execute && !options.dryRun;
  const isUhuuExecute = options.source === "uhuu" && options.execute && !options.dryRun;
  const isEcovillaExecute = options.source === "ecovilla" && options.execute && !options.dryRun;
  if (!process.env.SANITY_API_TOKEN && !options.dryRun) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório fora de --dry-run)");
  }
  const startedAt = new Date().toISOString();
  const csvPath = options.latest
    ? await resolveLatestCsv()
    : join(process.cwd(), options.csvPath!);

  const allRows = await readEnrichedCSV(csvPath);
  let rows = options.limit ? allRows.slice(0, options.limit) : allRows;

  // Dedup: busca slugs existentes no Sanity antes de iterar.
  // Evita recriação de fichas em rodadas repetidas (Sympla, Clubinho, Manual).
  let dedupIgnored = 0;
  let rejectedIgnored = 0;
  if (
    options.source === "sympla" ||
    options.source === "clubinho" ||
    options.source === "manual" ||
    options.source === "uhuu" ||
    options.source === "ecovilla"
  ) {
    console.log("Buscando slugs existentes no Sanity para dedup...");
    const [existingSlugs, rejectedSlugs] = await Promise.all([
      fetchExistingSlugs(),
      fetchRejectedSlugs(),
    ]);

    // 1. Filtra rejeitadas (lista negra permanente) — silencioso, sem criar documento.
    const beforeReject = rows.length;
    rows = rows.filter((r) => !rejectedSlugs.has(r.slug));
    rejectedIgnored = beforeReject - rows.length;

    // 2. Dedup normal — slugs já existentes no Sanity.
    const result = filterNewRows(rows, existingSlugs);
    dedupIgnored = result.ignoredCount;
    rows = result.newRows;

    console.log(`Rejeitadas (lista negra): ${rejectedIgnored} ignoradas`);
    console.log(`Dedup: ${dedupIgnored} ignoradas (já existem no Sanity), ${rows.length} a processar`);
  }

  // Filtro de expiração: rejeita fichas com proxima_data no passado antes de criar draft.
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const expired: Array<{ slug: string; proxima_data: string }> = [];
  rows = rows.filter((r) => {
    if (r.proxima_data && r.proxima_data < today) {
      expired.push({ slug: r.slug, proxima_data: r.proxima_data });
      return false;
    }
    return true;
  });
  if (expired.length > 0) {
    console.log(`\nFichas rejeitadas por data expirada (${expired.length}):`);
    for (const e of expired) {
      console.log(`  ✗ EXPIRADA slug=${e.slug} proxima_data=${e.proxima_data} motivo=proxima_data_passada`);
    }
    console.log();
  }

  const items: ImportReportItem[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let imagesGenerated = 0;
  let imagesFailed = 0;

  const modeLabel = options.dryRun
    ? " [DRY-RUN]"
    : isSymplaExecute || isClubinhoExecute || isManualExecute || isUhuuExecute || isEcovillaExecute
      ? " [EXECUTE]"
      : "";
  console.log(
    `Import Sanity: ${rows.length}/${allRows.length} linhas de ${csvPath}${modeLabel}`,
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
        if (options.source === "clubinho") {
          // Clubinho: rodada semanal — só atualiza campos de data/programação.
          // Preserva descrição, mini_review, foto e demais campos editoriais.
          const dateFields: Record<string, unknown> = {
            tipo_programacao: linha.tipo_programacao,
            programacao_texto: linha.programacao_texto,
          };
          if (linha.proxima_data !== null) {
            dateFields.proxima_data = linha.proxima_data;
          }
          await sanityWriteClient
            .patch(draftId)
            .set(dateFields)
            .commit();
        } else {
          // Outros sources: patch completo (exceto _id, _type e foto).
          const { _id, _type, ...patchFields } = doc;
          await sanityWriteClient
            .patch(draftId)
            .set(patchFields)
            .commit();
        }
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
        image_gen_fallback: imageResult.fallback || undefined,
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
    dedup_ignored: dedupIgnored,
    expired_rejected: expired.length,
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
  console.log(`Total (após dedup): ${report.total}`);
  if (rejectedIgnored > 0) console.log(`Ignoradas (lista negra rejeitado): ${rejectedIgnored}`);
  if (dedupIgnored > 0) console.log(`Ignoradas (já existem no Sanity): ${dedupIgnored}`);
  if (expired.length > 0) console.log(`Rejeitadas (data expirada): ${expired.length}`);
  console.log(`Criados: ${report.created}`);
  console.log(`Atualizados: ${report.updated}`);
  console.log(`Skipped (publicados): ${report.skipped}`);
  console.log(`Erros: ${report.errors}`);
  console.log(`Imagens geradas: ${report.images_generated}`);
  console.log(`Imagens falhas: ${report.images_failed}`);
  console.log(`Report: ${reportPath}`);
}

// Guard: só executa main() quando o arquivo é rodado diretamente (CLI),
// não quando importado por testes ou outros módulos.
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
