import { groq } from "next-sanity";

const atracaoProjection = groq`
  _id,
  nome,
  slug,
  categoria,
  idade_min,
  idade_max,
  duracao_min,
  preco,
  preco_a_partir,
  link_compra,
  origem,
  bairro,
  endereco,
  indoor_outdoor,
  status,
  tipo_programacao,
  programacao_texto,
  proxima_data,
  descricao,
  mini_review,
  foto{
    alt,
    asset->{_ref, url}
  }
`;

export const atracoesAtivas = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando" && (!defined(proxima_data) || proxima_data >= $hoje)]
  | order(proxima_data asc, nome asc) {
    ${atracaoProjection}
  }
`;

export const atracaoBySlug = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && slug.current == $slug][0] {
    ${atracaoProjection}
  }
`;

export const atracoesPorBairro = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando" && lower(bairro) == lower($bairro)]
  | order(nome asc) {
    ${atracaoProjection}
  }
`;

export const todosSlugs = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && defined(slug.current)] {
    "slug": slug.current
  }
`;

/** Slugs apenas das atrações publicadas e operando — usado pelo sitemap.xml */
export const slugsAtivos = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando" && defined(slug.current)] {
    "slug": slug.current
  }
`;
