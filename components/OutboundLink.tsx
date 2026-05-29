"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import {
  detectDestinationType,
  trackEvent,
  type OutboundClickParams,
} from "@/lib/analytics";
import type { Atracao } from "@/lib/sanity/types";

interface OutboundLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  atracao: Atracao;
  href: string;
  ctaLabel: string;
  source?: OutboundClickParams["source"];
  children: ReactNode;
}

export function OutboundLink({
  atracao,
  href,
  ctaLabel,
  source = "detail_page",
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
          source,
          partner: atracao.partner,
        };

        trackEvent("outbound_click", params);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
