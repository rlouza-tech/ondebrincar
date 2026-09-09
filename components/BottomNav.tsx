"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CATEGORIA_TRIGGER_PARAM } from "@/lib/filter-options";
import { cn } from "@/lib/cn";

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

function CategoriasIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-6"
      aria-hidden
    >
      <path d="M11.5 3.5 20 12l-8 8-8.5-8.5V4a.5.5 0 0 1 .5-.5Z" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface NavItemDef {
  key: string;
  label: string;
  overrides: Record<string, string | null>;
  isActive: (params: {
    isHome: boolean;
    data: string;
    preco: string;
    categoria: string;
  }) => boolean;
  Icon: () => React.JSX.Element;
}

const NAV_ITEMS: NavItemDef[] = [
  {
    key: "inicio",
    label: "Início",
    overrides: { data: null, preco: null, categoria: null, [CATEGORIA_TRIGGER_PARAM]: null },
    isActive: ({ isHome, data, preco, categoria }) =>
      isHome && !data && !preco && !categoria,
    Icon: HomeIcon,
  },
  {
    key: "categorias",
    label: "Categorias",
    overrides: { [CATEGORIA_TRIGGER_PARAM]: "1" },
    isActive: ({ isHome, categoria }) => isHome && categoria.length > 0,
    Icon: CategoriasIcon,
  },
  {
    key: "fim-de-semana",
    label: "Esse fim de semana",
    overrides: { data: "fim-de-semana" },
    isActive: ({ isHome, data }) => isHome && data === "fim-de-semana",
    Icon: CalendarIcon,
  },
  {
    key: "gratis",
    label: "Grátis",
    overrides: { preco: "gratuito" },
    isActive: ({ isHome, preco }) => isHome && preco === "gratuito",
    Icon: TagIcon,
  },
];

function buildHref(
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

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isHome = pathname === "/";
  const state = {
    isHome,
    data: searchParams.get("data") ?? "",
    preco: searchParams.get("preco") ?? "",
    categoria: searchParams.get("categoria") ?? "",
  };

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-muted bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-screen-lg items-stretch justify-around">
        {NAV_ITEMS.map(({ key, label, overrides, isActive, Icon }) => {
          const active = isActive(state);
          return (
            <li key={key} className="flex-1">
              <Link
                href={buildHref(isHome, searchParams, overrides)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                  active ? "text-primary" : "text-ink-mid hover:text-primary",
                )}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}
