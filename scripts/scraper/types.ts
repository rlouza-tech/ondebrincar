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
