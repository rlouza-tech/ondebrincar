"use client";

import { useCallback, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/FilterChip";
import type { IndoorOutdoor, PrecoTipo } from "@/lib/sanity/types";

export const FAIXAS_ETARIAS = [
  { label: "0–2 anos", value: "2" },
  { label: "3–5 anos", value: "5" },
  { label: "6–9 anos", value: "9" },
  { label: "10–13 anos", value: "13" },
] as const;

export const CATEGORIA_OPTIONS = [
  { label: "Teatro", value: "teatro" },
  { label: "Parque", value: "parque" },
  { label: "Museu", value: "museu" },
  { label: "Atividade extra", value: "atividade-extra" },
  { label: "Evento", value: "evento" },
] as const;

export const PRECO_OPTIONS: Array<{ label: string; value: PrecoTipo }> = [
  { label: "Gratuito", value: "gratuito" },
  { label: "Pago", value: "pago" },
];

export const AMBIENTE_OPTIONS: Array<{ label: string; value: IndoorOutdoor }> = [
  { label: "Indoor", value: "indoor" },
  { label: "Outdoor", value: "outdoor" },
  { label: "Ambos", value: "ambos" },
];

interface HomeFiltersProps {
  bairros: string[];
}

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

export function HomeFilters({ bairros }: HomeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const bairroAtivo = searchParams.get("bairro") ?? "";
  const idadeAtiva = searchParams.get("idade") ?? "";
  const categoriaAtiva = searchParams.get("categoria") ?? "";
  const precoAtivo = searchParams.get("preco") ?? "";
  const ambienteAtivo = searchParams.get("ambiente") ?? "";

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `/?${query}` : "/", { scroll: false });
    },
    [router, searchParams],
  );

  const toggleParam = (key: string, value: string, ativo: string) => {
    setParam(key, ativo === value ? null : value);
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
