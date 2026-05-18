import { describe, expect, it } from "vitest";
import {
  filtrarAtracoes,
  getAtracaoBySlug,
  type Atracao,
} from "./atracoes";
import { mockAtracoes } from "./mock-atracoes";

describe("filtrarAtracoes", () => {
  it("filtra por bairro Tijuca", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { bairro: "Tijuca" });
    expect(resultados.length).toBe(2);
    expect(resultados.every((a) => a.bairro === "Tijuca")).toBe(true);
  });

  it("filtra por idade dentro da faixa", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { idade: 4 });
    expect(resultados.some((a) => a.slug.includes("pequeno-principe"))).toBe(
      true,
    );
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
      descricaoCurta: expect.any(String),
      imagemUrl: expect.any(String),
      linkExterno: expect.any(String),
    });
  });
});
