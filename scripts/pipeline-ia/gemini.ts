import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "./prompt";
import type { LinhaInput, RespostaGemini } from "./types";

const THIRTY_SECONDS_MS = 30_000;
const RATE_LIMIT_DELAY_MS = 4_100;

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
    descricao:
      "Processamento automático não concluído. Esta linha precisa de revisão humana antes de virar draft editorial.",
    mini_review:
      "A curadoria precisa revisar os dados originais, porque a IA não retornou uma resposta confiável para esta atração.",
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

export function waitForRateLimit(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
}

export async function enrichLinha(
  linha: LinhaInput,
  modelName: string,
): Promise<RespostaGemini> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("GEMINI_API_KEY ausente");
  }

  const ai = new GoogleGenAI({ apiKey });
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), THIRTY_SECONDS_MS);

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
      return errorResponse("Resposta vazia do Gemini");
    }

    return JSON.parse(rawText) as RespostaGemini;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return errorResponse(message);
  } finally {
    clearTimeout(timeout);
  }
}
