import { describe, expect, it } from "vitest";
import { normalizeAllCapsTitle } from "../title-case";

// US-S58: 2 ocorrências reais confirmadas em fontes diferentes (Sympla e fonte
// não identificada) — não é bug de uma fonte específica.
describe("normalizeAllCapsTitle", () => {
  it("normaliza título 100% caixa alta pra Title Case — caso real Sympla (16/07)", () => {
    expect(normalizeAllCapsTitle("COLÔNIA DE FÉRIAS ARTÍSTICAS DO CAQUI")).toBe(
      "Colônia de Férias Artísticas do Caqui",
    );
  });

  it("normaliza título 100% caixa alta pra Title Case — caso real 2ª fonte (20/07)", () => {
    expect(normalizeAllCapsTitle("ANA E O MAR, O MUSICAL INFANTIL")).toBe(
      "Ana e o Mar, o Musical Infantil",
    );
  });

  it("caso de controle: título já em capitalização correta não é alterado", () => {
    const nome = "Colônia de Férias Artísticas do Caqui";
    expect(normalizeAllCapsTitle(nome)).toBe(nome);
  });

  it("não altera título com capitalização mista (evita falso positivo em nome estilizado)", () => {
    const nome = "Festival iFood de Música Infantil";
    expect(normalizeAllCapsTitle(nome)).toBe(nome);
  });

  it("preserva sigla conhecida (CCBB) ao normalizar", () => {
    expect(normalizeAllCapsTitle("FESTIVAL CCBB DE MÚSICA")).toBe(
      "Festival CCBB de Música",
    );
  });
});
