/**
 * Persistência da data do último draft gerado — US-N2 (AC4)
 *
 * Arquivo local `data/newsletter-state.json`, sem banco de dados (assumption
 * explícita da story). Usado por classify.ts para calcular a seção
 * "Novidades" na rodada seguinte.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export const STATE_PATH = join(process.cwd(), "data", "newsletter-state.json");

export interface NewsletterState {
  lastDraftDate: string; // ISO datetime
}

/** Lê o state. Retorna null se o arquivo não existe (primeira execução) ou
 * está corrompido — nunca lança, quem chama decide o fallback. */
export async function lerState(path: string = STATE_PATH): Promise<NewsletterState | null> {
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<NewsletterState>;
    if (typeof parsed.lastDraftDate !== "string") return null;
    return { lastDraftDate: parsed.lastDraftDate };
  } catch {
    return null;
  }
}

export async function salvarState(
  state: NewsletterState,
  path: string = STATE_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2) + "\n", "utf-8");
}
