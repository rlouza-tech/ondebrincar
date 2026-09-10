"use client";

import Image from "next/image";
import Link from "next/link";
import { sanityImageUrl } from "@/lib/atracoes";
import { CATEGORIA_OPTIONS } from "@/lib/filter-options";
import { useAttractionView } from "@/hooks/useAttractionView";
import type { Atracao } from "@/lib/sanity/types";

export interface DestaqueCardMobileProps {
  atracao: Atracao;
}

function categoriaLabel(categoria: string): string {
  return CATEGORIA_OPTIONS.find((option) => option.value === categoria)?.label ?? categoria;
}

/**
 * US-I49 — card mobile da trilha "Destaques da semana": layout `.dcard` validado em
 * dispositivo real no Discovery de 19/08 (72% da largura da tela, imagem 170px, título até 2
 * linhas). Par de DestaqueCard (US-I43, desktop) — mesmo conteúdo, apresentação própria.
 */
export function DestaqueCardMobile({ atracao }: DestaqueCardMobileProps) {
  const cardRef = useAttractionView(atracao, "listing");
  const meta = [
    categoriaLabel(atracao.categoria),
    atracao.precoTipo === "gratuito" ? "Grátis" : atracao.bairro,
  ].join(" · ");

  return (
    <div ref={cardRef} className="w-[72vw] shrink-0 snap-start">
      <Link
        href={`/atracao/${atracao.slug}`}
        className="block overflow-hidden rounded-2xl border border-surface-muted bg-white transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative h-[170px] w-full bg-surface-card">
          <Image
            src={sanityImageUrl(atracao.imagemUrl, 480)}
            alt={`Foto: ${atracao.titulo}`}
            fill
            unoptimized
            sizes="72vw"
            className="object-cover"
          />
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-primary">
            {atracao.titulo}
          </h3>
          <p className="text-[12px] text-secondary">{meta}</p>
        </div>
      </Link>
    </div>
  );
}
