#!/usr/bin/env tsx
/**
 * backfill-idade-recomendada.ts
 * US-S77 — Backfill retroativo da separação classificação oficial vs. idade
 * recomendada em fichas já publicadas com o comportamento antigo da US-S20
 * (que misturava classificação oficial e inferência por contexto num único
 * par de campos idade_min/idade_max).
 *
 * Estratégia:
 *  1. Busca no Sanity fichas `atracao` (publicadas + draft) com idade_min ou
 *     idade_max definido, criadas depois do merge da US-S20 (PR #171, commit
 *     c9f188d, 11/08/2026 ~21:10 UTC) — só esse período pode ter recebido
 *     inferência por contexto nesses campos.
 *  2. Para cada candidata, localiza o CSV de origem (mesmo padrão de
 *     scripts/backfill-endereco.ts: via `source_csv` do import-report que
 *     criou o slug, com fallback varrendo os planilha-enriquecida-*.csv de
 *     data/output/) e lê a flag `idade_inferida_por_contexto` daquela linha.
 *  3. Usa o VALOR ATUAL gravado no Sanity (idade_min/idade_max — respeita
 *     qualquer edição manual feita no Studio depois da publicação); a flag do
 *     CSV só decide o roteamento:
 *       - idade_inferida_por_contexto=true  → o valor atual era inferência
 *         por contexto, não classificação oficial: idade_recomendada_min/max
 *         recebem o valor atual; idade_min/idade_max voltam a null (não há
 *         classificação real).
 *       - idade_inferida_por_contexto=false → o valor atual já era
 *         classificação oficial explícita: idade_recomendada_min/max recebem
 *         cópia do valor atual (AC4); idade_min/idade_max ficam como estão.
 *       - sem fonte localizável → não dá pra saber se foi inferência. Copia o
 *         valor atual pra idade_recomendada (não perde dado), mas NÃO mexe em
 *         idade_min/idade_max — listado à parte pro Rafa decidir manualmente.
 *  4. --dry-run lista tudo e salva JSON em data/output/; --execute aplica os
 *     patches (published + draft).
 *
 * Uso (raiz do projeto Cursor):
 *   pnpm backfill-idade-recomendada --dry-run
 *   pnpm backfill-idade-recomendada --execute
 *
 * Protocolo: sempre --dry-run primeiro, revisar o JSON com o Rafa, só então
 * --execute (CLAUDE.md).
 */

import { fileURLToPath } from "node:url";
import { basename, join } from "node:path";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { readEnrichedCSV } from "./import-sanity/index";
import type { ImportReport } from "./import-sanity/types";
import { csvTimestampFromFilename, findSourceCsvForSlug } from "./backfill-endereco";
import type { ImportReportLike } from "./backfill-endereco";

// Merge da US-S20 (PR #171, commit c9f188d) — 11/08/2026 18:10:28 -03:00.
// Candidatas criadas antes disso não podem ter recebido inferência por
// contexto em idade_min/idade_max (a lógica não existia ainda).
const DATA_CORTE = "2026-08-11T21:00:00Z";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Candidato {
  _id: string;
  slug: string;
  nome: string;
  origem: string;
  idade_min: number | null;
  idade_max: number | null;
  _createdAt: string;
}

export interface CsvIdadeRow {
  slug: string;
  idade_min: number | null;
  idade_max: number | null;
  idade_inferida_por_contexto: boolean;
}

export interface CsvDisponivelIdade {
  path: string;
  timestamp: string;
  rows: CsvIdadeRow[];
}

export type MetodoMatch = "import-report" | "csv-scan" | "sem-fonte";

export interface IdadeMatchResult {
  csvRow: CsvIdadeRow | null;
  csvPath: string | null;
  metodo: MetodoMatch;
}

export type Acao = "reverter_para_null" | "copiar" | "copiar_sem_certeza";

export interface Resolucao {
  idade_min: number | null;
  idade_max: number | null;
  idade_recomendada_min: number | null;
  idade_recomendada_max: number | null;
  acao: Acao;
}

export interface ResultadoBackfill extends Resolucao {
  _id: string;
  slug: string;
  nome: string;
  origem: string;
  _createdAt: string;
  metodo: MetodoMatch;
  csvPath: string | null;
}

// ---------------------------------------------------------------------------
// Funções puras — matching CSV → doc + resolução (sem I/O, cobertas por teste)
// ---------------------------------------------------------------------------

/** Busca a linha do slug num CSV já parseado. Retorna null se não achar. */
export function findIdadeInfoNoCsv(slug: string, rows: CsvIdadeRow[]): CsvIdadeRow | null {
  return rows.find((r) => r.slug === slug) ?? null;
}

/**
 * Localiza a linha de origem de um candidato combinando as duas estratégias
 * de scripts/backfill-endereco.ts: (1) via `source_csv` do import-report que
 * criou o slug, (2) fallback varrendo os CSVs disponíveis por linha com o
 * mesmo slug, preferindo o mais recente anterior a `createdAt`.
 */
