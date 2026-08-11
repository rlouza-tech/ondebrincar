/**
 * Scraper — Uhuu (US-S28)
 *
 * Diferente do Clubinho (SPA com API interna) e do Sympla (SPA hidratada via
 * __NEXT_DATA__), a Uhuu é renderizada 100% no servidor: uma requisição HTTP
 * simples (sem JS, sem Playwright) já retorna o HTML final com todos os
 * eventos. Confirmado via `curl` puro (sem cookies, sem User-Agent especial)
 * durante a investigação técnica desta story — ver
 * docs/discovery/DISCOVERY-2026-07-22-scraper-uhuu.md. Por isso este scraper
 * usa `fetch` + `jsdom`, não `browser.ts` (Playwright) — mais rápido e sem a
 * complexidade de sessão/retry que Clubinho e Sympla precisam para contornar
 * proteção anti-bot que a Uhuu não tem.
 *
 * Cada card de listagem embute um payload de analytics (`gtag('event',
 * 'select_item', ...)`) com dados estruturados (nome, venue, cidade, UF,
 * data, hora, preço, classificação indicativa) — não precisamos parsear
 * texto solto para esses campos, só para sinopse/duração, que exigem
 * visitar a página do evento.
 */

import { JSDOM } from "jsdom";
import { GEOCODING_DELAY_MS, reverseGeocodeUhuu } from "./geocoding";
import type { ReverseGeocodeResult } from "./geocoding";
import { extractDuracaoMinutos, isLocalizacaoRioDeJaneiro } from "./parse";
import type { LinhaEnriquecida } from "./types";

export const UHUU_BASE_URL = "https://uhuu.com";
export const UHUU_CATEGORY_URL = `${UHUU_BASE_URL}/categoria/familia-infantil-11`;

const MAX_PAGES = 20;
const DEFAULT_DELAY_MS = 400;

export interface UhuuListingItem {
  url: string;
  nome: string;
  venue: string;
  cidade: string;
  uf: string;
  data: string;
  hora: string;
  precoRaw: string;
  parentalRating: string;
}

