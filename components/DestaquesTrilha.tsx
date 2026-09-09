"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DestaqueCard } from "@/components/DestaqueCard";
import type { Atracao } from "@/lib/sanity/types";

export interface DestaquesTrilhaProps {
  destaques: Atracao[];
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      className="size-4"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
      />
    </svg>
  );
}

/**
 * US-I43 — trilha "Destaques da semana" (desktop): curadoria 100% Sanity (US-I51), sem
 * lógica de seleção aqui, só exibição na ordem que a query já devolve. Sem destaques
 * (Sanity não configurado, doc ainda não existe ou erro de fetch), a seção inteira some —
 * decisão do Rafa, não há fallback automático (AC5).
 */
export function DestaquesTrilha({ destaques }: DestaquesTrilhaProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 2);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, destaques.length]);

  const scroll = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (destaques.length === 0) {
    return null;
  }

  return (
    <section aria-label="Destaques da semana" className="space-y-3.5">
      <h2 className="font-display text-[22px] font-semibold text-ink">
        ✨ Destaques da semana
      </h2>
      <div className="relative">
        {canScrollPrev && (
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Rolar Destaques para a esquerda"
            className="absolute -left-4 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-muted bg-white text-primary shadow-md transition-shadow hover:shadow-lg"
          >
            <ChevronIcon direction="left" />
          </button>
        )}
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-surface-muted [&::-webkit-scrollbar]:h-2"
        >
          {destaques.map((atracao) => (
            <DestaqueCard key={atracao.slug} atracao={atracao} />
          ))}
        </div>
        {canScrollNext && (
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Rolar Destaques para a direita"
            className="absolute -right-4 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-muted bg-white text-primary shadow-md transition-shadow hover:shadow-lg"
          >
            <ChevronIcon direction="right" />
          </button>
        )}
      </div>
    </section>
  );
}
