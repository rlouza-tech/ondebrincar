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
    const response = await ai.models.generateContent({
      model: modelName,
      contents: buildPrompt(linha),
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
        abortSignal: abortController.signal,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      const failed = buildFailedResult("Resposta vazia do Gemini", modelName);
      await logCall(options, timestamp, modelName, failed, "Resposta vazia do Gemini");
      return failed;
    }

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

    await logCall(options, timestamp, modelName, result, undefined);
    console.log(
      JSON.stringify({
        timestamp,
        slug: options.slug,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        custo_estimado_reais: custo,
        model: modelName,
        success_or_error: "success",
      }),
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    const failed = buildFailedResult(message, modelName);
    await logCall(options, timestamp, modelName, failed, message);
    console.log(
      JSON.stringify({
        timestamp,
        slug: options.slug,
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
): Promise<void> {
  if (!options.costLogPath) {
    return;
  }

  const entry: CostLogEntry = {
    timestamp,
    slug: options.slug,
    input_tokens: result.usage.input_tokens,
    output_tokens: result.usage.output_tokens,
    custo_estimado_reais: result.usage.custo_estimado_reais,
    model: modelName,
    success_or_error: result.pipeline_failed ? "error" : "success",
    error_message: errorMessage,
  };

  await appendCostLog(options.costLogPath, entry);
}
