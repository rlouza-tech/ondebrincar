import { describe, expect, it } from "vitest";
import { toSanityDoc } from "../mapper";
import type { LinhaEnriquecida } from "../types";

function baseLinha(overrides: Partial<LinhaEnriquecida> = {}): LinhaEnriquecida {
  return {
    nome: "O Pequeno Príncipe",
    slug: "o-pequeno-principe-teatro-clara-nunes",
    categoria: "teatro",
    idade_min: 4,
    idade_max: 10,
    duracao_min: 60,
    preco_centavos: 4000,
    link_compra: "https://www.sympla.com.br/exemplo",
    partner: "sympla",
    bairro: "Tijuca",
    indoor_outdoor: "indoor",
    status: "operando",
    descricao: "Adaptação musical do clássico, com duração de cerca de 60 minutos e figurinos coloridos para famílias.",
    mini_review:
      "Boa primeira peça para crianças a partir de 4 anos. Ressalva: sessão sem intervalo pode cansar os mais novos no final.",
    tipo_programacao: "evento_recorrente",
    programacao_texto: "Sábados e domingos 16h e 18h",
    proxima_data: null,
    foto_url: "",
    review_status: "auto_ok",
    abstain_reasons: [],
    confidence: 5,
    processed_at: "2026-05-19T12:00:00.000Z",
    source_url: "https://clubinhodeofertas.com.br/rio-de-janeiro",
    ...overrides,
  };
}

describe("toSanityDoc", () => {
  it("mapeia linha completa com todos os campos esperados", () => {
    const doc = toSanityDoc(baseLinha());

    expect(doc).toEqual({
      _id: "drafts.atracao-o-pequeno-principe-teatro-clara-nunes",
      _type: "atracao",
      nome: "O Pequeno Príncipe",
      slug: { _type: "slug", current: "o-pequeno-principe-teatro-clara-nunes" },
      categoria: "teatro",
      idade_min: 4,
      idade_max: 10,
      duracao_min: 60,
      preco: 4000,
      link_compra: "https://www.sympla.com.br/exemplo",
      partner: "sympla",
      bairro: "Tijuca",
      indoor_outdoor: "indoor",
      status: "operando",
      tipo_programacao: "evento_recorrente",
      programacao_texto: "Sábados e domingos 16h e 18h",
      descricao:
        "Adaptação musical do clássico, com duração de cerca de 60 minutos e figurinos coloridos para famílias.",
      mini_review:
        "Boa primeira peça para crianças a partir de 4 anos. Ressalva: sessão sem intervalo pode cansar os mais novos no final.",
      review_status: "auto_ok",
    });
    expect(doc).not.toHaveProperty("foto");
  });

  it("omite preco quando preco_centavos é null", () => {
    const doc = toSanityDoc(baseLinha({ preco_centavos: null }));
    expect(doc).not.toHaveProperty("preco");
  });

  it("omite duracao_min quando é null", () => {
    const doc = toSanityDoc(baseLinha({ duracao_min: null }));
    expect(doc).not.toHaveProperty("duracao_min");
  });

  it("omite proxima_data quando é null", () => {
    const doc = toSanityDoc(baseLinha({ proxima_data: null }));
    expect(doc).not.toHaveProperty("proxima_data");
  });

  it("inclui proxima_data quando preenchida", () => {
    const doc = toSanityDoc(baseLinha({ proxima_data: "2026-05-23" }));
    expect(doc.proxima_data).toBe("2026-05-23");
  });

  it("preserva review_status auto_ok e needs_human", () => {
    expect(toSanityDoc(baseLinha({ review_status: "auto_ok" })).review_status).toBe(
      "auto_ok",
    );
    expect(
      toSanityDoc(baseLinha({ review_status: "needs_human" })).review_status,
    ).toBe("needs_human");
  });
});
