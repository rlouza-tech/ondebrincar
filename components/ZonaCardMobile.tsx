"use client";

import Image from "next/image";
import Link from "next/link";
import { sanityImageUrl } from "@/lib/atracoes";
import { useAttractionView } from "@/hooks/useAttractionView";
import type { Atracao } from "@/lib/sanity/types";

export interface ZonaCardMobileProps {
  atracao: Atracao;
}

/**
 * US-I50 — card mobile do carrossel de zona: par de `AtracaoCardLink` (usado no desktop,
 * US-I47), mais compacto (42% da largura, imagem 110px, só título + bairro) — layout
 * validado em dispositivo real no Discovery de 19/08 e no protótipo v2.
 */
export function ZonaCardMobile({ atracao }: ZonaCardMobileProps) {
  const cardRef = useAttractionView(atracao, "listing");

  return (
    <div ref={cardRef} className="w-[42%] shrink-0 snap-start">
      <Link
        href={`/atracao/${atracao.slug}`}
        className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative h-[110px] w-full overflow-hidden rounded-xl bg-surface-card">
          <Image
            src={sanityImageUrl(atracao.imagemUrl, 320)}
            alt={`Foto: ${atracao.titulo}`}
            fill
            unoptimized
            sizes="42vw"
            className="object-cover"
          />
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[12.5px] font-bold leading-tight text-primary">
          {atracao.titulo}
        </h3>
        <p className="mt-0.5 text-[11px] text-secondary">{atracao.bairro}</p>
      </Link>
    </div>
  );
}
