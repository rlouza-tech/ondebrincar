import type { LinhaEnriquecida } from "./types";
import type { SanityAtracaoDocInput } from "./types";

export function toSanityDoc(linha: LinhaEnriquecida): SanityAtracaoDocInput {
  const doc: SanityAtracaoDocInput = {
    _id: `drafts.atracao-${linha.slug}`,
    _type: "atracao",
    nome: linha.nome,
    slug: {
      _type: "slug",
      current: linha.slug,
    },
    categoria: linha.categoria,
    idade_min: linha.idade_min,
    idade_max: linha.idade_max,
    link_compra: linha.link_compra,
    partner: linha.partner,
    bairro: linha.bairro,
    indoor_outdoor: linha.indoor_outdoor,
    status: "operando",
    tipo_programacao: linha.tipo_programacao,
    programacao_texto: linha.programacao_texto,
    descricao: linha.descricao,
    mini_review: linha.mini_review,
    review_status: linha.review_status,
    ai_generated: linha.ai_generated,
    pipeline_failed: linha.pipeline_failed,
  };

  if (linha.ai_model) {
    doc.ai_model = linha.ai_model;
  }

  if (linha.duracao_min !== null) {
    doc.duracao_min = linha.duracao_min;
  }

  if (linha.preco_centavos !== null) {
    doc.preco = linha.preco_centavos;
  }

  if (linha.proxima_data !== null) {
    doc.proxima_data = linha.proxima_data;
  }

  return doc;
}
