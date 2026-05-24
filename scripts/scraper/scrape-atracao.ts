import type { Page } from "playwright";
import type { ClubinhoProductApi } from "./clubinho-api";
import { getMetaValue } from "./clubinho-api";
import { fetchProductApi, gotoWithRetry } from "./browser";
import {
  extractBairroFromVenue,
  extractDuracaoMinutos,
  extractHorariosSessao,
  extractIdadeMaxima,
  extractIdadeMinima,
  formatPrecoBruto,
  stripHtml,
} from "./parse";
import type { ListingPreview, LinhaEnriquecida } from "./types";

function productApiPathFromUrl(productUrl: string): string {
  const parsed = new URL(productUrl);
  return `/api${parsed.pathname}`;
}

function mapApiToLinha(
  preview: ListingPreview,
  api: ClubinhoProductApi,
  productUrl: string,
): LinhaEnriquecida {
  const bodyHtml = api.product.content?.body ?? "";
  const excerpt = api.product.content?.excerpt ?? "";
  const plainText = stripHtml(bodyHtml || excerpt);
  const metaDuration = getMetaValue(api, "duration");
  const venue = api.venues?.[0]?.name ?? preview.venue;
  const bairro =
    api.venues?.[0]?.address?.neighborhood ?? extractBairroFromVenue(venue);
  const fullPrice = api.lowestPrice?.full ?? null;
  const salePrice = api.lowestPrice?.sale ?? null;
  const maxDiscount = api.lowestPrice?.max_discount;
  const categoria =
    api.genres?.[0]?.name ?? preview.categoria_origem;

  const idadeMin = extractIdadeMinima(plainText);
  const idadeMax = extractIdadeMaxima(plainText);

  return {
    nome: api.product.title || preview.nome,
    categoria_origem: categoria,
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
    sinopse_oficial: excerpt || plainText.slice(0, 1200),
    horarios_sessao: extractHorariosSessao(bodyHtml || excerpt),
    duracao_minutos: extractDuracaoMinutos(plainText, metaDuration),
    idade_minima: idadeMin,
    idade_maxima: idadeMax,
    preco_inteira_centavos:
      fullPrice !== null && fullPrice > 0 ? String(fullPrice) : "",
    url_ingresso: productUrl,
  };
}

function mapPreviewFallback(preview: ListingPreview): LinhaEnriquecida {
  return {
    nome: preview.nome,
    categoria_origem: preview.categoria_origem,
    venue: preview.venue,
    bairro: extractBairroFromVenue(preview.venue),
    dias_apresentacao: preview.dias_apresentacao,
    desconto_percentual: preview.desconto_percentual,
    preco_bruto: preview.preco_bruto,
    url_origem: preview.url,
    sinopse_oficial: "",
    horarios_sessao: "",
    duracao_minutos: "",
    idade_minima: "",
    idade_maxima: "",
    preco_inteira_centavos: "",
    url_ingresso: preview.url,
  };
}

export async function scrapeAtracao(
  page: Page,
  preview: ListingPreview,
): Promise<LinhaEnriquecida> {
  const productUrl = preview.url;
  const apiPath = productApiPathFromUrl(productUrl);

  await gotoWithRetry(page, productUrl);
  await page.waitForTimeout(1500);

  const { status, data } = await fetchProductApi<ClubinhoProductApi>(page, apiPath);
  if (status === 200 && data) {
    return mapApiToLinha(preview, data, productUrl);
  }

  return mapPreviewFallback(preview);
}
