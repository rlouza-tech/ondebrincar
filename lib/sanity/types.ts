export type PrecoTipo = "gratuito" | "pago";
export type IndoorOutdoor = "indoor" | "outdoor" | "ambos";
export type StatusAtracao = "operando" | "encerrada" | "em_obras" | "esgotada";
export type TipoProgramacao = "evento_pontual" | "evento_recorrente" | "permanente";

export interface Atracao {
  slug: string;
  titulo: string;
  categoria: string;
  idadeMin: number;
  idadeMax: number;
  bairro: string;
  precoTipo: PrecoTipo;
  precoLabel?: string;
  /** true quando há múltiplas faixas de preço — exibe "A partir de R$X" no site. */
  precoAPartir?: boolean;
  indoorOutdoor: IndoorOutdoor;
  tipoProgramacao: TipoProgramacao;
  programacaoTexto: string;
  proximaData?: string;
  descricaoCurta: string;
  imagemUrl: string;
  linkExterno: string;
  /** Canal de venda: "sympla" | "eventim" | "outro". Usado em analytics de conversão. */
  partner?: "sympla" | "eventim" | "outro";
}

export interface SanityAtracaoDocument {
  _id: string;
  nome: string;
  slug: { current: string };
  categoria: string;
  idade_min: number;
  idade_max: number;
  duracao_min?: number;
  preco?: number | null;
  preco_a_partir?: boolean;
  link_compra?: string;
  partner?: "sympla" | "eventim" | "outro";
  bairro: string;
  indoor_outdoor: IndoorOutdoor;
  status: StatusAtracao;
  tipo_programacao?: TipoProgramacao;
  programacao_texto?: string;
  proxima_data?: string | null;
  descricao: string;
  mini_review?: string;
  foto?: {
    asset?: {
      _ref?: string;
      url?: string;
    };
    alt?: string;
  };
}
