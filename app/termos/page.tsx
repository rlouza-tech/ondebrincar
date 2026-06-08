import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Termos de Uso | Onde Brincar",
  description:
    "Termos e condições de uso do site Onde Brincar.",
};

export default function TermosPage() {
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

        <article className="prose prose-sm sm:prose max-w-none text-secondary">
          <h1 className="font-display text-primary">Termos de Uso</h1>
          <p className="text-sm text-secondary">
            Última atualização: junho de 2026
          </p>

          <p>
            Ao acessar e usar o site <strong>Onde Brincar</strong>{" "}
            (ondebrincar.com.br), você concorda com os termos descritos abaixo.
            Se não concordar, por favor não utilize o site.
          </p>

          <h2 className="font-display text-primary">1. O que é o Onde Brincar</h2>
          <p>
            O Onde Brincar é um site de curadoria de atrações infantis no Rio de
            Janeiro. Nosso objetivo é ajudar pais e responsáveis a descobrir
            programas para crianças — teatro, exposições, parques, eventos e
            muito mais.
          </p>
          <p>
            As informações publicadas (preços, horários, datas, disponibilidade
            de ingressos) são atualizadas com frequência, mas podem não refletir
            mudanças de última hora. Sempre confirme os detalhes diretamente com
            o local ou evento antes de ir.
          </p>

          <h2 className="font-display text-primary">2. Uso permitido</h2>
          <p>Você pode usar o Onde Brincar para:</p>
          <ul>
            <li>Descobrir e planejar programas infantis no Rio de Janeiro;</li>
            <li>
              Compartilhar links de atrações com amigos e familiares;
            </li>
            <li>
              Usar as informações para fins pessoais e não comerciais.
            </li>
          </ul>

          <h2 className="font-display text-primary">3. Uso não permitido</h2>
          <p>É proibido:</p>
          <ul>
            <li>
              Copiar, reproduzir ou redistribuir o conteúdo do site para fins
              comerciais sem autorização prévia por escrito;
            </li>
            <li>
              Usar scripts automáticos (bots, scrapers) para coletar dados do
              site em grande escala;
            </li>
            <li>
              Interferir no funcionamento técnico do site ou tentar acessar
              sistemas não autorizados.
            </li>
          </ul>

          <h2 className="font-display text-primary">4. Links para terceiros</h2>
          <p>
            O Onde Brincar contém links para sites de terceiros (bilheterias,
            organizadores de eventos, locais parceiros). Não nos
            responsabilizamos pelo conteúdo, disponibilidade ou práticas desses
            sites. A inclusão de um link não representa endosso do Onde Brincar.
          </p>

          <h2 className="font-display text-primary">5. Precisão das informações</h2>
          <p>
            Fazemos nosso melhor para manter as informações atualizadas e
            corretas, mas não garantimos a exatidão, completude ou
            disponibilidade de qualquer atração listada. O Onde Brincar não se
            responsabiliza por atrações canceladas, preços alterados ou
            ingressos esgotados após a publicação.
          </p>

          <h2 className="font-display text-primary">6. Propriedade intelectual</h2>
          <p>
            O conteúdo editorial do Onde Brincar — textos de curadoria,
            descrições redigidas pela equipe, estrutura e design do site — é
            protegido por direitos autorais. Imagens de atrações utilizadas no
            site são de propriedade dos respectivos locais ou eventos e são
            usadas com finalidade informativa.
          </p>

          <h2 className="font-display text-primary">7. Limitação de responsabilidade</h2>
          <p>
            O Onde Brincar é um serviço gratuito de informação. Em nenhuma
            hipótese seremos responsáveis por danos diretos, indiretos ou
            consequentes decorrentes do uso (ou impossibilidade de uso) das
            informações publicadas no site.
          </p>

          <h2 className="font-display text-primary">8. Alterações nos termos</h2>
          <p>
            Podemos atualizar estes termos a qualquer momento. A data de
            &quot;Última atualização&quot; indica a versão vigente. O uso
            continuado do site após alterações constitui aceitação dos novos
            termos.
          </p>

          <h2 className="font-display text-primary">9. Contato</h2>
          <p>
            Dúvidas sobre estes termos? Fale com a gente pelo Instagram:{" "}
            <a
              href="https://ig.me/m/ondebrincar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @ondebrincar
            </a>
            .
          </p>
        </article>
      </main>
    </>
  );
}
