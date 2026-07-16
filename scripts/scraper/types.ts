/** Linha gerada pelo scraper v2 (15 colunas). */
export interface LinhaEnriquecida {
  nome: string;
  categoria_origem: string;
  venue: string;
  bairro: string;
  dias_apresentacao: string;
  desconto_percentual: string;
  preco_bruto: string;
  url_origem: string;
  sinopse_oficial: string;
  horarios_sessao: string;
  duracao_minutos: string;
  idade_minima: string;
  idade_maxima: string;
  preco_inteira_centavos: string;
  url_ingresso: string;
  /** true quando há múltiplas faixas de preço (ex: lotes, early bird, dias avulsos vs semana). */
  preco_a_partir?: boolean;
  /** Endereço completo do venue extraído pelo scraper. Ex.: Rua Fonseca, 240 — Bangu. */
  endereco?: string;
  /**
   * Diagnóstico — US-S36 (instrumentação, 06/07/2026).
   * Status HTTP retornado por fetchProductApi() para esta ficha (da última
   * tentativa, se houve retry — ver _apiOutcome). Não faz parte do CSV de
   * saída (fora de CSV_COLUMNS, é ignorado por writeScrapedCsv).
   */
  _apiStatus?: number;
  /**
   * Diagnóstico — US-S39 (retry por item, 16/07/2026).
   * Em qual tentativa o fetchProductApi() desta ficha teve sucesso (ou não).
   * Não faz parte do CSV de saída (fora de CSV_COLUMNS).
   */
  _apiOutcome?: "primeira-tentativa" | "recuperada-via-retry" | "falhou-apos-retry";
}

export interface ListingPreview {
  url: string;
  nome: string;
  categoria_origem: string;
  venue: string;
  dias_apresentacao: string;
  desconto_percentual: string;
  preco_bruto: string;
}
