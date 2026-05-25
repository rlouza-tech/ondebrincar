import { describe, expect, it } from "vitest";
import {
  extractBairroFromVenue,
  extractFaixaEtaria,
  extractFromLdJson,
  extractHorariosSessao,
  extractIdadeMaxima,
  extractIdadeMinima,
  extractSinopseOficial,
  formatPrecoBruto,
  isGratuidadeCriancaAte,
  stripHtml,
} from "../parse";

describe("scraper parse", () => {
  it("extrai faixa etária Crianças de X a Y anos", () => {
    const text = "Gratuidade: Crianças de 3 a 12 anos. Crianças até 3 anos não pagam.";
    expect(extractFaixaEtaria(text)).toEqual({
      idade_minima: "3",
      idade_maxima: "12",
    });
    expect(extractIdadeMinima(text)).toBe("3");
    expect(extractIdadeMaxima(text)).toBe("12");
  });

  it("não usa gratuidade Crianças até X anos para idade_minima", () => {
    const text =
      "Crianças até 3 anos de idade não pagam ingresso. Classificação: Livre.";
    expect(isGratuidadeCriancaAte(text)).toBe(true);
    expect(extractIdadeMinima(text)).toBe("0");
    expect(extractFaixaEtaria(text).idade_minima).toBe("");
  });

  it("extrai sinopse da seção Sobre o espetáculo no texto renderizado", () => {
    const fullText = `Outras seções
Sobre o espetáculo:
Nessa nova aventura os heróis encontram piratas do bem com muita música.
Classificação: Livre`;
    const sinopse = extractSinopseOficial(fullText);
    expect(sinopse).toContain("piratas do bem");
    expect(sinopse).not.toContain("Classificação");
  });

  it("extrai horários de sessão", () => {
    const html =
      "<p>Apresentações sábados às 16h e domingos às 15h no Teatro dos Quatro.</p>";
    expect(extractHorariosSessao(html)).toMatch(/16h/);
    expect(extractHorariosSessao(html)).toMatch(/15h/);
  });

  it("extrai startDate e venue do ld+json", () => {
    const ld = extractFromLdJson([
      {
        "@type": "Event",
        startDate: ["2026-05-30T15:00:00", "2026-05-31T11:00:00"],
        offers: { price: "49.90" },
        location: { name: "Teatro dos Quatro - Gávea" },
      },
    ]);
    expect(ld.horarios_sessao).toContain("30/05 às 15:00");
    expect(ld.horarios_sessao).toContain("31/05 às 11:00");
    expect(ld.offer_price_centavos).toBe("4990");
    expect(ld.venue).toContain("Teatro dos Quatro");
  });

  it("formata preço inteiro em centavos", () => {
    expect(formatPrecoBruto(8000, 5490)).toBe("de R$80,00");
  });

  it("extrai bairro do venue", () => {
    expect(extractBairroFromVenue("Teatro dos Quatro - Shopping da Gávea - Gávea")).toBe(
      "Gávea",
    );
  });

  it("remove HTML da sinopse", () => {
    expect(stripHtml("<p>Olá <strong>mundo</strong></p>")).toBe("Olá mundo");
  });
});
