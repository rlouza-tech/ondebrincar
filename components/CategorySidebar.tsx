"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORIA_OPTIONS } from "@/lib/filter-options";
import { buildHref, type NavItemDef } from "@/lib/nav-links";
import { cn } from "@/lib/cn";

/** Menu lateral fixo do desktop (US-I44) — só é montado na home, então os
 * hrefs sempre carregam os filtros já ativos via querystring (isHome=true). */
const EXPLORAR_ITEMS: NavItemDef[] = [
  {
    key: "inicio",
    label: "Início",
    overrides: { data: null, preco: null, categoria: null },
    isActive: ({ data, preco, categoria }) => !data && !preco && !categoria,
  },
  {
    key: "fim-de-semana",
    label: "Esse fim de semana",
    overrides: { data: "fim-de-semana" },
    isActive: ({ data }) => data === "fim-de-semana",
  },
  {
    key: "gratis",
    label: "Grátis",
    overrides: { preco: "gratuito" },
    isActive: ({ preco }) => preco === "gratuito",
  },
];

function CategorySidebarInner() {
  const searchParams = useSearchParams();

  const state = {
    isHome: true,
    data: searchParams.get("data") ?? "",
    preco: searchParams.get("preco") ?? "",
    categoria: searchParams.get("categoria") ?? "",
  };

  return (
    <aside
      aria-label="Navegação por categoria"
      className="hidden self-start lg:sticky lg:top-8 lg:block"
    >
      <nav className="space-y-7">
        <div>
          <p className="mb-2.5 px-3 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
            Explorar
          </p>
          <ul>
            {EXPLORAR_ITEMS.map(({ key, label, overrides, isActive }) => {
              const active = isActive(state);
              return (
                <li key={key}>
                  <Link
                    href={buildHref(true, searchParams, overrides)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-[14.5px] font-semibold transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-ink hover:bg-surface-muted",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2.5 px-3 text-xs font-extrabold uppercase tracking-wide text-ink-soft">
            Categorias
          </p>
          <ul>
            {CATEGORIA_OPTIONS.map(({ label, value }) => {
              const active = state.categoria === value;
              return (
                <li key={value}>
                  <Link
                    href={buildHref(true, searchParams, {
                      categoria: active ? null : value,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-[7px] text-sm transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-ink-mid hover:bg-surface-muted hover:text-ink",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}

export function CategorySidebar() {
  return (
    <Suspense fallback={null}>
      <CategorySidebarInner />
    </Suspense>
  );
}
