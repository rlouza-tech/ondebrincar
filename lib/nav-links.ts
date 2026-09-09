import { CATEGORIA_TRIGGER_PARAM } from "@/lib/filter-options";

export interface NavItemDef {
  key: string;
  label: string;
  overrides: Record<string, string | null>;
  isActive: (params: {
    isHome: boolean;
    data: string;
    preco: string;
    categoria: string;
  }) => boolean;
}

/** Monta o href de um atalho de navegação (bottom nav mobile, sidebar
 * desktop) reaproveitando os filtros já ativos via querystring quando a
 * navegação parte da própria home (US-I42, US-I44). */
export function buildHref(
  isHome: boolean,
  currentParams: URLSearchParams,
  overrides: Record<string, string | null>,
): string {
  const params = new URLSearchParams(isHome ? currentParams.toString() : "");
  params.delete(CATEGORIA_TRIGGER_PARAM);

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
