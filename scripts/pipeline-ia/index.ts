#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { readCSV, writeCSV } from "./csv";
import type { CostLogEntry, CostSummary } from "./cost-log";
import { buildCostSummary, estimateCostUsd } from "./cost-log";
import { enrichLinha, waitForRateLimit, QuotaExhaustedError } from "./gemini";
import { appendPipelineRun, PIPELINE_RUNS_LOG_PATH } from "./pipeline-run-log";
import { PROMPT_VERSION } from "./prompt";
import { evaluate } from "./quality-gate";
import type {
  LinhaEnriquecida,
  LinhaInput,
  Partner,
  PipelineReport,
  RespostaGemini,
} from "./types";
import { CATEGORIAS_VALIDAS } from "./types";
import {
  normalizeClubinho,
  DEFAULT_INPUT_PATH as CLUBINHO_DEFAULT_PATH,
} from "@/scripts/normalizer/clubinho";
import {
  normalizeSympla,
  DEFAULT_INPUT_PATH as SYMPLA_DEFAULT_PATH,
} from "@/scripts/normalizer/sympla";
import {
  normalizeWhatsapp,
  DEFAULT_INPUT_PATH as WHATSAPP_DEFAULT_PATH,
} from "@/scripts/normalizer/whatsapp";
import {
  normalizeManual,
  DEFAULT_INPUT_PATH as MANUAL_DEFAULT_PATH,
} from "@/scripts/normalizer/manual";
import { fetchExistingSlugs } from "@/scripts/import-sanity/index";
import { filterGeo, appendGeoRejections, GEO_REJECTED_LOG_PATH } from "./geo-filter";
import { filterLinkCompra, appendLinkRejections, LINK_REJECTED_LOG_PATH } from "./link-validator";
import { extractBairroFromVenue } from "./bairro-extractor";

type Source = "clubinho" | "sympla" | "whatsapp" | "manual";

interface CliOptions {
  inputPath?: string;
  source?: Source;
  limit?: number;
  model: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { model: "gemini-2.5-flash" };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--limit") {
      const parsed = Number.parseInt(next ?? "", 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        throw new Error("--limit precisa ser um número inteiro positivo");
      }
      options.limit = parsed;
      index += 1;
    } else if (arg === "--model") {
      if (!next) {
        throw new Error("--model precisa de um valor");
      }
      options.model = next;
      index += 1;
    } else if (arg === "--source") {
      if (next !== "clubinho" && next !== "sympla" && next !== "whatsapp" && next !== "manual") {
        throw new Error("--source precisa ser 'clubinho', 'sympla', 'whatsapp' ou 'manual'");
      }
      options.source = next as Source;
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    options.inputPath = positional[0];
  }

  if (!options.source && !options.inputPath) {
    throw new Error(
      "Uso: pnpm pipeline-ia <caminho.csv> [--limit N] [--model gemini-2.5-flash]\n" +
      "  ou: pnpm pipeline-ia --source clubinho|sympla|whatsapp|manual [--limit N] [--model gemini-2.5-flash]",
    );
  }

  return options;
}

