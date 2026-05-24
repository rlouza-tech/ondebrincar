"use client";

import { useEffect } from "react";
import { FilterChip } from "@/components/FilterChip";
import { AMBIENTE_OPTIONS, PRECO_OPTIONS } from "@/lib/filter-options";
import type { IndoorOutdoor, PrecoTipo } from "@/lib/sanity/types";
import { cn } from "@/lib/cn";

interface FiltersBottomSheetProps {
  open: boolean;
  onClose: () => void;
  precoAtivo: string;
  ambienteAtivo: string;
  onTogglePreco: (value: PrecoTipo) => void;
  onToggleAmbiente: (value: IndoorOutdoor) => void;
  onClearSecondary: () => void;
}

function getAmbienteChipLabel(value: IndoorOutdoor, defaultLabel: string): string {
  if (value === "ambos") {
    return "Indoor e outdoor";
  }
  return defaultLabel;
}

function FiltersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 shrink-0"
      aria-hidden
    >
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
    </svg>
  );
}

export function FiltersBottomSheet({
  open,
  onClose,
  precoAtivo,
  ambienteAtivo,
  onTogglePreco,
  onToggleAmbiente,
  onClearSecondary,
}: FiltersBottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Filtros">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar filtros"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 rounded-t-2xl bg-white p-6 shadow-lg">
        <div className="mx-auto mb-4 h-1 w-10 rounded bg-primary/20" aria-hidden />

        <h2 className="mb-6 text-lg font-semibold text-primary">Filtros</h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Preço</p>
            <div className="flex flex-wrap gap-2">
              {PRECO_OPTIONS.map((opcao) => (
                <FilterChip
                  key={opcao.value}
                  label={opcao.label}
                  selected={precoAtivo === opcao.value}
                  onClick={() => onTogglePreco(opcao.value)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Ambiente</p>
            <div className="flex flex-wrap gap-2">
              {AMBIENTE_OPTIONS.map((opcao) => (
                <FilterChip
                  key={opcao.value}
                  label={getAmbienteChipLabel(opcao.value, opcao.label)}
                  selected={ambienteAtivo === opcao.value}
                  onClick={() => onToggleAmbiente(opcao.value)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onClearSecondary();
              onClose();
            }}
            className="text-sm text-secondary underline underline-offset-2 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Limpar filtros
          </button>

          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground",
              "transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export { FiltersIcon };
