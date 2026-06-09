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
            Sobre Onde Brincar
          </h1>

          <p>
            Quem é pai ou mãe certamente já passou por aquela boa e velha
            pergunta… &quot;E aí, qual boa para o fim de semana?&quot;. E
            diversas respostas já surgiram. Aquela peça de teatro com os
            personagens mais amados, aquela pracinha em que os amigos da escola
            se encontram. Ou aquela ida à exposição com toda cara de ser um
            encanto pra todo mundo.
          </p>

          <p>
            Daí nasceu o &quot;Onde Brincar&quot;. Tem muita opção em cidades
            como o Rio de Janeiro. Gratuitas, pagas, ao ar livre e fechadas. De
            tudo um pouco. A gente só precisa de um ponto de encontro. Um lugar
            onde essas diversas atividades podem ser achadas facilmente.
            Através de um filtro, de um toque no celular.
          </p>

          <p>
            Pais, mães. Bem-vindo a este espaço e torço para que ele seja
            realmente útil a vocês. E que vocês se sintam à vontade para
            indicar lugares enquanto encontram outros tantos onde se divertir
            com os seus pequenos. Onde… Brincar.
          </p>

          <p className="font-medium text-primary">
            Um grande abraço,
            <br />
            Equipe Onde Brincar
          </p>

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
