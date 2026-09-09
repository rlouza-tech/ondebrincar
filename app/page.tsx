import type { Metadata } from "next";
import { Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { CategorySidebar } from "@/components/CategorySidebar";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HomeContent } from "@/app/home-content";
import { getAllAtracoes } from "@/lib/atracoes";
import { carrosseisAtivosOrdenados } from "@/lib/carrosseis";
import { getConfigHomeAtual } from "@/lib/config-home";
import { getDestaquesSemana } from "@/lib/destaques";
import { montarCarrosseisZona, ZONA_ORDEM_PADRAO, type ZonaId } from "@/lib/zonas";

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
  const [atracoes, destaques, configHome] = await Promise.all([
    getAllAtracoes(),
    getDestaquesSemana(),
    getConfigHomeAtual(),
  ]);
  const bairros = Array.from(
    new Set(atracoes.map((atracao) => atracao.bairro)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // US-I47 — lê a config do painel de curadoria (US-I46) pra saber quais zonas mostrar e em
  // que ordem; sem doc salvo ainda, cai nas 5 zonas na ordem padrão do Discovery.
  const zonasAtivas = configHome?.carrosseisAtivos?.length
    ? carrosseisAtivosOrdenados(configHome.carrosseisAtivos)
        .map((carrossel) => carrossel.id)
        .filter((id): id is ZonaId => id.startsWith("zona-"))
    : ZONA_ORDEM_PADRAO;
  const carrosseisZona = montarCarrosseisZona(atracoes, zonasAtivas);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 pb-24 pt-8 sm:px-6 sm:pt-10 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:pb-10">
        <CategorySidebar />
        <Suspense
          fallback={
            <p className="text-sm text-secondary" aria-live="polite">
              Carregando atrações…
            </p>
          }
        >
          <HomeContent
            atracoes={atracoes}
            bairros={bairros}
            destaques={destaques}
            carrosseisZona={carrosseisZona}
          />
        </Suspense>
      </main>
      <SiteFooter />
      <BottomNav />
    </>
  );
}
