#!/usr/bin/env tsx
/**
 * backfill-endereco.ts
 * US-S62 — Backfill retroativo do campo `endereco` em fichas Sympla/Clubinho
 * criadas vazias pelo bug do US-S61 (readEnrichedCSV() nunca lia a coluna
 * `endereco` do CSV enriquecido — corrigido no PR #143, mas o fix não é
 * retroativo).
 *
 * Estratégia:
 *  1. Busca no Sanity fichas `atracao` (Sympla/Clubinho, publicadas ou draft)
 *     sem `endereco`, criadas depois de 01/07/2026 (lançamento da extração
 *     de endereço, US-S24 — antes disso a ausência do campo é esperada).
 *  2. Para cada candidata, localiza o CSV de origem: primeiro via
 *     `source_csv` do `import-report-*.json` que efetivamente criou aquele
 *     slug; se não achar report, faz fallback varrendo os
 *     `planilha-enriquecida-*.csv` de `data/output/` por linha com o mesmo
 *     slug, preferindo o CSV mais recente anterior a `_createdAt`.
 *  3. Se a linha localizada tiver `endereco` preenchido, aplica patch no
 *     Sanity. Se não tiver (ou nenhum CSV for localizado), lista como
 *     "sem fonte" — nunca inventa dado (sem Gemini, sem scraping ao vivo;
 *     ver docs/discovery/DISCOVERY-2026-07-07-endereco-sympla.md).
 *
 * Uso (raiz do projeto Cursor):
 *   pnpm backfill-endereco --dry-run
 *   pnpm backfill-endereco --execute
 *
 * Protocolo: sempre --dry-run primeiro, revisar o JSON salvo em
 * data/output/backfill-endereco-TIMESTAMP.json com o Rafa, só então --execute.
 */

import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { readEnrichedCSV } from "./import-sanity/index";
import type { ImportReport } from "./import-sanity/types";

// Lançamento da extração de endereço (US-S24) — candidatas criadas antes
// disso nunca tiveram o campo por natureza, não são bug.
const DATA_CORTE = "2026-07-01T00:00:00Z";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CandidatoAtracao {
  _id: string;
  slug: string;
  nome: string;
  origem: string;
  _createdAt: string;
}

export interface ImportReportLike {
  source_csv: string;
  started_at: string;
  items: Array<{ slug: string; status: string; reason?: string }>;
}

export interface CsvRowLike {
  slug: string;
  endereco?: string;
}

export interface CsvDisponivel {
  path: string;
  timestamp: string;
  rows: CsvRowLike[];
}

export type MetodoMatch = "import-report" | "csv-scan" | "sem-fonte";

export interface MatchResult {
  endereco: string | null;
  csvPath: string | null;
  metodo: MetodoMatch;
}

export interface ResultadoBackfill extends MatchResult {
  _id: string;
  slug: string;
  nome: string;
  origem: string;
  _createdAt: string;
}

// ---------------------------------------------------------------------------
// Funções puras — matching CSV → doc (sem I/O, cobertas por teste)
// ---------------------------------------------------------------------------

/**
 * Acha o report que efetivamente criou o slug (status "created", não
 * dry-run) e retorna o `source_csv` daquele import. Com mais de um match,
 * prefere o mais recente.
 */
export function findSourceCsvForSlug(
  slug: string,
  reports: ImportReportLike[],
): string | null {
  const matches = reports.filter((r) =>
    r.items.some(
      (it) => it.slug === slug && it.status === "created" && it.reason !== "dry_run",
    ),
  );
  if (matches.length === 0) return null;

  matches.sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  return matches[0].source_csv;
}

/** Busca a linha do slug num CSV já parseado e retorna o endereco (trim), ou null. */
export function findEnderecoNoCsv(slug: string, rows: CsvRowLike[]): string | null {
  const row = rows.find((r) => r.slug === slug);
  if (!row) return null;
  const endereco = row.endereco?.trim();
  return endereco ? endereco : null;
}

/**
 * Converte o timestamp embutido no nome de `planilha-enriquecida-<ts>.csv`
 * de volta para ISO 8601. Retorna null para nomes fora do padrão (ex:
 * `planilha-enriquecida-FILTRADA.csv`).
 */
