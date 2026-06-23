import type { Page } from "playwright";
import type { ClubinhoProductApi } from "./clubinho-api";
import { getMetaValue } from "./clubinho-api";
import { fetchProductApi, gotoWithRetry } from "./browser";
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
  const bairro =
    api?.venues?.[0]?.address?.neighborhood ?? extractBairroFromVenue(venue);

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
  };
}

function mapPreviewFallback(
  preview: ListingPreview,
  pageData: PageRenderedData,
): LinhaEnriquecida {
  return mapToLinha(preview, preview.url, pageData, null);
}

export async function scrapeAtracao(
  page: Page,
  preview: ListingPreview,
): Promise<LinhaEnriquecida> {
  const productUrl = preview.url;
  const apiPath = productApiPathFromUrl(productUrl);

  await gotoWithRetry(page, productUrl);
  await waitForRenderedProductPage(page);
  const pageData = await extractPageRenderedData(page);

  const { status, data } = await fetchProductApi<ClubinhoProductApi>(page, apiPath);
  if (status === 200 && data) {
    return mapToLinha(preview, productUrl, pageData, data);
  }

  return mapPreviewFallback(preview, pageData);
}
