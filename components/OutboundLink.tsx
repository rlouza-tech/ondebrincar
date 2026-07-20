"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  detectDestinationType,
  trackEvent,
  type BuyTicketClickParams,
  type OutboundClickParams,
} from "@/lib/analytics";
import type { Atracao } from "@/lib/sanity/types";

interface OutboundLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  atracao: Atracao;
  href: string;
  ctaLabel: string;
  source?: OutboundClickParams["view_source"];
  /** Quando true, dispara buy_ticket_click em paralelo ao outbound_click. */
  isBuyTicket?: boolean;
  children: ReactNode;
}

export function OutboundLink({
  atracao,
  href,
  ctaLabel,
  source = "detail_page",
  isBuyTicket = false,
  children,
  ...props
}: OutboundLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        const params: OutboundClickParams = {
          attraction_id: atracao.slug,
          attraction_name: atracao.titulo,
          category: atracao.categoria,
          destination_url: href,
          destination_type: detectDestinationType(href),
          cta_label: ctaLabel,
          view_source: source,
          partner: atracao.origem,
        };

        trackEvent("outbound_click", params);

        if (isBuyTicket) {
          const buyParams: BuyTicketClickParams = {
            attraction_id: params.attraction_id,
            attraction_name: params.attraction_name,
            category: params.category,
            destination_url: params.destination_url,
            destination_type: params.destination_type,
            cta_label: params.cta_label,
            partner: params.partner,
          };
          trackEvent("buy_ticket_click", buyParams);
        }
      }}
      {...props}
    >
      {children}
    </a>
  );
}
