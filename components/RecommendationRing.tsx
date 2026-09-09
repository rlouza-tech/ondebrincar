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
  /**
   * "ring" (padrão): trilha ao fim da ficha, mesmo formato desde a US-I33.
   * "rail" (US-I45): coluna lateral fixa (sticky) pro desktop — substitui o "ring"
   * nesse breakpoint, no lugar de duplicar a mesma recomendação duas vezes na página.
   */
  variant?: "ring" | "rail";
  /**
   * Override das classes do wrapper externo do variant "ring" — usado pela aba
   * "Sugestões" da FichaTabs (US-I52), que já provê a separação visual (a própria
   * faixa de abas), então dispensa o `mt-10 border-t ... pt-8` pensado pra quando o
   * "ring" era a última seção solta da página.
   */
  className?: string;
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

export function RecommendationRing({
  recomendacoes,
  variant = "ring",
  className,
}: RecommendationRingProps) {
  if (recomendacoes.length === 0) {
    return null;
  }

  const isRail = variant === "rail";
  const Wrapper = isRail ? "aside" : "section";

  return (
    <Wrapper
      className={
        isRail
          ? "hidden shrink-0 lg:sticky lg:top-8 lg:block lg:w-[340px]"
          : (className ?? "mt-10 border-t border-surface-muted pt-8 lg:hidden")
      }
    >
      <h2 className={isRail ? "text-lg font-display font-bold text-primary" : "text-xl font-display font-bold text-primary"}>
        Continue o programa
      </h2>
      {!isRail ? (
        <p className="mt-1 text-sm text-secondary">
          Mais programação por perto, pro mesmo fim de semana
        </p>
      ) : null}

      <ul className={isRail ? "mt-4 space-y-1" : "mt-5 space-y-3"}>
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
                className={
                  isRail
                    ? "flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    : "flex items-center gap-3 rounded-xl border border-primary/10 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
                }
              >
                <div
                  className={
                    isRail
                      ? "relative h-[72px] w-24 shrink-0 overflow-hidden rounded-lg bg-primary/5"
                      : "relative size-24 shrink-0 overflow-hidden rounded-lg bg-primary/5 sm:h-28 sm:w-[150px]"
                  }
                >
                  <Image
                    src={sanityImageUrl(recomendacao.imagemUrl, isRail ? 200 : 300)}
                    alt={`Foto: ${recomendacao.titulo}`}
                    fill
                    unoptimized
                    sizes={isRail ? "96px" : "(max-width: 640px) 96px, 150px"}
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  {isRail ? (
                    <>
                      <p className="line-clamp-2 text-sm font-semibold text-primary">
                        {recomendacao.titulo}
                      </p>
                      <p className="truncate text-xs text-secondary">
                        {badge.label(recomendacao.bairro)}
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Wrapper>
  );
}
