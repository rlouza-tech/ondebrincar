import { describe, expect, it } from "vitest";
import {
  filtrarAtracoes,
  getAtracaoBySlug,
  mapSanityAtracao,
  normalizeCategoriaSlug,
  sanityImageUrl,
  type Atracao,
} from "./atracoes";
import { mockAtracoes } from "./mock-atracoes";
import type { SanityAtracaoDocument } from "./sanity/types";

describe("filtrarAtracoes", () => {
  it("filtra por bairro Tijuca", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { bairros: ["Tijuca"] });
    expect(resultados.length).toBe(2);
    expect(resultados.every((a) => a.bairro === "Tijuca")).toBe(true);
  });

  it("filtra por múltiplos bairros", () => {
    const tijuca = filtrarAtracoes(mockAtracoes, { bairros: ["Tijuca"] });
    const bairroExtra = mockAtracoes.find((a) => a.bairro !== "Tijuca")?.bairro;
    if (!bairroExtra) {
      return;
    }
    const resultados = filtrarAtracoes(mockAtracoes, {
      bairros: ["Tijuca", bairroExtra],
    });
    expect(resultados.length).toBeGreaterThan(tijuca.length);
    expect(
      resultados.every(
        (a) => a.bairro === "Tijuca" || a.bairro === bairroExtra,
      ),
    ).toBe(true);
  });

  it("filtra por idade dentro da faixa", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { idade: 4 });
    expect(resultados.some((a) => a.slug.includes("pequeno-principe"))).toBe(
      true,
    );
  });

  it("filtra por categoria teatro (mock com label legível)", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { categoria: "teatro" });
    expect(resultados.length).toBeGreaterThan(0);
    expect(
      resultados.every((a) => normalizeCategoriaSlug(a.categoria) === "teatro"),
    ).toBe(true);
  });

  it("filtra por preço gratuito", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { preco: "gratuito" });
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((a) => a.precoTipo === "gratuito")).toBe(true);
  });

  it("filtra por ambiente outdoor", () => {
    const resultados = filtrarAtracoes(mockAtracoes, {
      indoorOutdoor: "outdoor",
    });
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((a) => a.indoorOutdoor === "outdoor")).toBe(true);
  });
});

describe("getAtracaoBySlug", () => {
  it("retorna atração existente usando fallback mock", async () => {
    const atracao = await getAtracaoBySlug(
      "peca-o-pequeno-principe-teatro-clara-nunes",
    );
    expect(atracao?.titulo).toContain("Pequeno Príncipe");
  });
});

describe("Atracao type", () => {
  it("preserva o shape usado pelas rotas e cards", () => {
    const atracao = mockAtracoes[0] satisfies Atracao;

    expect(atracao).toMatchObject({
      slug: expect.any(String),
      titulo: expect.any(String),
      categoria: expect.any(String),
      idadeMin: expect.any(Number),
      idadeMax: expect.any(Number),
      bairro: expect.any(String),
      precoTipo: expect.stringMatching(/gratuito|pago/),
      indoorOutdoor: expect.stringMatching(/indoor|outdoor|ambos/),
      tipoProgramacao: expect.stringMatching(
        /evento_pontual|evento_recorrente|permanente/,
      ),
      programacaoTexto: expect.any(String),
      descricaoCurta: expect.any(String),
      imagemUrl: expect.any(String),
      linkExterno: expect.any(String),
    });
  });
});

describe("mapSanityAtracao", () => {
  function baseDocument(
    overrides: Partial<SanityAtracaoDocument> = {},
  ): SanityAtracaoDocument {
    return {
      _id: "atracao-teste",
      nome: "Teste",
      slug: { current: "teste" },
      categoria: "teatro",
      idade_min: 4,
      idade_max: 10,
      bairro: "Tijuca",
      indoor_outdoor: "indoor",
      status: "operando",
      tipo_programacao: "evento_pontual",
      programacao_texto: "Sessões nos dias 23, 30 e 31",
      descricao: "Descrição de teste com comprimento suficiente para validação.",
      ...overrides,
    };
  }

  it("com proxima_data null → propriedade proximaData ausente", () => {
    const atracao = mapSanityAtracao(
      baseDocument({ proxima_data: null }),
    );
    expect(atracao).not.toHaveProperty("proximaData");
  });

  it("com proxima_data preenchida → mapeia proximaData", () => {
    const atracao = mapSanityAtracao(
      baseDocument({ proxima_data: "2026-05-23" }),
    );
    expect(atracao.proximaData).toBe("2026-05-23");
  });

  it("sem foto no documento Sanity → usa placeholder local", () => {
    const atracao = mapSanityAtracao(baseDocument({ foto: undefined }));
    expect(atracao.imagemUrl).toBe("/placeholder-atracao.svg");
  });
});

describe("sanityImageUrl", () => {
  it("anexa largura e auto=format a uma URL do CDN Sanity", () => {
    const url = sanityImageUrl(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg",
      800,
    );
    expect(url).toBe(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg?w=800&auto=format",
    );
  });

  it("aplica a largura pedida (1200px no detalhe)", () => {
    const url = sanityImageUrl(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg",
      1200,
    );
    expect(url).toContain("w=1200");
  });

  it("URL local (placeholder) retorna sem alteração", () => {
    expect(sanityImageUrl("/placeholder-atracao.svg", 800)).toBe(
      "/placeholder-atracao.svg",
    );
  });

  it("string vazia retorna sem alteração", () => {
    expect(sanityImageUrl("", 800)).toBe("");
  });
});