export function matchCandidateToIdadeInfo(
  slug: string,
  createdAt: string,
  reports: ImportReportLike[],
  csvsDisponiveis: CsvDisponivelIdade[],
): IdadeMatchResult {
  const viaReport = findSourceCsvForSlug(slug, reports);
  if (viaReport) {
    const csv = csvsDisponiveis.find((c) => basename(c.path) === basename(viaReport));
    const csvRow = csv ? findIdadeInfoNoCsv(slug, csv.rows) : null;
    return { csvRow, csvPath: viaReport, metodo: csvRow ? "import-report" : "sem-fonte" };
  }

  const fallback = csvsDisponiveis
    .filter((c) => c.timestamp <= createdAt && c.rows.some((r) => r.slug === slug))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))[0];

  if (fallback) {
    const csvRow = findIdadeInfoNoCsv(slug, fallback.rows);
    return { csvRow, csvPath: fallback.path, metodo: csvRow ? "csv-scan" : "sem-fonte" };
  }

  return { csvRow: null, csvPath: null, metodo: "sem-fonte" };
}

/**
 * Decide o que fazer com um candidato a partir do valor ATUAL gravado no
 * Sanity (respeita edição manual pós-publicação) e da flag
 * idade_inferida_por_contexto da linha de origem localizada (se houver).
 * Nunca inventa dado: sem fonte localizável, só copia pra idade_recomendada
 * (preserva o que já existe) sem tocar em idade_min/idade_max.
 */
export function resolverBackfill(
  candidato: Pick<Candidato, "idade_min" | "idade_max">,
  csvRow: CsvIdadeRow | null,
): Resolucao {
  if (csvRow === null) {
    return {
      idade_min: candidato.idade_min,
      idade_max: candidato.idade_max,
      idade_recomendada_min: candidato.idade_min,
      idade_recomendada_max: candidato.idade_max,
      acao: "copiar_sem_certeza",
    };
  }

  if (csvRow.idade_inferida_por_contexto) {
    return {
      idade_min: null,
      idade_max: null,
      idade_recomendada_min: candidato.idade_min,
      idade_recomendada_max: candidato.idade_max,
      acao: "reverter_para_null",
    };
  }

  return {
    idade_min: candidato.idade_min,
    idade_max: candidato.idade_max,
    idade_recomendada_min: candidato.idade_min,
    idade_recomendada_max: candidato.idade_max,
    acao: "copiar",
  };
}

// ---------------------------------------------------------------------------
// I/O — Sanity
// ---------------------------------------------------------------------------

const QUERY = `*[_type == "atracao"
  && (defined(idade_min) || defined(idade_max))
  && _createdAt > "${DATA_CORTE}"
] | order(_createdAt asc) {
  _id,
  "slug": slug.current,
  nome,
  origem,
  idade_min,
  idade_max,
  _createdAt
}`;

