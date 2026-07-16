import type { ClubinhoProductApi } from "./clubinho-api";
import { getMetaValue } from "./clubinho-api";
import {
  createBrowserSession,
  fetchProductApi,
  gotoWithRetry,
  type BrowserSession,
} from "./browser";
import {
  extractBairroFromVenue,
  extractDuracaoMinutos,
  extractFromLdJson,
  extractHorariosSessao,
  extractIdadeMaxima,
  extractIdadeMinima,
  extractSinopseOficial,
  formatPrecoBruto,
  stripHtml,
} from "./parse";
import {
  extractPageRenderedData,
  waitForRenderedProductPage,
  type PageRenderedData,
} from "./page-content";
import type { ListingPreview, LinhaEnriquecida } from "./types";

function productApiPathFromUrl(productUrl: string): string {
  const parsed = new URL(productUrl);
  return `/api${parsed.pathname}`;
}

function mapToLinha(
  preview: ListingPreview,
  productUrl: string,
  pageData: PageRenderedData,
  api: ClubinhoProductApi | null,
): LinhaEnriquecida {
  const bodyHtml = api?.product.content?.body ?? "";
  const excerpt = api?.product.content?.excerpt ?? "";
  const apiPlain = stripHtml(bodyHtml || excerpt);
  const textForParse = pageData.fullText || apiPlain;
  const ld = extractFromLdJson(pageData.ldJson);
  const metaDuration = api ? getMetaValue(api, "duration") : "";

  const venue =
    ld.venue ||
    api?.venues?.[0]?.name ||
    preview.venue;
  const venueAddress = api?.venues?.[0]?.address;
  const bairro =
    venueAddress?.neighborhood ?? extractBairroFromVenue(venue);

  // Compõe endereço completo a partir dos campos estruturados da API Clubinho.
  // Formato: "Rua Fonseca, 240 — Shopping Bangu — Bangu" (complement opcional).
  const endereco: string | undefined = (() => {
    if (!venueAddress?.street && !venueAddress?.number) return undefined;
    const rua = [venueAddress.street?.trim(), venueAddress.number]
      .filter(Boolean)
      .join(", ");
    const localizacao = [venueAddress.complement, venueAddress.neighborhood]
      .filter(Boolean)
      .join(" — ");
    return [rua, localizacao].filter(Boolean).join(" — ") || undefined;
  })();

  const fullPrice = api?.lowestPrice?.full ?? null;
  const salePrice = api?.lowestPrice?.sale ?? null;
  const maxDiscount = api?.lowestPrice?.max_discount;

  const horariosRender = extractHorariosSessao(textForParse);
  const horarios_sessao =
    horariosRender.length >= ld.horarios_sessao.length
      ? horariosRender || ld.horarios_sessao
      : ld.horarios_sessao || horariosRender;

  const sinopse_oficial =
    extractSinopseOficial(pageData.fullText, bodyHtml) ||
    excerpt ||
    apiPlain.slice(0, 1200);

  return {
    nome: api?.product.title || preview.nome,
    categoria_origem: api?.genres?.[0]?.name ?? preview.categoria_origem,
    venue,
    bairro,
    dias_apresentacao: preview.dias_apresentacao,
    desconto_percentual:
      preview.desconto_percentual ||
      (maxDiscount ? `${maxDiscount}%` : ""),
    preco_bruto:
      preview.preco_bruto ||
      formatPrecoBruto(fullPrice, salePrice),
    url_origem: productUrl,
    sinopse_oficial,
    horarios_sessao,
    duracao_minutos: extractDuracaoMinutos(textForParse, metaDuration),
    idade_minima: extractIdadeMinima(textForParse),
    idade_maxima: extractIdadeMaxima(textForParse),
    preco_inteira_centavos:
      salePrice !== null && salePrice > 0
        ? String(salePrice)          // preço que o usuário paga (com desconto Clubinho)
        : fullPrice !== null && fullPrice > 0
        ? String(fullPrice)          // fallback: sem desconto, fullPrice == salePrice
        : ld.offer_price_centavos,
    url_ingresso: productUrl,
    // max_discount > 0 indica desconto estrutural de lote — há múltiplas faixas de preço.
    preco_a_partir: (maxDiscount ?? 0) > 0,
    ...(endereco ? { endereco } : {}),
  };
}

function mapPreviewFallback(
  preview: ListingPreview,
  pageData: PageRenderedData,
): LinhaEnriquecida {
  return mapToLinha(preview, preview.url, pageData, null);
}

// US-S39 (16/07/2026): retry por item quando fetchProductApi falhar — espera
// antes de tentar de novo pra dar tempo de um eventual bloqueio anti-bot
// esporádico (Cloudflare/rate limiting) passar. Ver
// docs/discovery/DISCOVERY-2026-07-06-endereco-clubinho.md (causa raiz).
const RETRY_DELAY_MS = 2_500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** status !== 200 (inclui status 0 = timeout/erro de rede) ou corpo vazio/inválido — ver AC3 de US-S39. */
function isApiFailure(result: { status: number; data: unknown }): boolean {
  return result.status !== 200 || result.data === null;
}

export interface ScrapeAtracaoResult {
  row: LinhaEnriquecida;
  session: BrowserSession;
}

export async function scrapeAtracao(
  session: BrowserSession,
  preview: ListingPreview,
): Promise<ScrapeAtracaoResult> {
  const productUrl = preview.url;
  const apiPath = productApiPathFromUrl(productUrl);

  await gotoWithRetry(session.page, productUrl);
  await waitForRenderedProductPage(session.page);
  const pageData = await extractPageRenderedData(session.page);

  const first = await fetchProductApi<ClubinhoProductApi>(session.page, apiPath);
  if (!isApiFailure(first)) {
    return {
      session,
      row: {
        ...mapToLinha(preview, productUrl, pageData, first.data),
        _apiStatus: first.status,
        _apiOutcome: "primeira-tentativa",
      },
    };
  }

  console.warn(
    `[scrape-atracao] fetchProductApi falhou (status ${first.status}) — ${apiPath} — "${preview.nome}". Retentando em ${RETRY_DELAY_MS / 1000}s…`,
  );
  await delay(RETRY_DELAY_MS);

  // Padrão de ensureApiAccess() (scripts/scraper/index.ts): se ainda em
  // headless, reabre em modo visível pra contornar bloqueio anti-bot antes da
  // retentativa. Se já está headed, tenta de novo na mesma sessão.
  let retrySession = session;
  if (session.headless) {
    console.warn(
      `[scrape-atracao] Reabrindo navegador visível para a retentativa — "${preview.nome}".`,
    );
    await session.browser.close();
    retrySession = await createBrowserSession(true);
    await gotoWithRetry(retrySession.page, productUrl);
  }

  const retry = await fetchProductApi<ClubinhoProductApi>(retrySession.page, apiPath);
  if (!isApiFailure(retry)) {
    return {
      session: retrySession,
      row: {
        ...mapToLinha(preview, productUrl, pageData, retry.data),
        _apiStatus: retry.status,
        _apiOutcome: "recuperada-via-retry",
      },
    };
  }

  // Retentativa também falhou — mesmo fallback silencioso de US-S36/PR #110
  // (sem endereço, sem os demais campos vindos da API de produto).
  console.warn(
    `[scrape-atracao] Retentativa também falhou (status ${retry.status}) — ${apiPath} — "${preview.nome}". Fallback sem dados de API (sem endereço).`,
  );
  return {
    session: retrySession,
    row: {
      ...mapPreviewFallback(preview, pageData),
      _apiStatus: retry.status,
      _apiOutcome: "falhou-apos-retry",
    },
  };
}
