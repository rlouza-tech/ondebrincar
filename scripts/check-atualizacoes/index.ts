#!/usr/bin/env tsx
/**
 * check-atualizacoes — detecção de fichas desatualizadas na fonte
 *
 * Compara campos de fichas já publicadas no Sanity com os dados mais recentes
 * da fonte (CSV/JSON). Por padrão é read-only.
 *
 * Fichas com data_expirada exibem: slug, link, data atual, programacao_texto
 * e sugestão de nova data extraída do campo programacao_texto do Sanity.
 *
 * Uso:
 *   pnpm check-atualizacoes --source clubinho
 *   pnpm check-atualizacoes --source sympla
 *   pnpm check-atualizacoes --source uhuu
 *   pnpm check-atualizacoes --source manual [--fix-dates]
 *
 * --fix-dates  aplica automaticamente proxima_data para fichas com sugestão válida
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { buildSlugFromParts } from "@/scripts/lib/slug";
import {
  normalizeClubinho,
  DEFAULT_INPUT_PATH as CLUBINHO_PATH,
} from "@/scripts/normalizer/clubinho";
import {
  normalizeSympla,
  DEFAULT_INPUT_PATH as SYMPLA_PATH,
} from "@/scripts/normalizer/sympla";
import {
  normalizeUhuu,
  DEFAULT_INPUT_PATH as UHUU_PATH,
} from "@/scripts/normalizer/uhuu";
import {
  normalizeManual,
  DEFAULT_INPUT_PATH as MANUAL_PATH,
} from "@/scripts/normalizer/manual";
import type { PipelineInput } from "@/lib/pipeline/types";

type Source = "clubinho" | "sympla" | "uhuu" | "manual";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SanityFicha {
  _id: string;
  slug: string;
  preco?: number | null;
  proxima_data?: string | null;
  descricao?: string | null;
  programacao_texto?: string | null;
  link_compra?: string | null;
  status?: string | null;
}

/**
 * US-S47: fichas já fechadas (encerrada/rejeitado) nunca têm informação nova
 * a oferecer no relatório de "fichas expiradas" — o script relê
 * programacao_texto já salvo no Sanity, então reportar essas fichas de novo
 * é ruído puro. Fichas com status ativo (operando ou similar) continuam
 * aparecendo normalmente.
 */
export function isFichaFechada(status?: string | null): boolean {
  return status === "encerrada" || status === "rejeitado";
}

interface Divergencia {
  slug: string;
  campo: string;
  valor_fonte: string;
  valor_sanity: string;
}

interface FichaExpirada {
  slug: string;
  _id: string;
  link_fonte: string;
  link_compra: string;
  data_sanity: string;
  programacao_texto: string;
  sugestao: string | null;
  /**
   * US-S53: de onde veio a sugestão de data — "fonte viva" (re-raspada no
   * mesmo run, mais confiável) ou "texto salvo" (programacao_texto do
   * Sanity, pode estar desatualizado). null quando não há sugestão.
   */
  origem_sugestao: "fonte viva" | "texto salvo" | null;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { source: Source; fixDates: boolean } {
  const args = argv.slice(2);
  let source: Source | undefined;
  let fixDates = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--source") {
      if (next !== "clubinho" && next !== "sympla" && next !== "uhuu" && next !== "manual") {
        throw new Error(
          `--source aceita "clubinho", "sympla", "uhuu" ou "manual" — recebido: "${next ?? ""}"\n` +
          `  Exemplo: pnpm check-atualizacoes --source clubinho`,
        );
      }
      source = next as Source;
      i++;
    } else if (arg === "--fix-dates") {
      fixDates = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!source) {
    throw new Error(
      "Argumento --source é obrigatório.\n" +
      "  Uso: pnpm check-atualizacoes --source clubinho|sympla|uhuu|manual [--fix-dates]",
    );
  }

