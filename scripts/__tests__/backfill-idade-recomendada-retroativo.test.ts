/**
 * Testes para backfill-idade-recomendada-retroativo — cobertura de US-S79
 * (backfill retroativo de idade recomendada no resto do catálogo, sem
 * depender de CSV/import-report de origem como a US-S77). Cobre só as
 * funções puras de roteamento e parsing — sem I/O real (sem Sanity, sem
 * Gemini) — mesmo padrão de backfill-idade-recomendada.test.ts.
 */

import { describe, expect, it } from "vitest";
import {
  buildInferenciaPrompt,
  classificarResultadoInferencia,
  parseInferenciaGemini,
  precisaInferenciaGemini,
  resolverCopiaDireta,
} from "../backfill-idade-recomendada-retroativo";

describe("precisaInferenciaGemini", () => {
  it("faixa 0-18 (Livre genérico) precisa de inferência", () => {
    expect(precisaInferenciaGemini(0, 18)).toBe(true);
  });

  it("faixa mais estreita (recomendação explícita já capturada) não precisa", () => {
    expect(precisaInferenciaGemini(4, 12)).toBe(false);
    expect(precisaInferenciaGemini(0, 3)).toBe(false);
    expect(precisaInferenciaGemini(14, null)).toBe(false);
  });

  it("idade_min ou idade_max null (não é exatamente 0/18) não precisa de inferência", () => {
    expect(precisaInferenciaGemini(null, 18)).toBe(false);
    expect(precisaInferenciaGemini(0, null)).toBe(false);
    expect(precisaInferenciaGemini(null, null)).toBe(false);
  });
});

describe("resolverCopiaDireta", () => {
  it("copia idade_min/idade_max direto pra idade_recomendada_min/max", () => {
    const result = resolverCopiaDireta({ idade_min: 3, idade_max: 10 });
    expect(result).toEqual({
      idade_recomendada_min: 3,
      idade_recomendada_max: 10,
      regra_aplicada: null,
    });
  });

  it("preserva null parcial (classificação com só idade_min explícito)", () => {
    const result = resolverCopiaDireta({ idade_min: 14, idade_max: null });
    expect(result).toEqual({
      idade_recomendada_min: 14,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
  });
});

describe("parseInferenciaGemini", () => {
  it("resposta válida com regra youtuber_kids", () => {
    const raw = JSON.stringify({
      idade_recomendada_min: 4,
      idade_recomendada_max: 12,
      regra_aplicada: "youtuber_kids",
    });
    expect(parseInferenciaGemini(raw)).toEqual({
      idade_recomendada_min: 4,
      idade_recomendada_max: 12,
      regra_aplicada: "youtuber_kids",
    });
  });

  it("resposta válida com regra teatro_bebes", () => {
    const raw = JSON.stringify({
      idade_recomendada_min: 0,
      idade_recomendada_max: 3,
      regra_aplicada: "teatro_bebes",
    });
    expect(parseInferenciaGemini(raw)).toEqual({
      idade_recomendada_min: 0,
      idade_recomendada_max: 3,
      regra_aplicada: "teatro_bebes",
    });
  });

  it("resposta sem sinal (regra_aplicada null) → sem sinal, nunca inventa dado", () => {
    const raw = JSON.stringify({
      idade_recomendada_min: null,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
    expect(parseInferenciaGemini(raw)).toEqual({
      idade_recomendada_min: null,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
  });

  it("regra desconhecida/alucinada (fora do enum) → tratada como sem sinal", () => {
    const raw = JSON.stringify({
      idade_recomendada_min: 5,
      idade_recomendada_max: 15,
      regra_aplicada: "regra_inventada",
    });
    expect(parseInferenciaGemini(raw)).toEqual({
      idade_recomendada_min: null,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
  });

  it("valor numérico sem regra correspondente (órfão) → descartado, sem sinal", () => {
    // Defesa contra alucinação: o Gemini não deveria retornar um número sem
    // apontar a regra que o gerou. Se isso acontecer, não confia no número.
    const raw = JSON.stringify({
      idade_recomendada_min: 4,
      idade_recomendada_max: 12,
      regra_aplicada: null,
    });
    expect(parseInferenciaGemini(raw)).toEqual({
      idade_recomendada_min: null,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
  });

  it("JSON malformado → sem sinal, não lança erro", () => {
    expect(parseInferenciaGemini("não é json")).toEqual({
      idade_recomendada_min: null,
      idade_recomendada_max: null,
      regra_aplicada: null,
    });
  });
});

describe("classificarResultadoInferencia", () => {
  it("regra aplicada → inferido_gemini", () => {
    expect(
      classificarResultadoInferencia({
        idade_recomendada_min: 0,
        idade_recomendada_max: 12,
        regra_aplicada: "show_infantil_generico",
      }),
    ).toBe("inferido_gemini");
  });

  it("sem regra aplicada → sem_sinal", () => {
    expect(
      classificarResultadoInferencia({
        idade_recomendada_min: null,
        idade_recomendada_max: null,
        regra_aplicada: null,
      }),
    ).toBe("sem_sinal");
  });
});

describe("buildInferenciaPrompt", () => {
  it("inclui nome, categoria, descrição e mini_review no prompt", () => {
    const prompt = buildInferenciaPrompt({
      nome: "Luluca: O Show",
      categoria: "evento",
      descricao: "A youtuber Luluca sobe ao palco.",
      mini_review: "Show certeiro para fãs.",
    });
    expect(prompt).toContain("Luluca: O Show");
    expect(prompt).toContain("evento");
    expect(prompt).toContain("A youtuber Luluca sobe ao palco.");
    expect(prompt).toContain("Show certeiro para fãs.");
  });

  it("lida com descrição/mini_review ausentes sem quebrar", () => {
    const prompt = buildInferenciaPrompt({
      nome: "Evento sem descrição",
      categoria: "evento",
      descricao: null,
      mini_review: null,
    });
    expect(prompt).toContain("(sem descrição)");
    expect(prompt).toContain("(sem mini review)");
  });

  it("nunca instrui a usar 0-18 como resultado", () => {
    const prompt = buildInferenciaPrompt({
      nome: "X",
      categoria: "evento",
      descricao: null,
      mini_review: null,
    });
    expect(prompt).toContain("Nunca use 0-18 como resultado");
  });
});
