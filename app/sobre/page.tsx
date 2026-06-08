import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Sobre | Onde Brincar",
  description:
    "Curadoria semanal de atrações infantis no Rio de Janeiro. Saiba o que é o Onde Brincar e quem está por trás.",
};

export default function SobrePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-screen-md px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-medium text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ← Voltar
        </Link>

        <article className="space-y-6 text-base leading-relaxed text-secondary">
          <h1 className="font-display text-3xl font-bold text-primary">
            Onde Brincar
          </h1>

          <p>
            Rio tem atração pra criança que nem cabe na cabeça. Show de mágica,
            peça de teatro, exposição interativa, parquinho escondido, museu que
            dá pra tocar em tudo — e ainda uma lista enorme de eventos que
            aparecem e somem sem aviso.
          </p>

          <p>
            O problema não é falta de opção. É que descobrir o que está
            acontecendo, onde fica, quanto custa e se ainda tem ingresso virou
            tarefa de investigação.
          </p>

          <p>
            O Onde Brincar existe pra acabar com isso.
          </p>

          <p>
            A gente garimpou, testou e organizou as melhores atrações infantis
            do Rio — e atualiza isso toda semana. Você chega aqui na quinta à
            noite sem ideia nenhuma e sai com um programa pra curtir no fim de
            semana.
          </p>

          <p>Simples assim.</p>

          <hr className="border-primary/10" />

          <p>
            Tem um lugar que a gente deveria incluir?{" "}
            <a
              href="https://ig.me/m/ondebrincar"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Manda uma mensagem no Instagram.
            </a>
          </p>
        </article>
      </main>
    </>
  );
}
