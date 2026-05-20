import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrompt } from "../prompt";
import type { LinhaInput } from "../types";

function baseInput(): LinhaInput {
  return {
    nome: "O Mágico de Oz",
    categoria_origem: "Teatro",
    venue: "Teatro Clara Nunes",
    bairro: "Gávea",
    dias_apresentacao: "Dias 23, 30, 31",
    desconto_percentual: "10",
    preco_bruto: "R$ 54,90",
    url_origem: "https://example.com",
  };
}

describe("buildPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("injeta data atual em CONTEXTO TEMPORAL", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("CONTEXTO TEMPORAL");
    expect(prompt).toContain("Data atual de referência: 2026-05-20");
    expect(prompt).toContain("NUNCA gere proxima_data no passado");
  });

  it("inclui TRANSPARÊNCIA SOBRE LACUNAS com exemplo de horário no ingresso", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("TRANSPARÊNCIA SOBRE LACUNAS");
    expect(prompt).toContain("Consulte horário ao clicar em 'Ver ingresso'");
    expect(prompt).toMatch(/Dias 23, 30, 31.*Consulte horário/s);
  });
});
