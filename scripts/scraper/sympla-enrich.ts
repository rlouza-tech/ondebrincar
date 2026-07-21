#!/usr/bin/env tsx
/**
 * sympla-enrich.ts — visita cada página de evento do pre-filter e extrai
 * a descrição completa para enriquecer descricao_raw.
 *
 * Uso:
 *   pnpm sympla-enrich                     # padrão: --headed, delay 2s
 *   pnpm sympla-enrich --delay 3           # delay customizado entre requests
 *   pnpm sympla-enrich --limit 10          # processa só os primeiros N eventos
 *
 * Input:  data/input/sympla-raw-pre-filter.json
 * Output: data/input/sympla-raw-enriquecido.json
 *
 * Log final: "N enriquecidos / N falhas / N sem melhora"
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createBrowserSession, gotoWithRetry } from "./browser";
import { isConteudoInfantil } from "./sympla-scrape";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const INPUT_PATH    = join(process.cwd(), "data", "input", "sympla-raw-pre-filter.json");
const OUTPUT_PATH   = join(process.cwd(), "data", "input", "sympla-raw-enriquecido.json");
export const PENDENTE_PATH = join(process.cwd(), "data", "input", "sympla-revisao-pendente.json");

/**
 * Cache de eventos já classificados como não-infantil com confiança (US-O23):
 * evita revisitar a página de um evento recorrente que já vimos e descartamos
 * antes. Só entra aqui o descarte "confiante" (descrição completa extraída e
 * sem keyword infantil) — o descarte por falha de extração ("sem descrição")
 * nunca é cacheado, porque nesse caso não vimos o conteúdo real da página.
 */
export const DESCARTADOS_PATH = join(process.cwd(), "data", "input", "sympla-descartados.json");

/** Mínimo de chars para considerar a descrição extraída "útil" */
export const MIN_DESCRICAO_CHARS = 150;

/**
 * Seletores candidatos, em ordem de especificidade.
 *
 * Estrutura confirmada via DevTools em sympla.com.br/evento/:
 *   <section data-testid="event-info-section">
 *     <h3 data-testid="event-description-section">Descrição do evento</h3>
 *     <div>  ← irmão seguinte, contém os <p> com o texto real
 *       <p>...</p>
 *     </div>
 *   </section>
 *
 * O data-testid="event-info-section" engloba descrição + info do evento.
 * O data-testid="event-description-section" é o <h3> título — pegamos o
 * conteúdo do nextElementSibling via JS (ver extrairDescricao).
 */
