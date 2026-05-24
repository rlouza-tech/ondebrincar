import { describe, expect, it } from "vitest";
import {
  extractBairroFromVenue,
  extractHorariosSessao,
  extractIdadeMaxima,
  extractIdadeMinima,
  formatPrecoBruto,
  stripHtml,
} from "../parse";

describe("scraper parse", () => {
  it("extrai idade mínima e máxima do texto", () => {
    const text =
      "Classificação: Livre. Indicado a partir de 4 anos. Até 12 anos no colo.";
    expect(extractIdadeMinima(text)).toBe("4");
    expect(extractIdadeMaxima(text)).toBe("12");
  });

  it("extrai horários de sessão", () => {
    const html =
      "<p>Apresentações sábados às 16h e domingos às 15h no Teatro dos Quatro.</p>";
    expect(extractHorariosSessao(html)).toMatch(/16h/);
    expect(extractHorariosSessao(html)).toMatch(/15h/);
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
