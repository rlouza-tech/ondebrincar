/**
 * Estimativa de custo Gemini Flash 2.5 via Google AI Studio.
 * Valores documentados no ADR S4.5 — não são billing real.
 */

/** USD por token (Gemini 2.5 Flash, tier pago — maio/2026). */
const INPUT_USD_PER_TOKEN = 0.075 / 1_000_000;
const OUTPUT_USD_PER_TOKEN = 0.3 / 1_000_000;

/** Taxa fixa para projeção em reais (ADR). */
export const USD_TO_BRL = 5.5;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface CostLogEntry {
  timestamp: string;
  slug?: string;
  /** Número da tentativa que gerou este log (1 = sem retry, >1 = após retry). */
  attempt?: number;
  input_tokens: number;
  output_tokens: number;
  custo_estimado_reais: number;
  model: string;
  success_or_error: "success" | "error";
  error_message?: string;
}

export interface CostSummary {
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  custo_estimado_total_reais: number;
  custo_estimado_por_ficha_reais: number;
  custo_estimado_mensal_60_fichas_reais: number;
}

export function estimateCostBrl(usage: TokenUsage): number {
  const usd =
    usage.input_tokens * INPUT_USD_PER_TOKEN +
    usage.output_tokens * OUTPUT_USD_PER_TOKEN;
  return Number((usd * USD_TO_BRL).toFixed(6));
}

/** Extrai usageMetadata da resposta @google/genai (shape pode variar). */
export function extractTokenUsage(response: unknown): TokenUsage {
  const record = response as Record<string, unknown> | null | undefined;
  const metadata =
    (record?.usageMetadata as Record<string, number> | undefined) ??
    (record?.usage as Record<string, number> | undefined);

  const input =
    metadata?.promptTokenCount ??
    metadata?.inputTokenCount ??
    metadata?.prompt_tokens ??
    0;
  const output =
    metadata?.candidatesTokenCount ??
    metadata?.outputTokenCount ??
    metadata?.completionTokenCount ??
    metadata?.output_tokens ??
    0;

  return {
    input_tokens: Number.isFinite(input) ? input : 0,
    output_tokens: Number.isFinite(output) ? output : 0,
  };
}

export function buildCostSummary(entries: CostLogEntry[]): CostSummary {
  const successful = entries.filter((e) => e.success_or_error === "success");
  const totalInput = entries.reduce((sum, e) => sum + e.input_tokens, 0);
  const totalOutput = entries.reduce((sum, e) => sum + e.output_tokens, 0);
  const totalCost = entries.reduce((sum, e) => sum + e.custo_estimado_reais, 0);
  const perFicha =
    successful.length === 0 ? 0 : totalCost / successful.length;
  const monthly60 = perFicha * 60;

  return {
    total_calls: entries.length,
    successful_calls: successful.length,
    failed_calls: entries.length - successful.length,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    custo_estimado_total_reais: Number(totalCost.toFixed(4)),
    custo_estimado_por_ficha_reais: Number(perFicha.toFixed(4)),
    custo_estimado_mensal_60_fichas_reais: Number(monthly60.toFixed(2)),
  };
}

export async function appendCostLog(
  filePath: string,
  entry: CostLogEntry,
): Promise<void> {
  const { appendFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
}
