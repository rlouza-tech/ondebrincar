/**
 * Normalizer — EcoVilla Ri Happy (US-S31)
 *
 * Lê o CSV produzido por `pnpm scrape --source ecovilla` (ecovilla-raw.csv) e
 * retorna PipelineInput[]. Wrapper fino sobre readCSV: o CSV já usa o formato
 * canônico (scripts/scraper/csv.ts::CSV_COLUMNS), igual ao de Uhuu e Clubinho.
 *
 * Mapeamento de campos (o que o scraper consegue vs. o que fica para o Gemini):
 *   nome, dias_apresentacao, sinopse_oficial   → extraídos direto do texto de
 *     cada card na página de programação (nome, data/horário, descrição —
 *     sempre presentes nos 3 primeiros blocos de texto do card).
 *   idade_minima, idade_maxima                  → derivados da classificação
 *     indicativa do card ("Classificação: Livre" → 0–18, "N anos" → N–vazio,
 *     mesma convenção de scripts/scraper/uhuu.ts).
 *   url_ingresso                                 → só preenchido quando o link
 *     do título aponta pra ingresso.com; eventos gratuitos costumam linkar
 *     pra um formulário de RSVP (Google Forms) em vez de uma venda de
 *     ingresso — nesse caso fica vazio.
 *   venue, bairro                                → SEMPRE fixos ("Teatro
 *     EcoVilla Ri Happy", "Jardim Botânico") — venue única e conhecida, sem
 *     variação por evento.
 *   categoria_origem                             → SEMPRE fixo ("Teatro
 *     Infantil") — a página não declara categoria por evento; o pipeline-ia
 *     já trata "Teatro" como padrão não-canônico mais comum
 *     (scripts/pipeline-ia/categoria-inferencia.ts) e reclassifica quando
 *     houver evidência melhor no texto.
 *   url_origem                                   → SEMPRE a URL fixa da
 *     página de programação (ECOVILLA_PROGRAMACAO_URL) — a venue não tem
 *     página própria por evento.
 *   preco_bruto, preco_inteira_centavos, desconto_percentual,
 *   horarios_sessao, duracao_minutos             → SEMPRE vazios — nenhum
 *     desses dados aparece no texto do card. Ficam para o Gemini preencher a
 *     partir de sinopse/venue quando possível, ou revisão manual.
 */

import { readCSV } from "@/scripts/pipeline-ia/csv";
import type { PipelineInput } from "@/lib/pipeline/types";

export const DEFAULT_INPUT_PATH = "data/input/ecovilla-raw.csv";

export async function normalizeEcovilla(
  inputPath: string = DEFAULT_INPUT_PATH,
): Promise<PipelineInput[]> {
  return readCSV(inputPath);
}
