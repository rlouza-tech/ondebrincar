import { describe, expect, it, vi } from "vitest";
import {
  ECOVILLA_BAIRRO,
  ECOVILLA_CATEGORIA_ORIGEM,
  ECOVILLA_PROGRAMACAO_URL,
  ECOVILLA_VENUE,
  parseClassificacaoEcovilla,
  parseListingPage,
  scrapeEcovilla,
} from "../ecovilla";

/**
 * Fixture fiel à estrutura real confirmada por inspeção manual (via
 * javascript_tool no Browser pane e `curl` direto) em
 * ecovillarihappy.com.br/programacao/ durante esta story (US-S31): cada
 * evento é um `div.fusion-builder-row-4-N` (N = índice sequencial, o site
 * real tinha 1..11 no momento da inspeção) com 4 blocos `.fusion-title` em
 * ordem fixa (nome+link opcional, data, classificação, descrição), dentro de
 * `.fusion-column-wrapper`.
 */
function buildEventRowHtml(
  index: number,
  overrides: Partial<{
    nome: string;
    link: string;
    data: string;
    classificacao: string;
    descricao: string;
  }> = {},
): string {
  const o = {
    nome: "Mogli, O Musical",
    link: "https://www.ingresso.com/espetaculos/mogli-o-musical?utm_source=site_evrh",
    data: "19 de setembro a 04 de outubro de 2026 | Sábados e Domingos às 11h",
    classificacao: "Classificação: Livre",
    descricao: "Com patrocínio da Prefeitura do Rio, o espetáculo retorna aos palcos.",
    ...overrides,
  };

  const nomeHtml = o.link
    ? `<p class="fusion-title-heading"><a href="${o.link}">${o.nome}</a></p>`
    : `<p class="fusion-title-heading">${o.nome}</p>`;

  return `
    <div class="fusion-fullwidth fullwidth-box fusion-builder-row-4-${index} fusion-flex-container">
      <div class="fusion-builder-row fusion-row">
        <div class="fusion-layout-column fusion_builder_column fusion-builder-column-${index}">
          <div class="fusion-column-wrapper fusion-content-layout-column">
            <div class="fusion-title title fusion-title-heading-block">${nomeHtml}</div>
            <div class="fusion-title title"><p class="fusion-title-heading">${o.data}</p></div>
            <div class="fusion-title title"><p class="fusion-title-heading">${o.classificacao}</p></div>
            <div class="fusion-title title"><p class="fusion-title-heading">${o.descricao}</p></div>
          </div>
        </div>
        <div class="fusion-layout-column">
          <div class="fusion-column-wrapper">
            <div class="fusion-imageframe imageframe-none"><a href="${o.link}" class="fusion-no-lightbox"></a></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildProgramacaoHtml(rows: string[]): string {
  return `<!DOCTYPE html><html><body><main><div class="post-content">${rows.join("\n")}</div></main></body></html>`;
}

describe("parseListingPage", () => {
  it("extrai nome, data, classificação, descrição e link de cada evento", () => {
    const html = buildProgramacaoHtml([buildEventRowHtml(1)]);
    const items = parseListingPage(html);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      nome: "Mogli, O Musical",
      diasApresentacao: "19 de setembro a 04 de outubro de 2026 | Sábados e Domingos às 11h",
      classificacaoRaw: "Classificação: Livre",
      sinopse: "Com patrocínio da Prefeitura do Rio, o espetáculo retorna aos palcos.",
      link: "https://www.ingresso.com/espetaculos/mogli-o-musical?utm_source=site_evrh",
    });
  });

  it("processa múltiplos eventos na mesma página, incluindo eventos sem link (gratuitos sem RSVP)", () => {
    const html = buildProgramacaoHtml([
      buildEventRowHtml(1, { nome: "Evento Pago", link: "https://www.ingresso.com/espetaculos/evento-pago" }),
      buildEventRowHtml(2, {
        nome: "DIA DO FOLCLORE",
        link: "",
        data: "22 de agosto às 15h",
        descricao: "Programação especial em parceria com o Jardim Botânico.",
      }),
    ]);

    const items = parseListingPage(html);
    expect(items).toHaveLength(2);
    expect(items[0].link).toBe("https://www.ingresso.com/espetaculos/evento-pago");
    expect(items[1].nome).toBe("DIA DO FOLCLORE");
    expect(items[1].link).toBe("");
  });

  it("ignora linhas sem os 4 blocos de texto esperados", () => {
    const html = buildProgramacaoHtml([
      `<div class="fusion-builder-row-4-1"><div class="fusion-column-wrapper"><div class="fusion-title"><p>Só um bloco</p></div></div></div>`,
    ]);
    expect(parseListingPage(html)).toEqual([]);
  });

  it("retorna lista vazia quando não há nenhum evento na página", () => {
    expect(parseListingPage(buildProgramacaoHtml([]))).toEqual([]);
  });
});

describe("parseClassificacaoEcovilla", () => {
  it('"Classificação: Livre" vira idade_minima 0 / idade_maxima 18 (convenção editorial)', () => {
    expect(parseClassificacaoEcovilla("Classificação: Livre")).toEqual({
      idade_minima: "0",
      idade_maxima: "18",
    });
  });

  it('"Classificação: 12 anos" vira idade_minima 12, idade_maxima vazia (sem teto declarado)', () => {
    expect(parseClassificacaoEcovilla("Classificação: 12 anos")).toEqual({
      idade_minima: "12",
      idade_maxima: "",
    });
  });

  it("formato desconhecido retorna ambos vazios", () => {
    expect(parseClassificacaoEcovilla("")).toEqual({ idade_minima: "", idade_maxima: "" });
    expect(parseClassificacaoEcovilla("Classificação: indefinida")).toEqual({
      idade_minima: "",
      idade_maxima: "",
    });
  });
});

describe("scrapeEcovilla (orquestração)", () => {
  it("busca a página única, extrai os eventos e aplica venue/bairro/categoria fixos", async () => {
    const html = buildProgramacaoHtml([
      buildEventRowHtml(1, { nome: "Espetáculo Pago", link: "https://www.ingresso.com/espetaculos/pago" }),
      buildEventRowHtml(2, {
        nome: "Evento Gratuito com RSVP",
        link: "https://docs.google.com/forms/d/e/abc/viewform",
      }),
    ]);

    const fetchImpl = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;

    const { rows, stats } = await scrapeEcovilla({ fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(ECOVILLA_PROGRAMACAO_URL);
    expect(stats.totalListados).toBe(2);
    expect(rows).toHaveLength(2);

    for (const row of rows) {
      expect(row.venue).toBe(ECOVILLA_VENUE);
      expect(row.bairro).toBe(ECOVILLA_BAIRRO);
      expect(row.categoria_origem).toBe(ECOVILLA_CATEGORIA_ORIGEM);
      expect(row.url_origem).toBe(ECOVILLA_PROGRAMACAO_URL);
    }

    expect(rows[0].url_ingresso).toBe("https://www.ingresso.com/espetaculos/pago");
    // Link de RSVP (Google Forms) não é link de ingresso — fica vazio.
    expect(rows[1].url_ingresso).toBe("");
  });

  it("respeita --limit", async () => {
    const html = buildProgramacaoHtml([buildEventRowHtml(1), buildEventRowHtml(2), buildEventRowHtml(3)]);
    const fetchImpl = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;

    const { rows, stats } = await scrapeEcovilla({ fetchImpl, limit: 2 });
    expect(stats.totalListados).toBe(3);
    expect(rows).toHaveLength(2);
  });

  it("lança erro descritivo quando a página de programação não responde 200", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    await expect(scrapeEcovilla({ fetchImpl })).rejects.toThrow(/503/);
  });
});
