"use client";

import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import {
  FILTER_PARAM_KEYS,
  getActiveFiltersFromParams,
  type FilterParamKey,
} from "@/lib/filter-options";
import { countActiveFilters } from "@/lib/atracoes";
import type { Atracao } from "@/lib/sanity/types";

interface ActiveFiltersProps {
  searchParams: ReadonlyURLSearchParams;
  atracoes: Atracao[];
}

function replaceSearchParams(
  router: ReturnType<typeof useRouter>,
  params: URLSearchParams,
) {
  const query = params.toString();
  router.replace(query ? `/?${query}` : "/", { scroll: false });
}

export function ActiveFilters({ searchParams }: ActiveFiltersProps) {
  const router = useRouter();
  const activeCount = countActiveFilters(searchParams);

  if (activeCount === 0) {
    return null;
  }

  const activeFilters = getActiveFiltersFromParams(searchParams);

  const removeFilter = (key: FilterParamKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    replaceSearchParams(router, params);
  };

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_PARAM_KEYS) {
      params.delete(key);
    }
    replaceSearchParams(router, params);
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Filtros ativos"
    >
      {activeFilters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={() => removeFilter(filter.key)}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {filter.label}
          <span aria-hidden="true">×</span>
          <span className="sr-only">{filter.srLabel}</span>
        </button>
      ))}

      {activeCount >= 2 ? (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Limpar tudo
        </button>
      ) : null}
    </div>
  );
}
