export type AssociateItemStatus = "attached" | "skipped" | "error";

export interface AssociateReportItem {
  slug: string;
  status: AssociateItemStatus;
  reason?: string;
  warnings?: string[];
}

export interface AssociateReport {
  total: number;
  attached: number;
  skipped: number;
  errors: number;
  warnings_count: number;
  items: AssociateReportItem[];
  source_csv: string;
  imagens_dir: string;
  started_at: string;
  finished_at: string;
}

export interface AssociateRow {
  slug: string;
  nome: string;
  bairro: string;
  venue: string;
}
