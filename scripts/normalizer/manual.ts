/**
 * Normalizer — Curadoria manual
 *
 * Lê o CSV de locais inseridos manualmente por Rafael e retorna PipelineInput[].
 * O CSV já usa o formato canônico de LinhaInput — sem transformação necessária.
 *
 * Locais manuais são tipicamente permanentes e gratuitos (preco_inteira_centavos=0),
 * mas o normalizer não assume isso: aceita qualquer atração no formato canônico.
 */

import { readCSV } from "@/scripts/pipeline-ia/csv";
import type { PipelineInput } from "@/lib/pipeline/types";

export const DEFAULT_INPUT_PATH = "data/input/manual-raw.csv";

export async function normalizeManual(
  inputPath: string = DEFAULT_INPUT_PATH,
): Promise<PipelineInput[]> {
  return readCSV(inputPath);
}