export const DESCRICAO_SELECTORS = [
  // 1. Seletor primário confirmado: div irmão do h3 de descrição
  "[data-testid='event-description-section'] + div",
  // 2. Seção completa de info do evento (inclui descrição + outras infos)
  "[data-testid='event-info-section']",
  // 3. Fallback: qualquer elemento com data-testid contendo "description"
  "[data-testid*='description']",
  // 4. Padrões de class React (hasheadas, menos estáveis)
  "[class*='EventDescription']",
  "[class*='event-description']",
  "[class*='eventDescription']",
  // 5. Último recurso: parágrafos dentro da área principal
  "main p",
  "article p",
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOptions {
  delay: number;
  limit?: number;
}

export function parseArgs(argv = process.argv): CliOptions {
  const opts: CliOptions = { delay: 2 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--delay") {
      const val = Number.parseFloat(argv[i + 1] ?? "");
      if (Number.isNaN(val) || val < 0) {
        throw new Error("--delay precisa ser um número ≥ 0");
      }
      opts.delay = val;
      i++;
    } else if (arg === "--limit") {
      const val = Number.parseInt(argv[i + 1] ?? "", 10);
      if (Number.isNaN(val) || val < 1) {
        throw new Error("--limit precisa ser um inteiro positivo");
      }
      opts.limit = val;
      i++;
    } else {
      throw new Error(
        `Argumento desconhecido: "${arg}"\nUso: pnpm sympla-enrich [--delay N] [--limit N]`
      );
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Parser de descrição — lógica extraível e testável
// ---------------------------------------------------------------------------

/**
 * Recebe o texto bruto extraído de um seletor e normaliza:
 * - colapsa espaços/newlines excessivos
 * - remove artefatos comuns de SSR/SPA
 * - retorna null se o resultado for menor que MIN_DESCRICAO_CHARS
 */
export function parseDescricao(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")          // múltiplos espaços/tabs → 1 espaço
    .replace(/\n{3,}/g, "\n\n")       // mais de 2 newlines → 2
    .replace(/^\s+|\s+$/g, "")        // trim
    // Remove linhas que são puramente UI (ex: "Ver mais", "Compartilhar")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.length === 0) return true; // mantém separadores de parágrafo
      const noise = ["ver mais", "compartilhar", "favoritar", "ingressos", "comprar", "aviso"];
      return !noise.some((n) => t.toLowerCase() === n);
    })
    .join("\n")
    .trim();

  return cleaned.length >= MIN_DESCRICAO_CHARS ? cleaned : null;
}

// ---------------------------------------------------------------------------
// Parsing puro — separado do Playwright para testabilidade (US-S23)
// ---------------------------------------------------------------------------

/**
 * Detecta checkout white-label Bileto (bileto.sympla.com.br/event/ID/...).
 * Nessas páginas não há __NEXT_DATA__ e o conteúdo fica dentro de web
 * components com shadow DOM. Até a US-S51, extrairEndereco falhava em
 * silêncio (US-S40) e marcávamos revisão manual sempre. A partir da US-S51,
 * extrairEnderecoBileto() consegue ler o endereço via page.locator() do
 * Playwright (que atravessa shadow root aberto) — revisão manual só é
 * forçada quando essa extração falha (ver precisaRevisaoManual).
 */
export function isBiletoUrl(url: string): boolean {
  return /bileto\.sympla\.com\.br\/event\/\d+/i.test(url);
}

/**
 * Escolas conhecidas que usam o Sympla para eventos (possivelmente privados).
 * Adicione novos nomes aqui conforme forem identificados.
 */
export const ESCOLAS_CONHECIDAS = ["maple bear", "eleva"] as const;

/**
 * Retorna true se o evento precisa de revisão humana antes de importar:
 * - nome sugere escola/colégio (ou lista de escolas conhecidas)
 * - URL é bileto.sympla.com.br E a extração automática de endereço falhou
 *   (temEndereco = false) — US-S51 só força revisão quando não há endereço.
 */
export function precisaRevisaoManual(nome: string, link = "", temEndereco = false): boolean {
  if (isBiletoUrl(link) && !temEndereco) return true;
  const nomeLower = nome.toLowerCase();
  if (/escola|col[eé]gio/i.test(nome)) return true;
  if (ESCOLAS_CONHECIDAS.some((e) => nomeLower.includes(e))) return true;
  return false;
}

/**
 * Limpa o texto bruto extraído de `.sta-event-venue-address-text` (bileto).
 *
 * Formato observado (US-S51, 3 fixtures reais): quebras de linha e espaços
 * de indentação do template Sympla ao redor de cada parte do endereço, ex.:
 *   "Rua Marques São Vicente , 52 - 3º andar Loja 371,\n   Rio de Janeiro -\n   Rio de Janeiro"
 *
 * Retorna null se o resultado ficar curto demais para ser um endereço real.
 */
export function parseEnderecoBileto(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/[\r\n]+/g, " ")     // quebras de linha → espaço
    .replace(/\s{2,}/g, " ")      // colapsa espaços múltiplos
    .replace(/\s*,\s*/g, ", ")    // normaliza espaçamento ao redor de vírgulas
    .replace(/^\s*,\s*/, "")      // remove vírgula perdida no início
    .replace(/,\s*$/, "")         // remove vírgula sobrando no fim
    .trim();

  return cleaned.length > 5 ? cleaned : null;
}

/**
 * Dado um texto bruto (ex.: innerText de um elemento), extrai padrões "R$ X,XX"
 * e retorna o menor preço em centavos e se há múltiplas faixas de preço.
 *
 * Exportada para testes unitários — não depende do browser.
 *
 * Limites:
 * - Ignora valores ≤ 0 (ex.: R$ 0,00 para ingressos gratuitos — Gemini detecta via texto)
 * - Ignora valores > R$100.000 (limite anti-lixo; valores maiores provavelmente vêm de
 *   CNPJs, telefones ou outros números não monetários que contêm "R$" por coincidência)
 */
