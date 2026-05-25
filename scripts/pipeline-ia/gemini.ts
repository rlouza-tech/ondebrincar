import { GoogleGenAI } from "@google/genai";
import { AI_MODEL_LABEL } from "@/lib/prompts/voice-adapter";
import {
  appendCostLog,
  estimateCostBrl,
  extractTokenUsage,
  type CostLogEntry,
} from "./cost-log";
import { buildPrompt } from "./prompt";
import type { EnrichResult, LinhaInput, RespostaGemini } from "./types";

const THIRTY_SECONDS_MS = 30_000;
const RATE_LIMIT_DELAY_MS = 4_100;

// ---------------------------------------------------------------------------
// Retry / quota-aware (US-S4.1g)
// Estratégia: até MAX_ATTEMPTS tentativas para erros transitórios (429 rate-limit
// e 503). Quota diária esgotada (429 + RESOURCE_EXHAUSTED / "quota") não é
// retentável — lança QuotaExhaustedError para parar o pipeline graciosamente.
// Backoff exponencial: INITIAL_BACKOFF_MS * 2^(attempt-1) → 2s, 4s, 8s.
// ---------------------------------------------------------------------------

/** Número máximo de tentativas por chamada (1 original + 3 retries = 4 total). */
const MAX_ATTEMPTS = 4;
const INITIAL_BACKOFF_MS = 2_000;
const BACKOFF_MULTIPLIER = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Classifica o erro retornado pelo SDK @google/genai para decidir a ação:
 * - "quota_exhausted": cota diária atingida → parar pipeline
 * - "retryable":       429 transitório ou 503 → retry com backoff
 * - "non_retryable":   qualquer outro erro → falhar a ficha, continuar pipeline
 */
export type GeminiErrorKind = "quota_exhausted" | "retryable" | "non_retryable";

export function classifyGeminiError(error: unknown): GeminiErrorKind {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const rec = error as Record<string, unknown>;
  const httpStatus = (rec?.status ?? rec?.statusCode) as number | undefined;

  // Quota diária: RESOURCE_EXHAUSTED ou 429 com menção a "quota"
  const isQuota =
    msg.includes("resource_exhausted") ||
    msg.includes("exceeded your current quota") ||
    (msg.includes("quota") && (msg.includes("exceeded") || msg.includes("exhausted") || msg.includes("limit")));
  if (isQuota) return "quota_exhausted";

  // Rate-limit transitório (429) ou serviço indisponível (503)
  const is429 = httpStatus === 429 || msg.includes("429") || msg.includes("too many requests") || msg.includes("rate limit");
  const is503 = httpStatus === 503 || msg.includes("503") || msg.includes("service unavailable");
  if (is429 || is503) return "retryable";

  return "non_retryable";
}

/** Lançado quando a cota diária da API Gemini é atingida. */
export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

const PLACEHOLDER_DESCRICAO =
  "Processamento automático não concluído. Esta linha precisa de revisão humana antes de virar draft editorial.";
const PLACEHOLDER_MINI_REVIEW =
  "A curadoria precisa revisar os dados originais, porque a IA não retornou uma resposta confiável para esta atração.";

const responseSchema = {
  type: "object",
  properties: {
    categoria: {
      type: "string",
      enum: ["teatro", "parque", "museu", "atividade-extra", "evento"],
    },
    idade_min: { type: "integer", minimum: 0, maximum: 18 },
    idade_max: { type: "integer", minimum: 0, maximum: 18 },
    duracao_min: { type: "integer", nullable: true, minimum: 0 },
    preco_centavos: { type: "integer", nullable: true, minimum: 0 },
    indoor_outdoor: { type: "string", enum: ["indoor", "outdoor", "ambos"] },
    descricao: { type: "string" },
    mini_review: { type: "string" },
    tipo_programacao: {
      type: "string",
      enum: ["evento_pontual", "evento_recorrente", "permanente"],
    },
    programacao_texto: { type: "string" },
    proxima_data: { type: "string", nullable: true },
    confidence: { type: "integer", minimum: 1, maximum: 5 },
    abstain_fields: {
      type: "array",
      items: { type: "string" },
    },
    notes_for_editor: { type: "string", nullable: true },
  },
  required: [
    "categoria",
    "idade_min",
    "idade_max",
    "duracao_min",
    "preco_centavos",
    "indoor_outdoor",
    "descricao",
    "mini_review",
    "tipo_programacao",
    "programacao_texto",
    "proxima_data",
    "confidence",
    "abstain_fields",
  ],
} as const;

