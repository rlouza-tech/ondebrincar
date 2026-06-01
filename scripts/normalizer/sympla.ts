/**
 * Normalizer — Sympla
 *
 * Lê sympla-raw.json (output do sympla-scrape.ts) e retorna PipelineInput[].
 *
 * Mapeamento de campos:
 *   nome            → nome
 *   venue           → venue  (endereço completo; bairro deixado vazio — Gemini infere)
 *   data            → dias_apresentacao
 *   link            → url_origem + url_ingresso
 *   descricao_raw   → sinopse_oficial  (texto estruturado "Nome\n\nVenue\n\nData")
 *   preco_raw       → preco_bruto      (vazio: Sympla não exibe preço no card)
 *
 * Campos sem equivalente na Sympla ficam como string vazia de forma intencional.
 * O Gemini preenche o que conseguir a partir de sinopse_oficial + venue.
 */

import { readFile } from "node:fs/promises";
import type { PipelineInput } from "@/lib/pipeline/types";

export const DEFAULT_INPUT_PATH = "data/input/sympla-raw.json";

interface SymplaRawItem {
  nome: string;
  venue: string;
  data: string;
  link: string;
  descricao_raw: string;
  preco_raw: string;
}

export async function normalizeSympla(
  inputPath: string = DEFAULT_INPUT_PATH,
): Promise<PipelineInput[]> {
  const raw = await readFile(inputPath, "utf8");
  const items: SymplaRawItem[] = JSON.parse(raw);

  return items.map((item): PipelineInput => ({
    nome: item.nome,
    categoria_origem: "Teatro Infantil",
    venue: item.venue,
    bairro: "",                        // Gemini infere a partir do venue
    dias_apresentacao: item.data,
    desconto_percentual: "",
    preco_bruto: item.preco_raw,       // vazio em todos os eventos atuais
    url_origem: item.link,
    sinopse_oficial: item.descricao_raw,
    horarios_sessao: "",
    duracao_minutos: "",
    idade_minima: "",
    idade_maxima: "",
    preco_inteira_centavos: "",
    url_ingresso: item.link,
  }));
}
