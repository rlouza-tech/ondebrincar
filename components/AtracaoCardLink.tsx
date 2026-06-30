"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import { AtracaoCard } from "@/components/AtracaoCard";
import {
  formatFaixaEtaria,
  formatPreco,
} from "@/lib/atracoes";
import { buildShareUrl, trackEvent, trackShareClick, type SaveClickParams } from "@/lib/analytics";
import { useAttractionView } from "@/hooks/useAttractionView";
import type { Atracao } from "@/lib/sanity/types";
import { cn } from "@/lib/cn";

export interface AtracaoCardLinkProps {
  atracao: Atracao;
  className?: string;
  filterRef?: string;
  sempreDisponivel?: boolean;
}

export function AtracaoCardLink({ atracao, className, filterRef, sempreDisponivel }: AtracaoCardLinkProps) {
  const [favorite, setFavorite] = useState(false);
  const cardRef = useAttractionView(atracao, "listing");

  const handleFavoriteToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!favorite) {
      trackEvent("save_click", {
        attraction_id: atracao.slug,
        attraction_name: atracao.titulo,
        category: atracao.categoria,
        source: "listing_card",
      } satisfies SaveClickParams);
    }

    setFavorite((value) => !value);
  };

  const handleShareClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = buildShareUrl(`${window.location.origin}/atracao/${atracao.slug}`, "ob_card");
    await trackShareClick(atracao, shareUrl, "listing_card");
  };

  return (
    <div ref={cardRef} className={cn("relative", className)}>
      <Link
        href={filterRef ? `/atracao/${atracao.slug}?ref=${encodeURIComponent(filterRef)}` : `/atracao/${atracao.slug}`}
        className="block rounded-xl transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <AtracaoCard
          name={atracao.titulo}
          ageRange={formatFaixaEtaria(atracao.idadeMin, atracao.idadeMax)}
          price={formatPreco(atracao)}
          imageUrl={atracao.imagemUrl}
          imageAlt={`Foto: ${atracao.titulo}`}
          bairro={atracao.bairro}
          proximaData={atracao.proximaData}
          categoria={atracao.categoria}
          sempreDisponivel={sempreDisponivel}
          favorite={favorite}
          onFavoriteToggle={handleFavoriteToggle}
          onShareClick={handleShareClick}
        />
      </Link>
    </div>
  );
}