async function loadInput(options: CliOptions): Promise<{ rows: LinhaInput[]; label: string }> {
  if (options.source === "clubinho") {
    const path = options.inputPath ?? CLUBINHO_DEFAULT_PATH;
    const rows = await normalizeClubinho(path);
    return { rows, label: `clubinho:${path}` };
  }
  if (options.source === "sympla") {
    const path = options.inputPath ?? SYMPLA_DEFAULT_PATH;
    const rows = await normalizeSympla(path);
    return { rows, label: `sympla:${path}` };
  }
  if (options.source === "whatsapp") {
    const path = options.inputPath ?? WHATSAPP_DEFAULT_PATH;
    const rows = await normalizeWhatsapp(path);
    return { rows, label: `whatsapp:${path}` };
  }
  if (options.source === "manual") {
    const path = options.inputPath ?? MANUAL_DEFAULT_PATH;
    const rows = await normalizeManual(path);
    return { rows, label: `manual:${path}` };
  }
  // Retrocompatibilidade: inputPath direto sem --source usa readCSV
  const path = options.inputPath!;
  const rows = await readCSV(path);
  return { rows, label: path };
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferPartner(url: string): Partner {
  const normalized = url.toLowerCase();
  if (normalized.includes("sympla")) {
    return "sympla";
  }
  if (normalized.includes("eventim")) {
    return "eventim";
  }
  return "outro";
}

function buildSlug(linha: LinhaInput): string {
  return slugify([linha.nome, linha.venue || linha.bairro].filter(Boolean).join(" "));
}

interface BairroEnrichLog {
  slug: string;
  venue: string;
  bairro: string;
  method: string;
}

/**
 * Pré-processa fichas com bairro vazio aplicando venue_map e bairro_scan (US-S16).
 * Muta as linhas in-place e retorna log para exibição.
 * Gemini assume como terceira camada (bairro_inferido no JSON de resposta).
 */
function enrichBairrosPreGemini(rows: LinhaInput[]): BairroEnrichLog[] {
  const log: BairroEnrichLog[] = [];

  for (const linha of rows) {
    if (linha.bairro.trim()) continue;

    const result = extractBairroFromVenue(linha.venue);
    if (result) {
      linha.bairro = result.bairro;
      log.push({
        slug: buildSlug(linha),
        venue: linha.venue,
        bairro: result.bairro,
        method: result.method,
      });
    }
  }

  return log;
}

function buildLinhaEnriquecida(
  linha: LinhaInput,
  resposta: RespostaGemini,
  status: LinhaEnriquecida["review_status"],
  reasons: string[],
  processedAt: string,
  meta: Pick<LinhaEnriquecida, "ai_generated" | "ai_model" | "pipeline_failed">,
): LinhaEnriquecida {
  return {
    nome: linha.nome,
    slug: buildSlug(linha),
    // Se categoria_origem já é um valor canônico válido, respeita sem deixar o Gemini sobrescrever.
    categoria: (CATEGORIAS_VALIDAS as readonly string[]).includes(linha.categoria_origem)
      ? (linha.categoria_origem as typeof CATEGORIAS_VALIDAS[number])
      : resposta.categoria,
    idade_min: resposta.idade_min,
    idade_max: resposta.idade_max,
    duracao_min: resposta.duracao_min,
    preco_centavos: resposta.preco_centavos,
    // url_ingresso é o link de compra/ingresso direto; url_origem é proveniência dos dados.
    // Para fontes sem ingresso (curadoria manual, parques, museus gratuitos), url_ingresso fica vazio.
    link_compra: linha.url_ingresso ?? linha.url_origem ?? "",
    partner: inferPartner(linha.url_ingresso ?? linha.url_origem ?? ""),
    // US-S16: se bairro ainda vazio após pré-processamento, usa fallback do Gemini
    bairro: linha.bairro || resposta.bairro_inferido || "",
    endereco: linha.endereco,
    indoor_outdoor: resposta.indoor_outdoor,
    status: "operando",
    descricao: resposta.descricao,
    mini_review: resposta.mini_review,
    tipo_programacao: resposta.tipo_programacao,
    programacao_texto: resposta.programacao_texto,
    proxima_data: resposta.proxima_data,
    foto_url: "",
    aviso_operacional: resposta.aviso_operacional ?? null,
    review_status: status,
    abstain_reasons: Array.from(
      new Set([...reasons, ...resposta.abstain_fields]),
    ),
    confidence: resposta.confidence,
    processed_at: processedAt,
    source_url: linha.url_origem,
    ai_generated: meta.ai_generated,
    ai_model: meta.ai_model,
    pipeline_failed: meta.pipeline_failed,
    preco_a_partir: linha.preco_a_partir ?? false,
  };
}

function buildReport(
  rows: LinhaEnriquecida[],
  model: string,
  startedAt: string,
  finishedAt: string,
  costSummary: CostSummary,
  stoppedReason?: string,
): PipelineReport {
  const motivosTop: Record<string, number> = {};
  const itemsWithIssues: PipelineReport["items_with_issues"] = [];

  for (const row of rows) {
    if (row.review_status === "needs_human") {
      itemsWithIssues.push({ slug: row.slug, motivos: row.abstain_reasons });
    }

    for (const reason of row.abstain_reasons) {
      motivosTop[reason] = (motivosTop[reason] ?? 0) + 1;
    }
  }

  const needsHuman = rows.filter((row) => row.review_status === "needs_human").length;
  const autoOk = rows.length - needsHuman;

  return {
    total: rows.length,
    auto_ok: autoOk,
    needs_human: needsHuman,
    taxa_abstencao: rows.length === 0 ? 0 : needsHuman / rows.length,
    motivos_top: Object.fromEntries(
      Object.entries(motivosTop).sort(([, a], [, b]) => b - a),
    ),
    model_used: model,
    started_at: startedAt,
    finished_at: finishedAt,
    items_with_issues: itemsWithIssues,
    cost_summary: costSummary,
    ...(stoppedReason !== undefined ? { stopped_reason: stoppedReason } : {}),
  };
}

function timestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

async function main() {
  const options = parseArgs(process.argv);
  const startedAt = new Date().toISOString();
  const { rows: inputRows, label } = await loadInput(options);

  const existingSlugs = await fetchExistingSlugs();
  const dedupedRows = inputRows.filter((r) => !existingSlugs.has(buildSlug(r)));
  const dedupIgnored = inputRows.length - dedupedRows.length;
  console.log(`Dedup: ${dedupIgnored} ignoradas (já existem no Sanity), ${dedupedRows.length} a processar`);

  // Pré-processamento de bairro (US-S16): roda ANTES do geo-filter para que fichas
  // com bairro vazio mas venue reconhecível não sejam rejeitadas indevidamente.
  const bairroLog = enrichBairrosPreGemini(dedupedRows);
  if (bairroLog.length > 0) {
    console.log(`\nBairro inferido (pré-Gemini): ${bairroLog.length} ficha(s) corrigida(s):`);
    for (const entry of bairroLog) {
      console.log(`  ✓ ${entry.slug} | venue: "${entry.venue}" | bairro: "${entry.bairro}" | método: ${entry.method}`);
    }
    console.log();
  }

  const { accepted: geoAccepted, rejected: geoRejected } = filterGeo(dedupedRows);
  if (geoRejected.length > 0) {
    console.log(`\nFiltro geográfico: ${geoRejected.length} ficha(s) rejeitada(s) (fora do município do Rio de Janeiro):`);
    for (const r of geoRejected) {
      console.log(`  ✗ ${r.slug} | venue: "${r.venue}" | bairro: "${r.bairro}" | motivo: ${r.motivo}`);
    }
    console.log();
    await appendGeoRejections(geoRejected, options.source ?? label);
    console.log(`Geo rejected log: ${GEO_REJECTED_LOG_PATH}`);
  }

  // Filtro de link_compra: rejeita URLs com domínio inválido antes do Gemini (US-S17).
  // URLs vazias são aceitas — ausência de link de compra é legítima.
  const { accepted: linkAccepted, rejected: linkRejected } = filterLinkCompra(geoAccepted);
  if (linkRejected.length > 0) {
    console.log(`\nFiltro link_compra: ${linkRejected.length} ficha(s) rejeitada(s) (URL inválida):`);
    for (const r of linkRejected) {
      console.log(`  ✗ ${r.slug} | url: "${r.url}" | motivo: ${r.motivo}`);
    }
    console.log();
    await appendLinkRejections(linkRejected, options.source ?? label);
    console.log(`Link rejected log: ${LINK_REJECTED_LOG_PATH}`);
  }



  const rowsToProcess = options.limit ? linkAccepted.slice(0, options.limit) : linkAccepted;
  const enrichedRows: LinhaEnriquecida[] = [];
  const costLogEntries: CostLogEntry[] = [];
  const latenciasMs: number[] = [];
  const erros: string[] = [];
  const outputDir = join(process.cwd(), "data", "output");
  const costLogPath = join(outputDir, "pipeline-cost-log.jsonl");
  let stoppedReason: string | undefined;

  console.log(
    `Pipeline IA: ${rowsToProcess.length}/${dedupedRows.length} linhas de ${basename(label)} usando ${options.model}`,
  );

  for (let index = 0; index < rowsToProcess.length; index += 1) {
    const linha = rowsToProcess[index];
    const slug = buildSlug(linha);

    let enrich: Awaited<ReturnType<typeof enrichLinha>>;
    const fichaStart = Date.now();
    try {
      enrich = await enrichLinha(linha, options.model, { costLogPath, slug });
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        stoppedReason = `quota_exhausted: ${error.message}`;
        console.log(`\n[pipeline] Cota diária atingida — parando graciosamente.`);
        console.log(`[pipeline] Motivo: ${error.message}`);
        console.log(
          `[pipeline] Fichas salvas: ${enrichedRows.length}/${rowsToProcess.length}`,
        );
        break;
      }
      throw error;
    }
    latenciasMs.push(Date.now() - fichaStart);

    const gate = evaluate(linha, enrich.resposta);
    const processedAt = new Date().toISOString();
    const enriched = buildLinhaEnriquecida(
      linha,
      enrich.resposta,
      gate.status,
      gate.reasons,
      processedAt,
      {
        ai_generated: enrich.ai_generated,
        ai_model: enrich.ai_model,
        pipeline_failed: enrich.pipeline_failed,
      },
    );
    enrichedRows.push(enriched);

    if (enrich.pipeline_failed) {
      erros.push(`${slug}: ${enrich.resposta.error ?? "pipeline_failed"}`);
    }

    costLogEntries.push({
      timestamp: processedAt,
      slug,
      input_tokens: enrich.usage.input_tokens,
      output_tokens: enrich.usage.output_tokens,
      custo_estimado_reais: enrich.usage.custo_estimado_reais,
      model: options.model,
      success_or_error: enrich.pipeline_failed ? "error" : "success",
      error_message: enrich.resposta.error,
    });

    const mark = gate.status === "auto_ok" ? "✓" : "✗";
    const failTag = enrich.pipeline_failed ? " [pipeline_failed]" : "";
    const reasons = gate.reasons.length > 0 ? ` (${gate.reasons.join(", ")})` : "";
    console.log(
      `${mark} [${index + 1}/${rowsToProcess.length}] ${enriched.slug}${failTag}${reasons}`,
    );

    if (index < rowsToProcess.length - 1) {
      await waitForRateLimit();
    }
  }

  const finishedAt = new Date().toISOString();
  const timestamp = timestampForFilename(startedAt);
  await mkdir(outputDir, { recursive: true });

  const csvPath = join(outputDir, `planilha-enriquecida-${timestamp}.csv`);
  const reportPath = join(outputDir, `pipeline-report-${timestamp}.json`);
  const costSummary = buildCostSummary(costLogEntries);
  const report = buildReport(
    enrichedRows,
    options.model,
    startedAt,
    finishedAt,
    costSummary,
    stoppedReason,
  );

  await writeCSV(csvPath, enrichedRows);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const latenciaMedia =
    latenciasMs.length === 0
      ? 0
      : Math.round(latenciasMs.reduce((a, b) => a + b, 0) / latenciasMs.length);
  const custoUsd = estimateCostUsd({
    input_tokens: costSummary.total_input_tokens,
    output_tokens: costSummary.total_output_tokens,
  });

  await appendPipelineRun({
    timestamp: startedAt,
    source: options.source ?? label,
    fichas_processadas: report.total,
    fichas_novas: report.total,
    dedup_ignored: dedupIgnored,
    geo_rejected: geoRejected.length,
    link_rejected: linkRejected.length,
    custo_estimado_usd: custoUsd,
    latencia_media_ms: latenciaMedia,
    erros,
    prompt_version: PROMPT_VERSION,
  });

  const autoOkPercent = report.total === 0 ? 0 : Math.round((report.auto_ok / report.total) * 100);
  console.log("\nResumo");
  if (stoppedReason) {
    console.log(`[AVISO] Pipeline parou antes do fim: ${stoppedReason}`);
  }
  console.log(`Total processado: ${report.total}`);
  console.log(`auto_ok: ${report.auto_ok} (${autoOkPercent}%)`);
  console.log(`needs_human: ${report.needs_human}`);
  console.log(`Top motivos: ${JSON.stringify(report.motivos_top)}`);
  console.log(
    `Custo estimado: R$ ${costSummary.custo_estimado_total_reais} (projeção 60 fichas/mês: R$ ${costSummary.custo_estimado_mensal_60_fichas_reais})`,
  );
  console.log(`Cost log: ${costLogPath}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Report: ${reportPath}`);
  console.log(`Run log: ${PIPELINE_RUNS_LOG_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
