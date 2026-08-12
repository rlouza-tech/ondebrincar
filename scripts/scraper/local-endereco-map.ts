/**
 * local-endereco-map.ts — US-S76
 *
 * Tabela persistente nome↔endereço, alimentada automaticamente pelo pipeline
 * (Sympla e Clubinho) sempre que uma extração traz os dois juntos. Serve de
 * fallback quando uma ficha futura só traz um dos dois: consulta pelo valor
 * disponível para preencher o que falta.
 *
 * Arquivo: data/local-endereco-map.json — JSON versionado no git (não
 * data/input/, que é gitignored), auditável/reversível, mesmo espírito de
 * data/logs/pipeline-runs.json. Não é gate de validação — só fallback.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const LOCAL_ENDERECO_MAP_PATH = join(
  process.cwd(),
  "data",
  "local-endereco-map.json",
);

export interface LocalEnderecoPair {
  local: string;
  endereco: string;
}

/** Normaliza para comparação: minúsculas, sem acento, sem pontuação, espaços colapsados. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Faz parse do JSON da tabela. Retorna [] se o arquivo não existir ou vier inválido. */
export function parseLocalEnderecoMap(raw: string | null): LocalEnderecoPair[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function lookupEnderecoPorLocal(
  tabela: LocalEnderecoPair[],
  local: string,
): string | null {
  const alvo = normalize(local);
  if (!alvo) return null;
  return tabela.find((par) => normalize(par.local) === alvo)?.endereco ?? null;
}

export function lookupLocalPorEndereco(
  tabela: LocalEnderecoPair[],
  endereco: string,
): string | null {
  const alvo = normalize(endereco);
  if (!alvo) return null;
  return tabela.find((par) => normalize(par.endereco) === alvo)?.local ?? null;
}

/**
 * Grava ou atualiza o par (upsert por `local` normalizado). Retorna uma nova
 * lista — não muta `tabela`. Sem efeito se local/endereco vierem vazios ou se
 * o par já existir idêntico.
 */
export function upsertPar(
  tabela: LocalEnderecoPair[],
  local: string,
  endereco: string,
): LocalEnderecoPair[] {
  const localTrim = local.trim();
  const enderecoTrim = endereco.trim();
  if (!localTrim || !enderecoTrim) return tabela;

  const alvo = normalize(localTrim);
  const idx = tabela.findIndex((par) => normalize(par.local) === alvo);
  if (idx === -1) return [...tabela, { local: localTrim, endereco: enderecoTrim }];
  if (tabela[idx].endereco === enderecoTrim) return tabela;

  const copia = [...tabela];
  copia[idx] = { local: localTrim, endereco: enderecoTrim };
  return copia;
}

export function loadLocalEnderecoMap(): LocalEnderecoPair[] {
  try {
    return parseLocalEnderecoMap(readFileSync(LOCAL_ENDERECO_MAP_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function saveLocalEnderecoMap(tabela: LocalEnderecoPair[]): void {
  mkdirSync(dirname(LOCAL_ENDERECO_MAP_PATH), { recursive: true });
  writeFileSync(LOCAL_ENDERECO_MAP_PATH, JSON.stringify(tabela, null, 2), "utf-8");
}
