/**
 * Normalizer — Clubinho de Ofertas
 *
 * Lê o CSV de origem (planilha-origem.csv) e retorna PipelineInput[].
 * Wrapper fino sobre readCSV: o CSV do Clubinho já usa o formato canônico.
 */

import { readCSV } from "@/scripts/pipeline-ia/csv";
import type { PipelineInput } from "@/lib/pipeline/types";

export const DEFAULT_INPUT_PATH = "data/input/planilha-origem.csv";

export async function normalizeClubinho(
  inputPath: string = DEFAULT_INPUT_PATH,
): Promise<PipelineInput[]> {
  return readCSV(inputPath);
}
