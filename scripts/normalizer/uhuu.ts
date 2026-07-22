/**
 * Normalizer — Uhuu (US-S28)
 *
 * Lê o CSV produzido por `pnpm scrape --source uhuu` (uhuu-raw.csv) e retorna
 * PipelineInput[]. Wrapper fino sobre readCSV: o CSV já usa o formato
 * canônico (scripts/scraper/csv.ts::CSV_COLUMNS), igual ao do Clubinho.
 *
 * Mapeamento de campos (o que o scraper consegue vs. o que fica para o Gemini):
 *   nome, venue, dias_apresentacao, url_origem, url_ingresso   → vêm direto do
 *     payload de analytics embutido no card de listagem da Uhuu (gtag
 *     select_item) — sempre presentes.
 *   categoria_origem, sinopse_oficial, duracao_minutos         → vêm da página
 *     do evento (aba "Sobre"). sinopse_oficial e duracao_minutos podem ficar
 *     vazios se o evento não descrever duração em minutos no texto.
 *   idade_minima, idade_maxima                                 → derivados da
 *     classificação indicativa do card ("Livre" → 0–18, "N Anos" → N–vazio).
 *     Ausentes quando a Uhuu não declara classificação (raro).
 *   preco_bruto, preco_inteira_centavos                        → do preço "a
 *     partir de" mostrado no card; a Uhuu não expõe o preço cheio (sem
 *     desconto) separadamente, então preco_a_partir é sempre true.
 *   bairro, endereco, horarios_sessao, desconto_percentual     → SEMPRE
 *     vazios — a Uhuu não expõe bairro nem endereço textual (só coordenadas
 *     via link do Google Maps, sem geocoding por decisão de projeto — ver
 *     scripts/normalizer/sympla.ts), nem grade de horários de sessão
 *     separada, nem percentual de desconto. Ficam para o Gemini preencher a
 *     partir de venue + sinopse quando possível, ou revisão manual.
 */

import { readCSV } from "@/scripts/pipeline-ia/csv";
import type { PipelineInput } from "@/lib/pipeline/types";

export const DEFAULT_INPUT_PATH = "data/input/uhuu-raw.csv";

export async function normalizeUhuu(
  inputPath: string = DEFAULT_INPUT_PATH,
): Promise<PipelineInput[]> {
  return readCSV(inputPath);
}
