/**
 * Testes para check-duplicatas-cross-fonte — cobertura de US-S63 (fix do
 * spike US-S46: auditoria de duplicatas entre fontes diferentes). Cobre só
 * as funções puras de normalização/similaridade/agrupamento, sem I/O real
 * (sem Sanity, sem filesystem) — AC4/AC5 da story.
 */

import { describe, expect, it } from "vitest";
import {
  diceSimilarity,
  findCandidatePairs,
  normalizeBairro,
  normalizeTokens,
  QUERY,
  THRESHOLD_DEFAULT,
  type AtracaoDoc,
} from "../check-duplicatas-cross-fonte";

// US-S64: sem excluir "duplicada" da query, um par já resolvido pelo
// apply-duplicatas.ts voltaria a aparecer como candidato pra sempre.
describe("QUERY — exclui rejeitado e duplicada (US-S64)", () => {
  it('exclui status "rejeitado"', () => {
    expect(QUERY).toContain('status != "rejeitado"');
  });

  it('exclui status "duplicada"', () => {
    expect(QUERY).toContain('status != "duplicada"');
  });
});

describe("normalizeTokens", () => {
  it("remove acentos, pontuação e stopwords", () => {
    expect(normalizeTokens("Luiz e Nazinha – Luiz Gonzaga para Crianças")).toEqual([
      "luiz", "nazinha", "luiz", "gonzaga", "criancas",
    ]);
  });

  it("é case-insensitive", () => {
    expect(normalizeTokens("CIRCO DO Tio Bino")).toEqual(["circo", "tio", "bino"]);
  });
});

describe("normalizeBairro", () => {
  it("normaliza acento, caixa e espaços nas bordas", () => {
    expect(normalizeBairro("  São Cristóvão ")).toBe("sao cristovao");
  });
});

describe("diceSimilarity", () => {
  it("retorna 1 para tokens idênticos", () => {
    expect(diceSimilarity(["luiz", "nazinha"], ["luiz", "nazinha"])).toBe(1);
  });

  it("retorna 0 para conjuntos sem interseção", () => {
    expect(diceSimilarity(["circo", "tio", "bino"], ["parque", "da", "cidade"])).toBe(0);
  });

  it("retorna 0 quando um dos lados está vazio", () => {
    expect(diceSimilarity([], ["luiz"])).toBe(0);
  });

  it("penaliza proporcionalmente uma diferença de sufixo (ex: 'Sessão 3')", () => {
    const a = normalizeTokens("Colônia de Férias do Caqui");
    const b = normalizeTokens("Colônia de Férias do Caqui - Turma B");
    const score = diceSimilarity(a, b);
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThan(1);
  });
});

describe("findCandidatePairs", () => {
  function doc(over: Partial<AtracaoDoc>): AtracaoDoc {
    return {
      _id: "atracao-x",
      slug: "x",
      nome: "Nome",
      bairro: "Tijuca",
      origem: "sympla",
      ...over,
    };
  }

  it("sinaliza par de nomes idênticos entre origens diferentes, mesmo bairro", () => {
    const docs: AtracaoDoc[] = [
      doc({
        _id: "atracao-luiz-e-nazinha-clubinho",
        slug: "luiz-e-nazinha-clubinho",
        nome: "Luiz e Nazinha – Luiz Gonzaga para Crianças",
        bairro: "São Cristóvão",
        origem: "clubinho",
      }),
      doc({
        _id: "atracao-luiz-e-nazinha-sympla",
        slug: "luiz-e-nazinha-sympla",
        nome: "Luiz e Nazinha – Luiz Gonzaga para Crianças",
        bairro: "São Cristóvão",
        origem: "sympla",
      }),
    ];

    const candidatos = findCandidatePairs(docs);

    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].score).toBe(1);
    expect([candidatos[0].a._id, candidatos[0].b._id]).toEqual(
      expect.arrayContaining(["atracao-luiz-e-nazinha-clubinho", "atracao-luiz-e-nazinha-sympla"]),
    );
  });

  it("não sinaliza nomes parecidos mas legitimamente diferentes no mesmo bairro", () => {
    const docs: AtracaoDoc[] = [
      doc({
        _id: "atracao-circo-a",
        nome: "Circo Vitória",
        bairro: "Barra da Tijuca",
        origem: "sympla",
      }),
      doc({
        _id: "atracao-circo-b",
        nome: "Teatro de Bonecos do Parque",
        bairro: "Barra da Tijuca",
        origem: "clubinho",
      }),
    ];

    const candidatos = findCandidatePairs(docs, THRESHOLD_DEFAULT);

    expect(candidatos).toHaveLength(0);
  });

  it("não compara documentos da mesma origem (evita falso positivo de draft/published)", () => {
    const docs: AtracaoDoc[] = [
      doc({
        _id: "atracao-peca-x",
        slug: "peca-x",
        nome: "Peça X",
        bairro: "Leblon",
        origem: "sympla",
      }),
      doc({
        _id: "drafts.atracao-peca-x",
        slug: "peca-x",
        nome: "Peça X",
        bairro: "Leblon",
        origem: "sympla",
      }),
    ];

    const candidatos = findCandidatePairs(docs);

    expect(candidatos).toHaveLength(0);
  });

  it("não compara documentos em bairros diferentes, mesmo com nome idêntico", () => {
    const docs: AtracaoDoc[] = [
      doc({
        _id: "atracao-a",
        nome: "Festival de Inverno",
        bairro: "Tijuca",
        origem: "sympla",
      }),
      doc({
        _id: "atracao-b",
        nome: "Festival de Inverno",
        bairro: "Copacabana",
        origem: "clubinho",
      }),
    ];

    const candidatos = findCandidatePairs(docs);

    expect(candidatos).toHaveLength(0);
  });

  it("trata origem ausente (null) como um único grupo — nunca compara entre si", () => {
    const docs: AtracaoDoc[] = [
      doc({ _id: "atracao-a", nome: "Peça Sem Origem", bairro: "Tijuca", origem: null }),
      doc({ _id: "atracao-b", nome: "Peça Sem Origem", bairro: "Tijuca", origem: null }),
    ];

    const candidatos = findCandidatePairs(docs);

    expect(candidatos).toHaveLength(0);
  });

  it("ordena candidatos por score decrescente", () => {
    const docs: AtracaoDoc[] = [
      doc({
        _id: "atracao-a1",
        nome: "Colônia de Férias do Caqui",
        bairro: "Tijuca",
        origem: "sympla",
      }),
      doc({
        _id: "atracao-a2",
        nome: "Colônia de Férias do Caqui - Turma B",
        bairro: "Tijuca",
        origem: "clubinho",
      }),
      doc({
        _id: "atracao-b1",
        nome: "Luiz e Nazinha",
        bairro: "Tijuca",
        origem: "sympla",
      }),
      doc({
        _id: "atracao-b2",
        nome: "Luiz e Nazinha",
        bairro: "Tijuca",
        origem: "clubinho",
      }),
    ];

    const candidatos = findCandidatePairs(docs, 0.5);

    expect(candidatos.length).toBeGreaterThanOrEqual(2);
    expect(candidatos[0].score).toBeGreaterThanOrEqual(candidatos[1].score);
    expect(candidatos[0].score).toBe(1);
  });
});