export function parsePrecos(text: string): {
  minPriceCents: number | null;
  multiplasFaixas: boolean;
} {
  const matches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/g)];
  const prices: number[] = [];
  for (const m of matches) {
    // "29,90" → "29.90" | "1.000,00" → "1000.00"
    const normalized = m[1].replace(/\./g, "").replace(",", ".");
    const value = Number.parseFloat(normalized);
    if (!Number.isNaN(value) && value > 0 && value <= 100_000) {
      prices.push(Math.round(value * 100));
    }
  }
  if (prices.length === 0) return { minPriceCents: null, multiplasFaixas: false };
  const unique = [...new Set(prices)];
  return { minPriceCents: Math.min(...unique), multiplasFaixas: unique.length > 1 };
}

// ---------------------------------------------------------------------------
// Extração de preços via Playwright (roda no browser)
// ---------------------------------------------------------------------------

/**
 * Extrai preços de uma página de evento Sympla já carregada.
 * Busca padrões "R$ X,XX" no container de tickets.
 * Retorna o menor preço em centavos e se há múltiplas faixas.
 *
 * NOTA (US-S23): Sympla é uma SPA React. O `gotoWithRetry` usa
 * `domcontentloaded`, que dispara antes do React renderizar a seção de
 * ingressos. Aguardamos até 5s pelo primeiro padrão "R$ \d" no innerText
 * antes de correr o page.evaluate(), para não capturar uma página vazia.
 */
export async function extrairPrecos(
  page: import("playwright").Page
): Promise<{ minPriceCents: number | null; multiplasFaixas: boolean }> {
  // Aguarda a SPA renderizar os preços. Timeout generoso de 5s — eventos
  // sem preço visível (esgotado, login obrigatório) terão timeout silencioso.
  try {
    await page.waitForFunction(
      () => /R\$\s*\d/.test(document.body.innerText),
      { timeout: 5_000 },
    );
  } catch {
    // Timeout silencioso — nenhum "R$ X" apareceu na página.
    // Retorno abaixo será { minPriceCents: null, multiplasFaixas: false }.
  }

  return page.evaluate(() => {
    // Tenta escopar a busca à seção de tickets (mais preciso)
    const ticketSelectors = [
      "[data-testid*='ticket']",
      "[data-testid*='lot']",
      "[class*='TicketList']",
      "[class*='ticket-list']",
      "[class*='LotList']",
      // "Escolha uma opção" é o título da seção de tickets no Sympla
      "section:has(h2)",
    ];

    let searchEl: Element = document.body;
    for (const sel of ticketSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) { searchEl = el; break; }
      } catch { /* seletor inválido neste browser */ }
    }

    const text = (searchEl as HTMLElement).innerText ?? "";
    // Lógica espelhada de parsePrecos() — inline pois page.evaluate()
    // roda no contexto do browser e não pode chamar funções Node.js.
    const matches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/g)];
    const prices: number[] = [];
    for (const m of matches) {
      const normalized = m[1].replace(/\./g, "").replace(",", ".");
      const value = Number.parseFloat(normalized);
      if (!Number.isNaN(value) && value > 0 && value <= 100_000) {
        prices.push(Math.round(value * 100));
      }
    }

    if (prices.length === 0) return { minPriceCents: null, multiplasFaixas: false };
    const unique = [...new Set(prices)];
    return { minPriceCents: Math.min(...unique), multiplasFaixas: unique.length > 1 };
  });
}

// ---------------------------------------------------------------------------
// Extração via Playwright (roda no browser)
// ---------------------------------------------------------------------------

/**
 * Tenta extrair a descrição de uma página de evento Sympla já carregada.
 * Itera pelos seletores candidatos e retorna o primeiro texto útil encontrado.
 * Retorna { texto, seletor } ou { texto: null, seletor: null } se falhar.
 */
