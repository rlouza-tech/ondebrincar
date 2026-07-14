/**
 * Check de expiração pré-Gemini (AC7 — US-S19).
 *
 * Itens do Raindrop com data explícita no texto já vencida em relação à
 * data de referência não entram no pipeline (economiza cota do Gemini e
 * evita ficha morta). Só filtra quando `data_hint` foi preenchido — sem
 * data identificável no texto bruto, o item segue normalmente e cai no
 * check pós-Gemini existente (quality-gate: proxima_data_no_passado).
 */

import type { RaindropLinhaInput } from "./types";

export interface ExpiredFilterResult {
  accepted: RaindropLinhaInput[];
  rejected: Array<{ raindrop_id: number; nome: string; data_hint: string }>;
}

export function filterExpiredPreGemini(
  rows: RaindropLinhaInput[],
  referenceDateIso: string,
): ExpiredFilterResult {
  const accepted: RaindropLinhaInput[] = [];
  const rejected: ExpiredFilterResult["rejected"] = [];

  for (const row of rows) {
    if (row.data_hint && row.data_hint < referenceDateIso) {
      rejected.push({ raindrop_id: row.raindrop_id, nome: row.nome, data_hint: row.data_hint });
    } else {
      accepted.push(row);
    }
  }

  return { accepted, rejected };
}
