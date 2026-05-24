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

  it("inclui 3 exemplos canônicos de voz Onde Brincar", () => {
    expect(CANONICAL_EXAMPLES).toHaveLength(3);
    expect(CANONICAL_EXAMPLES.map((e) => e.titulo)).toEqual([
      "Primeira ida ao teatro (tom acolhedor)",
      "Ressalva sobre duração",
      "Aviso sobre acessibilidade (incerteza explícita)",
    ]);
  });

  it("system prompt referencia persona Daniel Mendes e exemplos", () => {
    const prompt = buildVoiceSystemPrompt();
    expect(prompt).toContain("Daniel Mendes");
    expect(prompt).toContain("Lívia (4)");
    expect(prompt).toContain("Tijuca");
    expect(prompt).toContain("primeira ida ao teatro");
    expect(prompt).toContain("90 minutos");
    expect(prompt).toContain("acessibilidade");
  });

  it("instrui [INCERTO] inline e abstain_fields", () => {
    const instruction = buildIncertezaInstruction();
    expect(instruction).toContain("[INCERTO]");
    expect(instruction).toContain("abstain_fields");
    expect(instruction).toMatch(/NÃO invente/i);
  });
});