async function extrairDescricao(
  page: import("playwright").Page
): Promise<{ texto: string | null; seletor: string | null }> {
  const raw = await page.evaluate((selectors: string[]) => {
    // Caso especial: h3 com data-testid="event-description-section" seguido de div
    // O seletor CSS "+ div" nem sempre funciona — tentamos via nextElementSibling
    const h3 = document.querySelector("[data-testid='event-description-section']");
    if (h3) {
      const sibling = h3.nextElementSibling as HTMLElement | null;
      const texto = sibling?.innerText?.trim();
      if (texto && texto.length > 80) {
        return { texto, seletor: "[data-testid='event-description-section'] + sibling" };
      }
    }

    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        const textos = Array.from(els)
          .map((e) => (e as HTMLElement).innerText?.trim())
          .filter((t) => t && t.length > 80);

        if (textos.length > 0) {
          // Concatena parágrafos se forem múltiplos elementos curtos (ex: main p)
          const joined = textos.join("\n\n");
          if (joined.length > 80) return { texto: joined, seletor: sel };
        }
      } catch {
        // seletor inválido neste browser — pula
      }
    }
    return { texto: null, seletor: null };
  }, DESCRICAO_SELECTORS);

  return raw;
}

// ---------------------------------------------------------------------------
// Extração de endereço via Playwright (roda no browser)
// ---------------------------------------------------------------------------

/**
 * Extrai o endereço de uma página bileto.sympla.com.br (checkout white-label).
 *
 * Causa raiz do fracasso anterior (US-S40): a página não é Next.js e o
 * conteúdo vive dentro de web components com shadow DOM aninhado
 * (`<app-page> > <event-page> > <span class="sta-event-venue-address-text">`).
 * `page.evaluate()` + `document.querySelector()` (usado no restante deste
 * arquivo) NÃO atravessa shadow DOM — por isso vinha vazio. `page.locator()`
 * do Playwright atravessa shadow root aberto automaticamente, então
 * conseguimos ler o texto sem escrever um walker manual.
 *
 * A classe `.sta-event-venue-address-text` aparece 2x aninhada na mesma
 * árvore (confirmado nos 3 fixtures da US-S51: 121678, 122583, 123227) — o
 * elemento externo tem "Nome do venue - endereço completo", o interno (mais
 * profundo, por isso `.last()`) só o endereço, sem duplicar o venue (que já
 * vem por outro caminho, o campo `venue` do scraper).
 *
 * Retorna null se o seletor não existir, der timeout, ou o texto limpo ficar
 * curto demais — nesse caso quem chama decide revisão manual (US-S40).
 */
export async function extrairEnderecoBileto(
  page: import("playwright").Page
): Promise<string | null> {
  try {
    const raw = await page
      .locator(".sta-event-venue-address-text")
      .last()
      .innerText({ timeout: 5_000 });
    return parseEnderecoBileto(raw);
  } catch {
    // Seletor ausente, timeout, ou layout diferente do esperado — sem endereço.
    return null;
  }
}

/**
 * Tenta extrair o endereço do venue de uma página de evento Sympla já carregada.
 *
 * Estratégia em cascata:
 * 0. Se a URL for bileto.sympla.com.br (US-S51) — delega para extrairEnderecoBileto,
 *    que usa page.locator() (atravessa shadow DOM) em vez de page.evaluate().
 * 1. window.__NEXT_DATA__ — dados de hidratação do Next.js (mais confiável, estruturado)
 * 2. DOM selectors — fallback para elementos visíveis na página
 *
 * Retorna null se não encontrar ou se o texto parecer genérico/inútil.
 */
