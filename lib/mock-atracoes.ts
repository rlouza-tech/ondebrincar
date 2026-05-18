export type PrecoTipo = "gratuito" | "pago";
export type IndoorOutdoor = "indoor" | "outdoor" | "ambos";

export interface MockAtracao {
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

export const mockAtracoes: MockAtracao[] = [
  {
    slug: "peca-o-pequeno-principe-teatro-clara-nunes",
    titulo: "O Pequeno Príncipe — versão musical",
    categoria: "Teatro infantil",
    idadeMin: 4,
    idadeMax: 10,
    bairro: "Tijuca",
    precoTipo: "pago",
    precoLabel: "R$ 40",
    indoorOutdoor: "indoor",
    descricaoCurta:
      "Adaptação musical do clássico de Saint-Exupéry, com figurinos coloridos e duração de cerca de 60 minutos. Boa primeira peça para crianças a partir de 4 anos.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://www.sympla.com.br/exemplo-pequeno-principe",
  },
  {
    slug: "parque-quinta-da-boa-vista-sao-cristovao",
    titulo: "Parque da Quinta da Boa Vista",
    categoria: "Parque",
    idadeMin: 0,
    idadeMax: 12,
    bairro: "São Cristóvão",
    precoTipo: "gratuito",
    indoorOutdoor: "outdoor",
    descricaoCurta:
      "Áreas verdes amplas, playground e espaço para piquenique. Ideal para uma tarde leve sem gastar com ingresso.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://www.rio.rj.gov.br/exemplo-quinta",
  },
  {
    slug: "museu-do-amanha-centro",
    titulo: "Museu do Amanhã",
    categoria: "Museu",
    idadeMin: 6,
    idadeMax: 14,
    bairro: "Centro",
    precoTipo: "pago",
    precoLabel: "R$ 30",
    indoorOutdoor: "indoor",
    descricaoCurta:
      "Exposição interativa sobre ciência e futuro do planeta. Funciona melhor com crianças que já leem um pouco ou acompanham os adultos na leitura dos painéis.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://museudoamanha.org.br/exemplo",
  },
  {
    slug: "bio-parque-do-rio-sao-conrado",
    titulo: "BioParque do Rio",
    categoria: "Parque",
    idadeMin: 3,
    idadeMax: 12,
    bairro: "São Conrado",
    precoTipo: "pago",
    precoLabel: "R$ 89",
    indoorOutdoor: "ambos",
    descricaoCurta:
      "Zoológico com foco em conservação; alguns recintos são cobertos. Reserve meio dia e protetor solar para os trechos ao ar livre.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://www.riozoo.com.br/exemplo",
  },
  {
    slug: "oficina-de-teatro-leite-duplo-tijuca",
    titulo: "Oficina de teatro — Leite Dúplo",
    categoria: "Atividade extra",
    idadeMin: 5,
    idadeMax: 9,
    bairro: "Tijuca",
    precoTipo: "pago",
    precoLabel: "R$ 55",
    indoorOutdoor: "indoor",
    descricaoCurta:
      "Oficina participativa de 90 minutos com jogos corporais e improviso. Grupo pequeno; vale chegar 10 minutos antes.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://www.sympla.com.br/exemplo-leite-duplo",
  },
];
