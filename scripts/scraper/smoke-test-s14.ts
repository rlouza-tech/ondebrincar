#!/usr/bin/env tsx
/**
 * smoke-test-s14.ts — verifica preço das fichas Colônia Fazendo Arte (US-S14)
 *
 * Raspa apenas as 2 URLs afetadas e imprime preco_inteira_centavos.
 * Não modifica planilha-origem.csv.
 *
 * Uso:
 *   pnpm tsx scripts/scraper/smoke-test-s14.ts --headed
 *
 * Saída: data/output/smoke-test-s14.json  (para revisão)
 * Preço esperado: 26290  (= R$262,90)
 * Preço incorreto seria: 29211  (= R$292,11 — lowestPrice.full com 10% off)
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBrowserSession, gotoWithRetry } from "./browser";
import { scrapeAtracao } from "./scrape-atracao";

const URLS = [
  "https://clubinhodeofertas.com.br/rio-de-janeiro/colonia-fazendo-arte-nas-ferias-botafogo-72",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/colonia-fazendo-arte-nas-ferias-tijuca-2006",
];

const OUTPUT_PATH = join(process.cwd(), "data", "output", "smoke-test-s14.json");
const PRECO_ESPERADO = 26290;   // R$262,90 — salePrice com 10% off
const PRECO_INCORRETO = 29211;  // R$292,11 — lowestPrice.full (bug US-S11)

async function main() {
  const headed = process.argv.includes("--headed");

  console.log("\n=== Smoke Test US-S14 — Colônia Fazendo Arte ===");
  console.log(`URLs:   ${URLS.length} fichas`);
  console.log(`Modo:   ${headed ? "headed" : "headless"}`);
  console.log(`Preço esperado: ${PRECO_ESPERADO} centavos (R$${(PRECO_ESPERADO / 100).toFixed(2)})`);
  console.log(`Preço bug:      ${PRECO_INCORRETO} centavos (R$${(PRECO_INCORRETO / 100).toFixed(2)})\n`);

  let session = await createBrowserSession(headed);
  const resultados: object[] = [];
  let passou = 0;
  let falhou = 0;

  try {
    for (let i = 0; i < URLS.length; i++) {
      const url = URLS[i];
      const slug = url.split("/").pop() ?? url;
      const preview = {
        url,
        nome: slug,
        categoria_origem: "Colônia de férias",
        venue: "",
        dias_apresentacao: "",
        desconto_percentual: "10%",
        preco_bruto: "",
      };

      process.stdout.write(`[${i + 1}/${URLS.length}] ${slug}... `);

      try {
        await gotoWithRetry(session.page, "about:blank");
        const result = await scrapeAtracao(session, preview);
        session = result.session;
        const row = result.row;

        const precoNum = Number(row.preco_inteira_centavos);
        const ok = precoNum === PRECO_ESPERADO;

        if (ok) {
          process.stdout.write(`✅ preco_inteira_centavos=${row.preco_inteira_centavos} (R$${(precoNum / 100).toFixed(2)}) — correto\n`);
          passou++;
        } else if (precoNum === PRECO_INCORRETO) {
          process.stdout.write(`❌ preco_inteira_centavos=${row.preco_inteira_centavos} (R$${(precoNum / 100).toFixed(2)}) — BUG AINDA PRESENTE\n`);
          falhou++;
        } else {
          process.stdout.write(`⚠️  preco_inteira_centavos=${row.preco_inteira_centavos} — valor inesperado (nem correto nem bug conhecido)\n`);
          falhou++;
        }

        resultados.push({
          url,
          nome: row.nome,
          preco_inteira_centavos: row.preco_inteira_centavos,
          preco_bruto: row.preco_bruto,
          desconto_percentual: row.desconto_percentual,
          status: ok ? "OK" : "FALHOU",
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        process.stdout.write(`❌ ERRO — ${msg}\n`);
        falhou++;
        resultados.push({ url, status: "ERRO", erro: msg });
      }
    }
  } finally {
    await session.browser.close();
  }

  mkdirSync(join(process.cwd(), "data", "output"), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(resultados, null, 2), "utf-8");

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Resultado: ${passou}/${URLS.length} corretos, ${falhou} falhas`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log("─".repeat(50) + "\n");

  if (falhou > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