export async function extrairEndereco(
  page: import("playwright").Page,
  url?: string
): Promise<string | null> {
  if (url && isBiletoUrl(url)) {
    return extrairEnderecoBileto(page);
  }

  return page.evaluate(() => {
    // --- Estratégia 1: __NEXT_DATA__ ---
    // Caminho real confirmado via debug: props.pageProps.hydrationData.eventHydration.event.eventsAddress
    // Campos: address (rua), addressNum (número), addressAlt (complemento), neighborhood (bairro)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nd = (window as any).__NEXT_DATA__;
      const pageProps = nd?.props?.pageProps ?? {};

      // Caminho confirmado (Sympla ≥ 2024)
      const eventsAddress =
        pageProps.hydrationData?.eventHydration?.event?.eventsAddress;

      if (eventsAddress && typeof eventsAddress === "object") {
        const rua = eventsAddress.address?.trim() ?? "";
        const num = eventsAddress.addressNum?.trim() ?? "";
        const comp = eventsAddress.addressAlt?.trim() ?? "";
        const bairro = eventsAddress.neighborhood?.trim() ?? "";

        const streetPart = [rua, num].filter(Boolean).join(", ");
        const rest = [comp, bairro].filter(Boolean).join(" — ");
        const full = [streetPart, rest].filter(Boolean).join(" — ");
        if (full.length > 5) return full;
      }

      // Fallback: estruturas alternativas (versões antigas ou outros endpoints)
      const altEv =
        pageProps.event ??
        pageProps.initialData?.event ??
        pageProps.eventData?.event;

      if (altEv) {
        const a = altEv.address ?? altEv.location?.address ?? altEv.venue?.address;
        if (a && typeof a === "object") {
          const street = a.street?.trim() ?? a.logradouro?.trim() ?? "";
          const number = a.number ?? a.numero ?? "";
          const complement = a.complement ?? a.complemento ?? "";
          const neighborhood = a.neighborhood ?? a.bairro ?? a.district ?? "";

          const streetPart = [street, number].filter(Boolean).join(", ");
          const rest = [complement, neighborhood].filter(Boolean).join(" — ");
          const full = [streetPart, rest].filter(Boolean).join(" — ");
          if (full.length > 5) return full;
        }
        const locStr = altEv.location?.name ?? altEv.venue?.name ?? altEv.local;
        if (typeof locStr === "string" && locStr.length > 5 && locStr.length < 200) {
          return locStr;
        }
      }
    } catch {
      // __NEXT_DATA__ ausente ou estrutura inesperada — segue para fallback
    }

    // --- Estratégia 2: DOM selectors ---
    const selectors = [
      "[data-testid='event-address']",
      "[data-testid*='location'] address",
      "[data-testid*='venue'] address",
      "[class*='EventLocation'] address",
      "[class*='EventAddress']",
      "address",
    ];

    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel) as HTMLElement | null;
        const text = el?.innerText?.trim()
          .replace(/\s*\n\s*/g, ", ")
          .replace(/,\s*,/g, ",")
          .trim();
        if (text && text.length > 5 && text.length < 300) return text;
      } catch {
        // seletor inválido — próximo
      }
    }

    return null;
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface SymplarRawEvent {
  nome: string;
  venue: string;
  data: string;
  link: string;
  descricao_raw: string;
  preco_raw: string;
  revisao_manual?: boolean;
  /** Menor preço disponível na página do evento (em centavos). Vazio se não detectado. */
  preco_inteira_centavos?: string;
  /** true quando há múltiplas faixas de preço (lotes, meia/inteira, etc.). */
  preco_a_partir?: boolean;
  /** Endereço completo do venue extraído da página do evento. */
  endereco?: string;
}

// ---------------------------------------------------------------------------
// Cache de descartados (US-O23) — separado do Playwright para testabilidade
// ---------------------------------------------------------------------------

export interface DescartadoEntry {
  link: string;
  nome: string;
  descartado_em: string;
}

/** Faz parse do JSON do cache de descartados. Retorna [] se o arquivo não existir ou vier inválido. */
export function parseDescartadosCache(raw: string | null): DescartadoEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Funde os descartados carregados do disco com os novos descartes confiantes
 * desta rodada, deduplicando por link (novo entra, mantém 1 entrada por link).
 */
export function mergeDescartados(
  existentes: DescartadoEntry[],
  novos: DescartadoEntry[],
): DescartadoEntry[] {
  const porLink = new Map<string, DescartadoEntry>();
  for (const e of existentes) porLink.set(e.link, e);
  for (const n of novos) porLink.set(n.link, n);
  return [...porLink.values()];
}

/**
 * Decide o destino de um evento cuja tentativa de enrich lançou exceção (rede, timeout,
 * bloqueio anti-bot em burst de requisições etc.) — nunca vimos a descrição real da
 * página, só o stub do pre-filter (`ev`). Mesma regra da falha "sem seletor" (nenhuma
 * exceção, mas texto extraído < MIN_DESCRICAO_CHARS): aplica o filtro de conteúdo
 * infantil sobre o stub antes de aceitar, e marca revisão manual pelas mesmas regras
 * de sempre. Sem isso, uma falha transiente aprovava o evento cru sem checagem alguma.
 */
export function decidirAposFalhaDeEnrich(
  ev: SymplarRawEvent,
): { descarta: true } | { descarta: false; evFinal: SymplarRawEvent; revisaoManual: boolean } {
  if (!isConteudoInfantil(ev.nome, ev.descricao_raw)) {
    return { descarta: true };
  }
  const revisaoManual = precisaRevisaoManual(ev.nome, ev.link, Boolean(ev.endereco));
  const evFinal = revisaoManual ? { ...ev, revisao_manual: true } : ev;
  return { descarta: false, evFinal, revisaoManual };
}

