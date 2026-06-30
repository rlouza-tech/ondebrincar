/**
 * categoria-inferencia.ts — US-S22
 *
 * Inferência de categoria canônica por palavra-chave quando o Gemini
 * retorna um valor inválido (fora de CATEGORIAS_VALIDAS).
 *
 * Fluxo de resolução em buildLinhaEnriquecida (index.ts):
 *   1. categoria_origem já é canônica  → usa direto (sem Gemini)
 *   2. Gemini retornou categoria válida → usa
 *   3. Gemini retornou inválida         → tenta inferirCategoriaPorKeyword()
 *   4. Sem match                        → mantém valor inválido (quality gate sinaliza needs_human)
 *
 * Busca em texto combinado: nome + categoria_origem + venue.
 * Regras ordenadas por especificidade — a primeira que fizer match vence.
 */

import type { Categoria } from "./types";

interface KeywordRule {
  /** Substrings a buscar (após normalização NFD + lowercase). */
  keywords: string[];
  categoria: Categoria;
}

/**
 * Regras em ordem de especificidade decrescente.
 * Categorias mais granulares (colonia-de-ferias, festa-junina) vêm antes
 * das mais genéricas (atividade-extra, evento) para evitar falsos positivos.
 */
export const KEYWORD_RULES: KeywordRule[] = [
  {
    // Colônia de férias é subconjunto de atividade-extra — precisa vir antes.
    // Cobre variações: "Colônia de Férias", "colonia de ferias", "Acampamento".
    keywords: ["colonia de ferias", "acampamento"],
    categoria: "colonia-de-ferias",
  },
  {
    keywords: ["festa junina", "festa-junina", "quadrilha", "arraial", "arraia", "quermesse"],
    categoria: "festa-junina",
  },
  {
    keywords: ["futebol", "soccer"],
    categoria: "futebol",
  },
  {
    // Teatro é o caso mais frequente de categoria_origem não canônica:
    // "Teatro Infantil" → "teatro". Inclui circo, ballet, dança e ópera
    // (todos se encaixam em espetáculos com sessão e ingresso).
    keywords: ["teatro", "espetaculo", "musical", "circo", "ballet", "bale", "opera", "danca", "peca infantil", "peca de teatro"],
    categoria: "teatro",
  },
  {
    keywords: ["museu", "exposicao", "galeria"],
    categoria: "museu",
  },
  {
    keywords: ["praia", "beach"],
    categoria: "praia",
  },
  {
    // Praça/playground antes de parque: evita "parquinho" matchando em "parque".
    keywords: ["pracinha", "praca", "playground", "parquinho"],
    categoria: "pracinha",
  },
  {
    keywords: [
      "parque",
      "aquario",
      "jardim botanico",
      "zoologico",
      "floresta",
      "reserva ecologica",
    ],
    categoria: "parque",
  },
  {
    keywords: ["restaurante"],
    categoria: "restaurante",
  },
  {
    // Atividade extra como catch-all para cursos e oficinas que não se encaixaram antes.
    keywords: [
      "atividade",
      "curso",
      "aula",
      "workshop",
      "oficina",
      "natacao",
      "judo",
      "capoeira",
      "ginastica",
    ],
    categoria: "atividade-extra",
  },
];

/**
 * Normaliza texto para busca de substrings:
 * lowercase + remove diacríticos + substitui não-alfanumérico por espaço.
 */
export function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Infere categoria canônica a partir de palavras-chave.
 *
 * Combina nome + categoria_origem + venue em um único texto normalizado
 * e aplica as regras em ordem de especificidade.
 *
 * @returns Categoria canônica inferida, ou null se nenhuma regra fizer match.
 */
export function inferirCategoriaPorKeyword(
  nome: string,
  categoriaOrigem: string,
  venue: string,
): Categoria | null {
  const combinedText = normalizeForSearch(
    [nome, categoriaOrigem, venue].join(" "),
  );

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (combinedText.includes(keyword)) {
        return rule.categoria;
      }
    }
  }

  return null;
}