export function csvTimestampFromFilename(filename: string): string | null {
  const m = filename.match(
    /^planilha-enriquecida-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.csv$/,
  );
  if (!m) return null;
  const [, data, hh, mm, ss, ms] = m;
  return `${data}T${hh}:${mm}:${ss}.${ms}Z`;
}

/**
 * Localiza o endereco de um candidato combinando as duas estratégias do
 * AC2: (1) via `source_csv` do import-report que criou o slug, (2) fallback
 * varrendo os CSVs disponíveis por linha com o mesmo slug, preferindo o
 * mais recente anterior a `createdAt`. Nunca inventa dado — se a linha
 * localizada não tiver `endereco`, ou nenhuma fonte for encontrada, o
 * método retorna "sem-fonte" (AC3).
 */
export function matchCandidateToEndereco(
  slug: string,
  createdAt: string,
  reports: ImportReportLike[],
  csvsDisponiveis: CsvDisponivel[],
): MatchResult {
  const viaReport = findSourceCsvForSlug(slug, reports);
  if (viaReport) {
    const csv = csvsDisponiveis.find((c) => basename(c.path) === basename(viaReport));
    const endereco = csv ? findEnderecoNoCsv(slug, csv.rows) : null;
    return { endereco, csvPath: viaReport, metodo: endereco ? "import-report" : "sem-fonte" };
  }

  const fallback = csvsDisponiveis
    .filter((c) => c.timestamp <= createdAt && c.rows.some((r) => r.slug === slug))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];

  if (fallback) {
    const endereco = findEnderecoNoCsv(slug, fallback.rows);
    return { endereco, csvPath: fallback.path, metodo: endereco ? "csv-scan" : "sem-fonte" };
  }

  return { endereco: null, csvPath: null, metodo: "sem-fonte" };
}

// ---------------------------------------------------------------------------
// I/O — Sanity
// ---------------------------------------------------------------------------

const QUERY = `*[_type == "atracao"
  && origem in ["sympla", "clubinho"]
  && !defined(endereco)
  && _createdAt > "${DATA_CORTE}"
] | order(_createdAt asc) {
  _id,
  "slug": slug.current,
  nome,
  origem,
  _createdAt
}`;

export async function fetchCandidatos(): Promise<CandidatoAtracao[]> {
  return sanityWriteClient.fetch<CandidatoAtracao[]>(QUERY);
}

// ---------------------------------------------------------------------------
// I/O — CSVs e import-reports em data/output/
// ---------------------------------------------------------------------------

async function listImportReports(outputDir: string): Promise<ImportReportLike[]> {
  const entries = await readdir(outputDir);
  const reportFiles = entries.filter(
    (f) => f.startsWith("import-report-") && f.endsWith(".json"),
  );

  const reports: ImportReportLike[] = [];
  for (const f of reportFiles) {
    try {
      const raw = await readFile(join(outputDir, f), "utf8");
      const parsed = JSON.parse(raw) as ImportReport;
      reports.push({
        source_csv: parsed.source_csv,
        started_at: parsed.started_at,
        items: parsed.items,
      });
    } catch {
      // report corrompido/incompleto — ignora, não é fatal pro backfill
    }
  }
  return reports;
}

async function listCsvsDisponiveis(outputDir: string): Promise<CsvDisponivel[]> {
  const entries = await readdir(outputDir);
  const csvFiles = entries.filter(
    (f) => f.startsWith("planilha-enriquecida-") && f.endsWith(".csv"),
  );

  const csvs: CsvDisponivel[] = [];
  for (const f of csvFiles) {
    const timestamp = csvTimestampFromFilename(f);
    if (!timestamp) continue; // fora do padrão (ex: planilha-enriquecida-FILTRADA.csv)
    const path = join(outputDir, f);
    const rows = await readEnrichedCSV(path);
    csvs.push({
      path,
      timestamp,
      rows: rows.map((r) => ({ slug: r.slug, endereco: r.endereco })),
    });
  }
  return csvs;
}

// ---------------------------------------------------------------------------
// Saída — tabela e JSON
// ---------------------------------------------------------------------------

function padRight(str: string, len: number): string {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len - 1) + " " : s + " ".repeat(len - s.length);
}

