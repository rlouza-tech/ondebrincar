/**
 * imagen.ts
 * Cliente de geração de imagem via Gemini 2.5 Flash Image.
 * Retry 3x com backoff exponencial. Fallback retorna failed: true.
 * ADR: docs/decisions/2026-05-26-s4-8a-image-gen.md
 */

import { GoogleGenAI } from "@google/genai";
import { IMAGE_MODEL } from "@/lib/prompts/image-adapter";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5_000;

export interface ImageGenResult {
  imageBuffer: Buffer | null;
  mimeType: string;
  failed: boolean;
  error?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(message: string): boolean {
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("UNAVAILABLE")
  );
}

/**
 * Gera uma imagem via Gemini 2.5 Flash Image a partir de um prompt textual.
 * Retenta automaticamente em caso de 429/503 com backoff exponencial.
 *
 * @param prompt - Prompt visual construído pelo image-adapter
 * @returns ImageGenResult com buffer PNG ou failed: true em caso de erro
 */
export async function generateImage(prompt: string): Promise<ImageGenResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { imageBuffer: null, mimeType: "image/png", failed: true, error: "GEMINI_API_KEY ausente" };
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError = "Erro desconhecido";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          responseModalities: ["IMAGE"],
        } as Record<string, unknown>,
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find(
        (p: Record<string, unknown>) => p.inlineData != null,
      ) as { inlineData: { data: string; mimeType: string } } | undefined;

      if (!imagePart?.inlineData?.data) {
        lastError = "Resposta sem inlineData de imagem";
        continue;
      }

      const buffer = Buffer.from(imagePart.inlineData.data, "base64");
      const mimeType = imagePart.inlineData.mimeType || "image/png";
      return { imageBuffer: buffer, mimeType, failed: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      lastError = message;

      const isLast = attempt === MAX_RETRIES;
      if (!isLast && isRetryableError(message)) {
        const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
        console.log(
          JSON.stringify({
            event: "imagen_retry",
            attempt,
            delay_ms: delay,
            error: message,
          }),
        );
        await sleep(delay);
        continue;
      }

      break;
    }
  }

  return { imageBuffer: null, mimeType: "image/png", failed: true, error: lastError };
}
