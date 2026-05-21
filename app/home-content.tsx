"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AtracaoCardLink } from "@/components/AtracaoCardLink";
import { HomeFilters } from "@/components/HomeFilters";
import { filtrarAtracoes, type Atracao } from "@/lib/atracoes";
import type { IndoorOutdoor, PrecoTipo } from "@/lib/sanity/types";

interface HomeContentProps {
  atracoes: Atracao[];
  bairros: string[];
}

function parseIdadeParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePrecoParam(value: string | null): PrecoTipo | undefined {
  if (value === "gratuito" || value === "pago") {
    return value;
  }
  return undefined;
}

function parseAmbienteParam(value: string | null): IndoorOutdoor | undefined {
  if (value === "indoor" || value === "outdoor" || value === "ambos") {
    return value;
  }
  return undefined;
}

export function HomeContent({ atracoes, bairros }: HomeContentProps) {
  const searchParams = useSearchParams();

  const filtros = useMemo(
    () => ({
      bairro: searchParams.get("bairro") ?? undefined,
      idade: parseIdadeParam(searchParams.get("idade")),
      categoria: searchParams.get("categoria") ?? undefined,
      preco: parsePrecoParam(searchParams.get("preco")),
      indoorOutdoor: parseAmbienteParam(searchParams.get("ambiente")),
    }),
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
        <h1 className="text-2xl font-semibold text-primary md:text-3xl">
          O que fazer com criança no Rio
        </h1>
        <p className="max-w-2xl text-base text-secondary">
          Peças, parques e museus selecionados para famílias cariocas — com
          ressalvas honestas sobre idade e logística.
        </p>
      </div>

      <HomeFilters bairros={bairros} />

      <p className="text-sm font-medium text-secondary" aria-live="polite">
        {contagemLabel}
      </p>

      {resultados.length === 0 ? (
        <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-primary">
          Nenhuma atração encontrada com esses filtros. Tente outro bairro,
          faixa etária ou categoria.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resultados.map((atracao) => (
            <li key={atracao.slug}>
              <AtracaoCardLink atracao={atracao} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
