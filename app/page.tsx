import type { Metadata } from "next";
import { AtracaoCardLink } from "@/components/AtracaoCardLink";
import { SiteHeader } from "@/components/SiteHeader";
import { getAllAtracoes } from "@/lib/atracoes";

export function generateMetadata(): Metadata {
  return {
    title: "O que fazer com criança no Rio | Onde Brincar",
    description:
      "Curadoria de atrações infantis no Rio de Janeiro para pais planejando o fim de semana.",
  };
}

export default async function HomePage() {
  const atracoes = await getAllAtracoes();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-8 space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-success">
            Curadoria humana
          </p>
          <h1 className="text-2xl font-semibold text-primary md:text-3xl">
            O que fazer com criança no Rio
          </h1>
          <p className="max-w-2xl text-base text-secondary">
            Peças, parques e museus selecionados para famílias cariocas — com
            ressalvas honestas sobre idade e logística.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {atracoes.map((atracao) => (
            <li key={atracao.slug}>
              <AtracaoCardLink atracao={atracao} />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
