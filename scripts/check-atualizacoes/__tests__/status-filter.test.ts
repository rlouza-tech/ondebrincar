import { describe, expect, it } from "vitest";
import type { PipelineInput } from "@/lib/pipeline/types";
import {
  isFichaFechada,
  processarEmComum,
  processarExpiradasSemFonte,
} from "../index";

// US-S47: fichas encerradas/rejeitadas com proxima_data vencida não devem
// aparecer no relatório de "fichas expiradas" — já não têm informação nova a
// oferecer. Fichas com status ativo (ex.: operando) continuam aparecendo.

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

describe("isFichaFechada", () => {
  it("reconhece status encerrada como fechada", () => {
    expect(isFichaFechada("encerrada")).toBe(true);
  });

  it("reconhece status rejeitado como fechada", () => {
    expect(isFichaFechada("rejeitado")).toBe(true);
  });

  it("não considera operando como fechada", () => {
    expect(isFichaFechada("operando")).toBe(false);
  });

  it("não considera status ausente/null como fechada", () => {
    expect(isFichaFechada(undefined)).toBe(false);
    expect(isFichaFechada(null)).toBe(false);
  });
});

describe("processarEmComum — filtro de status (US-S47)", () => {
  it("ficha encerrada com data vencida NÃO aparece no relatório de expiradas", () => {
    const slug = "ficha-encerrada";
    const emComum = [{ input: buildInput(), slug }];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-1",
          slug,
          proxima_data: "2026-06-01",
          programacao_texto: "",
          status: "encerrada",
        },
      ],
    ]);

    const { expiradas, divergencias } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(0);
    expect(divergencias).toHaveLength(0);
  });

  it("ficha rejeitada com data vencida NÃO aparece no relatório de expiradas", () => {
    const slug = "ficha-rejeitada";
    const emComum = [{ input: buildInput(), slug }];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-2",
          slug,
          proxima_data: "2026-05-01",
          programacao_texto: "",
          status: "rejeitado",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(0);
  });

  it("ficha operando com data vencida aparece normalmente no relatório", () => {
    const slug = "ficha-operando";
    const emComum = [{ input: buildInput(), slug }];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-3",
          slug,
          proxima_data: "2026-06-15",
          programacao_texto: "Datas: 20 de julho.",
          link_compra: "https://example.com/compra",
          status: "operando",
        },
      ],
    ]);

    const { expiradas } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].slug).toBe(slug);
    expect(expiradas[0].data_sanity).toBe("2026-06-15");
  });

  it("ficha sem data vencida segue para checagem normal de divergências, independente de status", () => {
    const slug = "ficha-ativa";
    const emComum = [{ input: buildInput({ preco_bruto: "R$50" }), slug }];
    const fichasSanity = new Map([
      [
        slug,
        {
          _id: "atracao-4",
          slug,
          proxima_data: "2026-08-01",
          preco: 1000,
          programacao_texto: "",
          status: "operando",
        },
      ],
    ]);

    const { expiradas, divergencias } = processarEmComum(emComum, fichasSanity, HOJE);

    expect(expiradas).toHaveLength(0);
    expect(divergencias.some((d) => d.campo === "preco")).toBe(true);
  });
});

describe("processarExpiradasSemFonte — filtro de status (US-S47)", () => {
  it("filtra fichas encerradas e rejeitadas, mantém as com status ativo", () => {
    const fichas = [
      {
        _id: "a1",
        slug: "encerrada-sem-fonte",
        proxima_data: "2026-06-01",
        programacao_texto: "",
        status: "encerrada",
      },
      {
        _id: "a2",
        slug: "rejeitada-sem-fonte",
        proxima_data: "2026-06-01",
        programacao_texto: "",
        status: "rejeitado",
      },
      {
        _id: "a3",
        slug: "operando-sem-fonte",
        proxima_data: "2026-06-01",
        programacao_texto: "",
        status: "operando",
      },
    ];

    const expiradas = processarExpiradasSemFonte(fichas, HOJE);

    expect(expiradas).toHaveLength(1);
    expect(expiradas[0].slug).toBe("operando-sem-fonte");
  });

  it("retorna lista vazia quando todas as fichas estão fechadas", () => {
    const fichas = [
      { _id: "a1", slug: "x", proxima_data: "2026-06-01", status: "encerrada" },
      { _id: "a2", slug: "y", proxima_data: "2026-06-01", status: "rejeitado" },
    ];

    expect(processarExpiradasSemFonte(fichas, HOJE)).toHaveLength(0);
  });
});
