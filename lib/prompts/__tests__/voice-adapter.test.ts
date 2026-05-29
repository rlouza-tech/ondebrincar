import { describe, expect, it } from "vitest";
import {
  AI_MODEL_LABEL,
  buildIncertezaInstruction,
  buildVoiceSystemPrompt,
  CANONICAL_EXAMPLES,
} from "../voice-adapter";

describe("voice-adapter", () => {
  it("expõe label canônico do modelo para Sanity", () => {
    expect(AI_MODEL_LABEL).toBe("gemini-flash-2.5");
  });

  it("inclui 3 exemplos canônicos de fichas reais aprovadas", () => {
    expect(CANONICAL_EXAMPLES).toHaveLength(3);
    // Verifica que todos os exemplos têm titulo, descricao e mini_review não-vazios
    for (const exemplo of CANONICAL_EXAMPLES) {
      expect(exemplo.titulo.length).toBeGreaterThan(0);
      expect(exemplo.descricao.length).toBeGreaterThanOrEqual(50);
      expect(exemplo.descricao.length).toBeLessThanOrEqual(600);
      expect(exemplo.mini_review.length).toBeGreaterThanOrEqual(50);
      expect(exemplo.mini_review.length).toBeLessThanOrEqual(500);
    }
  });

  it("system prompt referencia persona Daniel Mendes e exemplos canônicos reais", () => {
    const prompt = buildVoiceSystemPrompt();
    expect(prompt).toContain("Daniel Mendes");
    expect(prompt).toContain("Lívia (4)");
    expect(prompt).toContain("Tijuca");
    // Conteúdo dos novos exemplos canônicos
    expect(prompt).toContain("primeira ida ao teatro");
    expect(prompt).toContain("elenco infantil");
    expect(prompt).toContain("garanta");
  });

  it("instrui [INCERTO] inline, abstain_fields e anti-padrão de afirmação", () => {
    const instruction = buildIncertezaInstruction();
    expect(instruction).toContain("[INCERTO]");
    expect(instruction).toContain("abstain_fields");
    expect(instruction).toMatch(/NÃO invente/i);
    // Anti-padrão: não afirmar valor depois do [INCERTO]
    expect(instruction).toContain("Anti-padrão");
    expect(instruction).toMatch(/NÃO afirme o valor incerto/i);
  });

  it("instrui limites de caracteres em descricao, mini_review e programacao_texto", () => {
    const instruction = buildIncertezaInstruction();
    expect(instruction).toContain("600");
    expect(instruction).toContain("500");
    expect(instruction).toContain("200");
    expect(instruction).toMatch(/LIMITES DE CARACTERES/i);
  });
});
