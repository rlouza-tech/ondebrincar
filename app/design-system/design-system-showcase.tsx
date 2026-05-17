"use client";

import { useState } from "react";
import { AtracaoCard } from "@/components/AtracaoCard";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FilterChip } from "@/components/FilterChip";

const FILTER_OPTIONS = ["Zona Sul", "Gratuito", "4–6 anos", "Fim de semana"];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

function ViewportFrame({
  width,
  label,
  children,
}: {
  width: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-secondary">
        {label} ({width}px)
      </p>
      <div
        className="overflow-hidden rounded-lg border border-dashed border-primary/20 bg-white"
        style={{ width: `${width}px`, maxWidth: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

export function DesignSystemShowcase() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([
    "Zona Sul",
  ]);
  const [favorite, setFavorite] = useState(false);

  const toggleFilter = (label: string) => {
    setSelectedFilters((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };

  return (
    <div className="space-y-12">
      <Section title="Button">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm text-secondary">Variantes</p>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-secondary">Tamanhos</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-secondary">Estados</p>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button loading>
                Loading
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["none", "sm", "md", "lg"] as const).map((padding) => (
            <Card key={padding} padding={padding}>
              <p className="text-sm font-medium text-primary">
                padding=&quot;{padding}&quot;
              </p>
              <p className="text-sm text-secondary">Container com sombra suave.</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="FilterChip">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((label) => (
            <FilterChip
              key={label}
              label={label}
              selected={selectedFilters.includes(label)}
              onClick={() => toggleFilter(label)}
            />
          ))}
        </div>
        <p className="text-sm text-secondary">
          Selecionados: {selectedFilters.join(", ") || "nenhum"}
        </p>
      </Section>

      <Section title="AtracaoCard">
        <ViewportFrame width={320} label="Mobile">
          <div className="p-3">
            <AtracaoCard
              name="Parque da Cidade"
              ageRange="4–8 anos"
              price="Gratuito"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Área verde do parque com playground"
              favorite={favorite}
              onFavoriteToggle={() => setFavorite((value) => !value)}
            />
          </div>
        </ViewportFrame>
        <ViewportFrame width={768} label="Tablet">
          <div className="grid grid-cols-2 gap-4 p-4">
            <AtracaoCard
              name="Museu do Amanhã"
              ageRange="6+ anos"
              price="R$ 30"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Vista externa do museu"
              favorite
            />
            <AtracaoCard
              name="Praça XV"
              ageRange="Todas as idades"
              price="Gratuito"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Praça arborizada no centro"
            />
          </div>
        </ViewportFrame>
        <ViewportFrame width={1024} label="Desktop">
          <div className="grid grid-cols-3 gap-4 p-4">
            <AtracaoCard
              name="BioParque"
              ageRange="3–10 anos"
              price="R$ 89"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Entrada do zoológico"
            />
            <AtracaoCard
              name="Casa do Pontal"
              ageRange="5+ anos"
              price="R$ 25"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Galeria de arte popular"
              favorite
            />
            <AtracaoCard
              name="Parque Lage"
              ageRange="Todas as idades"
              price="Gratuito"
              imageUrl="/placeholder-atracao.svg"
              imageAlt="Jardim e mansão histórica"
            />
          </div>
        </ViewportFrame>
      </Section>
    </div>
  );
}
