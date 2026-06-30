/**
 * bairro-extractor.ts — US-S16
 *
 * Tenta inferir o bairro de uma ficha quando o campo está vazio na fonte.
 *
 * Duas estratégias em cascata:
 *   1. venue_map  — lookup em mapa estático de venues conhecidos
 *   2. bairro_scan — varredura do venue contra a whitelist BAIRROS_RIO
 *
 * Se ambas falharem, o chamador pode recorrer ao Gemini como terceira camada
 * (campo bairro_inferido no JSON de resposta — ver prompt.ts).
 *
 * Não usa geocoding nem chamadas externas — zero custo incremental por ficha.
 */

import { BAIRROS_RIO } from "@/scripts/scraper/parse";

/**
 * Mapa estático de substrings de venue → bairro.
 * Cobre os venues mais frequentes do catálogo Clubinho/Sympla.
 * Entradas mais longas têm prioridade (são testadas primeiro).
 */
export const VENUE_BAIRRO_MAP: Record<string, string> = {
  // Teatro
  "teatro oi futuro": "Flamengo",
  "teatro oi casa grande": "Barra da Tijuca",
  "teatro laura alvim": "Ipanema",
  "teatro net rio": "Ipanema",
  "teatro leblon": "Leblon",
  "teatro riachuelo": "Centro",
  "teatro municipal do rio": "Centro",
  "teatro municipal": "Centro",
  "teatro carlos gomes": "Centro",
  "teatro nelson rodrigues": "Centro",
  "teatro maison de france": "Centro",
  "teatro margarida schivazappa": "Santa Teresa",
  "teatro villa-lobos": "Copacabana",
  "teatro clara nunes": "Centro",
  "teatro da caixa": "Centro",
  "teatro adolpho bloch": "Copacabana",
  "teatro rival": "Centro",
  "teatro jovem": "Tijuca",
  "teatro claro": "Botafogo",
  "teatro multiplan": "Barra da Tijuca",
  "teatro shopping leblon": "Leblon",
  "teatro rio sul": "Botafogo",
  "teatro shopping rio sul": "Botafogo",
  "teatro shopping tijuca": "Tijuca",
  "teatro bangu shopping": "Bangu",
  "teatro shopping bangu": "Bangu",
  "teatro shopping metrô": "Botafogo",
  "teatro fashion mall": "São Conrado",
  "teatro vivo": "Copacabana",

  // Cultura / museus
  "centro cultural banco do brasil": "Centro",
  "ccbb": "Centro",
  "museu do amanhã": "Centro",
  "museu de arte do rio": "Centro",
  "mar rio": "Centro",
  "museu nacional": "São Cristóvão",
  "museu da república": "Catete",
  "museu de arte moderna": "Centro",
  "mam rio": "Centro",
  "casa daros": "Botafogo",
  "instituto moreira salles": "Gávea",
  "ims rio": "Gávea",
  "parque lage": "Jardim Botânico",
  "jardim botânico do rio": "Jardim Botânico",

  // Espaços culturais / coworking infantil
  "espaço cria": "Santa Teresa",
  "espaço kapim": "Santa Teresa",
  "mundo da criança": "Barra da Tijuca",

  // Shoppings (venue frequente em fichas de teatro/atividade)
  "bangu shopping": "Bangu",
  "shopping tijuca": "Tijuca",
  "tijuca mall": "Tijuca",
  "barra shopping": "Barra da Tijuca",
  "barra mall": "Barra da Tijuca",
  "downtown": "Barra da Tijuca",
  "village mall": "Barra da Tijuca",
  "rio design barra": "Barra da Tijuca",
  "rio sul": "Botafogo",
  "botafogo praia shopping": "Botafogo",
  "shopping via parque": "Barra da Tijuca",
  "carioca shopping": "Del Castilho",
  "shopping américas": "Barra da Tijuca",
  "novo shopping": "Barra da Tijuca",
  "shopping leblon": "Leblon",
  "fashion mall": "São Conrado",
  "shopping são conrado": "São Conrado",
  "norte shopping": "Cachambi",
  "shopping plaza": "Flamengo",
  "san shopping": "Recreio dos Bandeirantes",
};

export type BairroExtractionMethod = "venue_map" | "bairro_scan";

export interface BairroExtractionResult {
  bairro: string;
  method: BairroExtractionMethod;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTitleCase(text: string): string {
  const minusculas = ["da", "de", "do", "das", "dos", "e"];
  return text
    .split(" ")
    .map((word, index) =>
      index === 0 || !minusculas.includes(word.toLowerCase())
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.toLowerCase(),
    )
    .join(" ");
}

/**
 * Tentativa 1: lookup no VENUE_BAIRRO_MAP.
 * Testa da entrada mais longa para a mais curta (mais específico primeiro).
 */
function tryVenueMap(venueNorm: string): BairroExtractionResult | null {
  const entries = Object.entries(VENUE_BAIRRO_MAP).sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [key, bairro] of entries) {
    if (venueNorm.includes(normalize(key))) {
      return { bairro, method: "venue_map" };
    }
  }
  return null;
}

/**
 * Tentativa 2: varredura por BAIRROS_RIO no venue.
 * Testa da entrada mais longa para a mais curta para evitar match parcial
 * (ex.: "barra da tijuca" antes de "barra de guaratiba" antes de qualquer
 * bairro de nome curto que pudesse aparecer como substring).
 */
function tryBairroScan(venueNorm: string): BairroExtractionResult | null {
  const sorted = [...BAIRROS_RIO].sort((a, b) => b.length - a.length);

  for (const bairro of sorted) {
    const bairroNorm = normalize(bairro);

    // Constrói regex com word-boundary aproximado:
    // aceita o bairro precedido/seguido por início, fim, espaço, hífen ou vírgula.
    const escaped = bairroNorm.replace(/\s+/g, "\\s+");
    const pattern = new RegExp(
      `(^|[\\s,\\-])${escaped}($|[\\s,\\-])`,
      "i",
    );

    if (pattern.test(venueNorm)) {
      return { bairro: toTitleCase(bairro), method: "bairro_scan" };
    }
  }

  return null;
}

/**
 * Tenta extrair bairro a partir do texto do venue.
 * Retorna null se não conseguir inferir com confiança mínima.
 *
 * Fluxo: venue_map → bairro_scan → null (Gemini assume no chamador)
 */
export function extractBairroFromVenue(venue: string): BairroExtractionResult | null {
  if (!venue.trim()) return null;

  const venueNorm = normalize(venue);

  return tryVenueMap(venueNorm) ?? tryBairroScan(venueNorm);
}
