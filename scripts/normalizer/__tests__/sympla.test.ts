import { describe, expect, it } from "vitest";
import { extractBairro } from "../sympla";

describe("extractBairro", () => {
  it("extrai bairro explícito do padrão 'Local - Bairro, RJ'", () => {
    expect(extractBairro("Teatro Bradesco - Barra da Tijuca, RJ")).toBe(
      "Barra da Tijuca",
    );
  });

  it("retorna vazio quando token é 'Rio de Janeiro' (cidade, não bairro)", () => {
    // Todos os 16 venues Sympla atuais caem aqui — ficam em needs_human para revisão manual
    expect(extractBairro("Escola Eleva Barra da Tijuca - Rio de Janeiro, RJ")).toBe(
      "",
    );
  });

  it("retorna string vazia quando venue não tem o padrão '- X, RJ'", () => {
    expect(extractBairro("SESC Tijuca — Rio de Janeiro")).toBe("");
  });

  it("retorna string vazia quando venue está vazio", () => {
    expect(extractBairro("")).toBe("");
  });
});
