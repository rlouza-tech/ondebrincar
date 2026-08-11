import type { CostSummary } from "./cost-log";

export const CATEGORIAS_VALIDAS = [
  "teatro",
  "parque",
  "pracinha",
  "museu",
  "atividade-extra",
  "evento",
  "praia",
  "colonia-de-ferias",
  "futebol",
  "restaurante",
  "festa-junina",
] as const;

export const INDOOR_OUTDOOR_VALIDOS = ["indoor", "outdoor", "ambos"] as const;

export const TIPOS_PROGRAMACAO_VALIDOS = [
  "evento_pontual",
  "evento_recorrente",
  "permanente",
] as const;

export type Categoria = (typeof CATEGORIAS_VALIDAS)[number];
export type IndoorOutdoor = (typeof INDOOR_OUTDOOR_VALIDOS)[number];
export type TipoProgramacao = (typeof TIPOS_PROGRAMACAO_VALIDOS)[number];
export type ReviewStatus = "auto_ok" | "needs_human";
export type Origem = "sympla" | "eventim" | "clubinho" | "raindrop" | "uhuu" | "ecovilla" | "outro";

export interface LinhaInput {
  nome: string;
  categoria_origem: string;
  venue: string;
  bairro: string;
  dias_apresentacao: string;
  desconto_percentual: string;
  preco_bruto: string;
  url_origem: string;
  /** Campos opcionais — presentes quando gerado pelo scraper v2 */
  sinopse_oficial?: string;
  horarios_sessao?: string;
  duracao_minutos?: string;
  idade_minima?: string;
  idade_maxima?: string;
  preco_inteira_centavos?: string;
  url_ingresso?: string;
  /** true quando há múltiplas faixas de preço na fonte (lotes, early bird, meia/inteira). */
  preco_a_partir?: boolean;
  /** Endereço completo extraído pelo scraper (ex.: Sympla fornece venue address). */
  endereco?: string;
}

export interface RespostaGemini {
  categoria: Categoria;
  /** null quando não há classificação/recomendação explícita nem inferência de contexto confiável (US-S20) — vira "A confirmar" no site. */
  idade_min: number | null;
  idade_max: number | null;
  duracao_min: number | null;
  preco_centavos: number | null;
  indoor_outdoor: IndoorOutdoor;
  descricao: string;
  mini_review: string;
  tipo_programacao: TipoProgramacao;
  programacao_texto: string;
  proxima_data: string | null;
  /** Último dia de eventos com programação contínua em vários dias seguidos (ex.: "6 a 10 de julho") — null quando não é um intervalo contínuo (US-S37). */
  data_fim: string | null;
  confidence: number;
  abstain_fields: string[];
  aviso_operacional: string | null;
  notes_for_editor?: string;
  /**
   * Preenchido pelo Gemini apenas quando `bairro` do input está vazio (US-S16).
   * Representa o bairro carioca inferido a partir do venue.
   * null = Gemini não conseguiu inferir com confiança.
   */
  bairro_inferido?: string | null;
  /** true quando idade_min/idade_max vieram de inferência por contexto (US-S20), não de classificação/recomendação explícita no texto. */
  idade_inferida_por_contexto: boolean;
  error?: string;
}

export interface LinhaEnriquecida {
  nome: string;
  slug: string;
  categoria: Categoria;
  idade_min: number | null;
  idade_max: number | null;
  duracao_min: number | null;
  preco_centavos: number | null;
  link_compra: string;
  origem: Origem;
  bairro: string;
  indoor_outdoor: IndoorOutdoor;
  status: "operando";
  descricao: string;
  mini_review: string;
  tipo_programacao: TipoProgramacao;
  programacao_texto: string;
  proxima_data: string | null;
  /** Último dia de eventos com programação contínua em vários dias seguidos — null quando não se aplica (US-S37). */
  data_fim: string | null;
  foto_url: string;
  endereco?: string;
  aviso_operacional: string | null;
  review_status: ReviewStatus;
  abstain_reasons: string[];
  confidence: number;
  processed_at: string;
  source_url: string;
  ai_generated: boolean;
  ai_model: string | null;
  pipeline_failed: boolean;
  /** true quando há múltiplas faixas de preço na fonte. Propagado sem envolver Gemini. */
  preco_a_partir: boolean;
  /** true quando idade_min/idade_max vieram de inferência por contexto (US-S20) — não de classificação/recomendação explícita. */
  idade_inferida_por_contexto: boolean;
}

export interface EnrichResult {
  resposta: RespostaGemini;
  ai_generated: boolean;
  ai_model: string | null;
  pipeline_failed: boolean;
  usage: {
    input_tokens: number;
    output_tokens: number;
    custo_estimado_reais: number;
  };
}

export interface PipelineReport {
  total: number;
  auto_ok: number;
  needs_human: number;
  taxa_abstencao: number;
  motivos_top: Record<string, number>;
  model_used: string;
  started_at: string;
  finished_at: string;
  items_with_issues: Array<{ slug: string; motivos: string[] }>;
  cost_summary: CostSummary;
  /** Definido quando a pipeline parou antes de processar todas as linhas. */
  stopped_reason?: string;
}

export interface QualityGateResult {
  status: ReviewStatus;
  reasons: string[];
}
