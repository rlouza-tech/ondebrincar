#!/usr/bin/env tsx
/**
 * backfill-idade-recomendada-retroativo.ts
 * US-S79 — Backfill retroativo de idade recomendada nas fichas já publicadas.
 *
 * Diferente de scripts/backfill-idade-recomendada.ts (US-S77, que só cobre fichas
 * criadas depois do merge da US-S20 e depende de casar com CSV/import-report de
 * origem): este script cobre o resto do catálogo — fichas publicadas antes da
 * lógica de idade_recomendada existir, sem depender de nenhuma fonte externa.
 *
 * Estratégia:
 *  1. Busca candidatas no Sanity: status == 'operando' && !defined(idade_recomendada_min)
 *     (idempotente — reprocessar não afeta quem já tem o campo).
 *  2. idade_min/idade_max != 0/18 (classificação ou recomendação explícita já
 *     capturada) → copia direto pra idade_recomendada_min/max, sem Gemini.
 *  3. idade_min == 0 && idade_max == 18 (classificação genérica/"Livre", sem sinal
 *     real) → chamada Gemini dedicada usando nome/descricao/mini_review/categoria
 *     já salvos no Sanity (sem re-buscar a fonte externa — a maioria dos eventos
 *     já passou e a página de origem provavelmente saiu do ar), aplicando as
 *     mesmas 3 regras de inferência por contexto da US-S77/US-S20. Sem sinal
 *     suficiente → idade_recomendada fica null (nunca inventa dado).
 *  4. --dry-run (padrão) chama Gemini de verdade pras fichas "Livre" (é o único
 *     jeito de saber a regra aplicada) e gera relatório + JSON, sem escrever no
 *     Sanity. --execute só depois do dry-run validado com o Rafa (CLAUDE.md).
 *  5. Custo real das chamadas Gemini é reportado ao fim de toda execução.
 *
 * Uso (raiz do projeto Cursor):
 *   pnpm backfill-idade-recomendada-retroativo --dry-run
 *   pnpm backfill-idade-recomendada-retroativo --dry-run --limit 5   # smoke test
 *   pnpm backfill-idade-recomendada-retroativo --execute
 *
 * Protocolo: sempre --dry-run primeiro, revisar o relatório e o custo com o
 * Rafa, só então --execute (CLAUDE.md).
 */

import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { estimateCostBrl, extractTokenUsage, type TokenUsage } from "./pipeline-ia/cost-log";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 20_000;
const GEMINI_RATE_LIMIT_DELAY_MS = 2_000;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface Candidato {
  _id: string;
  slug: string;
  nome: string;
  categoria: string;
  descricao: string | null;
  mini_review: string | null;
  idade_min: number | null;
  idade_max: number | null;
  _createdAt: string;
}

export type RegraAplicada = "youtuber_kids" | "teatro_bebes" | "show_infantil_generico" | null;

export type Metodo = "copiado" | "inferido_gemini" | "sem_sinal" | "erro_gemini";

export interface ResultadoInferencia {
  idade_recomendada_min: number | null;
  idade_recomendada_max: number | null;
  regra_aplicada: RegraAplicada;
}

export interface ResultadoBackfill {
  _id: string;
  slug: string;
  nome: string;
  categoria: string;
  idade_min: number | null;
  idade_max: number | null;
  idade_recomendada_min: number | null;
  idade_recomendada_max: number | null;
  metodo: Metodo;
  regra_aplicada: RegraAplicada;
  erro?: string;
}

// ---------------------------------------------------------------------------
// Funções puras — roteamento copiar/inferir + parsing da resposta Gemini
// (sem I/O, cobertas por teste)
// ---------------------------------------------------------------------------

/**
 * Fichas com classificação genérica "Livre" (0-18) não carregam sinal real de
 * recomendação — precisam de inferência por contexto via Gemini. Qualquer
 * outra faixa já é recomendação/classificação explícita capturada na fonte:
 * copia direto (US-S79 AC2).
 */
