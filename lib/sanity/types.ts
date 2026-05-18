export type PrecoTipo = "gratuito" | "pago";
export type IndoorOutdoor = "indoor" | "outdoor" | "ambos";
export type StatusAtracao = "operando" | "encerrada" | "em_obras" | "esgotada";

export interface Atracao {
  slug: string;
  titulo: string;
  categoria: string;
  idadeMin: number;
  idadeMax: number;
  bairro: string;
  precoTipo: PrecoTipo;
  precoLabel?: string;
  indoorOutdoor: IndoorOutdoor;
  descricaoCurta: string;
  imagemUrl: string;
  linkExterno: string;
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
  link_compra?: string;
  partner?: "sympla" | "eventim" | "outro";
  bairro: string;
  indoor_outdoor: IndoorOutdoor;
  status: StatusAtracao;
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
