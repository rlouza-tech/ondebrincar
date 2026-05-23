"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/FilterChip";
import { trackEvent, type FilterUsedParams } from "@/lib/analytics";
import {
  AMBIENTE_OPTIONS,
  CATEGORIA_OPTIONS,
  FAIXAS_ETARIAS,
  PRECO_OPTIONS,
} from "@/lib/filter-options";
import {
  countActiveFilters,
  filtrarAtracoes,
  filtrosFromSearchParams,
} from "@/lib/atracoes";
import type { Atracao } from "@/lib/sanity/types";

interface HomeFiltersProps {
  bairros: string[];
  atracoes: Atracao[];
}

const FILTER_TYPE_BY_PARAM: Record<string, FilterUsedParams["filter_type"]> = {
  bairro: "neighborhood",
  idade: "age",
  categoria: "category",
  preco: "price",
  ambiente: "environment",
};

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-primary">{label}</p>
      <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1">
        {children}
      </div>
    </div>
  );
}

export function HomeFilters({ bairros, atracoes }: HomeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bairroAtivo = searchParams.get("bairro") ?? "";
  const idadeAtiva = searchParams.get("idade") ?? "";
  const categoriaAtiva = searchParams.get("categoria") ?? "";
  const precoAtivo = searchParams.get("preco") ?? "";
  const ambienteAtivo = searchParams.get("ambiente") ?? "";

  const toggleParam = (key: string, value: string, ativo: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextValue = ativo === value ? null : value;

    if (nextValue === null) {
      params.delete(key);
    } else {
      params.set(key, nextValue);
    }

    const filterType = FILTER_TYPE_BY_PARAM[key];
    if (filterType) {
      trackEvent("filter_used", {
        filter_type: filterType,
        filter_value: value,
        active_filters_count: countActiveFilters(params),
        results_count: filtrarAtracoes(atracoes, filtrosFromSearchParams(params))
          .length,
      } satisfies FilterUsedParams);
    }

    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

  return (
    <section
      className="space-y-4 rounded-xl border border-primary/10 bg-white p-4 shadow-sm"
      aria-label="Filtros de busca"
    >
      <FilterGroup label="Bairro">
        {bairros.map((bairro) => (
          <FilterChip
            key={bairro}
            label={bairro}
            selected={bairroAtivo === bairro}
            onClick={() => toggleParam("bairro", bairro, bairroAtivo)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Idade da criança">
        {FAIXAS_ETARIAS.map((faixa) => (
          <FilterChip
            key={faixa.value}
            label={faixa.label}
            selected={idadeAtiva === faixa.value}
            onClick={() => toggleParam("idade", faixa.value, idadeAtiva)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Categoria">
        {CATEGORIA_OPTIONS.map((opcao) => (
          <FilterChip
            key={opcao.value}
            label={opcao.label}
            selected={categoriaAtiva === opcao.value}
            onClick={() => toggleParam("categoria", opcao.value, categoriaAtiva)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Preço">
        {PRECO_OPTIONS.map((opcao) => (
          <FilterChip
            key={opcao.value}
            label={opcao.label}
            selected={precoAtivo === opcao.value}
            onClick={() => toggleParam("preco", opcao.value, precoAtivo)}
          />
        ))}
      </FilterGroup>

      <FilterGroup label="Ambiente">
        {AMBIENTE_OPTIONS.map((opcao) => (
          <FilterChip
            key={opcao.value}
            label={opcao.label}
            selected={ambienteAtivo === opcao.value}
            onClick={() => toggleParam("ambiente", opcao.value, ambienteAtivo)}
          />
        ))}
      </FilterGroup>
    </section>
  );
}