export function precisaInferenciaGemini(idadeMin: number | null, idadeMax: number | null): boolean {
  return idadeMin === 0 && idadeMax === 18;
}

/** Copia idade_min/idade_max direto pra idade_recomendada_min/max (AC2). */
export function resolverCopiaDireta(
  candidato: Pick<Candidato, "idade_min" | "idade_max">,
): ResultadoInferencia {
  return {
    idade_recomendada_min: candidato.idade_min,
    idade_recomendada_max: candidato.idade_max,
    regra_aplicada: null,
  };
}

const REGRAS_VALIDAS: ReadonlySet<string> = new Set([
  "youtuber_kids",
  "teatro_bebes",
  "show_infantil_generico",
]);

/**
 * Interpreta a resposta bruta do Gemini. Nunca aceita idade sem uma regra
 * correspondente (defesa contra alucinação de valor "órfão") — resposta
 * malformada ou sem regra reconhecida vira "sem sinal", nunca inventa dado.
 */
export function parseInferenciaGemini(rawText: string): ResultadoInferencia {
  try {
    const parsed = JSON.parse(rawText) as {
      idade_recomendada_min?: unknown;
      idade_recomendada_max?: unknown;
      regra_aplicada?: unknown;
    };

    const regra =
      typeof parsed.regra_aplicada === "string" && REGRAS_VALIDAS.has(parsed.regra_aplicada)
        ? (parsed.regra_aplicada as RegraAplicada)
        : null;

    if (regra === null) {
      return { idade_recomendada_min: null, idade_recomendada_max: null, regra_aplicada: null };
    }

    const min = typeof parsed.idade_recomendada_min === "number" ? parsed.idade_recomendada_min : null;
    const max = typeof parsed.idade_recomendada_max === "number" ? parsed.idade_recomendada_max : null;
    return { idade_recomendada_min: min, idade_recomendada_max: max, regra_aplicada: regra };
  } catch {
    return { idade_recomendada_min: null, idade_recomendada_max: null, regra_aplicada: null };
  }
}

/** Classifica o resultado da inferência Gemini em "inferido_gemini" ou "sem_sinal". */
export function classificarResultadoInferencia(resultado: ResultadoInferencia): Metodo {
  return resultado.regra_aplicada === null ? "sem_sinal" : "inferido_gemini";
}

// ---------------------------------------------------------------------------
// Prompt + schema dedicados (reaproveita as 3 regras da US-S77/US-S20, sem
// o resto do prompt principal de enriquecimento — scripts/pipeline-ia/prompt.ts)
// ---------------------------------------------------------------------------

export function buildInferenciaPrompt(
  candidato: Pick<Candidato, "nome" | "categoria" | "descricao" | "mini_review">,
): string {
  return (
    `Você está classificando a idade recomendada de uma atração infantil no Rio de Janeiro ` +
    `pro filtro público de idade do site Onde Brincar. A ficha já está marcada com ` +
    `classificação etária genérica "Livre" (0 a 18 anos), que não dá nenhum sinal real de ` +
    `público-alvo — sua tarefa é achar um sinal de contexto no nome/descrição, não usar 0-18.\n\n` +
    `Dados da ficha:\n` +
    `- Nome: ${candidato.nome}\n` +
    `- Categoria: ${candidato.categoria}\n` +
    `- Descrição: ${candidato.descricao ?? "(sem descrição)"}\n` +
    `- Mini review: ${candidato.mini_review ?? "(sem mini review)"}\n\n` +
    `Aplique as 3 regras de inferência por contexto abaixo, NA ORDEM, e pare na primeira que se aplicar:\n\n` +
    `1. youtuber_kids: o nome cita um canal ou personagem de conteúdo infantil online ` +
    `(ex.: "Luluca", "Maria Clara e JP", "Karol Eskás") → idade_recomendada_min: 4, idade_recomendada_max: 12.\n` +
    `2. teatro_bebes: nome ou descrição menciona "bebê", "colo", "primeira infância" → ` +
    `idade_recomendada_min: 0, idade_recomendada_max: 3.\n` +
    `3. show_infantil_generico: nome ou descrição diz "show infantil", "musical infantil" ou ` +
    `equivalente, sem classificação nem público-alvo mais específico → idade_recomendada_min: 0, idade_recomendada_max: 12.\n\n` +
    `Se nenhuma das 3 regras se aplicar com confiança, retorne idade_recomendada_min: null, ` +
    `idade_recomendada_max: null, regra_aplicada: null. NUNCA force uma das 3 categorias só ` +
    `pra evitar null — abstenção genuína (vira "A confirmar" no site) é sempre preferível a uma ` +
    `inferência sem base real no texto. Nunca use 0-18 como resultado.`
  );
}

