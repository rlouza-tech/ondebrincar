"use client";

import Image from "next/image";
import Link from "next/link";
import { sanityImageUrl } from "@/lib/atracoes";
import { trackEvent, type RecommendationClickParams } from "@/lib/analytics";
import { formatDataCurta } from "@/lib/format-date";
import { cn } from "@/lib/cn";
import type { EixoRecomendacao, Recomendacao } from "@/lib/recomendacoes";

export interface RecommendationRingProps {
  recomendacoes: Recomendacao[];
}

const EIXO_BADGE: Record<EixoRecomendacao, { label: (bairro: string) => string; className: string }> = {
  bairro: {
    label: (bairro) => `Também em ${bairro}`,
    className: "bg-brand-accent text-white",
  },
  tema: {
    label: () => "Mesmo tema",
    className: "bg-brand-secondary text-white",
  },
};

export function RecommendationRing({ recomendacoes }: RecommendationRingProps) {
  if (recomendacoes.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 border-t border-surface-muted pt-8">
      <h2 className="text-xl font-display font-bold text-primary">Continue o programa</h2>
      <p className="mt-1 text-sm text-secondary">
        Mais programação por perto, pro mesmo fim de semana
      </p>

      <ul className="mt-5 space-y-3">
        {recomendacoes.map((recomendacao, index) => {
          const badge = EIXO_BADGE[recomendacao.eixo];
          return (
            <li key={recomendacao.slug}>
              <Link
                href={`/atracao/${recomendacao.slug}`}
                onClick={() => {
                  trackEvent("recommendation_click", {
                    attraction_id: recomendacao.slug,
                    attraction_name: recomendacao.titulo,
                    category: recomendacao.categoria,
                    position: index,
                    axis: recomendacao.eixo,
                  } satisfies RecommendationClickParams);
                }}
                className="flex items-center gap-3 rounded-xl border border-primary/10 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
              >
                <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-primary/5 sm:h-28 sm:w-[150px]">
                  <Image
                    src={sanityImageUrl(recomendacao.imagemUrl, 300)}
                    alt={`Foto: ${recomendacao.titulo}`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 96px, 150px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-xs font-semibold",
                      badge.className,
                    )}
                  >
                    {badge.label(recomendacao.bairro)}
                  </span>
                  <p className="truncate font-semibold text-primary">{recomendacao.titulo}</p>
                  <p className="truncate text-sm text-secondary">{recomendacao.bairro}</p>
                  {recomendacao.proximaData ? (
                    <p className="text-sm font-bold text-brand-primary">
                      {formatDataCurta(recomendacao.proximaData)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
