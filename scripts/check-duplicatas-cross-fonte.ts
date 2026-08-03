#!/usr/bin/env tsx
/**
 * check-duplicatas-cross-fonte.ts
 * US-S63 — Auditoria de duplicatas cross-fonte (fix do spike US-S46).
 *
 * Causa raiz (docs/discovery/DISCOVERY-2026-07-22-dedup-cross-fonte.md): o
 * dedup existente (import-sanity, check-novidades, raindrop-process,
 * check-atualizacoes) compara só igualdade exata de slug. Como o slug é
 * derivado do texto bruto de nome+venue, a mesma atração capturada por
 * fontes diferentes (ex.: Clubinho e Sympla) gera slugs distintos e passa
 * despercebida — nenhum desses scripts cruza fontes na mesma execução.
 *
 * Este script é só diagnóstico (Opção A do spike — confirmado com o Rafa em
 * 22/07/2026): audita o Sanity inteiro sob demanda, fora do caminho de
 * escrita, e nunca aplica nada sozinho. Estratégia:
 *  1. Busca todas as atrações não-rejeitadas (published + drafts).
 *  2. Agrupa por `bairro` normalizado (campo obrigatório no schema, mais
 *     estável entre fontes que `venue`) — partição barata que reduz
 *     comparações de O(n²) global para O(n²) por grupo pequeno.
 *  3. Dentro de cada grupo, compara nome normalizado (Dice coefficient sobre
 *     tokens, sem stopwords) só entre documentos de `origem` diferentes.
 *  4. Pares acima do threshold viram candidato no relatório .md — decisão
 *     final sempre manual do Rafa (mesmo padrão do check-atualizacoes
 *     --fix-dates: nunca auto-aplica).
 *
 * Limitação conhecida (registrada no spike, não coberta aqui): se a mesma
 * atração tiver `bairro` divergente entre fontes (ex.: enriquecimento
 * inferiu bairros diferentes para o mesmo endereço), o par não é comparado
 * — falso negativo aceito, não bloqueador.
 *
 * Uso (raiz do projeto Cursor):
 *   pnpm check-duplicatas-cross-fonte
 *
 * Sempre read-only — não existe flag de aplicação.
 */

import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AtracaoDoc {
  _id: string;
  slug: string;
  nome: string;
  bairro: string;
  origem: string | null;
}

export interface CandidatoDuplicata {
  a: AtracaoDoc;
  b: AtracaoDoc;
  score: number;
}

// Validado empiricamente contra os 5 casos reais confirmados (AC3) — ver
// retro da sessão US-S63 para o detalhe da calibração.
export const THRESHOLD_DEFAULT = 0.6;

// Comparados só depois de normalizeTokens já ter removido acentos — por isso
// aqui só as formas sem acento (ex.: "a" cobre "à" depois da normalização).
const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "a", "o", "os", "as",
  "um", "uma", "uns", "umas", "para", "com", "em", "no", "na",
  "nos", "nas", "por", "ao", "aos",
]);

// ---------------------------------------------------------------------------
// Normalização e similaridade — funções puras (sem I/O, cobertas por teste)
// ---------------------------------------------------------------------------

/** Remove acentos, pontuação e stopwords; retorna tokens significativos. */
export function normalizeTokens(nome: string): string[] {
  const semAcento = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const tokens = semAcento.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.filter((t) => !STOPWORDS.has(t));
}

/** Normaliza bairro para chave de agrupamento (lowercase, sem acento, trim). */
export function normalizeBairro(bairro: string): string {
  return bairro
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Dice coefficient sobre dois conjuntos de tokens: 2·|A∩B| / (|A|+|B|). */
export function diceSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersecao = 0;
  Array.from(setA).forEach((t) => {
    if (setB.has(t)) intersecao++;
  });
  return (2 * intersecao) / (setA.size + setB.size);
}

// ---------------------------------------------------------------------------
// Busca de candidatos — comparação por par, agrupada por bairro
// ---------------------------------------------------------------------------

/**
 * Agrupa documentos por bairro normalizado, compara nome (Dice) só entre
 * pares de `origem` diferente dentro do mesmo grupo, e retorna os pares
 * acima do threshold — ordenados por score decrescente.
 *
 * Documentos com `origem` ausente (null/undefined) são tratados como um
 * único grupo de origem "sem origem" — nunca comparados entre si, já que a
 * regra é "origens diferentes" e dois valores ausentes contam como iguais.
 */
