/**
 * Scraper — EcoVilla Ri Happy (US-S31)
 *
 * Venue única (Teatro EcoVilla Ri Happy, Jardim Botânico) com página de
 * programação renderizada 100% no servidor (Avada/Fusion Builder sobre
 * WordPress) — confirmado via `curl` puro (sem cookies, sem User-Agent
 * especial, sem JS) durante a inspeção manual desta story: os 11 eventos já
 * vêm prontos no HTML da resposta. Por isso este scraper usa `fetch` +
 * `jsdom`, igual ao padrão da Uhuu (US-S28), sem Playwright.
 *
 * Cada evento é um bloco `div.fusion-builder-row-4-N` (N = índice sequencial
 * por evento na página, confirmado 1..11 na inspeção real) com exatamente 4
 * blocos `.fusion-title` em ordem fixa dentro do texto do card: nome (com
 * link opcional — Ingresso.com para eventos pagos, Google Forms para RSVP de
 * eventos gratuitos, ou nenhum link), data/horário, classificação indicativa
 * ("Classificação: Livre"), descrição. Não há paginação nem "carregar mais"
 * — a programação inteira já está na única página.
 */

import { JSDOM } from "jsdom";
import type { LinhaEnriquecida } from "./types";

export const ECOVILLA_BASE_URL = "https://ecovillarihappy.com.br";
export const ECOVILLA_PROGRAMACAO_URL = `${ECOVILLA_BASE_URL}/programacao/`;
export const ECOVILLA_VENUE = "Teatro EcoVilla Ri Happy";
export const ECOVILLA_BAIRRO = "Jardim Botânico";
export const ECOVILLA_CATEGORIA_ORIGEM = "Teatro Infantil";

export interface EcovillaListingItem {
  nome: string;
  diasApresentacao: string;
  classificacaoRaw: string;
  sinopse: string;
  link: string;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parseia a página de programação e retorna um item por evento.
 *
 * Cada `.fusion-builder-row-4-N` (linha "top-level" do page builder — o
 * seletor exclui as sub-linhas aninhadas dentro de cada card, ex.:
 * `fusion-builder-row-4-1-2`, que não representam eventos novos) tem uma
 * coluna de texto (`.fusion-column-wrapper`) com 4 blocos `.fusion-title`
 * diretos, sempre na mesma ordem: nome, data, classificação, descrição.
 */
export function parseListingPage(html: string): EcovillaListingItem[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const rows = Array.from(doc.querySelectorAll('[class*="fusion-builder-row-4-"]')).filter(
    (el) => /(?:^|\s)fusion-builder-row-4-\d+(?:\s|$)/.test(el.className),
  );

  const items: EcovillaListingItem[] = [];
  for (const row of rows) {
    const textCol = row.querySelector(".fusion-column-wrapper");
    const blocks = textCol ? Array.from(textCol.querySelectorAll(":scope > .fusion-title")) : [];
    if (blocks.length < 4) continue;

    const [nomeBlock, dataBlock, classificacaoBlock, sinopseBlock] = blocks;
    const nome = normalizeWhitespace(nomeBlock.querySelector("p")?.textContent ?? "");
    if (!nome) continue;

    items.push({
      nome,
      diasApresentacao: normalizeWhitespace(dataBlock.querySelector("p")?.textContent ?? ""),
      classificacaoRaw: normalizeWhitespace(classificacaoBlock.querySelector("p")?.textContent ?? ""),
      sinopse: normalizeWhitespace(sinopseBlock.querySelector("p")?.textContent ?? ""),
      link: nomeBlock.querySelector("a")?.getAttribute("href") ?? "",
    });
  }

  return items;
}

/**
 * "Classificação: Livre" → 0-18 (mesma convenção editorial usada em
 * scripts/scraper/parse.ts e scripts/scraper/uhuu.ts). "Classificação: N
 * anos" → mínima N, sem teto declarado. Formato desconhecido → ambos vazios.
 */
export function parseClassificacaoEcovilla(classificacaoRaw: string): {
  idade_minima: string;
  idade_maxima: string;
} {
  const trimmed = classificacaoRaw.replace(/^classifica[cç][aã]o:?\s*/i, "").trim();
  if (/^livre$/i.test(trimmed)) {
    return { idade_minima: "0", idade_maxima: "18" };
  }
  const match = trimmed.match(/^(\d{1,2})\s*anos?$/i);
  if (match) {
    return { idade_minima: match[1], idade_maxima: "" };
  }
  return { idade_minima: "", idade_maxima: "" };
}

/**
 * Link do título só vira url_ingresso quando aponta pra Ingresso.com — o
 * mesmo campo, em eventos gratuitos, costuma linkar pra um formulário de
 * RSVP (ex.: Google Forms), que não é um link de compra de ingresso.
 */
function extractUrlIngresso(link: string): string {
  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, "") === "ingresso.com" ? link : "";
  } catch {
    return "";
  }
}

function buildLinha(item: EcovillaListingItem): LinhaEnriquecida {
  const { idade_minima, idade_maxima } = parseClassificacaoEcovilla(item.classificacaoRaw);

  return {
    nome: item.nome,
    categoria_origem: ECOVILLA_CATEGORIA_ORIGEM,
    venue: ECOVILLA_VENUE,
    bairro: ECOVILLA_BAIRRO,
    dias_apresentacao: item.diasApresentacao,
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: ECOVILLA_PROGRAMACAO_URL,
    sinopse_oficial: item.sinopse,
    horarios_sessao: "",
    duracao_minutos: "",
    idade_minima,
    idade_maxima,
    preco_inteira_centavos: "",
    url_ingresso: extractUrlIngresso(item.link),
  };
}

export interface ScrapeEcovillaOptions {
  listingUrl?: string;
  limit?: number;
  fetchImpl?: typeof fetch;
}

export interface ScrapeEcovillaResult {
  rows: LinhaEnriquecida[];
  stats: {
    totalListados: number;
  };
}

/** Roda o scraper completo: busca a página única de programação e extrai todos os eventos. */
export async function scrapeEcovilla(
  options: ScrapeEcovillaOptions = {},
): Promise<ScrapeEcovillaResult> {
  const listingUrl = options.listingUrl ?? ECOVILLA_PROGRAMACAO_URL;
  const doFetch = options.fetchImpl ?? fetch;

  const res = await doFetch(listingUrl);
  if (!res.ok) {
    throw new Error(`Falha ao buscar ${listingUrl} — status ${res.status}`);
  }
  const html = await res.text();
  const items = parseListingPage(html);
  const selected = options.limit ? items.slice(0, options.limit) : items;

  return {
    rows: selected.map(buildLinha),
    stats: {
      totalListados: items.length,
    },
  };
}
