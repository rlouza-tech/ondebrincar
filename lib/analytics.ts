// lib/analytics.ts
// Helper para eventos de analytics via GTM dataLayer
// Todos os eventos definem o NSM: WAU Planejadores (usuários que disparam >= 1 evento de intenção)

import type { Atracao, IndoorOutdoor } from "@/lib/sanity/types";

declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export function trackEvent(eventName: string, params: object = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

// ── Tipos dos 5 eventos NSM ────────────────────────────────────────────────

export interface AttractionViewParams {
  attraction_id: string;
  attraction_name: string;
  category: string;
  neighborhood?: string;
  price_type?: "gratuito" | "pago";
  environment?: "indoor" | "outdoor" | "hibrido";
  age_min?: number;
  age_max?: number;
  source: "listing" | "detail_page";
}

export interface FilterUsedParams {
  filter_type: "neighborhood" | "age" | "category" | "price" | "environment";
  filter_value: string;
  active_filters_count: number;
  results_count?: number;
}

export interface SaveClickParams {
  attraction_id: string;
  attraction_name: string;
  category: string;
  source: "listing_card" | "detail_page";
}

export interface ShareClickParams {
  attraction_id: string;
  attraction_name: string;
  category: string;
  share_method: "copy_link" | "native_share" | "whatsapp";
  source: "listing_card" | "detail_page";
}

export interface OutboundClickParams {
  attraction_id: string;
  attraction_name: string;
  category: string;
  destination_url: string;
  destination_type: "sympla" | "eventim" | "official_site" | "instagram" | "clubinho" | "other";
  cta_label: string;
  source: "detail_page" | "listing_card";
  /** Canal de venda registrado no Sanity (sympla | eventim | outro). Útil para medir conversão por canal. */
  partner?: string;
}

/** Disparado especificamente ao clicar em "Ver ingresso". Coexiste com outbound_click. */
export type BuyTicketClickParams = Omit<OutboundClickParams, "source">;

export function mapEnvironmentForAnalytics(
  indoorOutdoor: IndoorOutdoor,
): NonNullable<AttractionViewParams["environment"]> {
  return indoorOutdoor === "ambos" ? "hibrido" : indoorOutdoor;
}

export function buildAttractionViewParams(
  atracao: Atracao,
  source: AttractionViewParams["source"],
): AttractionViewParams {
  return {
    attraction_id: atracao.slug,
    attraction_name: atracao.titulo,
    category: atracao.categoria,
    neighborhood: atracao.bairro,
    price_type: atracao.precoTipo,
    environment: mapEnvironmentForAnalytics(atracao.indoorOutdoor),
    age_min: atracao.idadeMin,
    age_max: atracao.idadeMax,
    source,
  };
}

export function detectDestinationType(
  url: string,
): OutboundClickParams["destination_type"] {
  if (url.includes("sympla.com.br")) return "sympla";
  if (url.includes("eventim.com.br")) return "eventim";
  if (url.includes("instagram.com")) return "instagram";
  if (url.includes("clubinhodeofertas.com.br")) return "clubinho";
  return "official_site";
}

export async function trackShareClick(
  atracao: Pick<Atracao, "slug" | "titulo" | "categoria">,
  shareUrl: string,
  source: ShareClickParams["source"],
): Promise<void> {
  let shareMethod: ShareClickParams["share_method"] = "copy_link";

  if (navigator.share) {
    try {
      await navigator.share({
        title: atracao.titulo,
        url: shareUrl,
      });
      shareMethod = "native_share";
    } catch {
      return;
    }
  } else {
    await navigator.clipboard.writeText(shareUrl);
  }

  trackEvent("share_click", {
    attraction_id: atracao.slug,
    attraction_name: atracao.titulo,
    category: atracao.categoria,
    share_method: shareMethod,
    source,
  } satisfies ShareClickParams);
}
