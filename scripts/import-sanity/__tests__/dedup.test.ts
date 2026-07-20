import { describe, expect, it, vi, beforeEach } from "vitest";
import { filterNewRows } from "../index";
import type { LinhaEnriquecida } from "../types";

// filterNewRows é uma função pura — testável sem mocks de I/O.

function baseLinha(slug: string): LinhaEnriquecida {
  return {
    nome: `Evento ${slug}`,
    slug,
    categoria: "teatro",
    idade_min: 4,
    idade_max: 10,
    duracao_min: 60,
    preco_centavos: 2000,
    link_compra: "https://www.sympla.com.br/exemplo",
    origem: "sympla",
    bairro: "Tijuca",
    indoor_outdoor: "indoor",
    status: "operando",
    descricao: "Descrição de teste.",
    mini_review: "Mini review de teste.",
    tipo_programacao: "evento_recorrente",
    programacao_texto: "Sábados 16h",
    proxima_data: null,
    foto_url: "",
    review_status: "auto_ok",
    abstain_reasons: [],
    confidence: 5,
    processed_at: "2026-06-01T12:00:00.000Z",
    source_url: "https://www.sympla.com.br/evento/exemplo",
    ai_generated: true,
    ai_model: "gemini-flash-2.5",
    pipeline_failed: false,
  };
}

describe("filterNewRows", () => {
  it("passa todos quando Sanity está vazio", () => {
    const rows = [baseLinha("evento-a"), baseLinha("evento-b")];
    const { newRows, ignoredCount } = filterNewRows(rows, new Set());
    expect(newRows).toHaveLength(2);
    expect(ignoredCount).toBe(0);
  });

  it("filtra slug que já existe no Sanity", () => {
    const rows = [baseLinha("evento-a"), baseLinha("evento-b"), baseLinha("evento-c")];
    const existingSlugs = new Set(["evento-b"]);
    const { newRows, ignoredCount } = filterNewRows(rows, existingSlugs);
    expect(newRows.map((r) => r.slug)).toEqual(["evento-a", "evento-c"]);
    expect(ignoredCount).toBe(1);
  });

  it("ignora todos quando todos os slugs já existem (segunda rodada)", () => {
    const rows = [baseLinha("evento-a"), baseLinha("evento-b")];
    const existingSlugs = new Set(["evento-a", "evento-b"]);
    const { newRows, ignoredCount } = filterNewRows(rows, existingSlugs);
    expect(newRows).toHaveLength(0);
    expect(ignoredCount).toBe(2);
  });

  it("é case-sensitive na comparação de slugs", () => {
    const rows = [baseLinha("Evento-A")];
    const existingSlugs = new Set(["evento-a"]);
    // Slugs gerados pelo pipeline são sempre lowercase, mas garantimos o comportamento
    const { newRows, ignoredCount } = filterNewRows(rows, existingSlugs);
    expect(newRows).toHaveLength(1); // "Evento-A" ≠ "evento-a"
    expect(ignoredCount).toBe(0);
  });

  it("contabiliza corretamente N criadas e N ignoradas", () => {
    const rows = [
      baseLinha("novo-1"),
      baseLinha("existente-1"),
      baseLinha("novo-2"),
      baseLinha("existente-2"),
      baseLinha("novo-3"),
    ];
    const existingSlugs = new Set(["existente-1", "existente-2"]);
    const { newRows, ignoredCount } = filterNewRows(rows, existingSlugs);
    expect(newRows).toHaveLength(3);
    expect(ignoredCount).toBe(2);
  });
});