function errorResponse(message: string): RespostaGemini {
  return {
    categoria: "evento",
    idade_min: 0,
    idade_max: 18,
    duracao_min: null,
    preco_centavos: null,
    indoor_outdoor: "indoor",
    descricao: PLACEHOLDER_DESCRICAO,
    mini_review: PLACEHOLDER_MINI_REVIEW,
    tipo_programacao: "permanente",
    programacao_texto: "Consulte programação no link oficial",
    proxima_data: null,
    confidence: 1,
    abstain_fields: [
      "categoria",
      "idade_min",
      "idade_max",
      "duracao_min",
      "preco_centavos",
      "indoor_outdoor",
    ],
    notes_for_editor: message,
    error: message,
  };
}

function buildFailedResult(message: string, modelName: string): EnrichResult {
  return {
    resposta: errorResponse(message),
    ai_generated: false,
    ai_model: null,
    pipeline_failed: true,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      custo_estimado_reais: 0,
    },
  };
}

export function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
}

export interface EnrichOptions {
  costLogPath?: string;
  slug?: string;
}

/**
 * Chama generateContent com retry automático para erros transitórios.
 * Lança QuotaExhaustedError se a cota diária for atingida.
 * Lança o último erro recebido se todas as tentativas falharem.
 */
async function generateWithRetry(
  ai: GoogleGenAI,
  modelName: string,
  linha: LinhaInput,
  abortSignal: AbortSignal,
  slug?: string,
): Promise<{ rawText: string; response: unknown; attempt: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: buildPrompt(linha),
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema,
          abortSignal,
        },
      });

      const rawText = response.text;
      if (!rawText) throw new Error("Resposta vazia do Gemini");

      return { rawText, response, attempt };
    } catch (error) {
      lastError = error;
      const kind = classifyGeminiError(error);

      if (kind === "quota_exhausted") {
        throw new QuotaExhaustedError(
          error instanceof Error ? error.message : String(error),
        );
      }

      if (kind === "retryable" && attempt < MAX_ATTEMPTS) {
        const delayMs = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
        console.log(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            slug,
            event: "retry",
            attempt,
            max_attempts: MAX_ATTEMPTS,
            delay_ms: delayMs,
            error_message: error instanceof Error ? error.message : String(error),
          }),
        );
        await sleep(delayMs);
        continue;
      }

      // non_retryable ou tentativas esgotadas — sai do loop
      break;
    }
  }

  throw lastError;
}

export async function enrichLinha(
  linha: LinhaInput,
  modelName: string,
  options: EnrichOptions = {},
): Promise<EnrichResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return buildFailedResult("GEMINI_API_KEY ausente", modelName);
  }

  const ai = new GoogleGenAI({ apiKey });
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), THIRTY_SECONDS_MS);
  const timestamp = new Date().toISOString();

  try {
    const { rawText, response, attempt } = await generateWithRetry(
      ai,
      modelName,
      linha,
      abortController.signal,
      options.slug,
    );

    const usage = extractTokenUsage(response);
    const custo = estimateCostBrl(usage);
    const resposta = JSON.parse(rawText) as RespostaGemini;
    const result: EnrichResult = {
      resposta,
      ai_generated: true,
      ai_model: AI_MODEL_LABEL,
      pipeline_failed: false,
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        custo_estimado_reais: custo,
      },
    };

    await logCall(options, timestamp, modelName, result, undefined, attempt);
    console.log(
      JSON.stringify({
        timestamp,
        slug: options.slug,
        attempt,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        custo_estimado_reais: custo,
        model: modelName,
        success_or_error: "success",
      }),
    );

    return result;
  } catch (error) {
    // QuotaExhaustedError propaga para o pipeline poder parar graciosamente
    if (error instanceof QuotaExhaustedError) throw error;

    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const failed = buildFailedResult(message, modelName);
    await logCall(options, timestamp, modelName, failed, message, MAX_ATTEMPTS);
    console.log(
      JSON.stringify({
        timestamp,
        slug: options.slug,
        attempt: MAX_ATTEMPTS,
        input_tokens: 0,
        output_tokens: 0,
        custo_estimado_reais: 0,
        model: modelName,
        success_or_error: "error",
        error_message: message,
      }),
    );
    return failed;
  } finally {
    clearTimeout(timeout);
  }
}

async function logCall(
  options: EnrichOptions,
  timestamp: string,
  modelName: string,
  result: EnrichResult,
  errorMessage: string | undefined,
  attempt: number,
): Promise<void> {
  if (!options.costLogPath) {
    return;
  }

  const entry: CostLogEntry = {
    timestamp,
    slug: options.slug,
    attempt,
    input_tokens: result.usage.input_tokens,
    output_tokens: result.usage.output_tokens,
    custo_estimado_reais: result.usage.custo_estimado_reais,
    model: modelName,
    success_or_error: result.pipeline_failed ? "error" : "success",
    error_message: errorMessage,
  };

  await appendCostLog(options.costLogPath, entry);
}
