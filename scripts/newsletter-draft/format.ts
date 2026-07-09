/**
 * Geração do rascunho em HTML — US-N2 (AC3, AC6, AC7)
 *
 * Saída pronta para abrir no navegador, selecionar tudo e colar no editor
 * rich-text do Beehiiv (por isso HTML, não markdown puro — markdown colado
 * literal em editor rich-text vira texto com "**" na tela em vez de negrito).
 *
 * Todo link de atração leva utm_source=newsletter&utm_medium=email (decisão
 * da sessão US-N3, 06/07/2026 — evita silo de dados fora do GA4/GTM que já
 * rastreiam view_source e os eventos NSM).
 *
 * Seção vazia é omitida inteiramente do output (AC6) — nunca imprime um
 * título de seção sem itens embaixo.
 */

import type { AtracaoNewsletter, ClassificacaoResultado } from "./types";

export const BASE_URL = "https://ondebrincar.com.br";

const TITULOS_SECAO: Record<keyof ClassificacaoResultado, string> = {
  novidades: "Novidades",
  fimDeSemana: "Fim de semana",
  permanentes: "Permanentes",
};

const ORDEM_SECOES: (keyof ClassificacaoResultado)[] = ["novidades", "fimDeSemana", "permanentes"];

export function buildLinkComUtm(slug: string, baseUrl: string = BASE_URL): string {
  return `${baseUrl}/atracao/${slug}?utm_source=newsletter&utm_medium=email`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderItem(atracao: AtracaoNewsletter, baseUrl: string): string {
  const link = buildLinkComUtm(atracao.slug, baseUrl);
  const resumo = atracao.mini_review?.trim() || atracao.descricao?.trim() || "";
  const resumoHtml = resumo ? ` — ${escapeHtml(resumo)}` : "";
  return `    <li><a href="${link}">${escapeHtml(atracao.nome)}</a>${resumoHtml} <span style="color:#888">(${escapeHtml(atracao.bairro)})</span></li>`;
}

function renderSecao(titulo: string, atracoes: AtracaoNewsletter[], baseUrl: string): string {
  const itens = atracoes.map((a) => renderItem(a, baseUrl)).join("\n");
  return `  <h2>${escapeHtml(titulo)}</h2>\n  <ul>\n${itens}\n  </ul>`;
}

export interface GerarHtmlOpts {
  baseUrl?: string;
}

export function gerarHtml(resultado: ClassificacaoResultado, opts: GerarHtmlOpts = {}): string {
  const baseUrl = opts.baseUrl ?? BASE_URL;

  const blocos = ORDEM_SECOES
    .filter((chave) => resultado[chave].length > 0)
    .map((chave) => renderSecao(TITULOS_SECAO[chave], resultado[chave], baseUrl));

  if (blocos.length === 0) {
    return "<!-- newsletter-draft: nenhuma atração elegível nesta rodada -->";
  }

  return blocos.join("\n\n");
}

/** Contagem por seção pro log no terminal (AC5). Só inclui seções não-vazias. */
export function contagemPorSecao(resultado: ClassificacaoResultado): string {
  return ORDEM_SECOES
    .filter((chave) => resultado[chave].length > 0)
    .map((chave) => `${TITULOS_SECAO[chave]}: ${resultado[chave].length}`)
    .join(" | ");
}