export async function fetchCandidatos(): Promise<Candidato[]> {
  return sanityWriteClient.fetch<Candidato[]>(QUERY);
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

async function listCsvsDisponiveis(outputDir: string): Promise<CsvDisponivelIdade[]> {
  const entries = await readdir(outputDir);
  const csvFiles = entries.filter(
    (f) => f.startsWith("planilha-enriquecida-") && f.endsWith(".csv"),
  );

  const csvs: CsvDisponivelIdade[] = [];
  for (const f of csvFiles) {
    const timestamp = csvTimestampFromFilename(f);
    if (!timestamp) continue; // fora do padrão (ex: planilha-enriquecida-FILTRADA.csv)
    const path = join(outputDir, f);
    const rows = await readEnrichedCSV(path);
    csvs.push({
      path,
      timestamp,
      rows: rows.map((r) => ({
        slug: r.slug,
        idade_min: r.idade_min,
        idade_max: r.idade_max,
        idade_inferida_por_contexto: r.idade_inferida_por_contexto,
      })),
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

function fmtIdade(min: number | null, max: number | null): string {
  if (min === null && max === null) return "A confirmar";
  return `${min ?? "?"}–${max ?? "?"}`;
}

function printTable(resultados: ResultadoBackfill[]): void {
  const SEP = "─".repeat(170);
  console.log("\n" + SEP);
  console.log(
    padRight("slug", 45) +
      padRight("origem", 10) +
      padRight("metodo", 15) +
      padRight("acao", 20) +
      padRight("oficial (antes→depois)", 25) +
      "recomendada",
  );
  console.log(SEP);
  for (const r of resultados) {
    const oficialAntes = fmtIdade(r.idade_min, r.idade_max);
    console.log(
      padRight(r.slug, 45) +
        padRight(r.origem, 10) +
        padRight(r.metodo, 15) +
        padRight(r.acao, 20) +
        padRight(oficialAntes, 25) +
        fmtIdade(r.idade_recomendada_min, r.idade_recomendada_max),
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
  const filepath = join(outputDir, `backfill-idade-recomendada-${timestamp}.json`);
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
        "  Preview:  pnpm backfill-idade-recomendada --dry-run\n" +
        "  Executar: pnpm backfill-idade-recomendada --execute",
    );
  }
  if (dryRun && execute) {
    throw new Error("Use --dry-run OU --execute, não ambos.");
  }

  return { dryRun, execute };
}

/** Aplica o patch em published + draft (lição US-P1: nem sempre só um existe). */
async function patchBothVersions(
  baseId: string,
  set: Record<string, number>,
  unset: string[],
): Promise<number> {
  const idsToTry = baseId.startsWith("drafts.")
    ? [baseId]
    : [baseId, `drafts.${baseId}`];

  let patched = 0;
  for (const docId of idsToTry) {
    try {
      let mutation = sanityWriteClient.patch(docId);
      if (Object.keys(set).length > 0) mutation = mutation.set(set);
      if (unset.length > 0) mutation = mutation.unset(unset);
      await mutation.commit();
      patched++;
    } catch {
      // versão (published ou draft) não existe — ok, segue
    }
  }
  return patched;
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

  console.log(`\n[backfill-idade-recomendada] Modo: ${dryRun ? "DRY-RUN" : "EXECUTE ⚠️"}`);
  console.log(`[backfill-idade-recomendada] Data de corte: candidatas criadas após ${DATA_CORTE}\n`);

  console.log("Buscando candidatas no Sanity (idade_min ou idade_max definido)...");
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
    const match = matchCandidateToIdadeInfo(c.slug, c._createdAt, reports, csvsDisponiveis);
    const resolucao = resolverBackfill(c, match.csvRow);
    return {
      _id: c._id,
      slug: c.slug,
      nome: c.nome,
      origem: c.origem,
      _createdAt: c._createdAt,
      metodo: match.metodo,
      csvPath: match.csvPath,
      ...resolucao,
    };
  });

  printTable(resultados);

  const revertidas = resultados.filter((r) => r.acao === "reverter_para_null");
  const copiadas = resultados.filter((r) => r.acao === "copiar");
  const semCerteza = resultados.filter((r) => r.acao === "copiar_sem_certeza");

  console.log(`\nResumo:`);
  console.log(`  Total candidatas:                    ${resultados.length}`);
  console.log(`  Revertidas p/ null (era inferência):  ${revertidas.length}`);
  console.log(`  Copiadas (era classificação oficial): ${copiadas.length}`);
  console.log(`  Sem fonte (copiado sem certeza):      ${semCerteza.length}`);

  const jsonPath = await saveJson(resultados, outputDir);
  console.log(`\nJSON salvo em: ${jsonPath}`);

  if (dryRun) {
    console.log(
      `\n[DRY-RUN] Nenhuma alteração feita. Revise o JSON acima com o Rafa antes de rodar --execute.`,
    );
    if (semCerteza.length > 0) {
      console.log(
        `\n⚠️  Sem fonte localizável (${semCerteza.length}) — idade_recomendada foi copiada do valor atual, mas idade_min/idade_max NÃO seriam alteradas (não dá pra saber se era inferência). Revisar manualmente se necessário:`,
      );
      for (const r of semCerteza) {
        console.log(`  • ${r.slug} (${r.origem}) — criada em ${r._createdAt}`);
      }
    }
    return;
  }

  // --execute: aplica patches.
  console.log(`\n🔧 --execute: aplicando ${resultados.length} patch(es) no Sanity...\n`);
  let patched = 0;
  let errors = 0;
  for (const r of resultados) {
    const set: Record<string, number> = {};
    const unset: string[] = [];

    if (r.idade_recomendada_min !== null) set.idade_recomendada_min = r.idade_recomendada_min;
    if (r.idade_recomendada_max !== null) set.idade_recomendada_max = r.idade_recomendada_max;

    if (r.acao === "reverter_para_null") {
      unset.push("idade_min", "idade_max");
    }

    try {
      const count = await patchBothVersions(r._id, set, unset);
      console.log(
        `  ✅ ${r._id} [${r.acao}] -> recomendada: ${fmtIdade(r.idade_recomendada_min, r.idade_recomendada_max)}${
          r.acao === "reverter_para_null" ? " | oficial revertida p/ null" : ""
        } (${count} versão(ões) patchada(s))`,
      );
      patched++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${r._id} — falha no patch: ${message}`);
      errors++;
    }
  }

  console.log(`\nPatch completo: ${patched} documento(s) atualizado(s), ${errors} erro(s).`);
  if (semCerteza.length > 0) {
    console.log(
      `\n⚠️  ${semCerteza.length} ficha(s) sem fonte localizável — idade_min/idade_max NÃO foram alteradas, só idade_recomendada foi copiada. Revisar manualmente:`,
    );
    for (const r of semCerteza) {
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
