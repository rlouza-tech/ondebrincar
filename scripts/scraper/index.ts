#!/usr/bin/env tsx

import { join } from "node:path";
import {
  createBrowserSession,
  fetchProductApi,
  gotoWithRetry,
  type BrowserSession,
} from "./browser";
import type { ClubinhoProductApi } from "./clubinho-api";
import { writeScrapedCsv } from "./csv";
import { isLocalizacaoRioDeJaneiro } from "./parse";
import { scrapeAtracao } from "./scrape-atracao";
import { scrapeListing } from "./scrape-listing";

const DEFAULT_LISTING_URL = "https://clubinhodeofertas.com.br/rio-de-janeiro";
const DEFAULT_OUTPUT = join(process.cwd(), "data", "input", "planilha-origem.csv");

interface CliOptions {
  listingUrl: string;
  outputPath: string;
  limit?: number;
  headed: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    listingUrl: DEFAULT_LISTING_URL,
    outputPath: DEFAULT_OUTPUT,
    headed: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--url" && next) {
      options.listingUrl = next;
      index += 1;
    } else if (arg === "--output" && next) {
      options.outputPath = next.startsWith("/")
        ? next
        : join(process.cwd(), next);
      index += 1;
    } else if (arg === "--limit") {
      const parsed = Number.parseInt(next ?? "", 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        throw new Error("--limit precisa ser um número inteiro positivo");
      }
      options.limit = parsed;
      index += 1;
    } else if (arg === "--headed") {
      options.headed = true;
    } else {
      throw new Error(
        "Uso: pnpm scrape [--url <listagem>] [--output <csv>] [--limit N] [--headed]",
      );
    }
  }

  return options;
}

const PROBE_PRODUCT_URL =
  "https://clubinhodeofertas.com.br/rio-de-janeiro/filhotes-caninos-2942";

async function ensureApiAccess(
  session: BrowserSession,
  headed: boolean,
): Promise<BrowserSession> {
  await gotoWithRetry(session.page, PROBE_PRODUCT_URL);
  const probe = await fetchProductApi<ClubinhoProductApi>(
    session.page,
    "/api/rio-de-janeiro/filhotes-caninos-2942",
  );

  if (probe.status === 200 || headed) {
    return session;
  }

  console.warn(
    "API bloqueada em headless (403). Reabrindo navegador visível para concluir o scrape…",
  );
  await session.browser.close();
  return createBrowserSession(true);
}

async function main() {
  const options = parseArgs(process.argv);
  let session = await createBrowserSession(options.headed);

  console.log(
    `Scraper v2: listagem ${options.listingUrl} → ${options.outputPath}${
      options.headed ? " [headed]" : ""
    }`,
  );

  await gotoWithRetry(session.page, options.listingUrl);
  session = await ensureApiAccess(session, options.headed);

  await gotoWithRetry(session.page, options.listingUrl);
  const previews = await scrapeListing(session.page, options.listingUrl);
  const selected = options.limit ? previews.slice(0, options.limit) : previews;

  console.log(`Encontradas ${previews.length} atrações (${selected.length} a processar)`);

  const rows = [];
  let aceitas = 0;
  let descartadas = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const preview = selected[index];
    let row;
    try {
      row = await scrapeAtracao(session.page, preview);
    } catch (err) {
      const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
      console.warn(
        `[${index + 1}/${selected.length}] ERRO ao processar "${preview.nome}" (${preview.url}) — ${msg}`,
      );
      // Reseta o estado da página para evitar efeito dominó nas navegações seguintes
      try { await session.page.goto("about:blank", { timeout: 5_000 }); } catch { /* ignora */ }
      continue;
    }

    if (!isLocalizacaoRioDeJaneiro(row.venue, row.bairro)) {
      descartadas += 1;
      console.log(
        `[${index + 1}/${selected.length}] DESCARTADO (fora do RJ) — ${row.nome} | venue: "${row.venue}"`,
      );
      continue;
    }

    aceitas += 1;
    rows.push(row);
    console.log(
      `[${index + 1}/${selected.length}] ${row.nome} | horários: ${
        row.horarios_sessao ? "sim" : "não"
      } | idade_max: ${row.idade_maxima || "-"} | preço: ${
        row.preco_inteira_centavos || "-"
      }`,
    );
  }

  console.log(`\n${aceitas} eventos aceitos / ${descartadas} descartados (fora do município do RJ)`);

  await writeScrapedCsv(options.outputPath, rows);
  await session.browser.close();

  console.log(`CSV salvo: ${options.outputPath} (${rows.length} linhas, 15 colunas)`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
