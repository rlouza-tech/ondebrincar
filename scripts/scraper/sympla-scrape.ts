#!/usr/bin/env tsx
/**
 * sympla-scrape.ts — scraper de produção para eventos infantis no RJ (Sympla)
 *
 * Uso:
 *   pnpm sympla-scrape                   # headless, todos os eventos
 *   pnpm sympla-scrape --limit 20        # limita a 20 eventos (teste)
 *   pnpm sympla-scrape --headed          # abre janela visível (debug / bypass bot)
 *   pnpm sympla-scrape --headed --limit 5
 *
 * Output: data/input/sympla-raw.json
 *
 * Campos por evento: nome, venue, data, link, descricao_raw, preco_raw
 *
 * Filtros aplicados:
 *   - Eventos com data expirada são descartados
 *   - Venues fora do município do Rio de Janeiro são descartados (isLocalizacaoRioDeJaneiro)
 *
 * Log final: "N coletados / N descartados (motivo)"
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createBrowserSession, gotoWithRetry } from "./browser";
import { isLocalizacaoRioDeJaneiro } from "./parse";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SYMPLA_URL =
  "https://www.sympla.com.br/eventos/infantil?state=RJ";

const OUTPUT_PATH = join(process.cwd(), "data", "input", "sympla-raw.json");

/** Quanto descer por iteração de scroll (px) */
const SCROLL_STEP = 1200;

/** Quantas iterações de scroll sem novos eventos antes de parar */
const MAX_IDLE_SCROLLS = 4;

/** Timeout por tentativa de seletor (ms) */
const SELECTOR_TIMEOUT_MS = 15_000;

// Seletores candidatos para links de evento na Sympla (React SPA)
const EVENT_LINK_SELECTORS = [
  'a[href*="/evento/"]',
  'a[href*=".sympla.com.br/"]',
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOptions {
  headed: boolean;
  limit?: number;
}

function parseArgs(): CliOptions {
  const opts: CliOptions = { headed: false };
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--headed") {
      opts.headed = true;
    } else if (arg === "--limit") {
      const val = Number.parseInt(process.argv[i + 1] ?? "", 10);
      if (Number.isNaN(val) || val < 1) {
        throw new Error("--limit precisa ser um número inteiro positivo");
      }
      opts.limit = val;
      i++;
    } else {
      throw new Error(
        `Argumento desconhecido: "${arg}"\nUso: pnpm sympla-scrape [--headed] [--limit N]`
      );
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Parsing de data em pt-BR
// ---------------------------------------------------------------------------

const MESES: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  janeiro: 0, fevereiro: 1, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

/**
 * Tenta extrair uma Date de um texto como "25 mai 2026", "25/05/2026",
 * "25 de maio de 2026", "até 30 jun". Retorna null se não conseguir.
 */
function parseDatePtBr(text: string): Date | null {
  if (!text) return null;

  // ISO ou DD/MM/YYYY
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  const dmy = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));

  // "25 mai" / "25 de maio" / "25 mai 2026"
  const ptbr = text
    .toLowerCase()
    .match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúâêôãõç]+)(?:\s+(?:de\s+)?(\d{4}))?/);
  if (ptbr) {
    const day = Number(ptbr[1]);
    const mes = MESES[ptbr[2]];
    if (mes !== undefined) {
      const year = ptbr[3] ? Number(ptbr[3]) : new Date().getFullYear();
      return new Date(year, mes, day);
    }
  }

  return null;
}

/**
 * Retorna true se o texto de data indica que o evento ainda está no futuro
 * (ou se não conseguiu parsear — benefício da dúvida).
 */
function isEventoAtivo(dataTexto: string): boolean {
  if (!dataTexto) return true;

  // Tenta extrair a última data do texto (para intervalos "10 mai a 30 jun")
  const partes = dataTexto.split(/\ba\b|até|–|-/i);
  const dataRef = partes[partes.length - 1].trim();
  const data = parseDatePtBr(dataRef) ?? parseDatePtBr(dataTexto);

  if (!data) return true; // não soube parsear → não descarta

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return data >= hoje;
}

