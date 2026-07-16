#!/usr/bin/env tsx
/**
 * Retry de URLs que falharam no scrape principal.
 * Appenda as linhas ao CSV existente sem sobrescrever.
 * Uso: pnpm tsx scripts/scraper/retry-urls.ts --output <csv> [--headed]
 */

import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "csv-stringify/sync";
import { createBrowserSession, gotoWithRetry } from "./browser";
import { isLocalizacaoRioDeJaneiro } from "./parse";
import { scrapeAtracao } from "./scrape-atracao";
import { CSV_COLUMNS } from "./csv";

const DEFAULT_OUTPUT = join(process.cwd(), "data", "input", "planilha-origem.csv");

const RETRY_URLS = [
  "https://clubinhodeofertas.com.br/rio-de-janeiro/tour-do-maracana-1700",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/yup-star-roda-gigante-do-rio-2490",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/tour-na-gavea-3872",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/museu-flamengo-imersivo-idolo-3995",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/museu-flamengo-imersivo-3996",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/saveiros-tour-baia-de-guanabara-2923",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/terra-dos-dinos-3970",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/carnaval-experience-3085",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/big-jump-usa-shopping-aerotown-2088",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/voltz-parkour-barra-1562",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/laser-tag-shopping-aerotown-3620",
  "https://clubinhodeofertas.com.br/rio-de-janeiro/parque-shanghai-2432",
];

function parseArgs(argv: string[]): { outputPath: string; headed: boolean } {
  let outputPath = DEFAULT_OUTPUT;
  let headed = false;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--output" && argv[i + 1]) { outputPath = argv[++i]; }
    else if (argv[i] === "--headed") { headed = true; }
  }
  return { outputPath, headed };
}

async function main() {
  const { outputPath, headed } = parseArgs(process.argv);
  let session = await createBrowserSession(headed);

  console.log(`Retry de ${RETRY_URLS.length} URLs → append em ${outputPath}${headed ? " [headed]" : ""}`);

  const rows = [];
  let aceitas = 0;
  let descartadas = 0;

  for (let i = 0; i < RETRY_URLS.length; i++) {
    const url = RETRY_URLS[i];
    const slug = url.split("/").pop() ?? url;
    const preview = { url, nome: slug, categoria_origem: "", venue: "", dias_apresentacao: "", desconto_percentual: "", preco_bruto: "" };

    let row;
    try {
      await gotoWithRetry(session.page, "about:blank");
      const result = await scrapeAtracao(session, preview);
      session = result.session;
      row = result.row;
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.warn(`[${i + 1}/${RETRY_URLS.length}] ERRO — ${slug} — ${msg}`);
      try { await session.page.goto("about:blank", { timeout: 5_000 }); } catch { /* ignora */ }
      continue;
    }

    if (!isLocalizacaoRioDeJaneiro(row.venue, row.bairro)) {
      descartadas++;
      console.log(`[${i + 1}/${RETRY_URLS.length}] DESCARTADO (fora do RJ) — ${row.nome} | venue: "${row.venue}"`);
      continue;
    }

    aceitas++;
    rows.push(row);
    console.log(`[${i + 1}/${RETRY_URLS.length}] ${row.nome} | horários: ${row.horarios_sessao ? "sim" : "não"} | idade_max: ${row.idade_maxima || "-"} | preço: ${row.preco_inteira_centavos || "-"}`);
  }

  await session.browser.close();

  if (rows.length === 0) {
    console.log(`\nNenhuma linha nova para appendar.`);
    return;
  }

  // Appenda sem header (o CSV principal já tem o header)
  const csv = stringify(rows, { header: false, columns: CSV_COLUMNS });
  await appendFile(outputPath, csv, "utf8");

  console.log(`\n${aceitas} aceitos / ${descartadas} descartados`);
  console.log(`${rows.length} linhas appendadas em ${outputPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
