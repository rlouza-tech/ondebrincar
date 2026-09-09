"use client";

import Image from "next/image";
import Link from "next/link";
import { sanityImageUrl } from "@/lib/atracoes";
import { CATEGORIA_OPTIONS } from "@/lib/filter-options";
import { useAttractionView } from "@/hooks/useAttractionView";
import type { Atracao } from "@/lib/sanity/types";

export interface DestaqueCardProps {
  atracao: Atracao;
}

function categoriaLabel(categoria: string): string {
  return CATEGORIA_OPTIONS.find((option) => option.value === categoria)?.label ?? categoria;
}

/**
 * US-I43 — card da trilha "Destaques da semana": layout próprio, visivelmente maior que o
 * card padrão de listagem (340px de largura, imagem 240px — AtracaoCard tem imagem
 * proporcional a aspect-[4/3], sem largura fixa). Não reaproveita AtracaoCard (AC1).
 */
export function DestaqueCard({ atracao }: DestaqueCardProps) {
  const cardRef = useAttractionView(atracao, "listing");
  const meta = [
    categoriaLabel(atracao.categoria),
    atracao.precoTipo === "gratuito" ? "Grátis" : atracao.bairro,
  ].join(" · ");

  return (
    <div ref={cardRef} className="w-[340px] shrink-0 snap-start">
      <Link
        href={`/atracao/${atracao.slug}`}
        className="block overflow-hidden rounded-2xl border border-surface-muted bg-white transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative h-[240px] w-full bg-surface-card">
          <Image
            src={sanityImageUrl(atracao.imagemUrl, 680)}
            alt={`Foto: ${atracao.titulo}`}
            fill
            unoptimized
            sizes="340px"
            className="object-cover"
          />
        </div>
        <div className="space-y-1 p-4">
          <h3 className="line-clamp-2 text-[17px] font-bold leading-tight text-primary">
            {atracao.titulo}
          </h3>
          <p className="text-[13px] text-secondary">{meta}</p>
        </div>
      </Link>
    </div>
  );
}