function printTable(resultados: ResultadoBackfill[]): void {
  const SEP = "─".repeat(150);
  console.log("\n" + SEP);
  console.log(
    padRight("slug", 55) +
      padRight("origem", 10) +
      padRight("metodo", 15) +
      "endereco",
  );
  console.log(SEP);
  for (const r of resultados) {
    console.log(
      padRight(r.slug, 55) +
        padRight(r.origem, 10) +
        padRight(r.metodo, 15) +
        (r.endereco ?? "(sem fonte)"),
    );
  }
  console.log(SEP);
}

async function saveJson(
  resultados: ResultadoBackfill[],
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = join(outputDir, `backfill-endereco-${timestamp}.json`);
  await writeFile(
    filepath,
    JSON.stringify({ gerado_em: new Date().toISOString(), resultados }, null, 2),
    "utf-8",
  );
  return filepath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { dryRun: boolean; execute: boolean } {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");

  if (!dryRun && !execute) {
    throw new Error(
      "Uso: informe --dry-run (preview) ou --execute (aplica patches).\n" +
        "  Preview:  pnpm backfill-endereco --dry-run\n" +
        "  Executar: pnpm backfill-endereco --execute",
    );
  }
  if (dryRun && execute) {
    throw new Error("Use --dry-run OU --execute, não ambos.");
  }

  return { dryRun, execute };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { dryRun, execute } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }
  if (execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório com --execute)");
  }

  console.log(`\n[backfill-endereco] Modo: ${dryRun ? "DRY-RUN" : "EXECUTE ⚠️"}`);
  console.log(`[backfill-endereco] Data de corte: candidatas criadas após ${DATA_CORTE}\n`);

  console.log("Buscando candidatas no Sanity (origem sympla/clubinho, sem endereco)...");
  const candidatos = await fetchCandidatos();
  console.log(`Candidatas encontradas: ${candidatos.length}`);

  if (candidatos.length === 0) {
    console.log("\n✅ Nenhuma ficha candidata. Nada a fazer.");
    return;
  }

  const outputDir = join(process.cwd(), "data", "output");
  console.log("\nCarregando import-reports e CSVs enriquecidos de data/output/...");
  const [reports, csvsDisponiveis] = await Promise.all([
    listImportReports(outputDir),
    listCsvsDisponiveis(outputDir),
  ]);
  console.log(`Reports carregados: ${reports.length} | CSVs carregados: ${csvsDisponiveis.length}`);

  const resultados: ResultadoBackfill[] = candidatos.map((c) => {
    const match = matchCandidateToEndereco(c.slug, c._createdAt, reports, csvsDisponiveis);
    return { ...c, ...match };
  });

  printTable(resultados);

  const comEndereco = resultados.filter((r) => r.endereco !== null);
  const semFonte = resultados.filter((r) => r.endereco === null);

  console.log(`\nResumo:`);
  console.log(`  Total candidatas:  ${resultados.length}`);
  console.log(`  Com endereco (via CSV): ${comEndereco.length}`);
  console.log(`  Sem fonte:              ${semFonte.length}`);

  const jsonPath = await saveJson(resultados, outputDir);
  console.log(`\nJSON salvo em: ${jsonPath}`);

  if (dryRun) {
    console.log(
      `\n[DRY-RUN] Nenhuma alteração feita. Revise o JSON acima com o Rafa antes de rodar --execute.`,
    );
    if (semFonte.length > 0) {
      console.log(`\nSem fonte localizável (fora do escopo do backfill automático):`);
      for (const r of semFonte) {
        console.log(`  • ${r.slug} (${r.origem}) — criada em ${r._createdAt}`);
      }
    }
    return;
  }

  // --execute: aplica patch só nas que têm endereco localizado.
  console.log(`\n🔧 --execute: aplicando ${comEndereco.length} patch(es) no Sanity...\n`);
  let patched = 0;
  let errors = 0;
  for (const r of comEndereco) {
    try {
      await sanityWriteClient.patch(r._id).set({ endereco: r.endereco }).commit();
      console.log(`  ✅ ${r._id} -> endereco: "${r.endereco}"`);
      patched++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${r._id} — falha no patch: ${message}`);
      errors++;
    }
  }

  console.log(`\nPatch completo: ${patched} documento(s) atualizado(s), ${errors} erro(s).`);
  if (semFonte.length > 0) {
    console.log(`\nSem fonte localizável (${semFonte.length}) — seguem sem endereco, fora do escopo automático:`);
    for (const r of semFonte) {
      console.log(`  • ${r.slug} (${r.origem})`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
