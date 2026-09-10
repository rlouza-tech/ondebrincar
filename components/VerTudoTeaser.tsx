"use client";

interface VerTudoTeaserProps {
  count: number;
  onClick: () => void;
}

/**
 * US-I56 — card teaser que substitui a listagem completa (HomeFilters + grid) na home,
 * logo após o último carrossel de zona. Ao tocar, `HomeContent` expande a seção real.
 */
export function VerTudoTeaser({ count, onClick }: VerTudoTeaserProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-primary/40 bg-white px-6 py-7 text-center transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="font-display text-3xl font-bold text-primary">{count}</span>
      <span className="text-sm text-secondary">
        atrações pra explorar no Rio inteiro
      </span>
      <span className="text-sm font-semibold text-primary">
        toque pra ver todas →
      </span>
    </button>
  );
}
