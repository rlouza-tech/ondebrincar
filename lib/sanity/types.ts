export type PrecoTipo = "gratuito" | "pago";
export type IndoorOutdoor = "indoor" | "outdoor" | "ambos";
export type StatusAtracao = "operando" | "encerrada" | "em_obras" | "esgotada";
export type TipoProgramacao = "evento_pontual" | "evento_recorrente" | "permanente";

export interface Atracao {
  slug: string;
  titulo: string;
  categoria: string;
  /**
   * Idade recomendada (curadoria), não a classificação indicativa oficial — ver
   * `idade_recomendada_min`/`idade_recomendada_max` no schema Sanity (US-I36).
   * null quando não pôde ser confirmada — site exibe "A confirmar" (US-S20).
   */
  idadeMin: number | null;
  idadeMax: number | null;
  bairro: string;
  endereco?: string;
  /** Nome do local/venue — exibido quando o endereço completo não está disponível (US-S76). */
  local?: string;
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
  /** Origem do link de compra: "sympla" | "eventim" | "clubinho" | "raindrop" | "uhuu" | "ecovilla" | "outro". Usado em analytics de conversão. */
  origem?: "sympla" | "eventim" | "clubinho" | "raindrop" | "uhuu" | "ecovilla" | "outro";
}

/** Shape retornado por `recomendacoesPorTema`/`recomendacoesPorBairro` (US-I33). */
export interface SanityRecomendacaoDocument {
  slug: string;
  titulo: string;
  categoria: string;
  bairro: string;
  proximaData?: string | null;
  imagemUrl?: string;
}

export interface SanityAtracaoDocument {
  _id: string;
  nome: string;
  slug: { current: string };
  categoria: string;
  idade_recomendada_min?: number | null;
  idade_recomendada_max?: number | null;
  duracao_min?: number;
  preco?: number | null;
  preco_a_partir?: boolean;
  link_compra?: string;
  origem?: "sympla" | "eventim" | "clubinho" | "raindrop" | "uhuu" | "ecovilla" | "outro";
  bairro: string;
  endereco?: string;
  local?: string;
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
