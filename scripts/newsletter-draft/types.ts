/**
 * Tipos compartilhados do newsletter-draft — US-N2
 */

export interface AtracaoNewsletter {
  _id: string;
  nome: string;
  slug: string;
  bairro: string;
  status: string;
  proxima_data?: string | null; // ISO date (YYYY-MM-DD), campo `proxima_data` do schema
  _createdAt: string; // ISO datetime, campo de sistema do Sanity
  mini_review?: string | null;
  descricao?: string | null;
}

export type Secao = "novidades" | "fimDeSemana" | "permanentes";

export interface ClassificacaoResultado {
  novidades: AtracaoNewsletter[];
  fimDeSemana: AtracaoNewsletter[];
  permanentes: AtracaoNewsletter[];
}
