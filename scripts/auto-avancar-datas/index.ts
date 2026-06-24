#!/usr/bin/env tsx
/**
 * auto-avancar-datas — auto-avança proxima_data de fichas expiradas
 *
 * Varre TODAS as fichas publicadas no Sanity com proxima_data vencida
 * e, quando o programacao_texto contém uma data futura válida,
 * propõe (dry-run) ou aplica (--execute) o avanço.
 *
 * Uso:
 *   pnpm auto-avancar-datas              ← dry-run (padrão — não escreve nada)
 *   pnpm auto-avancar-datas --execute    ← aplica os avanços aprovados
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface FichaExpirada {
  _id: string;
  slug: string;
  proxima_data: string;
  programacao_texto: string | null;
  link_compra: string | null;
}

interface DataExtraida {
  /** Data futura mais próxima encontrada — formato YYYY-MM-DD */
  data: string;
  /** Trecho do programacao_texto que originou a extração */
  trecho: string;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { execute: boolean } {
  const args = argv.slice(2);
  let execute = false;

  for (const arg of args) {
    if (arg === "--execute") {
      execute = true;
    } else if (arg.startsWith("-")) {
      throw new Error(
        `Argumento desconhecido: ${arg}\n` +
        `  Uso: pnpm auto-avancar-datas [--execute]`,
      );
    }
  }

  return { execute };
}

// ---------------------------------------------------------------------------
// Extração de datas de texto livre
// ---------------------------------------------------------------------------

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function toISO(dia: number, mes: number, ano: number): string | null {
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Varre o texto e retorna a data futura mais próxima (>= hoje),
 * junto com o trecho exato que a originou.
 *
 * Padrões suportados:
 *   DD/MM ou DD/MM/YYYY
 *   "DD de mês"
 *   "D1, D2 e D3 de mês" — múltiplos dias no mesmo mês
 *   "de DD a DD de mês" — range
 */
function extrairDataFuturaComTrecho(
  texto: string,
  hoje: string,
): DataExtraida | null {
  if (!texto) return null;
  const ano = new Date().getFullYear();
  const candidatas: { data: string; trecho: string }[] = [];

  // Padrão DD/MM ou DD/MM/YYYY
  const reDiaMes = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = reDiaMes.exec(texto)) !== null) {
    const d = toISO(
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      m[3] ? parseInt(m[3], 10) : ano,
    );
    if (d) candidatas.push({ data: d, trecho: m[0] });
  }

  // Padrão range "de DD a DD de mês"
  const reRange = /\bde\s+(\d{1,2})\s+a\s+(\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi;
  while ((m = reRange.exec(texto)) !== null) {
    const nomeMes = m[3].toLowerCase();
    const mes = MESES[nomeMes.slice(0, 3)] ?? MESES[nomeMes];
    if (!mes) continue;
    const dInicio = toISO(parseInt(m[1], 10), mes, ano);
    const dFim    = toISO(parseInt(m[2], 10), mes, ano);
    if (dInicio) candidatas.push({ data: dInicio, trecho: m[0] });
    if (dFim)    candidatas.push({ data: dFim,    trecho: m[0] });
  }

  // Padrão "D1, D2 e D3 de mês" — múltiplos dias compartilhando o mesmo mês
  const reMultiDia = /\b((?:\d{1,2}(?:,\s*|\s+e\s+))*\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi;
  while ((m = reMultiDia.exec(texto)) !== null) {
    const nomeMes = m[2].toLowerCase();
    const mes = MESES[nomeMes.slice(0, 3)] ?? MESES[nomeMes];
    if (!mes) continue;
    const dias = m[1].match(/\d{1,2}/g) ?? [];
    for (const diaStr of dias) {
      const d = toISO(parseInt(diaStr, 10), mes, ano);
      if (d) candidatas.push({ data: d, trecho: m[0] });
    }
  }

  // Retorna a mais próxima no futuro (>= hoje)
  const futuras = candidatas
    .filter((c) => c.data >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data));

  return futuras[0] ?? null;
}

// ---------------------------------------------------------------------------
// Buscar fichas expiradas no Sanity
// ---------------------------------------------------------------------------

