import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Política de Privacidade | Onde Brincar",
  description:
    "Como o Onde Brincar coleta, usa e protege suas informações, em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
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
          <h1 className="font-display text-primary">Política de Privacidade</h1>
          <p className="text-sm text-secondary">
            Última atualização: junho de 2026
          </p>

          <p>
            O <strong>Onde Brincar</strong> é um site de curadoria de atrações
            infantis no Rio de Janeiro. Esta política explica, em linguagem
            simples, quais dados coletamos, por que e quais são seus direitos —
            em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei
            13.709/2018).
          </p>

          <h2 className="font-display text-primary">1. Quais dados coletamos</h2>
          <p>
            O Onde Brincar <strong>não cria cadastro de usuários</strong> e não
            coleta nome, e-mail ou qualquer dado pessoal identificável de forma
            direta.
          </p>
          <p>
            Utilizamos ferramentas de análise de audiência que podem coletar
            automaticamente:
          </p>
          <ul>
            <li>
              Dados de navegação anônimos (páginas visitadas, tempo na página,
              origem do acesso);
            </li>
            <li>Tipo de dispositivo, sistema operacional e navegador;</li>
            <li>
              Endereço IP, utilizado apenas para geolocalização aproximada
              (cidade/estado) e imediatamente anonimizado.
            </li>
          </ul>

          <h2 className="font-display text-primary">
            2. Como coletamos — Google Tag Manager e Google Analytics 4
          </h2>
          <p>
            Usamos o <strong>Google Tag Manager (GTM)</strong> para gerenciar
            scripts de análise, e o <strong>Google Analytics 4 (GA4)</strong>{" "}
            para entender como os visitantes usam o site.
          </p>
          <p>
            O GA4 está configurado com{" "}
            <strong>Google Consent Mode v2</strong>. Isso significa:
          </p>
          <ul>
            <li>
              <strong>Antes de qualquer consentimento explícito:</strong> o GA4
              opera em modo de coleta anônima e agregada. Nenhum dado
              identificável é enviado; apenas sinais estatísticos são usados
              para modelagem de audiência.
            </li>
            <li>
              <strong>Cookies de análise</strong> são classificados como
              não-essenciais. No futuro, implementaremos um banner de
              consentimento para que você possa optar por não ser incluído nessa
              coleta.
            </li>
          </ul>
          <p>
            Para mais informações sobre como o Google usa esses dados, consulte
            a{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Política de Privacidade do Google
            </a>
            .
          </p>

          <h2 className="font-display text-primary">3. Para que usamos os dados</h2>
          <p>
            Os dados de navegação são usados exclusivamente para entender quais
            atrações têm mais interesse e como melhorar a experiência do site.
            Nunca vendemos ou compartilhamos dados com terceiros para fins
            comerciais.
          </p>

          <h2 className="font-display text-primary">4. Cookies</h2>
          <p>
            O site pode usar cookies técnicos (necessários ao funcionamento) e
            cookies de análise (Google Analytics). Você pode bloquear todos os
            cookies nas configurações do seu navegador — o site continuará
            funcionando normalmente.
          </p>

          <h2 className="font-display text-primary">
            5. Seus direitos (LGPD)
          </h2>
          <p>
            De acordo com a LGPD, você tem os seguintes direitos em relação a
            dados pessoais eventualmente associados a você:
          </p>
          <ul>
            <li>
              <strong>Acesso:</strong> saber quais dados temos sobre você.
            </li>
            <li>
              <strong>Correção:</strong> corrigir dados incompletos ou
              incorretos.
            </li>
            <li>
              <strong>Exclusão:</strong> solicitar a remoção de dados
              desnecessários.
            </li>
            <li>
              <strong>Opt-out de análise:</strong> instalar a extensão{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Google Analytics Opt-out
              </a>{" "}
              ou bloquear cookies de terceiros no navegador.
            </li>
            <li>
              <strong>Revogação de consentimento:</strong> quando implementarmos
              o banner de consentimento, você poderá alterar sua preferência a
              qualquer momento.
            </li>
          </ul>
          <p>
            Para exercer qualquer desses direitos, entre em contato pelo
            Instagram:{" "}
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

          <h2 className="font-display text-primary">
            6. Links para sites externos
          </h2>
          <p>
            O Onde Brincar contém links para sites de terceiros (ingressos,
            eventos, parceiros). Não somos responsáveis pelas práticas de
            privacidade desses sites — recomendamos que você leia as políticas
            deles antes de fornecer qualquer dado.
          </p>

          <h2 className="font-display text-primary">7. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta política periodicamente. A data de
            &quot;Última atualização&quot; no topo da página indica quando
            ocorreu a revisão mais recente. Mudanças significativas serão
            comunicadas no site.
          </p>

          <h2 className="font-display text-primary">8. Contato</h2>
          <p>
            Dúvidas sobre privacidade? Fale com a gente pelo Instagram:{" "}
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
