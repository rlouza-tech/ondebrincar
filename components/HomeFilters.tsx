"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterDropdown } from "@/components/FilterDropdown";
import {
  FiltersBottomSheet,
  FiltersIcon,
} from "@/components/FiltersBottomSheet";
import { trackEvent, type FilterUsedParams } from "@/lib/analytics";
import {
  CATEGORIA_OPTIONS,
  DATA_OPTIONS,
  FAIXAS_ETARIAS,
  getFilterDisplayLabel,
} from "@/lib/filter-options";
import {
  countActiveFilters,
  filtrarAtracoes,
  filtrosFromSearchParams,
} from "@/lib/atracoes";
import type { Atracao } from "@/lib/sanity/types";
import { cn } from "@/lib/cn";

interface HomeFiltersProps {
  bairros: string[];
  atracoes: Atracao[];
}

type PrimaryFilterKey = "idade" | "bairro" | "categoria" | "data";

const FILTER_TYPE_BY_PARAM: Record<string, FilterUsedParams["filter_type"]> = {
  bairro: "neighborhood",
  idade: "age",
  categoria: "category",
  preco: "price",
  ambiente: "environment",
  data: "date",
};

export function HomeFilters({ bairros, atracoes }: HomeFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [openDropdown, setOpenDropdown] = useState<PrimaryFilterKey | null>(
    null,
  );
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const bairrosAtivos = searchParams.getAll("bairro");
  const idadeAtiva = searchParams.get("idade") ?? "";
  const categoriaAtiva = searchParams.get("categoria") ?? "";
  const precoAtivo = searchParams.get("preco") ?? "";
  const ambienteAtivo = searchParams.get("ambiente") ?? "";
  const dataAtiva = searchParams.get("data") ?? "";

  const bairroDisplayLabel =
    bairrosAtivos.length === 1
      ? bairrosAtivos[0]
      : `Bairro (${bairrosAtivos.length})`;

  const secondaryActiveCount =
    (precoAtivo ? 1 : 0) + (ambienteAtivo ? 1 : 0);

  const bairroOptions = bairros.map((bairro) => ({
    label: bairro,
    value: bairro,
  }));

  const toggleBairro = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll("bairro");
    params.delete("bairro");

    const next = current.includes(value)
      ? current.filter((b) => b !== value)
      : [...current, value];

    for (const b of next) {
      params.append("bairro", b);
    }

    trackEvent("filter_used", {
      filter_type: "neighborhood",
      filter_value: value,
      active_filters_count: countActiveFilters(params),
      results_count: filtrarAtracoes(atracoes, filtrosFromSearchParams(params))
        .length,
    } satisfies FilterUsedParams);

    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

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

  const clearParam = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

  const clearSecondaryFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("preco");
    params.delete("ambiente");
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  };

  const handleDropdownOpen = (key: PrimaryFilterKey, open: boolean) => {
    setOpenDropdown(open ? key : null);
    if (open) {
      setBottomSheetOpen(false);
    }
  };

  return (
    <section aria-label="Filtros de busca">
      <div
        className={cn(
          "-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <FilterDropdown
          pillLabel="Idade"
          activeValue={idadeAtiva}
          activeDisplayLabel={
            idadeAtiva ? getFilterDisplayLabel("idade", idadeAtiva) : ""
          }
          options={FAIXAS_ETARIAS}
          isOpen={openDropdown === "idade"}
          onOpenChange={(open) => handleDropdownOpen("idade", open)}
          onSelect={(value) => toggleParam("idade", value, idadeAtiva)}
          onClear={() => clearParam("idade")}
        />

        <FilterDropdown
          pillLabel="Bairro"
          activeValue={bairrosAtivos[0] ?? ""}
          activeValues={bairrosAtivos}
          activeDisplayLabel={bairroDisplayLabel}
          options={bairroOptions}
          isOpen={openDropdown === "bairro"}
          onOpenChange={(open) => handleDropdownOpen("bairro", open)}
          onSelect={toggleBairro}
          onClear={() => clearParam("bairro")}
          multiSelect
        />

        <FilterDropdown
          pillLabel="Tipo"
          activeValue={categoriaAtiva}
          activeDisplayLabel={
            categoriaAtiva
              ? getFilterDisplayLabel("categoria", categoriaAtiva)
              : ""
          }
          options={CATEGORIA_OPTIONS}
          isOpen={openDropdown === "categoria"}
          onOpenChange={(open) => handleDropdownOpen("categoria", open)}
          onSelect={(value) => toggleParam("categoria", value, categoriaAtiva)}
          onClear={() => clearParam("categoria")}
        />

        <FilterDropdown
          pillLabel="Data"
          activeValue={dataAtiva}
          activeDisplayLabel={
            dataAtiva ? getFilterDisplayLabel("data", dataAtiva) : ""
          }
          options={DATA_OPTIONS}
          isOpen={openDropdown === "data"}
          onOpenChange={(open) => handleDropdownOpen("data", open)}
          onSelect={(value) => toggleParam("data", value, dataAtiva)}
          onClear={() => clearParam("data")}
        />

        <button
          type="button"
          onClick={() => {
            setOpenDropdown(null);
            setBottomSheetOpen(true);
          }}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-white px-4 text-sm font-medium text-primary transition-colors",
            "hover:border-primary/40 hover:bg-primary/5",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            secondaryActiveCount > 0 && "border-primary/30 bg-primary/10",
          )}
        >
          <FiltersIcon />
          <span>Filtros</span>
          {secondaryActiveCount > 0 ? (
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
              {secondaryActiveCount}
            </span>
          ) : null}
        </button>
      </div>

      <FiltersBottomSheet
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        precoAtivo={precoAtivo}
        ambienteAtivo={ambienteAtivo}
        onTogglePreco={(value) => toggleParam("preco", value, precoAtivo)}
        onToggleAmbiente={(value) => toggleParam("ambiente", value, ambienteAtivo)}
        onClearSecondary={clearSecondaryFilters}
      />
    </section>
  );
}
