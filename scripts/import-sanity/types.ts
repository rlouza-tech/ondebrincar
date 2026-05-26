export type {
  Categoria,
  IndoorOutdoor,
  LinhaEnriquecida,
  Partner,
  ReviewStatus,
  TipoProgramacao,
} from "../pipeline-ia/types";

export interface SanitySlug {
  _type: "slug";
  current: string;
}

/** Documento Sanity para create() como draft (`drafts.atracao-<slug>`). */
export interface SanityAtracaoDocInput {
  _id: string;
  _type: "atracao";
  nome: string;
  slug: SanitySlug;
  categoria: string;
  idade_min: number;
  idade_max: number;
  duracao_min?: number;
  preco?: number;
  link_compra: string;
  partner: string;
  bairro: string;
  indoor_outdoor: string;
  status: string;
  tipo_programacao: string;
  programacao_texto: string;
  proxima_data?: string;
  descricao: string;
  mini_review: string;
  review_status: string;
  ai_generated: boolean;
  ai_model?: string;
  pipeline_failed: boolean;
}

export type ImportItemStatus = "created" | "skipped" | "error";

export interface ImportReportItem {
  slug: string;
  status: ImportItemStatus;
  reason?: string;
  image_gen_failed?: boolean;
  image_gen_error?: string;
}

export interface ImportReport {
  total: number;
  created: number;
  skipped: number;
  errors: number;
  images_generated: number;
  images_failed: number;
  items: ImportReportItem[];
  source_csv: string;
  started_at: string;
  finished_at: string;
}
