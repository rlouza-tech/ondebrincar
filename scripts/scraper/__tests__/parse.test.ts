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
  isLocalizacaoRioDeJaneiro,
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

  describe("guard meia-entrada (bug 0–12)", () => {
    it("ignora 'Crianças de X a Y anos' em contexto de meia-entrada — extractFaixaEtaria", () => {
      const text = "Meia-entrada: Crianças de 0 a 12 anos.";
      expect(extractFaixaEtaria(text)).toEqual({ idade_minima: "", idade_maxima: "" });
    });

    it("ignora 'X a Y anos' em contexto de meia-entrada — extractIdadeMaxima", () => {
      const text = "Meia-entrada: Crianças de 0 a 12 anos. Espetáculo para toda a família.";
      expect(extractIdadeMaxima(text)).toBe("");
    });

    it("ignora 'X a Y anos' em contexto de meia-entrada — extractIdadeMinima", () => {
      const text = "Meia-entrada: Crianças de 3 a 12 anos.";
      expect(extractIdadeMinima(text)).toBe("");
    });

    it("ignora 'paga meia' com faixa etária", () => {
      const text = "Crianças que pagam meia de 2 a 12 anos.";
      expect(extractIdadeMaxima(text)).toBe("");
    });

    it("não ignora faixa etária legítima sem contexto de meia-entrada", () => {
      const text = "Indicado para crianças de 3 a 8 anos. Duração: 50 minutos.";
      expect(extractIdadeMinima(text)).toBe("3");
      expect(extractIdadeMaxima(text)).toBe("8");
    });
  });

  describe("Classificação: Livre → idade_max 18", () => {
    it("retorna 18 para extractIdadeMaxima quando texto diz Classificação: Livre", () => {
      const text = "Classificação: Livre. Indicado para toda a família.";
      expect(extractIdadeMaxima(text)).toBe("18");
    });

    it("retorna 0 e 18 quando meia-entrada + Classificação: Livre presentes", () => {
      const text =
        "Meia-entrada: Crianças de 0 a 12 anos. Classificação: Livre.";
      expect(extractIdadeMinima(text)).toBe("0");
      expect(extractIdadeMaxima(text)).toBe("18");
    });
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

  describe("isLocalizacaoRioDeJaneiro", () => {
    it("aceita venue com 'Rio de Janeiro' explícito", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro dos Quatro - Gávea, Rio de Janeiro")).toBe(true);
    });

    it("aceita venue com ', RJ'", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro Municipal - Rio de Janeiro, RJ")).toBe(true);
    });

    it("aceita venue com ', RJ' em maiúsculas/minúsculas", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro X - Centro, rj")).toBe(true);
    });

    it("rejeita venue com São Paulo explícito", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro Alfa - São Paulo, SP")).toBe(false);
    });

    it("rejeita venue com Niterói", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro Niterói - Niterói")).toBe(false);
    });

    it("rejeita Teresópolis no bairro", () => {
      expect(isLocalizacaoRioDeJaneiro("Le Canton", "Teresópolis")).toBe(false);
    });

    it("rejeita Mangaratiba no venue", () => {
      expect(isLocalizacaoRioDeJaneiro("Portobello Resort e Safari", "Mangaratiba")).toBe(false);
    });

    it("rejeita Petrópolis", () => {
      expect(isLocalizacaoRioDeJaneiro("Pousada X", "Petrópolis")).toBe(false);
    });

    it("rejeita Angra dos Reis", () => {
      expect(isLocalizacaoRioDeJaneiro("Resort Angra dos Reis", "")).toBe(false);
    });

    it("rejeita Búzios", () => {
      expect(isLocalizacaoRioDeJaneiro("Pousada Búzios", "")).toBe(false);
    });

    it("rejeita Cabo Frio", () => {
      expect(isLocalizacaoRioDeJaneiro("Parque X", "Cabo Frio")).toBe(false);
    });

    it("rejeita venue com ', SP'", () => {
      expect(isLocalizacaoRioDeJaneiro("Espaço Cultural, SP")).toBe(false);
    });

    it("aceita bairro carioca ambíguo sem marcador geográfico (Tijuca)", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro Carlos Gomes", "Tijuca")).toBe(true);
    });

    it("aceita bairro carioca ambíguo sem marcador geográfico (Recreio)", () => {
      expect(isLocalizacaoRioDeJaneiro("Teatro Recreio")).toBe(true);
    });

    it("rejeita venue sem nenhum marcador geográfico (v2: conservador)", () => {
      // v2: sem bairro carioca reconhecido e sem "Rio de Janeiro, RJ" explícito → false.
      // Para aceitar, venue precisa ter o bairro ou marcador completo.
      expect(isLocalizacaoRioDeJaneiro("Teatro Municipal")).toBe(false);
    });

    it("rejeita venue Niterói com acento diferente (nitero)", () => {
      // Municípios fluminenses são checados antes do marcador ', RJ'.
      // "Niterói, RJ" deve ser rejeitado porque Niterói não é o município do Rio.
      expect(isLocalizacaoRioDeJaneiro("Teatro em Niterói, RJ")).toBe(false);
    });
  });
});