  return { source, fixDates };
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
 * Extrai a primeira data encontrada em texto livre.
 * Retorna string ISO (YYYY-MM-DD) ou null.
 */
function extrairDataDaFonte(texto: string): string | null {
  if (!texto) return null;
  const ano = new Date().getFullYear();

  const matchDiaMes = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (matchDiaMes) {
    const d = toISO(
      parseInt(matchDiaMes[1], 10),
      parseInt(matchDiaMes[2], 10),
      matchDiaMes[3] ? parseInt(matchDiaMes[3], 10) : ano,
    );
    if (d) return d;
  }

  const matchDiaNome = texto.match(/\b(\d{1,2})\s+(?:de\s+)?([a-záéíóúâêîôûãõç]+)/i);
  if (matchDiaNome) {
    const nomeMes = matchDiaNome[2].toLowerCase();
    const mes = MESES[nomeMes.slice(0, 3)] ?? MESES[nomeMes];
    if (mes) {
      const d = toISO(parseInt(matchDiaNome[1], 10), mes, ano);
      if (d) return d;
    }
  }

  return null;
}

/**
 * Remove dias passados de sequências de datas no texto de programação.
 *
 * Exemplo (hoje = 16/06):
 *   "Datas: 13, 14, 20, 21, 27 e 28 de junho."
 *   → "Datas: 20, 21, 27 e 28 de junho."
 *
 * Ranges ("de 13 a 28 de junho"): mantidos enquanto a data-fim >= hoje.
 * Sequências em que todos os dias já passaram: removidas inteiramente.
 */
function limparProgramacaoTexto(texto: string, hoje: string): string {
  const ano = new Date().getFullYear();

  // Ranges "de DD a DD de mês": remove se fim já passou; mantém caso contrário
  let resultado = texto.replace(
    /\bde\s+(\d{1,2})\s+a\s+(\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi,
    (match, _d1, d2, nomeMes) => {
      const mes = MESES[nomeMes.toLowerCase().slice(0, 3)] ?? MESES[nomeMes.toLowerCase()];
      if (!mes) return match;
      const dFim = toISO(parseInt(d2, 10), mes, ano);
      return dFim && dFim >= hoje ? match : "";
    },
  );

  // Sequências "D1, D2 e D3 de mês": filtra dias passados, reconstrói
  resultado = resultado.replace(
    /\b((?:\d{1,2}(?:,\s*|\s+e\s+))*\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi,
    (match, diasStr: string, nomeMes: string) => {
      const mes = MESES[nomeMes.toLowerCase().slice(0, 3)] ?? MESES[nomeMes.toLowerCase()];
      if (!mes) return match;
      const todos = (diasStr.match(/\d{1,2}/g) ?? []).map(Number);
      const futuros = todos.filter((d) => {
        const iso = toISO(d, mes, ano);
        return iso !== null && iso >= hoje;
      });
      if (futuros.length === 0) return "";
      if (futuros.length === todos.length) return match;
      const partes =
        futuros.length === 1
          ? `${futuros[0]} de ${nomeMes}`
          : futuros.slice(0, -1).join(", ") + " e " + futuros[futuros.length - 1] + " de " + nomeMes;
      return partes;
    },
  );

  // Limpa artefatos: espaços duplos, vírgulas antes de ponto, pontos duplos
  return resultado
    .replace(/[,;]\s*\./g, ".")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Varre todo o texto e retorna a primeira data futura (>= hoje) encontrada.
 *
 * Lida com três padrões:
 *   DD/MM ou DD/MM/YYYY
 *   "DD de mês"
 *   "D1, D2 e D3 de mês" → expande todos os dias para o mesmo mês
 */
function extrairDataFutura(texto: string, hoje: string): string | null {
  if (!texto) return null;
  const ano = new Date().getFullYear();
  const candidatas: string[] = [];

  // Padrão DD/MM ou DD/MM/YYYY
  const reDiaMes = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g;
  let m: RegExpExecArray | null;
  while ((m = reDiaMes.exec(texto)) !== null) {
    const d = toISO(
      parseInt(m[1], 10),
      parseInt(m[2], 10),
      m[3] ? parseInt(m[3], 10) : ano,
    );
    if (d) candidatas.push(d);
  }

  // Padrão "D1, D2 e D3 de mês" — múltiplos dias compartilhando o mesmo mês
  // Captura: "13, 20 e 28 de junho", "27 e 28 de julho", "28 de junho"
  const reMultiDia = /\b((?:\d{1,2}(?:,\s*|\s+e\s+))*\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi;
  while ((m = reMultiDia.exec(texto)) !== null) {
    const nomeMes = m[2].toLowerCase();
    const mes = MESES[nomeMes.slice(0, 3)] ?? MESES[nomeMes];
    if (!mes) continue;
    const dias = m[1].match(/\d{1,2}/g) ?? [];
    for (const diaStr of dias) {
      const d = toISO(parseInt(diaStr, 10), mes, ano);
      if (d) candidatas.push(d);
    }
  }

  // Padrão range "de DD a DD de mês" — ex: "de 13 a 28 de junho"
  // Adiciona o início do range (se ainda não passou) para detectar fichas ativas
  const reRange = /\bde\s+(\d{1,2})\s+a\s+(\d{1,2})\s+de\s+([a-záéíóúâêîôûãõç]+)/gi;
  while ((m = reRange.exec(texto)) !== null) {
    const nomeMes = m[3].toLowerCase();
    const mes = MESES[nomeMes.slice(0, 3)] ?? MESES[nomeMes];
    if (!mes) continue;
    const dInicio = toISO(parseInt(m[1], 10), mes, ano);
    const dFim    = toISO(parseInt(m[2], 10), mes, ano);
    if (dInicio) candidatas.push(dInicio);
    if (dFim)    candidatas.push(dFim);
  }

  // Retorna a primeira candidata >= hoje (a mais próxima no futuro)
  const futuras = candidatas.filter((d) => d >= hoje).sort();
  return futuras[0] ?? null;
}

// ---------------------------------------------------------------------------
// Normalizar preço
// ---------------------------------------------------------------------------

function precoFonteEmCentavos(input: PipelineInput): number | null {
  if (input.preco_bruto) {
    const limpo = input.preco_bruto.replace(/[^\d,]/g, "").replace(",", ".");
    const v = parseFloat(limpo);
    if (!isNaN(v)) return Math.round(v * 100);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Buscar fichas publicadas no Sanity
// ---------------------------------------------------------------------------

async function fetchFichasSanity(slugs: string[]): Promise<Map<string, SanityFicha>> {
  if (slugs.length === 0) return new Map();

  const docs = await sanityWriteClient.fetch<SanityFicha[]>(
    `*[_type == "atracao" && !(_id in path("drafts.**")) && slug.current in $slugs]{
      _id,
      "slug": slug.current,
      preco,
      proxima_data,
      descricao,
      programacao_texto,
      link_compra,
      status
    }`,
    { slugs },
  );

  const mapa = new Map<string, SanityFicha>();
  for (const doc of docs) {
    mapa.set(doc.slug, doc);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Comparar campos (fichas sem data expirada)
// ---------------------------------------------------------------------------

function compararFicha(
  slug: string,
  input: PipelineInput,
  sanity: SanityFicha,
  hoje: string,
): Divergencia[] {
  const divergencias: Divergencia[] = [];

  // proxima_data: data ativa mas diferente da fonte
  const dataFonte = extrairDataDaFonte(input.dias_apresentacao ?? "");
  if (dataFonte && sanity.proxima_data) {
    const dataSanity = sanity.proxima_data.slice(0, 10);
    if (dataFonte !== dataSanity) {
      divergencias.push({
        slug,
        campo: "proxima_data [aproximado]",
        valor_fonte: `${dataFonte} (extraído de: "${input.dias_apresentacao}")`,
        valor_sanity: dataSanity,
      });
    }
  }

  // preco
  const precoFonte = precoFonteEmCentavos(input);
  if (precoFonte !== null && sanity.preco != null) {
    if (precoFonte !== sanity.preco) {
      divergencias.push({
        slug,
        campo: "preco",
        valor_fonte: `${precoFonte} centavos (R$${(precoFonte / 100).toFixed(2)})`,
        valor_sanity: `${sanity.preco} centavos (R$${(sanity.preco / 100).toFixed(2)})`,
      });
    }
  }

  // descricao (heurística)
  const sinopse = (input.sinopse_oficial ?? "").trim();
  const descSanity = (sanity.descricao ?? "").trim();
  if (sinopse && descSanity) {
    const normalizar = (s: string) => s.toLowerCase().replace(/\s+/g, " ").slice(0, 100);
    if (normalizar(sinopse) !== normalizar(descSanity)) {
      divergencias.push({
        slug,
        campo: "descricao [sinopse vs AI-enriched]",
        valor_fonte: sinopse.slice(0, 120) + (sinopse.length > 120 ? "…" : ""),
        valor_sanity: descSanity.slice(0, 120) + (descSanity.length > 120 ? "…" : ""),
      });
    }
  }

  return divergencias;
}

// ---------------------------------------------------------------------------
// Buscar fichas expiradas no Sanity que não estão na fonte atual
// ---------------------------------------------------------------------------

async function fetchFichasExpiradasSemFonte(
  excluirSlugs: string[],
  hoje: string,
): Promise<SanityFicha[]> {
  const docs = await sanityWriteClient.fetch<SanityFicha[]>(
    `*[_type == "atracao" && !(_id in path("drafts.**")) && defined(proxima_data) && proxima_data < $hoje]{
      _id,
      "slug": slug.current,
      preco,
      proxima_data,
      descricao,
      programacao_texto,
      link_compra,
      status
    }`,
    { hoje },
  );
  return docs.filter((d) => !excluirSlugs.includes(d.slug));
}

// ---------------------------------------------------------------------------
// Montar relatório de expiradas (filtra fichas já fechadas — US-S47)
// ---------------------------------------------------------------------------

/**
 * Fichas em comum (fonte ∩ Sanity) com proxima_data vencida viram entrada no
 * relatório de expiradas, exceto quando já estão encerradas/rejeitadas —
 * essas não têm informação nova a oferecer. Fichas não vencidas seguem para
 * a checagem normal de divergências.
 */
export function processarEmComum(
  emComum: { input: PipelineInput; slug: string }[],
  fichasSanity: Map<string, SanityFicha>,
  hoje: string,
): { expiradas: FichaExpirada[]; divergencias: Divergencia[] } {
  const expiradas: FichaExpirada[] = [];
  const divergencias: Divergencia[] = [];

  for (const { input, slug } of emComum) {
    const sanity = fichasSanity.get(slug)!;

    if (sanity.proxima_data && sanity.proxima_data.slice(0, 10) < hoje) {
      if (isFichaFechada(sanity.status)) continue;

      const prog = sanity.programacao_texto ?? "";
      // US-S53: tenta a fonte viva (re-raspada neste mesmo run) antes de cair
      // no fallback de reler o programacao_texto já salvo no Sanity — que
      // nunca vai ter uma data nova depois que o evento já passou daquele
      // texto (causa raiz do incidente "A Casa da Gabi", spike US-S50).
      const sugestaoFonte = extrairDataFutura(input.dias_apresentacao ?? "", hoje);
      const sugestaoTexto = sugestaoFonte ? null : extrairDataFutura(prog, hoje);
      const sugestao = sugestaoFonte ?? sugestaoTexto;
      const origem_sugestao: FichaExpirada["origem_sugestao"] = sugestaoFonte
        ? "fonte viva"
        : sugestaoTexto
          ? "texto salvo"
          : null;

      expiradas.push({
        slug,
        _id: sanity._id,
        link_fonte: input.url_origem ?? "",
        link_compra: sanity.link_compra ?? "",
        data_sanity: sanity.proxima_data.slice(0, 10),
        programacao_texto: prog || "(vazio)",
        sugestao,
        origem_sugestao,
      });
    } else {
      const divs = compararFicha(slug, input, sanity, hoje);
      divergencias.push(...divs);
    }
  }

  return { expiradas, divergencias };
}

/**
 * Fichas expiradas no Sanity que não estão na fonte atual — mesmo filtro de
 * status fechado (US-S47): encerrada/rejeitado não entra no relatório.
 */
export function processarExpiradasSemFonte(
  fichasExpiradasSemFonte: SanityFicha[],
  hoje: string,
): FichaExpirada[] {
  const expiradas: FichaExpirada[] = [];

  for (const sanity of fichasExpiradasSemFonte) {
    if (isFichaFechada(sanity.status)) continue;

    const prog = sanity.programacao_texto ?? "";
    // Sem fonte viva pra cruzar (não está no CSV/JSON desta rodada) — só o
    // texto salvo está disponível.
    const sugestao = extrairDataFutura(prog, hoje);
    expiradas.push({
      slug: sanity.slug,
      _id: sanity._id,
      link_fonte: "",
      link_compra: sanity.link_compra ?? "",
      data_sanity: (sanity.proxima_data ?? "").slice(0, 10),
      programacao_texto: prog || "(vazio)",
      sugestao,
      origem_sugestao: sugestao ? "texto salvo" : null,
    });
  }

  return expiradas;
}

// ---------------------------------------------------------------------------
// Carregar candidatos
// ---------------------------------------------------------------------------

async function loadCandidates(source: Source): Promise<{ rows: PipelineInput[]; inputPath: string }> {
  switch (source) {
    case "clubinho": return { rows: await normalizeClubinho(), inputPath: CLUBINHO_PATH };
    case "sympla":   return { rows: await normalizeSympla(),   inputPath: SYMPLA_PATH };
    case "uhuu":     return { rows: await normalizeUhuu(),     inputPath: UHUU_PATH };
    case "manual":   return { rows: await normalizeManual(),   inputPath: MANUAL_PATH };
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { source, fixDates } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const { rows, inputPath } = await loadCandidates(source);
  console.log(`\nFonte: ${source} (${inputPath})`);
  console.log(`Fichas na fonte: ${rows.length}`);

  const fichasComSlug = rows.map((r) => ({
    input: r,
    slug: buildSlugFromParts(r.nome, r.venue, r.bairro),
  }));

  const hoje = new Date().toISOString().slice(0, 10);

  console.log("Buscando fichas publicadas no Sanity...");
  const fichasSanity = await fetchFichasSanity(fichasComSlug.map((f) => f.slug));
  console.log(`Fichas encontradas no Sanity (publicadas): ${fichasSanity.size}`);

  const emComum = fichasComSlug.filter((f) => fichasSanity.has(f.slug));
  console.log(`Fichas em comum (fonte ∩ Sanity): ${emComum.length}`);

  // Fichas com data expirada no Sanity que não estão na fonte atual (ex: removidas do CSV)
  const slugsEmComum = emComum.map((f) => f.slug);
  console.log("Buscando fichas expiradas no Sanity fora da fonte atual...");
  const fichasExpiradasSemFonte = await fetchFichasExpiradasSemFonte(slugsEmComum, hoje);
  console.log(`Fichas expiradas fora da fonte: ${fichasExpiradasSemFonte.length}`);

  if (emComum.length === 0 && fichasExpiradasSemFonte.length === 0) {
    console.log("\nNenhuma ficha para comparar.");
    process.exit(0);
  }

  const { expiradas: expiradasEmComum, divergencias } = processarEmComum(
    emComum,
    fichasSanity,
    hoje,
  );
  // Fichas expiradas sem fonte — sem link_fonte (não estão no CSV atual)
  const expiradasSemFonte = processarExpiradasSemFonte(fichasExpiradasSemFonte, hoje);
  const expiradas: FichaExpirada[] = [...expiradasEmComum, ...expiradasSemFonte];

  // ── Seção 1: Fichas expiradas ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  if (expiradas.length === 0) {
    console.log("✅ Nenhuma ficha com data expirada.");
  } else {
    const comSugestao = expiradas.filter((f) => f.sugestao !== null);
    const semSugestao = expiradas.filter((f) => f.sugestao === null);

    console.log(`⚠️  ${expiradas.length} ficha(s) com data expirada:`);
    console.log(`   ${comSugestao.length} com sugestão de nova data`);
    console.log(`   ${semSugestao.length} sem data futura no campo programação\n`);

    for (const f of expiradas) {
      console.log("─".repeat(80));
      console.log(`slug:         ${f.slug}`);
      if (f.link_fonte)  console.log(`link fonte:   ${f.link_fonte}`);
      if (f.link_compra) console.log(`link compra:  ${f.link_compra}`);
      console.log(`data_sanity:  ${f.data_sanity}  ← expirada`);
      console.log(`programação:  "${f.programacao_texto}"`);
      if (f.sugestao) {
        console.log(`sugestão:     → atualizar proxima_data para ${f.sugestao}  (origem: ${f.origem_sugestao})`);
      } else {
        console.log(`sugestão:     → nenhuma data futura encontrada — revisar manualmente`);
      }
    }

    console.log("─".repeat(80));

    // ── Fix dates ────────────────────────────────────────────────────────────
    if (fixDates) {
      console.log(`\n🔧 --fix-dates: aplicando ${comSugestao.length} correção(ões)...\n`);
      let corrigidas = 0;
      let falhas = 0;
      for (const f of comSugestao) {
        try {
          const progOriginal = f.programacao_texto === "(vazio)" ? "" : f.programacao_texto;
          const progLimpo = progOriginal ? limparProgramacaoTexto(progOriginal, hoje) : "";
          const textoMudou = progLimpo && progLimpo !== progOriginal;

          const patch = sanityWriteClient.patch(f._id).set({ proxima_data: f.sugestao });
          if (textoMudou) patch.set({ programacao_texto: progLimpo });
          await patch.commit();

          const detalhe = textoMudou
            ? `→ ${f.sugestao}  (origem: ${f.origem_sugestao})  +  programacao_texto atualizado`
            : `→ ${f.sugestao}  (origem: ${f.origem_sugestao})`;
          console.log(`  ✅ ${f.slug}  ${detalhe}`);
          if (textoMudou) {
            console.log(`     antes: "${progOriginal}"`);
            console.log(`     depois: "${progLimpo}"`);
          }
          corrigidas++;
        } catch (err) {
          console.log(`  ❌ ${f.slug} — erro: ${err instanceof Error ? err.message : err}`);
          falhas++;
        }
      }
      console.log(`\nResumo --fix-dates: ${corrigidas} corrigida(s), ${falhas} falha(s), ${semSugestao.length} sem sugestão (revisar manualmente).`);
    } else {
      console.log(`\nPara aplicar as sugestões: pnpm check-atualizacoes --source ${source} --fix-dates`);
    }
  }

  // ── Seção 2: Outras divergências ──────────────────────────────────────────
  console.log("\n" + "═".repeat(80));
  if (divergencias.length === 0) {
    console.log("✅ Nenhuma outra divergência encontrada.");
  } else {
    console.log(`⚠️  ${divergencias.length} outra(s) divergência(s):\n`);
    console.log(
      padRight("slug", 45) +
      padRight("campo", 35) +
      padRight("valor_fonte", 45) +
      "valor_sanity",
    );
    console.log("─".repeat(160));
    for (const d of divergencias) {
      console.log(
        padRight(d.slug, 45) +
        padRight(d.campo, 35) +
        padRight(d.valor_fonte, 45) +
        d.valor_sanity,
      );
    }
    console.log("\n⚠️  Campos [aproximado] e [sinopse vs AI-enriched] requerem revisão manual.");
  }

  console.log(`\nTotal: ${expiradas.length} expirada(s), ${divergencias.length} outra(s) divergência(s) em ${new Set(divergencias.map((d) => d.slug)).size} ficha(s).`);
  process.exit(0);
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len - 1) + " " : str + " ".repeat(len - str.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
