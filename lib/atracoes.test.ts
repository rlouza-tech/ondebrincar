import { describe, expect, it } from "vitest";
import { filtrarAtracoes, getAtracaoBySlug } from "./atracoes";
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
  it("retorna atração existente", () => {
    const atracao = getAtracaoBySlug("peca-o-pequeno-principe-teatro-clara-nunes");
    expect(atracao?.titulo).toContain("Pequeno Príncipe");
  });
});
