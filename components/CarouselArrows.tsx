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

export interface CarouselArrowsProps {
  canScrollPrev: boolean;
  canScrollNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** Prefixo do aria-label, ex.: "Destaques", "Zona Sul" — some sozinho quando não há o que rolar. */
  ariaLabelPrefix: string;
}

/** US-I43/US-I47 — setinhas prev/next sobrepostas nas bordas de uma trilha horizontal. */
export function CarouselArrows({
  canScrollPrev,
  canScrollNext,
  onPrev,
  onNext,
  ariaLabelPrefix,
}: CarouselArrowsProps) {
  return (
    <>
      {canScrollPrev && (
        <button
          type="button"
          onClick={onPrev}
          aria-label={`Rolar ${ariaLabelPrefix} para a esquerda`}
          className="absolute -left-4 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-muted bg-white text-primary shadow-md transition-shadow hover:shadow-lg"
        >
          <ChevronIcon direction="left" />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={onNext}
          aria-label={`Rolar ${ariaLabelPrefix} para a direita`}
          className="absolute -right-4 top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-surface-muted bg-white text-primary shadow-md transition-shadow hover:shadow-lg"
        >
          <ChevronIcon direction="right" />
        </button>
      )}
    </>
  );
}
