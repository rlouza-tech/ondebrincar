"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

export type FichaTabKey = "detalhes" | "sugestoes";

interface FichaTabsProps {
  detalhes: React.ReactNode;
  sugestoes: React.ReactNode;
}

const TABS: { key: FichaTabKey; label: string }[] = [
  { key: "detalhes", label: "Detalhes" },
  { key: "sugestoes", label: "Sugestões" },
];

/**
 * Abas mobile da ficha (US-I52), estilo Netflix/Prime: "Detalhes" por padrão,
 * "Sugestões" reaproveita o variant "ring" da RecommendationRing (US-I45) sem
 * duplicar lógica de recomendação. No desktop (lg+) a faixa de abas some e os
 * dois painéis assumem o layout já existente antes desta story (Detalhes visível,
 * Sugestões cede lugar ao Right Rail, que é renderizado fora deste componente).
 */
export function FichaTabs({ detalhes, sugestoes }: FichaTabsProps) {
  const [activeTab, setActiveTab] = useState<FichaTabKey>("detalhes");
  const baseId = useId();

  return (
    <div>
      <div
        role="tablist"
        aria-label="Informações da atração"
        className="flex border-b-2 border-surface-muted lg:hidden"
      >
        {TABS.map(({ key, label }) => {
          const active = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${key}`}
              aria-selected={active}
              aria-controls={`${baseId}-panel-${key}`}
              onClick={() => setActiveTab(key)}
              className={cn(
                "-mb-0.5 flex-1 border-b-[3px] px-1 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-secondary hover:text-primary",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-detalhes`}
        aria-labelledby={`${baseId}-tab-detalhes`}
        className={cn("space-y-4 pt-4", activeTab === "detalhes" ? "block" : "hidden")}
      >
        {detalhes}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel-sugestoes`}
        aria-labelledby={`${baseId}-tab-sugestoes`}
        className={cn(activeTab === "sugestoes" ? "block" : "hidden")}
      >
        {sugestoes}
      </div>
    </div>
  );
}
