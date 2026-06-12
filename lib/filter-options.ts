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
  { label: "Pracinha", value: "pracinha" },
  { label: "Museu", value: "museu" },
  { label: "Praia", value: "praia" },
  { label: "Atividade extra", value: "atividade-extra" },
  { label: "Evento", value: "evento" },
  { label: "Colônia de Férias", value: "colonia-de-ferias" },
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

export const FILTER_PARAM_KEYS = [
  "bairro",
  "idade",
  "categoria",
  "preco",
  "ambiente",
] as const;

export type FilterParamKey = (typeof FILTER_PARAM_KEYS)[number];

export const FILTER_PARAM_LABELS: Record<FilterParamKey, string> = {
  bairro: "Bairro",
  idade: "Idade",
  categoria: "Categoria",
  preco: "Preço",
  ambiente: "Ambiente",
};

export interface ActiveFilterItem {
  key: FilterParamKey;
  value: string;
  label: string;
  srLabel: string;
}

export function getFilterDisplayLabel(paramKey: FilterParamKey, value: string): string {
  switch (paramKey) {
    case "bairro":
      return value;
    case "idade": {
      const faixa = FAIXAS_ETARIAS.find((item) => item.value === value);
      return faixa?.label ?? value;
    }
    case "categoria": {
      const categoria = CATEGORIA_OPTIONS.find((item) => item.value === value );
      return categoria?.label ?? value;
    }
    case "preco": {
      const preco = PRECO_OPTIONS.find((item) => item.value === value);
      return preco?.label ?? value;
    }
    case "ambiente": {
      if (value === "ambos") {
        return "Indoor e outdoor";
      }
      const ambiente = AMBIENTE_OPTIONS.find((item) => item.value === value);
      return ambiente?.label ?? value;
    }
    default:
      return value;
  }
}

export function getActiveFiltersFromParams(
  params: URLSearchParams,
): ActiveFilterItem[] {
  const items: ActiveFilterItem[] = [];

  for (const key of FILTER_PARAM_KEYS) {
    const value = params.get(key);
    if (!value) {
      continue;
    }

    const label = getFilterDisplayLabel(key, value);
    items.push({
      key,
      value,
      label,
      srLabel: `Remover filtro ${FILTER_PARAM_LABELS[key]}: ${label}`,
    });
  }

  return items;
}
