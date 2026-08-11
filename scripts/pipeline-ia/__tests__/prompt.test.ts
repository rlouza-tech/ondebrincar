import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrompt, PROMPT_VERSION } from "../prompt";
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

  it("inclui voz editorial do guia e política de incerteza do voice-adapter", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("Curador, não organizador");
    expect(prompt).toContain("VOZ EDITORIAL");
    expect(prompt).toContain("POLÍTICA DE INCERTEZA");
    expect(prompt).toContain("[INCERTO]");
    expect(prompt).toContain("Daniel Mendes");
    expect(prompt).toContain("NUNCA citar esses nomes");
    expect(prompt).toMatch(
      /mencionar nomes de pessoas — reais ou fictícias, incluindo qualquer persona de referência interna/,
    );
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

  it("instrui descartar idade de regra de documento/identificação (US-S45)", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("REGRA ANTI-DOCUMENTO/IDENTIFICAÇÃO");
    expect(prompt).toMatch(/documento.*identidade.*obrigatório apresentar/is);
    expect(prompt).toMatch(
      /NÃO popule idade_min nem idade_max|NÃO use o número em idade_min/i,
    );
    expect(prompt).toMatch(
      /classificação indicativa ou recomendação de público/i,
    );
  });

  /**
   * Caso real 09/07/2026 — Museu do Flamengo (card principal + combo Tour na Gávea).
   * Antes (PROMPT_VERSION v1.0.5): scraper V2 mandou idade_minima=6 vinda de regra de
   * documento ("a partir de 6 anos"); o Gemini tratou como público mínimo → ficha 6–18.
   * Depois (v1.0.6 / US-S45): o prompt instrui explicitamente a ignorar esse padrão.
   */
  it("caso Museu do Flamengo: prompt pós-US-S45 rejeita idade_minima de regra de documento", () => {
    const sinopseMuseuFlamengo =
      "Classificação: Livre. ⚠️ Regras de ingressos: obrigatória apresentação de documento para crianças a partir de 6 anos. Identificação idade de crianças entre 6 e 12 anos na bilheteria.";

    const prompt = buildPrompt(
      baseInput({
        nome: "Museu Flamengo",
        categoria_origem: "Museu",
        venue: "Museu Flamengo",
        bairro: "Leblon",
        sinopse_oficial: sinopseMuseuFlamengo,
        idade_minima: "6",
        idade_maxima: "18",
      }),
    );

    // Depois: versão bumped + instrução negativa + exemplo real
    expect(PROMPT_VERSION).toBe("v1.1.0");
    expect(prompt).toContain("Exceção — regra de documento/identificação (US-S45)");
    expect(prompt).toContain("REGRA ANTI-DOCUMENTO/IDENTIFICAÇÃO (US-S45)");
    expect(prompt).toContain("Museu do Flamengo");
    expect(prompt).toContain(
      "obrigatória apresentação de documento para crianças a partir de 6 anos",
    );
    expect(prompt).toMatch(
      /idade_minima:\s*6\s*→\s*idade_min:\s*0,\s*idade_max:\s*18/i,
    );
    expect(prompt).toMatch(/regra de identificação, não público mínimo/i);

    // O input problemático continua no bloco V2 (o que o Gemini priorizava antes);
    // o fix é a instrução negativa, não remover o campo.
    expect(prompt).toContain("idade_minima: 6");
    expect(prompt).toContain(sinopseMuseuFlamengo);
  });

  it("instrui descartar duracao_minutos ≤ 5 como dado suspeito", () => {
    const prompt = buildPrompt(
      baseInput({ duracao_minutos: "1" }),
    );
    expect(prompt).toContain("duracao_minutos for ≤ 5");
    expect(prompt).toMatch(/caminhada|distância/i);
    expect(prompt).toMatch(/duracao_min.*null/is);
  });

  it("proíbe duração estimada em campos de texto quando não declarada no input (US-S18)", () => {
    const prompt = buildPrompt(baseInput());
    expect(prompt).toContain("REGRA ANTI-DURAÇÃO GENÉRICA");
    expect(prompt).toMatch(/duração aproximada de 60 minutos.*proibidas/is);
    expect(prompt).toMatch(/duracao_min null.*abstain_fields/is);
    expect(prompt).toMatch(/nunca compense com estimativa no texto/i);
  });

  describe("inferência de faixa etária por contexto (US-S20)", () => {
    it("inclui as 3 regras de inferência por contexto e a instrução de null quando nenhuma se aplica", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toContain("INFERÊNCIA DE FAIXA ETÁRIA POR CONTEXTO (US-S20)");
      expect(prompt).toMatch(/YouTuber kids.*idade_min:\s*4,\s*idade_max:\s*12/is);
      expect(prompt).toMatch(/Teatro para bebês.*idade_min:\s*0,\s*idade_max:\s*3/is);
      expect(prompt).toMatch(
        /Show musical infantil genérico.*idade_min:\s*0,\s*idade_max:\s*12/is,
      );
      expect(prompt).toMatch(
        /nenhuma das 3 pistas se aplicar.*idade_min:\s*null,\s*idade_max:\s*null/is,
      );
      expect(prompt).toContain("idade_inferida_por_contexto");
    });

    it("instrui abstenção genuína (null) em vez de forçar uma das 3 categorias", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toMatch(
        /Não force uma dessas 3 categorias só para evitar null/i,
      );
      expect(prompt).toMatch(/nunca "chute" 0 e 18 só para preencher o campo/i);
    });

    it("prioriza classificação/recomendação explícita sobre inferência por contexto", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toMatch(
        /Só se aplica quando NÃO houver classificação indicativa nem recomendação de público explícita/i,
      );
    });

    it("inclui o exemplo Luluca: O Show calibrando idade_inferida_por_contexto true vs false", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toContain("EXEMPLO 4 — INFERÊNCIA POR CONTEXTO");
      expect(prompt).toContain("Luluca: O Show");
      expect(prompt).toMatch(
        /"idade_min":4,"idade_max":12.*"idade_inferida_por_contexto":true/,
      );
      expect(prompt).toMatch(/Compare com o Exemplo 3.*idade_inferida_por_contexto=false/is);
    });
  });

  describe("CAMPO data_fim (US-S37)", () => {
    it("inclui instrução de data_fim para intervalos contínuos de dias", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toContain("CAMPO data_fim (US-S37");
      expect(prompt).toMatch(/intervalo contínuo de dias seguidos/i);
      expect(prompt).toMatch(/proxima_data = 1º dia.*data_fim = último dia/i);
    });

    it("instrui null para dias avulsos e padrão recorrente sem intervalo fechado", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toMatch(/dias forem avulsos.*não.contínuos/i);
      expect(prompt).toMatch(/padrão recorrente sem intervalo fechado/i);
    });

    it("inclui o exemplo Colônia de Férias (13 a 17 de Jul) com data_fim calibrado", () => {
      const prompt = buildPrompt(baseInput());
      expect(prompt).toContain('"proxima_data":"2026-07-13","data_fim":"2026-07-17"');
      expect(prompt).toMatch(/proxima_data é o 1º dia \(13\), data_fim é o último \(17\)/);
    });
  });
});
