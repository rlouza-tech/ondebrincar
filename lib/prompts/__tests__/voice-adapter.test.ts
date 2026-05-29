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

  it("inclui 3 exemplos canônicos de voz Onde Brincar (fichas reais aprovadas)", () => {
    expect(CANONICAL_EXAMPLES).toHaveLength(3);
    expect(CANONICAL_EXAMPLES.map((e) => e.titulo)).toEqual([
      "Peça com elenco infantil — primeira ida ao teatro (O Mágico de Oz, Gávea)",
      "Musical Disney com lista de personagens e ressalva de ingresso (Show Mickey, Cachambi)",
      "Peça temática com ressalva prática de deslocamento e horário (João e Maria, Cachambi)",
    ]);
  });

  it("system prompt referencia persona Daniel Mendes e exemplos", () => {
    const prompt = buildVoiceSystemPrompt();
    expect(prompt).toContain("Daniel Mendes");
    expect(prompt).toContain("Lívia (4)");
    expect(prompt).toContain("Tijuca");
    expect(prompt).toContain("elenco infantil");
    expect(prompt).toContain("garanta");
  });

  it("instrui [INCERTO] inline e abstain_fields", () => {
    const instruction = buildIncertezaInstruction();
    expect(instruction).toContain("[INCERTO]");
    expect(instruction).toContain("abstain_fields");
    expect(instruction).toMatch(/NÃO invente/i);
  });

  it("instrui anti-padrão e limites de caracteres incluindo 500", () => {
    const instruction = buildIncertezaInstruction();
    expect(instruction).toContain("Anti-padrão");
    expect(instruction).toContain("500");
  });
});
