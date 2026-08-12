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
  local,
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

// US-S37: eventos multi-dia contínuos têm data_fim (último dia) além de proxima_data
// (1º dia) — a atração segue ativa até data_fim quando definido, não só até proxima_data.
export const atracoesAtivas = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"
    && (!defined(proxima_data)
      || (defined(data_fim) && data_fim >= $hoje)
      || (!defined(data_fim) && proxima_data >= $hoje))]
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

const recomendacaoProjection = groq`
  "slug": slug.current,
  "titulo": nome,
  categoria,
  bairro,
  "proximaData": proxima_data,
  "imagemUrl": foto.asset->url
`;

/** US-I33 — candidatos ao anel de recomendação: mesma categoria, data futura. */
export const recomendacoesPorTema = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"
    && categoria == $categoria && slug.current != $slug
    && defined(proxima_data) && proxima_data >= $hoje]
  | order(proxima_data asc)[0...6] {
    ${recomendacaoProjection}
  }
`;

/** US-I33 — candidatos ao anel de recomendação: mesmo bairro, mesmo fim de semana de referência. */
export const recomendacoesPorBairro = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"
    && lower(bairro) == lower($bairro) && slug.current != $slug
    && defined(proxima_data) && proxima_data >= $inicio && proxima_data <= $fim]
  | order(proxima_data asc)[0...6] {
    ${recomendacaoProjection}
  }
`;

/**
 * US-I35 — fallback do eixo bairro: outras atrações permanentes (sem `proxima_data`) no
 * mesmo bairro. Só usado quando a origem também é permanente; matches com data (query acima)
 * têm prioridade, este resultado só completa slots vagos.
 */
export const recomendacoesPermanentesPorBairro = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"
    && lower(bairro) == lower($bairro) && slug.current != $slug
    && tipo_programacao == "permanente" && !defined(proxima_data)]
  | order(nome asc)[0...6] {
    ${recomendacaoProjection}
  }
`;

/**
 * US-I35 — fallback do eixo tema: outras atrações permanentes (sem `proxima_data`) na
 * mesma categoria. Só usado quando a origem é permanente e o eixo bairro (mesmo já com
 * fallback aplicado) não achou nenhum candidato.
 */
export const recomendacoesPermanentesPorTema = groq`
  *[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"
    && categoria == $categoria && slug.current != $slug
    && tipo_programacao == "permanente" && !defined(proxima_data)]
  | order(nome asc)[0...6] {
    ${recomendacaoProjection}
  }
`;
