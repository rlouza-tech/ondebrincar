import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllAtracoes } from "@/lib/atracoes";
import { BuscarContent } from "./buscar-content";

export function generateMetadata(): Metadata {
  return {
    title: "Buscar atrações | Onde Brincar",
    description:
      "Filtre atrações infantis no Rio por bairro e idade da criança.",
  };
}

export default async function BuscarPage() {
  const atracoes = await getAllAtracoes();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold text-primary md:text-3xl">
            Buscar
          </h1>
          <p className="text-base text-secondary">
            Filtragem via URL — por exemplo{" "}
            <code className="rounded bg-primary/5 px-1.5 py-0.5 text-sm">
              /buscar?bairro=Tijuca&amp;idade=4
            </code>
          </p>
        </div>

        <Suspense
          fallback={
            <p className="text-sm text-secondary" aria-live="polite">
              Carregando resultados…
            </p>
          }
        >
          <BuscarContent atracoes={atracoes} />
        </Suspense>
      </main>
    </>
  );
}
