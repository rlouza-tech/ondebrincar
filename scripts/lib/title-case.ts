// US-S58: fontes (Sympla, Clubinho, Uhuu, Raindrop, manual) às vezes despejam o
// título bruto em CAIXA ALTA (ex.: "COLÔNIA DE FÉRIAS ARTÍSTICAS DO CAQUI",
// "ANA E O MAR, O MUSICAL INFANTIL" — 2 ocorrências confirmadas em fontes
// diferentes). Normaliza pra Title Case em português só quando o título é
// inteiramente caixa alta, pra não mexer em nomes próprios com capitalização
// estilizada mista (ex.: "iFood", "eSports").
const KNOWN_ACRONYMS = new Set(["CCBB", "RJ", "SP"]);

// Preposições/artigos/conjunções curtas que ficam minúsculas em Title Case
// pt-BR, exceto quando abrem o título.
const LOWERCASE_WORDS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "os",
  "para",
  "um",
  "uma",
]);

function isAllCaps(value: string): boolean {
  const letters = value.replace(/[^\p{L}]/gu, "");
  if (letters.length === 0) return false;
  return letters === letters.toUpperCase() && letters !== letters.toLowerCase();
}

function capitalizeWord(word: string): string {
  const match = word.match(/^(\P{L}*)(\p{L})(.*)$/u);
  if (!match) return word.toLowerCase();
  const [, prefix, firstLetter, rest] = match;
  return `${prefix}${firstLetter.toUpperCase()}${rest.toLowerCase()}`;
}

export function normalizeAllCapsTitle(nome: string): string {
  if (!isAllCaps(nome)) return nome;

  return nome
    .split(" ")
    .map((word, index) => {
      const bare = word.replace(/[^\p{L}]/gu, "");
      if (KNOWN_ACRONYMS.has(bare.toUpperCase())) {
        return word.toUpperCase();
      }
      if (index !== 0 && LOWERCASE_WORDS.has(bare.toLowerCase())) {
        return word.toLowerCase();
      }
      return capitalizeWord(word);
    })
    .join(" ");
}
