import { describe, expect, it } from "vitest";
import { resolveCategoria } from "../index";
import type { LinhaInput } from "../types";

/**
 * resolveCategoria — US-S22 (reaberta 06/jul/2026)
 *
 * Antes desta reabertura, a inferência por keyword só rodava quando o Gemini
 * retornava uma categoria FORA de CATEGORIAS_VALIDAS. Se o Gemini respondia
 * "evento" ou "atividade-extra" (categorias válidas, porém genéricas — ver
 * prompt.ts), a keyword nunca era chamada, mesmo cobrindo termos claros como
 * "arraial" e "colônia de férias". Os 5 casos abaixo são ocorrências reais
 * confirmadas na revisão de fichas de 06/jul/2026 (revisao-fichas-2026-07-06.md).
 */

function linha(overrides: Partial<LinhaInput> & Pick<LinhaInput, "nome" | "categoria_origem" | "venue">): LinhaInput {
  return {
    bairro: "",
    dias_apresentacao: "",
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: "",
    ...overrides,
  };
}

describe("resolveCategoria — 5 casos reais (revisão 06/jul/2026)", () => {
  it("Família Adams – Uma Comédia Musical: Gemini respondeu 'evento', keyword acha 'teatro'", () => {
    const result = resolveCategoria(
      linha({
        nome: "Família Adams – Uma Comédia Musical",
        categoria_origem: "Evento",
        venue: "Teatro Riachuelo",
      }),
      "evento",
    );
    expect(result).toEqual({ categoria: "teatro", inferida: true });
  });

  it("Arraiá do Sítio do PicaPau Amarelo: Gemini respondeu 'evento', keyword acha 'festa-junina'", () => {
    const result = resolveCategoria(
      linha({
        nome: "Arraiá do Sítio do PicaPau Amarelo",
        categoria_origem: "Zona Sul",
        venue: "Ecovilla Ri Happy",
      }),
      "evento",
    );
    expect(result).toEqual({ categoria: "festa-junina", inferida: true });
  });

  it("Colônia de Férias Gecrear – Flamengo: Gemini respondeu 'atividade-extra', keyword acha 'colonia-de-ferias'", () => {
    const result = resolveCategoria(
      linha({
        nome: "Colônia de Férias Gecrear - Flamengo",
        categoria_origem: "Colônia de férias",
        venue: "Clube de Regatas do Flamengo",
      }),
      "atividade-extra",
    );
    expect(result).toEqual({ categoria: "colonia-de-ferias", inferida: true });
  });

  it("Colônia de Férias Gecrear – Laranjeiras: Gemini respondeu 'atividade-extra', keyword acha 'colonia-de-ferias'", () => {
    const result = resolveCategoria(
      linha({
        nome: "Colônia de Férias Gecrear - Laranjeiras",
        categoria_origem: "Colônia de férias",
        venue: "Clube Sociedade Hebraica",
      }),
      "atividade-extra",
    );
    expect(result).toEqual({ categoria: "colonia-de-ferias", inferida: true });
  });

  it("Colônia de Férias Gracie Kore: Gemini respondeu 'evento', keyword acha 'colonia-de-ferias'", () => {
    const result = resolveCategoria(
      linha({
        nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
        categoria_origem: "Evento",
        venue: "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ",
      }),
      "evento",
    );
    expect(result).toEqual({ categoria: "colonia-de-ferias", inferida: true });
  });
});

describe("resolveCategoria — regressão dos estágios 1 e 2 (não pode quebrar)", () => {
  it("estágio 1: categoria_origem já canônica → usa direto, nunca chama Gemini/keyword", () => {
    const result = resolveCategoria(
      linha({
        nome: "Qualquer Nome Com Palavra teatro no meio",
        categoria_origem: "museu",
        venue: "Qualquer Venue",
      }),
      "evento",
    );
    // categoria_origem="museu" já é canônica — vence mesmo com "teatro" no nome
    // e mesmo com o Gemini tendo retornado "evento".
    expect(result).toEqual({ categoria: "museu", inferida: false });
  });

  it("estágio 2: Gemini retorna categoria válida E específica → usa direto, sem inferida", () => {
    const result = resolveCategoria(
      linha({
        nome: "Nome sem keyword nenhuma reconhecível",
        categoria_origem: "Categoria Origem Inválida",
        venue: "Venue qualquer",
      }),
      "praia",
    );
    expect(result).toEqual({ categoria: "praia", inferida: false });
  });

  it("evento/atividade-extra do Gemini sem nenhum match de keyword: mantém a genérica (não quebra, não inventa categoria)", () => {
    const result = resolveCategoria(
      linha({
        nome: "Nome Genérico XYZ-9999",
        categoria_origem: "Categoria Desconhecida",
        venue: "Venue Irreconhecível",
      }),
      "evento",
    );
    expect(result).toEqual({ categoria: "evento", inferida: false });
  });

  it("categoria inválida do Gemini sem match de keyword: mantém valor inválido (quality gate sinaliza needs_human)", () => {
    const result = resolveCategoria(
      linha({
        nome: "Nome Genérico XYZ-9999",
        categoria_origem: "Categoria Desconhecida",
        venue: "Venue Irreconhecível",
      }),
      // @ts-expect-error — simula resposta fora de CATEGORIAS_VALIDAS (runtime guard do Gemini)
      "categoria-invalida-do-gemini",
    );
    expect(result).toEqual({ categoria: "categoria-invalida-do-gemini", inferida: false });
  });
});
