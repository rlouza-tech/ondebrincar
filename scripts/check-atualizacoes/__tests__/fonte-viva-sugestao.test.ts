import { describe, expect, it } from "vitest";
import type { PipelineInput } from "@/lib/pipeline/types";
import { processarEmComum, processarExpiradasSemFonte } from "../index";

// US-S53: quando uma ficha já vencida (proxima_data < hoje) tem relistagem
// recorrente na fonte (comum no Clubinho — show de fim de semana relistado
// no mesmo link), a sugestão de nova data deve vir do dado fresco re-raspado
// (input.dias_apresentacao), não só do programacao_texto já salvo no Sanity
// — que nunca vai ter data nova depois que o evento já passou daquele texto.
// Causa raiz: spike US-S50 ("A Casa da Gabi", despublicada indevidamente).

const HOJE = "2026-07-13";

function buildInput(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    nome: "Ficha Teste",
    categoria_origem: "Destaques",
    venue: "Venue Teste",
    bairro: "Gávea",
    dias_apresentacao: "Dias 10",
    desconto_percentual: "10%",
    preco_bruto: "R$10",
    url_origem: "https://example.com/ficha-teste",
    ...overrides,
  };
}

describe("processarEmComum — sugestão a partir da fonte viva (US-S53)", () => {
  it("AC5(a): ficha vencida com fonte viva tendo data futura válida → sugestão vem da fonte, não do texto salvo", () => {
    const slug = "show-relistado";
    const emComum = [
      {
        input: buildInput({ dias_apresentacao: "Datas: 25 e 26 de julho." }),
        slug,
      },
    ];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-1",
          slug,
          proxima_data: "2026-07-11",
          // texto salvo está velho — não tem a data nova (25/26)
          programacao_texto: "Datas: 11 de julho.",
          status: "operando",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].sugestao).toBe("2026-07-25");
    expect(expiradas[0].origem_sugestao).toBe("fonte viva");
  });

  it("AC5(b): ficha vencida sem data futura em nenhum lugar → sem sugestão, revisão manual (comportamento atual mantido)", () => {
    const slug = "sem-data-em-lugar-nenhum";
    const emComum = [
      { input: buildInput({ dias_apresentacao: "Dias 10" }), slug },
    ];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-2",
          slug,
          proxima_data: "2026-06-01",
          programacao_texto: "",
          status: "operando",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].sugestao).toBeNull();
    expect(expiradas[0].origem_sugestao).toBeNull();
  });

  it("AC5(c) regressão: fonte viva sem data futura, mas programacao_texto salvo tem — fallback para texto salvo continua funcionando", () => {
    const slug = "so-texto-salvo-tem-data";
    const emComum = [
      { input: buildInput({ dias_apresentacao: "Dias 10" }), slug },
    ];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-3",
          slug,
          proxima_data: "2026-06-15",
          programacao_texto: "Datas: 20 de julho.",
          status: "operando",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].sugestao).toBe("2026-07-20");
    expect(expiradas[0].origem_sugestao).toBe("texto salvo");
  });

  it("fonte viva com data futura tem prioridade mesmo quando o texto salvo também tem uma data futura diferente", () => {
    const slug = "fonte-e-texto-divergem";
    const emComum = [
      {
        input: buildInput({ dias_apresentacao: "Datas: 25 de julho." }),
        slug,
      },
    ];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-4",
          slug,
          proxima_data: "2026-07-11",
          programacao_texto: "Datas: 30 de julho.",
          status: "operando",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas[0].sugestao).toBe("2026-07-25");
    expect(expiradas[0].origem_sugestao).toBe("fonte viva");
  });
});

describe("processarExpiradasSemFonte — origem_sugestao (US-S53)", () => {
  it("ficha sem fonte viva (fora do CSV/JSON desta rodada) com texto salvo tendo data futura → origem 'texto salvo'", () => {
    const fichas = [
      {
        _id: "a1",
        slug: "removida-do-csv",
        proxima_data: "2026-06-01",
        programacao_texto: "Datas: 20 de julho.",
        status: "operando",
      },
    ];

    const expiradas = processarExpiradasSemFonte(fichas, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].sugestao).toBe("2026-07-20");
    expect(expiradas[0].origem_sugestao).toBe("texto salvo");
  });

  it("ficha sem fonte viva e sem data futura no texto salvo → sem sugestão", () => {
    const fichas = [
      {
        _id: "a2",
        slug: "sem-sugestao-sem-fonte",
        proxima_data: "2026-06-01",
        programacao_texto: "",
        status: "operando",
      },
    ];

    const expiradas = processarExpiradasSemFonte(fichas, HOJE);

    expect(expiradas[0].sugestao).toBeNull();
    expect(expiradas[0].origem_sugestao).toBeNull();
  });
});
