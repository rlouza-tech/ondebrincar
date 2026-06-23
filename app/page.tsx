import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeContent } from "@/app/home-content";
import { getAllAtracoes } from "@/lib/atracoes";

interface HomePageProps {
  searchParams?: {
    bairro?: string | string[];
    idade?: string;
    categoria?: string;
    preco?: string;
    ambiente?: string;
    data?: string;
  };
}

export function generateMetadata({ searchParams }: HomePageProps): Metadata {
  const bairroRaw = searchParams?.bairro;
  // Com múltiplos bairros, bairroRaw é array — só usa título específico para 1 bairro
  const bairro =
    typeof bairroRaw === "string" ? bairroRaw.trim() : undefined;

  if (bairro) {
    return {
      title: `Onde Brincar — atrações infantis em ${bairro}`,
      description: `Curadoria de atrações infantis em ${bairro}, Rio de Janeiro, para pais planejando o fim de semana.`,
    };
  }

  return {
    title: "O que fazer com criança no Rio | Onde Brincar",
    description:
      "Curadoria de atrações infantis no Rio de Janeiro para pais planejando o fim de semana.",
  };
}

export default async function HomePage() {
  const atracoes = await getAllAtracoes();
  const bairros = Array.from(
    new Set(atracoes.map((atracao) => atracao.bairro)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Suspense
          fallback={
            <p className="text-sm text-secondary" aria-live="polite">
              Carregando atrações…
            </p>
          }
        >
          <HomeContent atracoes={atracoes} bairros={bairros} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
