import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrompt } from "../prompt";
import type { LinhaInput } from "../types";

function baseInput(overrides: Partial<LinhaInput> = {}): LinhaInput {
  return {
    nome: "O Mágico de Oz",
    categoria_origem: "Teatro",
    venue: "Teatro Clara Nunes",
    bairro: "Gávea",
    dias_apresentacao: "Dias 23, 30, 31",
    desconto_percentual: "10",
    preco_bruto: "R$ 54,90",
    url_origem: "https://example.com",
    ...overrides,
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

  it("inclui bloco scraper v2 quando campos opcionais existem", () => {
    const prompt = buildPrompt(
      baseInput({
        sinopse_oficial: "Sinopse oficial do teatro.",
        horarios_sessao: "Sábados 16h",
        idade_maxima: "12",
        preco_inteira_centavos: "8000",
      }),
    );
    expect(prompt).toContain("DADOS SCRAPER V2");
    expect(prompt).toContain("Sinopse oficial do teatro.");
    expect(prompt).toContain("priorize-os sobre qualquer inferência");
  });

  it("inclui voz editorial e política de incerteza do voice-adapter", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("VOZ EDITORIAL");
    expect(prompt).toContain("POLÍTICA DE INCERTEZA");
    expect(prompt).toContain("[INCERTO]");
    expect(prompt).toContain("Daniel Mendes");
  });

  it("inclui TRANSPARÊNCIA SOBRE LACUNAS com exemplo de horário no ingresso", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("TRANSPARÊNCIA SOBRE LACUNAS");
    expect(prompt).toContain("Consulte horário ao clicar em 'Ver ingresso'");
    expect(prompt).toMatch(/Dias 23, 30, 31.*Consulte horário/s);
  });

  it("instrui idade_max literal sem arredondar (ex.: até 12 anos → 12)", () => {
    const prompt = buildPrompt(
      baseInput({ nome: "Frozen — musical para até 12 anos" }),
    );
    expect(prompt).toContain("idade_max");
    expect(prompt).toMatch(/até 12 anos.*idade_max: 12/i);
    expect(prompt).toContain("Nunca infira nem arredonde");
  });

  it("instrui evento_pontual quando há datas de sessão listadas", () => {
    const prompt = buildPrompt(baseInput({ dias_apresentacao: "Dias 23, 30, 31" }));
    expect(prompt).toContain("evento_pontual");
    expect(prompt).toMatch(
      /datas de sessão listadas.*SEMPRE como "evento_pontual"/s,
    );
    expect(prompt).toContain('nunca "permanente"');
  });

  it("instrui extração de horários em programacao_texto", () => {
    const prompt = buildPrompt(
      baseInput({ dias_apresentacao: "Sábados e domingos, sessões às 16h" }),
    );
    expect(prompt).toContain("horarios (em programacao_texto)");
    expect(prompt).toMatch(/sessões às 16h|às 16h/i);
    expect(prompt).toContain(
      "Nunca omita horário quando houver qualquer menção no texto",
    );
  });

  it("instrui preco_centavos quando há valor no texto", () => {
    const prompt = buildPrompt(baseInput({ preco_bruto: "R$ 80,00" }));
    expect(prompt).toContain("preco_centavos");
    expect(prompt).toContain("R$ 80,00");
    expect(prompt).toContain("8000");
    expect(prompt).toMatch(
      /Só retorne null se não houver absolutamente nenhuma menção de preço/i,
    );
  });

  it("proíbe anglicismos Indoor/Outdoor no texto editorial", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("ambiente fechado");
    expect(prompt).toContain("ao ar livre");
    expect(prompt).toMatch(
      /Nunca escreva "Indoor", "Outdoor", "indoor" ou "outdoor"/,
    );
    expect(prompt).toContain('"indoor" | "outdoor" | "ambos"');
  });

  it("reforça proxima_data a partir da data de referência", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("proxima_data");
    expect(prompt).toContain("2026-05-20");
    expect(prompt).toMatch(/mais próxima que ainda não passou/i);
    expect(prompt).toContain("Nunca invente uma data");
  });

  it("instrui override de idade_min quando sinopse contém Classificação Livre", () => {
    const prompt = buildPrompt(
      baseInput({
        sinopse_oficial: "Classificação: Livre. Apresentações aos sábados.",
        idade_minima: "2",
      }),
    );
    expect(prompt).toContain("Classificação: Livre");
    expect(prompt).toMatch(/idade_min.*0.*independente/is);
    expect(prompt).toMatch(/meia.entrada.*não.*classificação/is);
  });

  it("instrui descartar duracao_minutos ≤ 5 como dado suspeito", () => {
    const prompt = buildPrompt(
      baseInput({ duracao_minutos: "1" }),
    );
    expect(prompt).toContain("duracao_minutos for ≤ 5");
    expect(prompt).toMatch(/caminhada|distância/i);
    expect(prompt).toMatch(/duracao_min.*null/is);
  });
});
