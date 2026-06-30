"use client";

import { trackEvent, type AddressClickParams } from "@/lib/analytics";
import type { Atracao } from "@/lib/sanity/types";

interface AddressLinkProps {
  atracao: Pick<Atracao, "slug" | "titulo" | "categoria">;
  endereco: string;
}

export function AddressLink({ atracao, endereco }: AddressLinkProps) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(endereco)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-primary"
      onClick={() => {
        const params: AddressClickParams = {
          attraction_id: atracao.slug,
          attraction_name: atracao.titulo,
          category: atracao.categoria,
          address: endereco,
        };
        trackEvent("address_click", params);
      }}
    >
      {endereco}
      <span aria-hidden="true">↗</span>
    </a>
  );
}
