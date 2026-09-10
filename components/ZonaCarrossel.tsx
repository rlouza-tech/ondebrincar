"use client";

import Link from "next/link";
import { AtracaoCardLink } from "@/components/AtracaoCardLink";
import { CarouselArrows } from "@/components/CarouselArrows";
import { useCarouselScroll } from "@/hooks/useCarouselScroll";
import type { CarrosselZona, ZonaId } from "@/lib/zonas";
import { zonaVerTodasHref } from "@/lib/zonas";

export interface ZonaCarrosselProps {
  carrossel: CarrosselZona;
}

const ZONA_LABEL: Record<ZonaId, string> = {
  "zona-sul": "🏖️ Zona Sul",
  "zona-sudoeste": "🌴 Zona Sudoeste",
  "zona-norte": "🏙️ Zona Norte",
  "zona-central": "🏛️ Zona Central",
  "zona-oeste": "🌇 Zona Oeste",
};

const ZONA_NOME: Record<ZonaId, string> = {
  "zona-sul": "Zona Sul",
  "zona-sudoeste": "Zona Sudoeste",
  "zona-norte": "Zona Norte",
  "zona-central": "Zona Central",
  "zona-oeste": "Zona Oeste",
};

/**
 * US-I47 — carrossel de uma zona: mesmo padrão de trilha horizontal com setinhas de
 * `DestaquesTrilha` (US-I43), mas com o card padrão de listagem (`AtracaoCardLink`,
 * 220px/165px), não o `.destaque-card` maior (AC1). Card "Ver todas — Zona X" sempre
 * aparece no fim, reaproveitando o filtro de bairro multi-select (AC5).
 */
export function ZonaCarrossel({ carrossel }: ZonaCarrosselProps) {
  const { trackRef, canScrollPrev, canScrollNext, scroll } = useCarouselScroll(
    carrossel.atracoes.length,
  );
  const nome = ZONA_NOME[carrossel.id];

  return (
    <section aria-label={nome} className="space-y-3.5">
      <h2 className="font-display text-[22px] font-semibold text-ink">
        {ZONA_LABEL[carrossel.id]}
      </h2>
      <div className="relative">
        <CarouselArrows
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
          onPrev={() => scroll(-1)}
          onNext={() => scroll(1)}
          ariaLabelPrefix={nome}
        />
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-surface-muted [&::-webkit-scrollbar]:h-2"
        >
          {carrossel.atracoes.map((atracao) => (
            <AtracaoCardLink
              key={atracao.slug}
              atracao={atracao}
              className="w-[220px] shrink-0 snap-start"
            />
          ))}
          <Link
            href={zonaVerTodasHref(carrossel.bairros)}
            className="flex w-[220px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-surface-muted p-4 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span>Ver todas — {nome} →</span>
            <span className="text-xs font-medium text-secondary">
              ({carrossel.total} no total)
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
