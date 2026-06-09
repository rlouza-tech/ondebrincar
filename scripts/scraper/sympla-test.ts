#!/usr/bin/env tsx
/**
 * sympla-test.ts — script exploratório de scraping da Sympla
 *
 * Abre a página de eventos infantis no RJ, aguarda a renderização JS,
 * extrai os dados dos cards visíveis e salva JSON + screenshot.
 *
 * Uso:
 *   pnpm tsx scripts/scraper/sympla-test.ts --headed
 *   pnpm tsx scripts/scraper/sympla-test.ts --headed --limit 20
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBrowserSession, gotoWithRetry } from "./browser";

const SYMPLA_URL = "https://www.sympla.com.br/eventos/infantil?state=RJ";
const OUTPUT_JSON = join(process.cwd(), "data", "output", "sympla-test.json");
const SCREENSHOT_PATH = join(process.cwd(), "data", "output", "sympla-screenshot.png");

// Seletores candidatos para cards de evento na Sympla (SPA React)
// O correto será confirmado após rodar o script pela primeira vez
const CARD_SELECTORS = [
  '[class*="EventCard"]',
  '[class*="event-card"]',
  '[data-testid*="event"]',
  'article[class*="card"]',
  'a[href*="/evento/"]',
];

function parseArgs() {
  const headed = process.argv.includes("--headed");
  const limitIdx = process.argv.indexOf("--limit");
  const limit = limitIdx !== -1 ? Number.parseInt(process.argv[limitIdx + 1] ?? "50", 10) : 50;
  return { headed, limit };
}

async function waitForCards(page: import("playwright").Page): Promise<string | null> {
  for (const selector of CARD_SELECTORS) {
    try {
      await page.waitForSelector(selector, { timeout: 8_000 });
      return selector;
    } catch {
      // tenta o próximo
    }
  }
  return null;
}

async function main() {
  const { headed, limit } = parseArgs();

  console.log(`\nSympla test scraper`);
  console.log(`URL: ${SYMPLA_URL}`);
  console.log(`Modo: ${headed ? "headed (visível)" : "headless"} | limite: ${limit} eventos\n`);

  if (!headed) {
    console.warn("⚠  Sympla provavelmente requer --headed. Use: pnpm tsx scripts/scraper/sympla-test.ts --headed\n");
  }

  const { browser, page } = await createBrowserSession(headed);

  try {
    await gotoWithRetry(page, SYMPLA_URL, 20_000);
    console.log("Página carregada. Aguardando JS renderizar...");

    const foundSelector = await waitForCards(page);

    if (foundSelector) {
      console.log(`Cards encontrados com seletor: "${foundSelector}"`);
    } else {
      console.log("Nenhum seletor padrão encontrou cards. Tentando scroll e aguardando mais...");
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(4_000);
    }

    // Screenshot para diagnóstico visual
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    console.log(`Screenshot salvo: ${SCREENSHOT_PATH}`);

    // Extração: todos os links para /evento/ + dados adjacentes
    const events = await page.evaluate(() => {
      const results: Array<{
        nome: string;
        url: string;
        data_texto: string;
        local: string;
        preco: string;
        imagem_url: string;
        produtor: string;
        raw_text: string;
      }> = [];

      // Sympla usa links /evento/slug ou variantes
      const anchors = document.querySelectorAll(
        'a[href*="/evento/"], a[href*="/e/"]'
      );

      anchors.forEach((a) => {
        const href = a.getAttribute("href") ?? "";
        if (!href) return;

        const url = href.startsWith("http")
          ? href
          : `https://www.sympla.com.br${href}`;

        // Evita links que não são de evento (ex: links do menu)
        if (!url.includes("/evento/") && !url.includes(".sympla.com.br/e/")) return;

        // Nome
        const nome =
          a.querySelector('[class*="itle"], [class*="ame"], h2, h3, h4')
            ?.textContent?.trim() ||
          a.getAttribute("aria-label")?.trim() ||
          a.textContent?.trim().substring(0, 120) ||
          "";

        // Data / período
        const data_texto =
          a.querySelector('[class*="ate"], [class*="ata"], time, [class*="hen"]')
            ?.textContent?.trim() || "";

        // Local / venue
        const local =
          a.querySelector('[class*="ocation"], [class*="ocal"], [class*="enue"], [class*="here"]')
            ?.textContent?.trim() || "";

        // Preço
        const preco =
          a.querySelector('[class*="rice"], [class*="reco"], [class*="alor"], [class*="icket"]')
            ?.textContent?.trim() || "";

        // Imagem do banner
        const img = a.querySelector("img");
        const imagem_url =
          img?.getAttribute("src") ||
          img?.getAttribute("data-src") ||
          img?.getAttribute("srcset")?.split(" ")[0] ||
          "";

        // Produtor (algumas versões do card mostram)
        const produtor =
          a.querySelector('[class*="roducer"], [class*="rodutor"], [class*="rganizer"]')
            ?.textContent?.trim() || "";

        const raw_text = a.textContent?.trim().substring(0, 200) || "";

        if (nome || raw_text.length > 10) {
          results.push({ nome, url, data_texto, local, preco, imagem_url, produtor, raw_text });
        }
      });

      return results;
    });

    // Deduplicar por URL
    const seen = new Set<string>();
    const unique = events.filter((e) => {
      if (!e.url || seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    });

    const limited = unique.slice(0, limit);

    // --- Output no terminal ---
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Resultado: ${unique.length} eventos únicos encontrados`);
    console.log(`Exibindo os primeiros ${limited.length}:`);
    console.log("=".repeat(60));

    if (limited.length === 0) {
      console.log("\n❌ Nenhum evento extraído.");
      console.log("Possíveis causas:");
      console.log("  1. Sympla bloqueou headless → rode com --headed");
      console.log("  2. Seletores desatualizados → inspecione o screenshot");
      console.log("  3. Timeout antes da renderização → tente aumentar o waitForTimeout");

      const bodySnippet = await page.evaluate(
        () => document.body?.innerHTML?.substring(0, 2000)
      );
      console.log("\n--- HTML snippet (primeiros 2000 chars) ---");
      console.log(bodySnippet);
    } else {
      limited.forEach((e, i) => {
        console.log(`\n[${i + 1}] ${e.nome || "(sem nome)"}`);
        console.log(`    URL:    ${e.url}`);
        console.log(`    Data:   ${e.data_texto || "-"}`);
        console.log(`    Local:  ${e.local || "-"}`);
        console.log(`    Preço:  ${e.preco || "-"}`);
        console.log(`    Imagem: ${e.imagem_url ? "✓" : "✗"}`);
        if (e.produtor) console.log(`    Prod:   ${e.produtor}`);
      });
    }

    // Salva JSON completo
    writeFileSync(OUTPUT_JSON, JSON.stringify(unique, null, 2), "utf-8");
    console.log(`\nJSON salvo: ${OUTPUT_JSON} (${unique.length} eventos)`);
    console.log(`Screenshot: ${SCREENSHOT_PATH}`);

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