const inferenciaResponseSchema = {
  type: "object",
  properties: {
    idade_recomendada_min: { type: "integer", nullable: true, minimum: 0, maximum: 18 },
    idade_recomendada_max: { type: "integer", nullable: true, minimum: 0, maximum: 18 },
    regra_aplicada: {
      type: "string",
      nullable: true,
      enum: ["youtuber_kids", "teatro_bebes", "show_infantil_generico"],
    },
  },
  required: ["idade_recomendada_min", "idade_recomendada_max", "regra_aplicada"],
} as const;

// ---------------------------------------------------------------------------
// I/O — Gemini
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ChamadaGeminiResult {
  resultado: ResultadoInferencia;
  usage: TokenUsage;
  erro?: string;
}

async function chamarGeminiInferencia(
  candidato: Pick<Candidato, "nome" | "categoria" | "descricao" | "mini_review">,
): Promise<ChamadaGeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      resultado: { idade_recomendada_min: null, idade_recomendada_max: null, regra_aplicada: null },
      usage: { input_tokens: 0, output_tokens: 0 },
      erro: "GEMINI_API_KEY ausente",
    };
  }

  const ai = new GoogleGenAI({ apiKey });
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildInferenciaPrompt(candidato),
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: inferenciaResponseSchema,
        abortSignal: abortController.signal,
      },
    });

    const rawText = response.text;
    const usage = extractTokenUsage(response);
    if (!rawText) {
      return {
        resultado: { idade_recomendada_min: null, idade_recomendada_max: null, regra_aplicada: null },
        usage,
        erro: "Resposta vazia do Gemini",
      };
    }

    return { resultado: parseInferenciaGemini(rawText), usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      resultado: { idade_recomendada_min: null, idade_recomendada_max: null, regra_aplicada: null },
      usage: { input_tokens: 0, output_tokens: 0 },
      erro: message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// I/O — Sanity
// ---------------------------------------------------------------------------

const QUERY = `*[_type == "atracao" && status == "operando" && !defined(idade_recomendada_min)] | order(_createdAt asc) {
  _id,
  "slug": slug.current,
  nome,
  categoria,
  descricao,
  mini_review,
  idade_min,
  idade_max,
  _createdAt
}`;

export async function fetchCandidatos(): Promise<Candidato[]> {
  return sanityWriteClient.fetch<Candidato[]>(QUERY);
}

/** Aplica o patch em published + draft (lição US-P1: nem sempre só um existe). */
async function patchBothVersions(baseId: string, set: Record<string, number>): Promise<number> {
  const idsToTry = baseId.startsWith("drafts.") ? [baseId] : [baseId, `drafts.${baseId}`];

  let patched = 0;
  for (const docId of idsToTry) {
    try {
      await sanityWriteClient.patch(docId).set(set).commit();
      patched++;
    } catch {
      // versão (published ou draft) não existe — ok, segue
    }
  }
  return patched;
}

// ---------------------------------------------------------------------------
// Saída — tabela, resumo, custo, JSON
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
  const SEP = "─".repeat(160);
  console.log("\n" + SEP);
  console.log(
    padRight("slug", 45) +
      padRight("metodo", 18) +
      padRight("regra", 26) +
      padRight("oficial", 12) +
      "recomendada",
  );
  console.log(SEP);
  for (const r of resultados) {
    console.log(
      padRight(r.slug, 45) +
        padRight(r.metodo, 18) +
        padRight(r.regra_aplicada ?? "-", 26) +
        padRight(fmtIdade(r.idade_min, r.idade_max), 12) +
        fmtIdade(r.idade_recomendada_min, r.idade_recomendada_max),
    );
  }
  console.log(SEP);
}