async function main() {
  const opts = parseArgs();

  // Lê input
  let eventos: SymplarRawEvent[];
  try {
    eventos = JSON.parse(readFileSync(INPUT_PATH, "utf-8")) as SymplarRawEvent[];
  } catch (e) {
    console.error(`\n❌ Não foi possível ler ${INPUT_PATH}`);
    console.error("   Execute pnpm sympla-scrape primeiro para gerar o pre-filter.");
    process.exit(1);
  }

  const alvo = opts.limit ? eventos.slice(0, opts.limit) : eventos;

  // Carrega cache de descartados confiantes (US-O23) — evita revisitar página
  // de evento recorrente já classificado como não-infantil em rodada anterior.
  let descartadosSalvos: DescartadoEntry[] = [];
  try {
    descartadosSalvos = parseDescartadosCache(readFileSync(DESCARTADOS_PATH, "utf-8"));
  } catch {
    descartadosSalvos = [];
  }
  const linksDescartados = new Set(descartadosSalvos.map((d) => d.link));
  const novosDescartados: DescartadoEntry[] = [];

  console.log("\n=== Sympla Enricher ===");
  console.log(`Input:   ${INPUT_PATH} (${eventos.length} eventos)`);
  console.log(`Alvo:    ${alvo.length} eventos`);
  console.log(`Cache:   ${DESCARTADOS_PATH} (${linksDescartados.size} descartados conhecidos)`);
  console.log(`Delay:   ${opts.delay}s entre requisições`);
  console.log(`Output:  ${OUTPUT_PATH}\n`);

  // Sempre --headed: Sympla bloqueia headless com captcha
  const { browser, page } = await createBrowserSession(true);

  let nEnriquecidos = 0;
  let nFalhas = 0;
  let nSemMelhora = 0;
  let nDescartados = 0;
  let nRevisao = 0;
  let nPulados = 0;

  const resultados: SymplarRawEvent[] = [];

  try {
    for (let i = 0; i < alvo.length; i++) {
      const ev = alvo[i];
      process.stdout.write(`[${i + 1}/${alvo.length}] ${ev.nome.substring(0, 60)}... `);

      if (linksDescartados.has(ev.link)) {
        process.stdout.write("⏭ pulado (já descartado antes, não-infantil)\n");
        nPulados++;
        continue;
      }

      try {
        await gotoWithRetry(page, ev.link, 25_000);

        const { texto, seletor } = await extrairDescricao(page);
        const descricaoLimpa = parseDescricao(texto);
        const { minPriceCents, multiplasFaixas } = await extrairPrecos(page);
        const enderecoExtraido = await extrairEndereco(page, ev.link);

        // Campos extras extraídos da página do evento
        const precoExtra: Pick<SymplarRawEvent, "preco_inteira_centavos" | "preco_a_partir" | "endereco"> = {
          ...(minPriceCents !== null ? { preco_inteira_centavos: String(minPriceCents) } : {}),
          preco_a_partir: multiplasFaixas,
          ...(enderecoExtraido ? { endereco: enderecoExtraido } : {}),
        };

        if (descricaoLimpa) {
          const evEnriquecido = descricaoLimpa.length > ev.descricao_raw.length
            ? { ...ev, descricao_raw: descricaoLimpa, ...precoExtra }
            : { ...ev, ...precoExtra };

          if (!isConteudoInfantil(evEnriquecido.nome, evEnriquecido.descricao_raw)) {
            process.stdout.write(`🚫 descartado (não infantil)\n`);
            nDescartados++;
            novosDescartados.push({
              link: ev.link,
              nome: ev.nome,
              descartado_em: new Date().toISOString(),
            });
          } else {
            const revisao = precisaRevisaoManual(
              evEnriquecido.nome,
              evEnriquecido.link,
              Boolean(evEnriquecido.endereco)
            );
            const evFinal = revisao ? { ...evEnriquecido, revisao_manual: true } : evEnriquecido;
            if (descricaoLimpa.length > ev.descricao_raw.length) {
              const precoLog = minPriceCents ? ` R$${(minPriceCents/100).toFixed(0)}${multiplasFaixas ? "+" : ""}` : "";
              const biletoLog = isBiletoUrl(ev.link) ? " (bileto)" : "";
              process.stdout.write(`✅ (${seletor}, ${descricaoLimpa.length} chars${precoLog})${revisao ? ` 🔍 revisão manual${biletoLog}` : ""}\n`);
              nEnriquecidos++;
            } else {
              const biletoLog = isBiletoUrl(ev.link) ? " (bileto)" : "";
              process.stdout.write(`→ sem melhora${revisao ? ` 🔍 revisão manual${biletoLog}` : ""}\n`);
              nSemMelhora++;
            }
            resultados.push(evFinal);
            if (revisao) nRevisao++;
          }
        } else {
          // Sem descrição extraída: aplica filtro na descrição original
          if (!isConteudoInfantil(ev.nome, ev.descricao_raw)) {
            process.stdout.write(`🚫 descartado (não infantil, sem descrição)\n`);
            nDescartados++;
          } else {
            const revisao = precisaRevisaoManual(ev.nome, ev.link, Boolean(precoExtra.endereco));
            const evFinal = revisao ? { ...ev, ...precoExtra, revisao_manual: true } : { ...ev, ...precoExtra };
            const biletoLog = isBiletoUrl(ev.link) ? " (bileto)" : "";
            process.stdout.write(`⚠ nenhum seletor retornou ≥${MIN_DESCRICAO_CHARS} chars${revisao ? ` 🔍 revisão manual${biletoLog}` : ""}\n`);
            resultados.push(evFinal);
            nFalhas++;
            if (revisao) nRevisao++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        const decisao = decidirAposFalhaDeEnrich(ev);
        if (decisao.descarta) {
          process.stdout.write(`🚫 descartado (não infantil, falha: ${msg})\n`);
          nDescartados++;
        } else {
          const biletoLog = isBiletoUrl(ev.link) ? " (bileto)" : "";
          process.stdout.write(`❌ ${msg}${decisao.revisaoManual ? ` 🔍 revisão manual${biletoLog}` : ""}\n`);
          resultados.push(decisao.evFinal);
          nFalhas++;
          if (decisao.revisaoManual) nRevisao++;
        }
      }

      // Delay entre requisições (exceto na última)
      if (i < alvo.length - 1 && opts.delay > 0) {
        await page.waitForTimeout(opts.delay * 1000);
      }
    }

    // Separa aprovados dos pendentes de revisão
    const aprovados  = resultados.filter((e) => !e.revisao_manual);
    const pendentes  = resultados.filter((e) => e.revisao_manual);

    // Salva aprovados
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(aprovados, null, 2), "utf-8");

    // Salva pendentes (se houver)
    if (pendentes.length > 0) {
      writeFileSync(PENDENTE_PATH, JSON.stringify(pendentes, null, 2), "utf-8");
    }

    // Persiste cache de descartados (US-O23) — funde com o que já existia no disco.
    if (novosDescartados.length > 0) {
      const descartadosFinal = mergeDescartados(descartadosSalvos, novosDescartados);
      writeFileSync(DESCARTADOS_PATH, JSON.stringify(descartadosFinal, null, 2), "utf-8");
    }

    // Log final
    console.log(`\n${"─".repeat(50)}`);
    console.log(`✅  ${nEnriquecidos} enriquecidos / ${nSemMelhora} sem melhora / ${nFalhas} falhas / ${nDescartados} descartados (não infantil) / ${nPulados} pulados (cache) / ${nRevisao} para revisão manual`);
    console.log(`📄  Aprovados: ${OUTPUT_PATH} (${aprovados.length} eventos)`);
    if (novosDescartados.length > 0) {
      console.log(`🗑️  Cache de descartados: ${DESCARTADOS_PATH} (+${novosDescartados.length} novo(s), ${linksDescartados.size + novosDescartados.length} total)`);
    }
    if (pendentes.length > 0) {
      console.log(`🔍  Revisão pendente: ${PENDENTE_PATH} (${pendentes.length} eventos)`);
      console.log(`    → rode pnpm sympla-aprovar para revisar e aprovar`);
    }
    console.log("─".repeat(50) + "\n");

  } finally {
    await browser.close();
  }
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