async function fetchFichasExpiradas(hoje: string): Promise<FichaExpirada[]> {
  return sanityWriteClient.fetch<FichaExpirada[]>(
    `*[_type == "atracao"
      && !(_id in path("drafts.**"))
      && status == "operando"
      && defined(proxima_data)
      && proxima_data < $hoje
    ]{
      _id,
      "slug": slug.current,
      proxima_data,
      programacao_texto,
      link_compra
    } | order(proxima_data asc)`,
    { hoje },
  );
}

// ---------------------------------------------------------------------------
// Aplicar patch no Sanity
// ---------------------------------------------------------------------------

async function aplicarPatch(id: string, novaData: string): Promise<void> {
  await sanityWriteClient
    .patch(id)
    .set({ proxima_data: novaData })
    .commit();
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);

  console.log(`\n${"═".repeat(70)}`);
  console.log(`auto-avancar-datas  |  ${execute ? "MODO EXECUTE ⚡" : "dry-run (sem escrita)"}`);
  console.log(`hoje: ${hoje}`);
  console.log(`${"═".repeat(70)}`);

  console.log("\nBuscando fichas com data expirada no Sanity...");
  const fichas = await fetchFichasExpiradas(hoje);
  console.log(`Fichas expiradas encontradas: ${fichas.length}`);

  if (fichas.length === 0) {
    console.log("\n✅ Nenhuma ficha com data expirada. Nada a fazer.");
    process.exit(0);
  }

  // Classifica
  const comSugestao: Array<{
    ficha: FichaExpirada;
    extraida: DataExtraida;
  }> = [];
  const semSugestao: FichaExpirada[] = [];

  for (const ficha of fichas) {
    const prog = ficha.programacao_texto ?? "";
    const extraida = extrairDataFuturaComTrecho(prog, hoje);
    if (extraida) {
      comSugestao.push({ ficha, extraida });
    } else {
      semSugestao.push(ficha);
    }
  }

  // ── Fichas com sugestão ───────────────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📅  ${comSugestao.length} ficha(s) com data futura detectável:`);
  console.log(`${"─".repeat(70)}`);

  for (const { ficha, extraida } of comSugestao) {
    console.log(`\nslug:           ${ficha.slug}`);
    console.log(`data_anterior:  ${ficha.proxima_data.slice(0, 10)}`);
    console.log(`data_nova:      ${extraida.data}`);
    console.log(`trecho:         "${extraida.trecho}"`);
    if (ficha.link_compra) console.log(`link_compra:    ${ficha.link_compra}`);
  }

  // ── Fichas sem sugestão ───────────────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`);
  if (semSugestao.length === 0) {
    console.log("✅ Todas as fichas expiradas têm data futura detectável.");
  } else {
    console.log(`⚠️  ${semSugestao.length} ficha(s) sem data futura no programacao_texto — REVISÃO MANUAL:`);
    console.log(`${"─".repeat(70)}`);
    for (const ficha of semSugestao) {
      console.log(`\nslug:           ${ficha.slug}`);
      console.log(`data_expirada:  ${ficha.proxima_data.slice(0, 10)}`);
      console.log(
        `programação:    "${(ficha.programacao_texto ?? "(vazio)").slice(0, 120)}"`,
      );
    }
  }

  // ── Ação ─────────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(70)}`);

  if (!execute) {
    console.log(
      `\nDry-run concluído. ${comSugestao.length} avanço(s) prontos para aplicar.`,
    );
    console.log(
      `Para aplicar: pnpm auto-avancar-datas --execute\n`,
    );
    process.exit(0);
  }

  // Execute
  console.log(`\n⚡ Aplicando ${comSugestao.length} avanço(s)...\n`);
  let corrigidas = 0;
  let falhas = 0;

  for (const { ficha, extraida } of comSugestao) {
    try {
      await aplicarPatch(ficha._id, extraida.data);
      console.log(
        `  ✅ ${ficha.slug}\n` +
        `     ${ficha.proxima_data.slice(0, 10)} → ${extraida.data}\n` +
        `     trecho: "${extraida.trecho}"`,
      );
      corrigidas++;
    } catch (err) {
      console.log(
        `  ❌ ${ficha.slug} — erro: ${err instanceof Error ? err.message : err}`,
      );
      falhas++;
    }
  }

  console.log(
    `\nResumo: ${corrigidas} avançada(s), ${falhas} falha(s), ` +
    `${semSugestao.length} sem data futura (revisar manualmente).\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