// ---------------------------------------------------------------------------
// Extração de cards
// ---------------------------------------------------------------------------

export interface SymplarRawEvent {
  nome: string;
  venue: string;
  data: string;
  link: string;
  descricao_raw: string;
  preco_raw: string;
}

/**
 * Extrai todos os cards de evento visíveis no DOM atual.
 * Executado dentro do contexto do navegador via page.evaluate().
 */
function extractCards(): SymplarRawEvent[] {
  // Esta função roda no browser — sem imports Node.
  const results: SymplarRawEvent[] = [];
  const seen = new Set<string>();

  // Sympla usa links /evento/slug — filtrar links de menu/header
  const anchors = Array.from(
    document.querySelectorAll('a[href*="/evento/"]')
  ) as HTMLAnchorElement[];

  for (const a of anchors) {
    const href = a.getAttribute("href") ?? "";
    if (!href) continue;

    const link = href.startsWith("http")
      ? href
      : `https://www.sympla.com.br${href}`;

    // Só links que parecem páginas de evento (contêm slug após /evento/)
    if (!/\/evento\/[^/]+/.test(link)) continue;
    if (seen.has(link)) continue;
    seen.add(link);

    // Nome: título explícito, aria-label, ou primeiro texto substancial
    const nome =
      (a.querySelector('[class*="itle"], [class*="ame"], h2, h3, h4') as HTMLElement | null)
        ?.innerText?.trim() ||
      a.getAttribute("aria-label")?.trim() ||
      a.innerText?.trim().split("\n")[0]?.trim() ||
      "";

    // Data
    const data =
      (a.querySelector('[class*="ate"], [class*="ata"], time, [class*="hen"], [class*="period"]') as HTMLElement | null)
        ?.innerText?.trim() || "";

    // Venue / local
    const venue =
      (a.querySelector('[class*="ocation"], [class*="ocal"], [class*="enue"], [class*="here"], [class*="place"]') as HTMLElement | null)
        ?.innerText?.trim() || "";

    // Preço
    const preco_raw =
      (a.querySelector('[class*="rice"], [class*="reco"], [class*="alor"], [class*="icket"], [class*="price"]') as HTMLElement | null)
        ?.innerText?.trim() || "";

    // Descrição bruta = todo o texto do card (sem duplicar nome)
    const descricao_raw = a.innerText?.trim().substring(0, 400) || "";

    if (!nome && descricao_raw.length < 10) continue;

    // Fallback: se venue/data não vieram dos seletores CSS, extrai do descricao_raw.
    // Formato observado na Sympla: "Nome\n\nVenue - Cidade, Estado\n\nData"
    let venueResolved = venue;
    let dataResolved = data;
    if (!venueResolved || !dataResolved) {
      const partes = descricao_raw.split(/\n{1,2}/).map((s) => s.trim()).filter(Boolean);
      // partes[0] = nome, partes[1] = venue+cidade, partes[2] = data
      if (!venueResolved && partes.length >= 2) venueResolved = partes[1] ?? "";
      if (!dataResolved && partes.length >= 3) dataResolved = partes[2] ?? "";
    }

    results.push({ nome, venue: venueResolved, data: dataResolved, link, descricao_raw, preco_raw });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Scroll incremental para carregar mais eventos (lazy load / infinite scroll)
// ---------------------------------------------------------------------------

async function scrollAndCollect(
  page: import("playwright").Page,
  limit?: number
): Promise<SymplarRawEvent[]> {
  let allEvents: SymplarRawEvent[] = [];
  let idleCount = 0;

  console.log("Aguardando primeiro lote de eventos...");

  // Espera qualquer link de evento aparecer
  let foundSelector = false;
  for (const sel of EVENT_LINK_SELECTORS) {
    try {
      await page.waitForSelector(sel, { timeout: SELECTOR_TIMEOUT_MS });
      foundSelector = true;
      break;
    } catch {
      // próximo
    }
  }

  if (!foundSelector) {
    const snippet = await page.evaluate(() =>
      document.body?.innerHTML?.substring(0, 1000)
    );
    console.error(
      "\nNenhum seletor encontrou eventos após " +
      `${SELECTOR_TIMEOUT_MS / 1000}s.\n` +
      "Se estiver rodando headless, tente --headed.\n\n" +
      "HTML snippet:\n" + snippet
    );
    return [];
  }

  // Loop de scroll
  while (true) {
    const batch = await page.evaluate(extractCards);
    const seen = new Set(allEvents.map((e) => e.link));
    const novos = batch.filter((e) => !seen.has(e.link));

    if (novos.length === 0) {
      idleCount++;
      if (idleCount >= MAX_IDLE_SCROLLS) break;
    } else {
      idleCount = 0;
      allEvents = [...allEvents, ...novos];
      process.stdout.write(`\rEventos capturados até agora: ${allEvents.length}   `);
    }

    if (limit && allEvents.length >= limit) break;

    // Verifica se chegou ao fim da página
    const atBottom = await page.evaluate(
      () => window.scrollY + window.innerHeight >= document.body.scrollHeight - 100
    );
    if (atBottom && idleCount >= 1) break;

    await page.evaluate((step) => window.scrollBy(0, step), SCROLL_STEP);
    await page.waitForTimeout(1200);
  }

  process.stdout.write("\n");
  return allEvents;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  console.log("\n=== Sympla Scraper ===");
  console.log(`URL:    ${SYMPLA_URL}`);
  console.log(`Modo:   ${opts.headed ? "headed (visível)" : "headless"}`);
  console.log(`Limite: ${opts.limit ?? "sem limite"}`);
  console.log(`Output: ${OUTPUT_PATH}\n`);

  const { browser, page } = await createBrowserSession(opts.headed);

  const descartados: Array<{ link: string; motivo: string }> = [];

  try {
    await gotoWithRetry(page, SYMPLA_URL, 25_000);
    console.log("Página carregada. Iniciando coleta...\n");

    const raw = await scrollAndCollect(page, opts.limit);

    if (raw.length === 0) {
      console.error(
        "\n❌ Nenhum evento coletado.\n" +
        "Dica: rode com --headed para verificar se a Sympla exibe um captcha ou tela de bloqueio."
      );
      await browser.close();
      process.exit(1);
    }

    // Aplica limite se ainda não aplicado (pode ter sobrado mais do que o limite por causa do batch)
    const candidatos = opts.limit ? raw.slice(0, opts.limit) : raw;

    // Filtragem
    const aceitos: SymplarRawEvent[] = [];

    for (const ev of candidatos) {
      if (!isEventoAtivo(ev.data)) {
        descartados.push({ link: ev.link, motivo: "expirado" });
        continue;
      }
      if (!isLocalizacaoRioDeJaneiro(ev.venue)) {
        descartados.push({ link: ev.link, motivo: "fora do RJ" });
        continue;
      }
      aceitos.push(ev);
    }

    // Salva output
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(aceitos, null, 2), "utf-8");

    // Log final
    console.log(`\n${"─".repeat(50)}`);
    console.log(`✅  ${aceitos.length} coletados / ${descartados.length} descartados`);
    if (descartados.length > 0) {
      const expirados = descartados.filter((d) => d.motivo === "expirado").length;
      const foraRj = descartados.filter((d) => d.motivo === "fora do RJ").length;
      if (expirados > 0) console.log(`    ↳ ${expirados} expirados`);
      if (foraRj > 0) console.log(`    ↳ ${foraRj} fora do município do RJ`);
    }
    console.log(`📄  Salvo em: ${OUTPUT_PATH}`);
    console.log("─".repeat(50) + "\n");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
