import { describe, expect, it } from "vitest";
import {
  buildCostSummary,
  estimateCostBrl,
  extractTokenUsage,
  USD_TO_BRL,
} from "../cost-log";

describe("cost-log", () => {
  it("estima custo em reais a partir de tokens", () => {
    const cost = estimateCostBrl({ input_tokens: 10_000, output_tokens: 2_000 });
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.05);
  });

  it("extrai usageMetadata da resposta Gemini", () => {
    const usage = extractTokenUsage({
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    });
    expect(usage).toEqual({ input_tokens: 100, output_tokens: 50 });
  });

  it("projeta custo mensal para 60 fichas abaixo de R$10", () => {
    const entries = Array.from({ length: 5 }, () => ({
      timestamp: "2026-05-19T12:00:00.000Z",
      input_tokens: 8_000,
      output_tokens: 1_500,
      custo_estimado_reais: 0.01,
      model: "gemini-2.5-flash",
      success_or_error: "success" as const,
    }));
    const summary = buildCostSummary(entries);
    expect(summary.custo_estimado_mensal_60_fichas_reais).toBeLessThan(10);
    expect(USD_TO_BRL).toBe(5.5);
  });
});
