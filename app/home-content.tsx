"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ActiveFilters } from "@/components/ActiveFilters";
import { AtracaoCardLink } from "@/components/AtracaoCardLink";
import { HomeFilters } from "@/components/HomeFilters";
import { ShareSearchButton } from "@/components/ShareSearchButton";
import { filtrarAtracoes, filtrosFromSearchParams, type Atracao } from "@/lib/atracoes";

interface HomeContentProps {
  atracoes: Atracao[];
  bairros: string[];
}

export function HomeContent({ atracoes, bairros }: HomeContentProps) {
  const searchParams = useSearchParams();

  const filtros = useMemo(
    () => filtrosFromSearchParams(searchParams),
    [searchParams],
  );

  const resultados = useMemo(
    () => filtrarAtracoes(atracoes, filtros),
    [atracoes, filtros],
  );

  const contagemLabel =
    resultados.length === 1
      ? "1 atração encontrada"
      : `${resultados.length} atrações encontradas`;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-success">
          Curadoria humana
        </p>
        <h1 className="text-2xl font-display font-bold text-primary md:text-3xl">
          O que fazer com criança no Rio
        </h1>
        <p className="max-w-2xl text-base text-secondary">
          Peças, parques e museus selecionados para famílias cariocas — com
          ressalvas honestas sobre idade e logística.
        </p>
      </div>

      <HomeFilters bairros={bairros} atracoes={atracoes} />

      <ActiveFilters searchParams={searchParams} atracoes={atracoes} />

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium text-secondary" aria-live="polite">
          {contagemLabel}
        </p>
        <ShareSearchButton searchParams={searchParams} />
      </div>

      {resultados.length === 0 ? (
        <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-primary">
          Nenhuma atração encontrada com esses filtros. Tente outro bairro,
          faixa etária ou categoria.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resultados.map((atracao) => (
            <li key={atracao.slug}>
              <AtracaoCardLink
                atracao={atracao}
                filterRef={searchParams.toString()}
                sempreDisponivel={filtros.data !== undefined && !atracao.proximaData}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
