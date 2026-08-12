/**
 * Normalizer — Sympla
 *
 * Lê sympla-raw-enriquecido.json (output do sympla-enrich.ts) e retorna PipelineInput[].
 *
 * Mapeamento de campos:
 *   nome            → nome
 *   venue           → venue
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

export const DEFAULT_INPUT_PATH = "data/input/sympla-raw-enriquecido.json";

/**
 * Tenta extrair o bairro a partir do campo venue da Sympla.
 *
 * Padrões reconhecidos:
 *   "Nome do Local - Bairro, RJ"         → "Bairro"
 *   "Endereço, Nº - Rio de Janeiro, RJ"  → "Rio de Janeiro"
 *
 * Se não houver correspondência, retorna "" (comportamento atual, sem regressão).
 * Não usa geocoding — decisão de MVP registrada no HANDOFF v11.
 */
export function extractBairro(venue: string): string {
  const match = venue.match(/ - ([^,]+),\s*RJ/i);
  if (!match) return "";
  const token = match[1].trim();
  // "Rio de Janeiro" é a cidade, não um bairro — tratar como sem informação
  if (token.toLowerCase() === "rio de janeiro") return "";
  return token;
}

interface SymplaRawItem {
  nome: string;
  venue: string;
  bairro?: string;
  data: string;
  link: string;
  descricao_raw: string;
  preco_raw: string;
  preco_inteira_centavos?: string;
  preco_a_partir?: boolean;
  endereco?: string;
  local?: string;
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
    bairro: item.bairro || extractBairro(item.venue),
    dias_apresentacao: item.data,
    desconto_percentual: "",
    preco_bruto: item.preco_raw,       // vazio em todos os eventos atuais
    url_origem: item.link,
    sinopse_oficial: item.descricao_raw,
    horarios_sessao: "",
    duracao_minutos: "",
    idade_minima: "",
    idade_maxima: "",
    preco_inteira_centavos: item.preco_inteira_centavos ?? "",
    url_ingresso: item.link,
    preco_a_partir: item.preco_a_partir ?? false,
    ...(item.endereco ? { endereco: item.endereco } : {}),
    ...(item.local ? { local: item.local } : {}),
  }));
}
