"use client";

import { CarouselArrows } from "@/components/CarouselArrows";
import { DestaqueCard } from "@/components/DestaqueCard";
import { useCarouselScroll } from "@/hooks/useCarouselScroll";
import type { Atracao } from "@/lib/sanity/types";

export interface DestaquesTrilhaProps {
  destaques: Atracao[];
}

/**
 * US-I43 — trilha "Destaques da semana" (desktop): curadoria 100% Sanity (US-I51), sem
 * lógica de seleção aqui, só exibição na ordem que a query já devolve. Sem destaques
 * (Sanity não configurado, doc ainda não existe ou erro de fetch), a seção inteira some —
 * decisão do Rafa, não há fallback automático (AC5).
 */
export function DestaquesTrilha({ destaques }: DestaquesTrilhaProps) {
  const { trackRef, canScrollPrev, canScrollNext, scroll } = useCarouselScroll(destaques.length);

  if (destaques.length === 0) {
    return null;
  }

  return (
    <section aria-label="Destaques da semana" className="space-y-3.5">
      <h2 className="font-display text-[22px] font-semibold text-ink">
        ✨ Destaques da semana
      </h2>
      <div className="relative">
        <CarouselArrows
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
          onPrev={() => scroll(-1)}
          onNext={() => scroll(1)}
          ariaLabelPrefix="Destaques"
        />
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-surface-muted [&::-webkit-scrollbar]:h-2"
        >
          {destaques.map((atracao) => (
            <DestaqueCard key={atracao.slug} atracao={atracao} />
          ))}
        </div>
      </div>
    </section>
  );
}
