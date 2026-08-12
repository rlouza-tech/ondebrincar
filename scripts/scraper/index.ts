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
import {
  loadLocalEnderecoMap,
  saveLocalEnderecoMap,
  upsertPar,
} from "./local-endereco-map";
import { isLocalizacaoRioDeJaneiro } from "./parse";
import { scrapeAtracao } from "./scrape-atracao";
import { scrapeListing } from "./scrape-listing";
import { scrapeUhuu, UHUU_CATEGORY_URL } from "./uhuu";
import { scrapeEcovilla, ECOVILLA_PROGRAMACAO_URL } from "./ecovilla";

const DEFAULT_LISTING_URL = "https://clubinhodeofertas.com.br/rio-de-janeiro";
const DEFAULT_OUTPUT_BY_SOURCE: Record<Source, string> = {
  clubinho: join(process.cwd(), "data", "input", "planilha-origem.csv"),
  uhuu: join(process.cwd(), "data", "input", "uhuu-raw.csv"),
  ecovilla: join(process.cwd(), "data", "input", "ecovilla-raw.csv"),
};

type Source = "clubinho" | "uhuu" | "ecovilla";

interface CliOptions {
  source: Source;
  listingUrl?: string;
  outputPath: string;
  limit?: number;
  headed: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  let source: Source = "clubinho";
  let listingUrl: string | undefined;
  let outputPath: string | undefined;
  let limit: number | undefined;
  let headed = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--source" && next) {
      if (next !== "clubinho" && next !== "uhuu" && next !== "ecovilla") {
        throw new Error(`--source aceita "clubinho", "uhuu" ou "ecovilla" — recebido: "${next}"`);
      }
      source = next;
      index += 1;
    } else if (arg === "--url" && next) {
      listingUrl = next;
      index += 1;
    } else if (arg === "--output" && next) {
      outputPath = next.startsWith("/") ? next : join(process.cwd(), next);
      index += 1;
    } else if (arg === "--limit") {
      const parsed = Number.parseInt(next ?? "", 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        throw new Error("--limit precisa ser um número inteiro positivo");
      }
      limit = parsed;
      index += 1;
    } else if (arg === "--headed") {
      headed = true;
    } else {
      throw new Error(
        "Uso: pnpm scrape [--source clubinho|uhuu|ecovilla] [--url <listagem>] [--output <csv>] [--limit N] [--headed]",
      );
    }
  }

  return {
    source,
    listingUrl: listingUrl ?? (source === "clubinho" ? DEFAULT_LISTING_URL : undefined),
    outputPath: outputPath ?? DEFAULT_OUTPUT_BY_SOURCE[source],
    limit,
    headed,
  };
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

async function runUhuuScrape(options: CliOptions): Promise<void> {
  console.log(`Scraper Uhuu: categoria ${options.listingUrl ?? UHUU_CATEGORY_URL} → ${options.outputPath}`);

  const { rows, stats } = await scrapeUhuu({
    categoryUrl: options.listingUrl,
    limit: options.limit,
  });

  console.log(
    `${stats.totalListados} listados / ${stats.totalRj} no município do RJ / ${stats.totalComDetalhe} enriquecidos`,
  );

  await writeScrapedCsv(options.outputPath, rows);
  console.log(`CSV salvo: ${options.outputPath} (${rows.length} linhas)`);
}

async function runEcovillaScrape(options: CliOptions): Promise<void> {
  console.log(
    `Scraper EcoVilla: ${options.listingUrl ?? ECOVILLA_PROGRAMACAO_URL} → ${options.outputPath}`,
  );

  const { rows, stats } = await scrapeEcovilla({
    listingUrl: options.listingUrl,
    limit: options.limit,
  });

  console.log(`${stats.totalListados} eventos listados / ${rows.length} exportados`);

  await writeScrapedCsv(options.outputPath, rows);
  console.log(`CSV salvo: ${options.outputPath} (${rows.length} linhas)`);
}

async function runClubinhoScrape(options: CliOptions): Promise<void> {
  const listingUrl = options.listingUrl ?? DEFAULT_LISTING_URL;
  let session = await createBrowserSession(options.headed);

  console.log(
    `Scraper v2: listagem ${listingUrl} → ${options.outputPath}${
      options.headed ? " [headed]" : ""
    }`,
  );

  await gotoWithRetry(session.page, listingUrl);
  session = await ensureApiAccess(session, options.headed);

  await gotoWithRetry(session.page, listingUrl);
  const previews = await scrapeListing(session.page, listingUrl);
  const selected = options.limit ? previews.slice(0, options.limit) : previews;

  console.log(`Encontradas ${previews.length} atrações (${selected.length} a processar)`);

  const rows = [];
  let aceitas = 0;
  let descartadas = 0;

  for (let index = 0; index < selected.length; index += 1) {
    const preview = selected[index];
    let row;
    try {
      const result = await scrapeAtracao(session, preview);
      session = result.session;
      row = result.row;
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

  // Diagnóstico US-S36/US-S39: agrega em que tentativa cada ficha conseguiu
  // dados da API do produto (ou não). Ver
  // docs/discovery/DISCOVERY-2026-07-06-endereco-clubinho.md.
  const primeiraTentativa = rows.filter((r) => r._apiOutcome === "primeira-tentativa").length;
  const recuperadasViaRetry = rows.filter((r) => r._apiOutcome === "recuperada-via-retry").length;
  const falharamAposRetry = rows.filter((r) => r._apiOutcome === "falhou-apos-retry");

  if (recuperadasViaRetry > 0 || falharamAposRetry.length > 0) {
    console.warn(
      `\n📊 fetchProductApi — ${primeiraTentativa} na 1ª tentativa, ${recuperadasViaRetry} recuperadas via retry, ${falharamAposRetry.length} falharam mesmo após retry.`,
    );
    if (falharamAposRetry.length > 0) {
      console.warn(
        `⚠️  Fichas sem endereço/dados de API mesmo após retry: ${falharamAposRetry
          .map((r) => `"${r.nome}" (status ${r._apiStatus ?? "sem status"})`)
          .join(", ")}. Ver warnings [scrape-atracao] acima.`,
      );
    }
  } else {
    console.log(`\n✅ fetchProductApi retornou 200 na 1ª tentativa para todas as ${rows.length} fichas aceitas.`);
  }

  await writeScrapedCsv(options.outputPath, rows);
  await session.browser.close();

  console.log(`CSV salvo: ${options.outputPath} (${rows.length} linhas, 15 colunas)`);

  // US-S76: grava em lote os pares nome↔endereço observados nesta rodada
  // (venue.name + venue.address da API do Clubinho, já limpos).
  const paresObservados = rows
    .map((r) => r._localEnderecoPar)
    .filter((par): par is { local: string; endereco: string } => Boolean(par));
  if (paresObservados.length > 0) {
    let tabela = loadLocalEnderecoMap();
    for (const par of paresObservados) {
      tabela = upsertPar(tabela, par.local, par.endereco);
    }
    saveLocalEnderecoMap(tabela);
    console.log(`📍  Tabela nome↔endereço atualizada: +${paresObservados.length} par(es) observado(s) (${tabela.length} total)`);
  }
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.source === "uhuu") {
    await runUhuuScrape(options);
  } else if (options.source === "ecovilla") {
    await runEcovillaScrape(options);
  } else {
    await runClubinhoScrape(options);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