export interface UhuuEventDetail {
  categoria_origem: string;
  sinopse_oficial: string;
  duracao_minutos: string;
  latitude: string;
  longitude: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * O payload do gtag vem de template SSR e pode conter entidades HTML sem
 * decodificar (ex.: "Maria Clara &amp; JP" em vez de "Maria Clara & JP",
 * confirmado em execução real contra o site — ver DISCOVERY desta story).
 * Decodifica usando o próprio parser HTML do jsdom em vez de reimplementar
 * uma tabela de entidades.
 */
function decodeHtmlEntities(doc: Document, text: string): string {
  const el = doc.createElement("div");
  el.innerHTML = text;
  return el.textContent ?? text;
}

function extractGtagField(doc: Document, scriptText: string, key: string): string {
  const match = scriptText.match(new RegExp(`${key}:\\s*'([^']*)'`));
  return match ? decodeHtmlEntities(doc, match[1].trim()) : "";
}

/** Parseia a página de listagem (categoria) e retorna um item por card. */
export function parseListingPage(html: string): UhuuListingItem[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const cards = Array.from(doc.querySelectorAll(".item.card-evento"));

  const items: UhuuListingItem[] = [];
  for (const card of cards) {
    const anchor = card.querySelector("a.link");
    const href = anchor?.getAttribute("href") ?? "";
    if (!href) continue;

    const cardHtml = card.outerHTML;
    const nome = extractGtagField(doc, cardHtml, "item_name");
    if (!nome) continue;

    items.push({
      url: href.startsWith("http") ? href : `${UHUU_BASE_URL}${href}`,
      nome,
      venue: extractGtagField(doc, cardHtml, "local_nome"),
      cidade: extractGtagField(doc, cardHtml, "local_cidade"),
      uf: extractGtagField(doc, cardHtml, "local_uf"),
      data: extractGtagField(doc, cardHtml, "event_date"),
      hora: extractGtagField(doc, cardHtml, "event_hour"),
      precoRaw: extractGtagField(doc, cardHtml, "price"),
      parentalRating: extractGtagField(doc, cardHtml, "parental_rating"),
    });
  }

  return items;
}

/**
 * Classificação indicativa → faixa etária, mesma convenção editorial usada
 * em scripts/scraper/parse.ts ("Livre" → teto de 18 anos, não 0-0).
 */
export function parseParentalRating(rating: string): {
  idade_minima: string;
  idade_maxima: string;
} {
  const trimmed = rating.trim();
  if (/^livre$/i.test(trimmed)) {
    return { idade_minima: "0", idade_maxima: "18" };
  }
  const match = trimmed.match(/^(\d{1,2})\s*anos?$/i);
  if (match) {
    return { idade_minima: match[1], idade_maxima: "" };
  }
  return { idade_minima: "", idade_maxima: "" };
}

/** "40,00" → "4000" (centavos). Retorna "" se não conseguir parsear. */
export function parsePrecoCentavos(precoRaw: string): string {
  const normalized = precoRaw.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? String(Math.round(parsed * 100)) : "";
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Extrai a sinopse do bloco "Sobre" — tudo antes de "Informações importantes"
 * ou "Classificação indicativa", sem a linha de logística ("Abertura da casa").
 */
export function extractSinopseUhuu(sobreText: string): string {
  const semAbertura = sobreText.replace(/abertura da casa:?[^.]*\.?/i, "");
  const cortado = semAbertura.split(/informa[cç][oõ]es importantes|classifica[cç][aã]o indicativa/i)[0];
  return normalizeWhitespace(cortado).slice(0, 1200);
}

/**
 * Extrai lat/long do link "Ver localização" do Google Maps — único ponto onde
 * a Uhuu expõe geolocalização (nunca endereço em texto, ver DISCOVERY desta
 * story). Formato confirmado em execução real: href
 * "https://www.google.com/maps/place/-22.9663958,-43.1875042".
 */
function extractCoordenadas(doc: Document): { latitude: string; longitude: string } {
  const href = doc.querySelector('a[href*="google.com/maps/place/"]')?.getAttribute("href") ?? "";
  const match = href.match(/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/);
  return { latitude: match?.[1] ?? "", longitude: match?.[2] ?? "" };
}

/** Parseia a página de um evento e retorna os campos só disponíveis ali (sinopse, duração, categoria, coordenadas). */
export function parseEventDetail(html: string): UhuuEventDetail {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const categoria_origem = normalizeWhitespace(
    doc.querySelector(".event-category")?.textContent ?? "",
  );
  const sobreRaw = doc.querySelector(".tabs-content-item.sobre")?.textContent ?? "";
  const sobreNormalizado = normalizeWhitespace(sobreRaw);
  const { latitude, longitude } = extractCoordenadas(doc);

  return {
    categoria_origem,
    sinopse_oficial: extractSinopseUhuu(sobreRaw),
    duracao_minutos: extractDuracaoMinutos(sobreNormalizado, ""),
    latitude,
    longitude,
  };
}

function buildLinha(
  item: UhuuListingItem,
  detail: UhuuEventDetail,
  geo: ReverseGeocodeResult,
): LinhaEnriquecida {
  const { idade_minima, idade_maxima } = parseParentalRating(item.parentalRating);
  const precoCentavos = parsePrecoCentavos(item.precoRaw);

  return {
    nome: item.nome,
    categoria_origem: detail.categoria_origem || "Família / Infantil",
    venue: item.venue,
    bairro: geo.bairro,
    dias_apresentacao: [item.data, item.hora ? `às ${item.hora}` : ""].filter(Boolean).join(" "),
    desconto_percentual: "",
    preco_bruto: precoCentavos ? `a partir de R$${item.precoRaw}` : "",
    url_origem: item.url,
    sinopse_oficial: detail.sinopse_oficial,
    horarios_sessao: "",
    duracao_minutos: detail.duracao_minutos,
    idade_minima,
    idade_maxima,
    preco_inteira_centavos: precoCentavos,
    url_ingresso: item.url,
    preco_a_partir: true,
    ...(geo.endereco ? { endereco: geo.endereco } : {}),
  };
}

export interface ScrapeUhuuOptions {
  categoryUrl?: string;
  limit?: number;
  delayMs?: number;
  fetchImpl?: typeof fetch;
  /** Fetch usado pra chamar o Nominatim — separado de fetchImpl (uhuu.com) pra facilitar teste isolado. */
  geocodeFetchImpl?: typeof fetch;
  /** Intervalo entre chamadas de geocoding (default: GEOCODING_DELAY_MS, respeita política do Nominatim). */
  geocodeDelayMs?: number;
}

export interface ScrapeUhuuStats {
  totalListados: number;
  totalRj: number;
  totalComDetalhe: number;
}

export interface ScrapeUhuuResult {
  rows: LinhaEnriquecida[];
  stats: ScrapeUhuuStats;
}

/** Roda o scraper completo: listagem paginada → filtro RJ → enriquecimento por evento. */
export async function scrapeUhuu(options: ScrapeUhuuOptions = {}): Promise<ScrapeUhuuResult> {
  const categoryUrl = options.categoryUrl ?? UHUU_CATEGORY_URL;
  const doFetch = options.fetchImpl ?? fetch;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const geocodeFetch = options.geocodeFetchImpl ?? fetch;
  const geocodeDelayMs = options.geocodeDelayMs ?? GEOCODING_DELAY_MS;

  const allItems: UhuuListingItem[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${categoryUrl}?page=${page}`;
    const res = await doFetch(url);
    if (!res.ok) break;
    const html = await res.text();
    const items = parseListingPage(html);
    if (items.length === 0) break;
    allItems.push(...items);
  }

  const seen = new Set<string>();
  const uniqueItems = allItems.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  const rjItems = uniqueItems.filter((item) =>
    isLocalizacaoRioDeJaneiro(`${item.venue} - ${item.cidade}, ${item.uf}`),
  );

  const selected = options.limit ? rjItems.slice(0, options.limit) : rjItems;

  const rows: LinhaEnriquecida[] = [];
  for (const item of selected) {
    let detail: UhuuEventDetail = {
      categoria_origem: "",
      sinopse_oficial: "",
      duracao_minutos: "",
      latitude: "",
      longitude: "",
    };
    try {
      const res = await doFetch(item.url);
      if (res.ok) {
        detail = parseEventDetail(await res.text());
      } else {
        console.warn(`[uhuu] status ${res.status} ao buscar "${item.nome}" (${item.url}) — sem sinopse/duração.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[uhuu] falha ao buscar "${item.nome}" (${item.url}) — ${msg}`);
    }

    let geo: ReverseGeocodeResult = { bairro: "", endereco: "" };
    if (detail.latitude && detail.longitude) {
      geo = await reverseGeocodeUhuu(detail.latitude, detail.longitude, geocodeFetch);
      if (geocodeDelayMs > 0) {
        await delay(geocodeDelayMs);
      }
    }

    rows.push(buildLinha(item, detail, geo));
    if (delayMs > 0) {
      await delay(delayMs);
    }
  }

  return {
    rows,
    stats: {
      totalListados: uniqueItems.length,
      totalRj: rjItems.length,
      totalComDetalhe: rows.length,
    },
  };
}
