import { describe, it, expect } from "vitest";
import { gerarHtml, buildLinkComUtm, contagemPorSecao } from "../format";
import type { AtracaoNewsletter, ClassificacaoResultado } from "../types";

function makeAtracao(overrides: Partial<AtracaoNewsletter>): AtracaoNewsletter {
  return {
    _id: "atracao-1",
    nome: "Chapeuzinho Vermelho",
    slug: "chapeuzinho-vermelho-leblon",
    bairro: "Leblon",
    status: "operando",
    proxima_data: null,
    _createdAt: "2026-07-01T10:00:00.000Z",
    mini_review: "Ótima pra criançada, mas fila grande",
    ...overrides,
  };
}

function makeResultado(overrides: Partial<ClassificacaoResultado>): ClassificacaoResultado {
  return { novidades: [], fimDeSemana: [], permanentes: [], ...overrides };
}

describe("buildLinkComUtm", () => {
  it("gera link com utm_source=newsletter e utm_medium=email", () => {
    const link = buildLinkComUtm("chapeuzinho-vermelho-leblon");
    expect(link).toBe(
      "https://ondebrincar.com.br/atracao/chapeuzinho-vermelho-leblon?utm_source=newsletter&utm_medium=email",
    );
  });
});

describe("gerarHtml — UTM (AC7)", () => {
  it("todo link de atração no rascunho inclui os parâmetros UTM", () => {
    const html = gerarHtml(makeResultado({ permanentes: [makeAtracao({})] }));
    expect(html).toContain("utm_source=newsletter&utm_medium=email");
  });
});

describe("gerarHtml — seções vazias (AC6)", () => {
  it("omite seção vazia inteiramente do output", () => {
    const html = gerarHtml(makeResultado({ novidades: [makeAtracao({})] }));
    expect(html).toContain("Novidades");
    expect(html).not.toContain("Fim de semana");
    expect(html).not.toContain("Permanentes");
  });

  it("não falha quando todas as seções estão vazias", () => {
    expect(() => gerarHtml(makeResultado({}))).not.toThrow();
    const html = gerarHtml(makeResultado({}));
    expect(html).toContain("nenhuma atração elegível");
  });
});

describe("gerarHtml — conteúdo", () => {
  it("inclui nome, bairro e resumo da atração", () => {
    const html = gerarHtml(makeResultado({ permanentes: [makeAtracao({})] }));
    expect(html).toContain("Chapeuzinho Vermelho");
    expect(html).toContain("Leblon");
    expect(html).toContain("Ótima pra criançada, mas fila grande");
  });

  it("usa descricao como fallback quando não há mini_review", () => {
    const atracao = makeAtracao({ mini_review: null, descricao: "Descrição objetiva" });
    const html = gerarHtml(makeResultado({ permanentes: [atracao] }));
    expect(html).toContain("Descrição objetiva");
  });

  it("escapa HTML no nome pra evitar quebra de markup", () => {
    const atracao = makeAtracao({ nome: "Show <especial> & cia" });
    const html = gerarHtml(makeResultado({ permanentes: [atracao] }));
    expect(html).toContain("Show &lt;especial&gt; &amp; cia");
    expect(html).not.toContain("<especial>");
  });

  it("mantém a ordem Novidades > Fim de semana > Permanentes no output", () => {
    const html = gerarHtml(
      makeResultado({
        novidades: [makeAtracao({ nome: "A" })],
        fimDeSemana: [makeAtracao({ nome: "B", proxima_data: "2026-07-11" })],
        permanentes: [makeAtracao({ nome: "C" })],
      }),
    );
    const idxNovidades = html.indexOf("Novidades");
    const idxFds = html.indexOf("Fim de semana");
    const idxPermanentes = html.indexOf("Permanentes");
    expect(idxNovidades).toBeLessThan(idxFds);
    expect(idxFds).toBeLessThan(idxPermanentes);
  });
});

describe("contagemPorSecao (AC5)", () => {
  it("formata a contagem só das seções não-vazias", () => {
    const texto = contagemPorSecao(
      makeResultado({
        novidades: [makeAtracao({}), makeAtracao({})],
        fimDeSemana: [],
        permanentes: [makeAtracao({})],
      }),
    );
    expect(texto).toBe("Novidades: 2 | Permanentes: 1");
  });

  it("retorna string vazia quando todas as seções estão vazias", () => {
    expect(contagemPorSecao(makeResultado({}))).toBe("");
  });
});
