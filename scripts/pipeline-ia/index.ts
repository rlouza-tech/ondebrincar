#!/usr/bin/env tsx

import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { readCSV, writeCSV } from "./csv";
import { enrichLinha, waitForRateLimit } from "./gemini";
import { evaluate } from "./quality-gate";
import type {
  LinhaEnriquecida,
  LinhaInput,
  Partner,
  PipelineReport,
  RespostaGemini,
} from "./types";

interface CliOptions {
  inputPath: string;
  limit?: number;
  model: string;
}

function parseArgs(argv: string[]): CliOptions {
  const [, , inputPath, ...rest] = argv;

  if (!inputPath) {
    throw new Error(
      "Uso: pnpm pipeline-ia <caminho.csv> [--limit N] [--model gemini-2.5-flash]",
    );
  }

  const options: CliOptions = {
    inputPath,
    model: "gemini-2.5-flash",
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];

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
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return options;
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

function buildLinhaEnriquecida(
  linha: LinhaInput,
  resposta: RespostaGemini,
  status: LinhaEnriquecida["review_status"],
  reasons: string[],
  processedAt: string,
): LinhaEnriquecida {
  return {
    nome: linha.nome,
    slug: buildSlug(linha),
    categoria: resposta.categoria,
    idade_min: resposta.idade_min,
    idade_max: resposta.idade_max,
    duracao_min: resposta.duracao_min,
    preco_centavos: resposta.preco_centavos,
    link_compra: linha.url_origem,
    partner: inferPartner(linha.url_origem),
    bairro: linha.bairro,
    indoor_outdoor: resposta.indoor_outdoor,
    status: "operando",
    descricao: resposta.descricao,
    mini_review: resposta.mini_review,
    foto_url: "",
    review_status: status,
    abstain_reasons: Array.from(
      new Set([...reasons, ...resposta.abstain_fields]),
    ),
    confidence: resposta.confidence,
    processed_at: processedAt,
    source_url: linha.url_origem,
  };
}

function buildReport(
  rows: LinhaEnriquecida[],
  model: string,
  startedAt: string,
  finishedAt: string,
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
  };
}

function timestampForFilename(iso: string): string {
  return iso.replace(/[:.]/g, "-");
}

async function main() {
  const options = parseArgs(process.argv);
  const startedAt = new Date().toISOString();
  const inputRows = await readCSV(options.inputPath);
  const rowsToProcess = options.limit ? inputRows.slice(0, options.limit) : inputRows;
  const enrichedRows: LinhaEnriquecida[] = [];

  console.log(
    `Pipeline IA: ${rowsToProcess.length}/${inputRows.length} linhas de ${basename(
      options.inputPath,
    )} usando ${options.model}`,
  );

  for (let index = 0; index < rowsToProcess.length; index += 1) {
    const linha = rowsToProcess[index];
    const resposta = await enrichLinha(linha, options.model);
    const gate = evaluate(linha, resposta);
    const processedAt = new Date().toISOString();
    const enriched = buildLinhaEnriquecida(
      linha,
      resposta,
      gate.status,
      gate.reasons,
      processedAt,
    );
    enrichedRows.push(enriched);

    const mark = gate.status === "auto_ok" ? "✓" : "✗";
    const reasons = gate.reasons.length > 0 ? ` (${gate.reasons.join(", ")})` : "";
    console.log(`${mark} [${index + 1}/${rowsToProcess.length}] ${enriched.slug}${reasons}`);

    if (index < rowsToProcess.length - 1) {
      await waitForRateLimit();
    }
  }

  const finishedAt = new Date().toISOString();
  const timestamp = timestampForFilename(startedAt);
  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });

  const csvPath = join(outputDir, `planilha-enriquecida-${timestamp}.csv`);
  const reportPath = join(outputDir, `pipeline-report-${timestamp}.json`);
  const report = buildReport(enrichedRows, options.model, startedAt, finishedAt);

  await writeCSV(csvPath, enrichedRows);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const autoOkPercent = report.total === 0 ? 0 : Math.round((report.auto_ok / report.total) * 100);
  console.log("\nResumo");
  console.log(`Total: ${report.total}`);
  console.log(`auto_ok: ${report.auto_ok} (${autoOkPercent}%)`);
  console.log(`needs_human: ${report.needs_human}`);
  console.log(`Top motivos: ${JSON.stringify(report.motivos_top)}`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
