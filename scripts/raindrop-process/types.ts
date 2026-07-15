import type { LinhaInput } from "@/scripts/pipeline-ia/types";

/**
 * Entrada montada por Claude, em sessão, após ler cada item da coleção
 * Raindrop pelo caminho validado no spike da US-S19 (API/WebFetch por
 * padrão, Chrome só quando necessário — ver Handoff-US-S19). Formato
 * canônico LinhaInput + o id do Raindrop, usado para mover o item para a
 * subcoleção "Processados" depois de processado (AC5).
 */
export interface RaindropLinhaInput extends LinhaInput {
  raindrop_id: number;
  /**
   * Data do evento (YYYY-MM-DD) quando identificável no texto bruto, antes
   * de chamar o Gemini — usada no check de expiração pré-Gemini (AC7).
   * Deixar de fora quando o texto não tiver data explícita; o quality gate
   * pós-Gemini (proxima_data_no_passado) cobre o restante dos casos.
   */
  data_hint?: string;
}

export type RaindropOutcome =
  | "created"
  | "updated"
  | "skipped_published_existe"
  | "rejected_dedup"
  | "rejected_geo"
  | "rejected_link"
  | "rejected_expirado_pre_gemini"
  | "needs_human"
  | "error";

export interface RaindropProcessResultItem {
  raindrop_id: number;
  slug: string;
  nome: string;
  outcome: RaindropOutcome;
  detail?: string;
}