export function findCandidatePairs(
  docs: AtracaoDoc[],
  threshold: number = THRESHOLD_DEFAULT,
): CandidatoDuplicata[] {
  const porBairro = new Map<string, AtracaoDoc[]>();
  for (const doc of docs) {
    const chave = normalizeBairro(doc.bairro);
    const grupo = porBairro.get(chave) ?? [];
    grupo.push(doc);
    porBairro.set(chave, grupo);
  }

  const candidatos: CandidatoDuplicata[] = [];

  for (const grupo of Array.from(porBairro.values())) {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i];
        const b = grupo[j];
        if (a._id === b._id) continue;
        if ((a.origem ?? null) === (b.origem ?? null)) continue;

        const score = diceSimilarity(normalizeTokens(a.nome), normalizeTokens(b.nome));
        if (score >= threshold) {
          candidatos.push({ a, b, score });
        }
      }
    }
  }

  return candidatos.sort((x, y) => y.score - x.score);
}

// ---------------------------------------------------------------------------
// I/O — Sanity
// ---------------------------------------------------------------------------

// US-S64: exclui também "duplicada" — sem isso, um par já resolvido pelo
// apply-duplicatas.ts continuaria aparecendo como candidato pra sempre nas
// próximas auditorias, poluindo o relatório com decisões já tomadas.
export const QUERY = `*[_type == "atracao" && status != "rejeitado" && status != "duplicada"]{
  _id,
  "slug": slug.current,
  nome,
  bairro,
  origem
}`;

export async function fetchAtracoes(): Promise<AtracaoDoc[]> {
  return sanityWriteClient.fetch<AtracaoDoc[]>(QUERY);
}

// ---------------------------------------------------------------------------
// Saída — tabela no console e relatório .md
// ---------------------------------------------------------------------------

function padRight(str: string, len: number): string {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len - 1) + " " : s + " ".repeat(len - s.length);
}

function printTable(candidatos: CandidatoDuplicata[]): void {
  const SEP = "─".repeat(150);
  console.log("\n" + SEP);
  console.log(
    padRight("score", 8) +
      padRight("origem A", 12) +
      padRight("origem B", 12) +
      padRight("nome A", 55) +
      "nome B",
  );
  console.log(SEP);
  for (const c of candidatos) {
    console.log(
      padRight(c.score.toFixed(2), 8) +
        padRight(c.a.origem ?? "(sem origem)", 12) +
        padRight(c.b.origem ?? "(sem origem)", 12) +
        padRight(c.a.nome, 55) +
        c.b.nome,
    );
  }
  console.log(SEP);
}

function buildMarkdownReport(candidatos: CandidatoDuplicata[], threshold: number): string {
  const linhas: string[] = [];
  linhas.push(`# Relatório — duplicatas cross-fonte`);
  linhas.push("");
  linhas.push(`Gerado em: ${new Date().toISOString()}`);
  linhas.push(`Threshold (Dice, nome normalizado): ${threshold}`);
  linhas.push(`Pares candidatos: ${candidatos.length}`);
  linhas.push("");
  linhas.push(
    "Só diagnóstico — nenhuma alteração foi feita no Sanity. Revisar cada par manualmente antes de agir.",
  );
  linhas.push("");

  if (candidatos.length === 0) {
    linhas.push("Nenhum par candidato encontrado acima do threshold.");
    return linhas.join("\n") + "\n";
  }

  linhas.push("| score | origem A | nome A | slug A | origem B | nome B | slug B |");
  linhas.push("|---|---|---|---|---|---|---|");
  for (const c of candidatos) {
    linhas.push(
      `| ${c.score.toFixed(2)} | ${c.a.origem ?? "—"} | ${c.a.nome} | ${c.a.slug} | ${c.b.origem ?? "—"} | ${c.b.nome} | ${c.b.slug} |`,
    );
  }

  return linhas.join("\n") + "\n";
}

async function saveMarkdownReport(
  candidatos: CandidatoDuplicata[],
  threshold: number,
  outputDir: string,
): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = join(outputDir, `duplicatas-cross-fonte-${timestamp}.md`);
  await writeFile(filepath, buildMarkdownReport(candidatos, threshold), "utf-8");
  return filepath;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  console.log("\n[check-duplicatas-cross-fonte] Modo: READ-ONLY (script só diagnostica)");
  console.log(`[check-duplicatas-cross-fonte] Threshold: ${THRESHOLD_DEFAULT}\n`);

  console.log("Buscando atrações não-rejeitadas no Sanity (published + drafts)...");
  const docs = await fetchAtracoes();
  console.log(`Atrações encontradas: ${docs.length}`);

  const candidatos = findCandidatePairs(docs, THRESHOLD_DEFAULT);
  console.log(`Pares candidatos (mesmo bairro, origem diferente, score >= ${THRESHOLD_DEFAULT}): ${candidatos.length}`);

  if (candidatos.length === 0) {
    console.log("\n✅ Nenhuma duplicata cross-fonte candidata encontrada.");
  } else {
    printTable(candidatos);
  }

  const outputDir = join(process.cwd(), "data", "output");
  const reportPath = await saveMarkdownReport(candidatos, THRESHOLD_DEFAULT, outputDir);
  console.log(`\nRelatório salvo em: ${reportPath}`);
  console.log("Nenhuma alteração foi feita no Sanity — revisão manual do Rafa antes de agir.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