async function saveJson(resultados: ResultadoBackfill[], custoTotalReais: number, outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = join(outputDir, `backfill-idade-recomendada-retroativo-${timestamp}.json`);
  await writeFile(
    filepath,
    JSON.stringify({ gerado_em: new Date().toISOString(), custo_estimado_reais: custoTotalReais, resultados }, null, 2),
    "utf-8",
  );
  return filepath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(
  argv: string[],
): { dryRun: boolean; execute: boolean; limit: number | null; excludeSlugs: string[] } {
  const args = argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const execute = args.includes("--execute");

  if (!dryRun && !execute) {
    throw new Error(
      "Uso: informe --dry-run (preview) ou --execute (aplica patches).\n" +
        "  Preview:  pnpm backfill-idade-recomendada-retroativo --dry-run\n" +
        "  Executar: pnpm backfill-idade-recomendada-retroativo --execute",
    );
  }
  if (dryRun && execute) {
    throw new Error("Use --dry-run OU --execute, não ambos.");
  }

  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 && args[limitIdx + 1] ? Number(args[limitIdx + 1]) : null;

  const excludeIdx = args.indexOf("--exclude");
  const excludeSlugs =
    excludeIdx >= 0 && args[excludeIdx + 1]
      ? args[excludeIdx + 1].split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  return {
    dryRun,
    execute,
    limit: limit && Number.isFinite(limit) && limit > 0 ? limit : null,
    excludeSlugs,
  };
}

async function main(): Promise<void> {
  const { dryRun, execute, limit, excludeSlugs } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }
  if (execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório com --execute)");
  }

  console.log(`\n[backfill-idade-recomendada-retroativo] Modo: ${dryRun ? "DRY-RUN" : "EXECUTE ⚠️"}`);

  console.log("Buscando candidatas no Sanity (status=='operando' && !defined(idade_recomendada_min))...");
  let candidatos = await fetchCandidatos();
  console.log(`Candidatas encontradas: ${candidatos.length}`);
  if (excludeSlugs.length > 0) {
    const antes = candidatos.length;
    candidatos = candidatos.filter((c) => !excludeSlugs.includes(c.slug));
    console.log(`--exclude: ${antes - candidatos.length} ficha(s) removida(s) da rodada (${excludeSlugs.join(", ")}).`);
  }
  if (limit) {
    candidatos = candidatos.slice(0, limit);
    console.log(`--limit ${limit}: processando só as ${candidatos.length} primeiras.`);
  }

  if (candidatos.length === 0) {
    console.log("\n✅ Nenhuma ficha candidata. Nada a fazer.");
    return;
  }

  const resultados: ResultadoBackfill[] = [];
  let custoTotalReais = 0;
  let inputTokensTotal = 0;
  let outputTokensTotal = 0;
  let chamadasGemini = 0;

  for (const c of candidatos) {
    if (!precisaInferenciaGemini(c.idade_min, c.idade_max)) {
      const resolucao = resolverCopiaDireta(c);
      resultados.push({
        _id: c._id,
        slug: c.slug,
        nome: c.nome,
        categoria: c.categoria,
        idade_min: c.idade_min,
        idade_max: c.idade_max,
        ...resolucao,
        metodo: "copiado",
      });
      continue;
    }

    const { resultado, usage, erro } = await chamarGeminiInferencia(c);
    chamadasGemini++;
    inputTokensTotal += usage.input_tokens;
    outputTokensTotal += usage.output_tokens;
    custoTotalReais += estimateCostBrl(usage);

    resultados.push({
      _id: c._id,
      slug: c.slug,
      nome: c.nome,
      categoria: c.categoria,
      idade_min: c.idade_min,
      idade_max: c.idade_max,
      ...resultado,
      metodo: erro ? "erro_gemini" : classificarResultadoInferencia(resultado),
      erro,
    });

    await sleep(GEMINI_RATE_LIMIT_DELAY_MS);
  }

  printTable(resultados);

  const copiadas = resultados.filter((r) => r.metodo === "copiado");
  const inferidas = resultados.filter((r) => r.metodo === "inferido_gemini");
  const semSinal = resultados.filter((r) => r.metodo === "sem_sinal");
  const erros = resultados.filter((r) => r.metodo === "erro_gemini");

  console.log(`\nResumo:`);
  console.log(`  Total candidatas processadas:        ${resultados.length}`);
  console.log(`  Copiadas direto (faixa != 0-18):     ${copiadas.length}`);
  console.log(`  Inferidas via Gemini (regra achada):  ${inferidas.length}`);
  console.log(`  Sem sinal suficiente (fica null):    ${semSinal.length}`);
  console.log(`  Erro na chamada Gemini:               ${erros.length}`);

  console.log(`\nCusto Gemini:`);
  console.log(`  Chamadas feitas:      ${chamadasGemini}`);
  console.log(`  Tokens de entrada:    ${inputTokensTotal}`);
  console.log(`  Tokens de saída:      ${outputTokensTotal}`);
  console.log(`  Custo estimado total: R$ ${custoTotalReais.toFixed(4)}`);

  const outputDir = join(process.cwd(), "data", "output");
  const jsonPath = await saveJson(resultados, custoTotalReais, outputDir);
  console.log(`\nJSON salvo em: ${jsonPath}`);

  if (erros.length > 0) {
    console.log(`\n⚠️  ${erros.length} ficha(s) com erro na chamada Gemini — não terão idade_recomendada escrita nesta rodada (idempotente: seguem candidatas na próxima):`);
    for (const r of erros) {
      console.log(`  • ${r.slug} — ${r.erro}`);
    }
  }

  if (dryRun) {
    console.log(
      `\n[DRY-RUN] Nenhuma alteração feita no Sanity. Revise o relatório e o custo acima com o Rafa antes de rodar --execute.`,
    );
    return;
  }

  // --execute: aplica patches só em quem tem valor real (copiado ou inferido
  // com regra). "sem_sinal" e "erro_gemini" não escrevem nada — o campo
  // segue !defined(idade_recomendada_min), então continuam candidatas em
  // runs futuros (idempotência natural, sem precisar de sentinela).
  const aplicaveis = resultados.filter((r) => r.metodo === "copiado" || r.metodo === "inferido_gemini");
  const semAcao = resultados.filter((r) => r.metodo === "sem_sinal" || r.metodo === "erro_gemini");

  console.log(`\n🔧 --execute: aplicando ${aplicaveis.length} patch(es) no Sanity...\n`);
  let patched = 0;
  let patchErrors = 0;
  for (const r of aplicaveis) {
    const set: Record<string, number> = {};
    if (r.idade_recomendada_min !== null) set.idade_recomendada_min = r.idade_recomendada_min;
    if (r.idade_recomendada_max !== null) set.idade_recomendada_max = r.idade_recomendada_max;

    try {
      const count = await patchBothVersions(r._id, set);
      console.log(
        `  ✅ ${r._id} [${r.metodo}] -> recomendada: ${fmtIdade(r.idade_recomendada_min, r.idade_recomendada_max)} (${count} versão(ões) patchada(s))`,
      );
      patched++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${r._id} — falha no patch: ${message}`);
      patchErrors++;
    }
  }

  console.log(`\nPatch completo: ${patched} documento(s) atualizado(s), ${patchErrors} erro(s).`);
  if (semAcao.length > 0) {
    console.log(
      `\n${semAcao.length} ficha(s) sem sinal suficiente ou com erro Gemini — idade_recomendada não foi escrita, seguem "A confirmar" e continuam candidatas em runs futuros:`,
    );
    for (const r of semAcao) {
      console.log(`  • ${r.slug} [${r.metodo}]${r.erro ? ` — ${r.erro}` : ""}`);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
