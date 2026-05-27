#!/usr/bin/env tsx
/**
 * Diagnóstico do scraper — roda SEMPRE em modo headed.
 * Uso: pnpm tsx scripts/scraper/diagnose-listing.ts
 *
 * Gera:
 *   data/debug/listing-screenshot.png  — screenshot do estado da página
 *   data/debug/listing-html.txt        — primeiros 8000 chars do HTML
 *   data/debug/listing-selectors.json  — quais seletores foram encontrados
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const LISTING_URL = "https://clubinhodeofertas.com.br/rio-de-janeiro";
const DEBUG_DIR = join(process.cwd(), "data", "debug");
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Seletores candidatos a produto — testamos todos para ver qual existe
const CANDIDATE_SELECTORS = [
  "a.product-thumb[href]",
  "a.product-thumb",
  "[class*='product-thumb']",
  "[class*='product-card']",
  "[class*='offer-thumb']",
  "[class*='offer-card']",
  "a[href*='/rio-de-janeiro/']",
  ".swiper-slide a[href]",
  "article a[href]",
  "[data-product]",
  "[data-offer]",
];

async function main() {
  mkdirSync(DEBUG_DIR, { recursive: true });

  console.log("🔍 Abrindo browser HEADED para diagnóstico...");
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9" },
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  console.log(`Navegando para ${LISTING_URL}...`);
  await page.goto(LISTING_URL, { waitUntil: "domcontentloaded", timeout: 15_000 });

  // Espera progressiva: testa a cada segundo por até 15s
  console.log("Aguardando Vue renderizar (até 15s)...");
  let foundAt = -1;
  for (let i = 1; i <= 15; i++) {
    await page.waitForTimeout(1000);
    const count = await page.evaluate((sel) => document.querySelectorAll(sel).length, "a.product-thumb[href]");
    process.stdout.write(`  t=${i}s: a.product-thumb[href] = ${count} elementos\n`);
    if (count > 0 && foundAt === -1) {
      foundAt = i;
      console.log(`  ✅ Seletor original encontrou ${count} elementos em t=${i}s!`);
      break;
    }
  }

  if (foundAt === -1) {
    console.log("\n  ⚠️  Seletor original não encontrou nada. Testando candidatos...\n");
  }

  // Testa todos os seletores candidatos
  const selectorResults: Record<string, number> = {};
  for (const sel of CANDIDATE_SELECTORS) {
    const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
    selectorResults[sel] = count;
    if (count > 0) {
      console.log(`  ✅  "${sel}" → ${count} elementos`);
    } else {
      console.log(`  ✗   "${sel}" → 0`);
    }
  }

  // Dump do HTML
  const html = await page.content();
  const htmlSnippet = html.slice(0, 8000);
  writeFileSync(join(DEBUG_DIR, "listing-html.txt"), htmlSnippet, "utf-8");
  console.log(`\nHTML (8000 chars) salvo em: ${DEBUG_DIR}/listing-html.txt`);

  // Screenshot
  await page.screenshot({ path: join(DEBUG_DIR, "listing-screenshot.png"), fullPage: false });
  console.log(`Screenshot salvo em: ${DEBUG_DIR}/listing-screenshot.png`);

  // Dump das classes dos primeiros links que apontam pro RJ
  const linkClasses = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll("a[href*='/rio-de-janeiro/']")).slice(0, 5);
    return links.map((a) => ({
      href: a.getAttribute("href"),
      classes: a.className,
      outerHTML: a.outerHTML.slice(0, 300),
    }));
  });

  writeFileSync(
    join(DEBUG_DIR, "listing-selectors.json"),
    JSON.stringify({ selectorResults, linkClasses, foundAt }, null, 2),
    "utf-8",
  );
  console.log(`Resultado de seletores salvo em: ${DEBUG_DIR}/listing-selectors.json`);

  console.log("\n--- RESUMO ---");
  console.log(`Seletor original encontrou elementos? ${foundAt > -1 ? `Sim, em t=${foundAt}s` : "Não"}`);
  const best = Object.entries(selectorResults).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (best.length > 0) {
    console.log("Melhores seletores alternativos:");
    best.forEach(([sel, count]) => console.log(`  "${sel}" → ${count}`));
  }

  await browser.close();
  console.log("\nDiagnóstico concluído. Verifique data/debug/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
