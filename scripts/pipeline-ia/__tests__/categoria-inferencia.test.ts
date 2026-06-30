import { describe, expect, it } from "vitest";
import {
  inferirCategoriaPorKeyword,
  KEYWORD_RULES,
  normalizeForSearch,
} from "../categoria-inferencia";

// ---------------------------------------------------------------------------
// normalizeForSearch
// ---------------------------------------------------------------------------

describe("normalizeForSearch", () => {
  it("converte para lowercase", () => {
    expect(normalizeForSearch("Teatro INFANTIL")).toBe("teatro infantil");
  });

  it("remove acentos", () => {
    expect(normalizeForSearch("Colônia de Férias")).toBe("colonia de ferias");
  });

  it("substitui caracteres especiais por espaço e faz trim", () => {
    // "-" e "!" viram espaço; trim() remove o espaço final → sem trailing space
    expect(normalizeForSearch("Festa-Junina!")).toBe("festa junina");
  });

  it("colapsa múltiplos espaços", () => {
    expect(normalizeForSearch("  a   b  ")).toBe("a b");
  });
});

// ---------------------------------------------------------------------------
// inferirCategoriaPorKeyword — fichas reais Clubinho/Sympla
// ---------------------------------------------------------------------------

describe("inferirCategoriaPorKeyword", () => {
  // --- teatro (caso mais frequente de categoria_origem não canônica) ---

  describe("teatro", () => {
    it("infere teatro quando categoria_origem é 'Teatro Infantil'", () => {
      const result = inferirCategoriaPorKeyword(
        "Top 10 da Galinha Pintadinha",
        "Teatro Infantil",
        "Teatro Bangu Shopping",
      );
      expect(result).toBe("teatro");
    });

    it("infere teatro por keyword no venue mesmo com categoria_origem genérica", () => {
      // venue "Teatro Laura Alvim" — padrão real Clubinho
      const result = inferirCategoriaPorKeyword(
        "Espetáculo Sem Categoria",
        "Outro",
        "Teatro Laura Alvim",
      );
      expect(result).toBe("teatro");
    });

    it("infere teatro quando nome contém 'Musical'", () => {
      const result = inferirCategoriaPorKeyword(
        "Musical da Turma da Mônica",
        "Evento Infantil",
        "Centro Cultural",
      );
      expect(result).toBe("teatro");
    });

    it("infere teatro quando nome contém 'Circo'", () => {
      const result = inferirCategoriaPorKeyword(
        "Circo das Cores",
        "Teatro Infantil",
        "Praça da Apoteose",
      );
      expect(result).toBe("teatro");
    });

    it("infere teatro por 'espetáculo' (com acento no input)", () => {
      const result = inferirCategoriaPorKeyword(
        "Espetáculo de Dança Contemporânea",
        "Artes",
        "Teatro Claro",
      );
      expect(result).toBe("teatro");
    });
  });

  // --- colonia-de-ferias (deve ter prioridade sobre atividade-extra) ---

  describe("colonia-de-ferias", () => {
    it("infere colonia-de-ferias quando categoria_origem é 'Colônia de Férias'", () => {
      // Ficha real Sympla: "Colônia de Férias - Na Cozinha com a Kapim - JUL26"
      const result = inferirCategoriaPorKeyword(
        "Colônia de Férias - Na Cozinha com a Kapim - JUL26",
        "Teatro Infantil",  // Sympla categoriza erroneamente como teatro
        "Espaço Cria – Cosme Velho",
      );
      expect(result).toBe("colonia-de-ferias");
    });

    it("infere colonia-de-ferias quando nome contém 'Colônia de Férias' sem acento no match", () => {
      const result = inferirCategoriaPorKeyword(
        "Colonia de Ferias Julho 2026",
        "Atividades",
        "Clube Fluminense",
      );
      expect(result).toBe("colonia-de-ferias");
    });

    it("infere colonia-de-ferias por 'acampamento'", () => {
      const result = inferirCategoriaPorKeyword(
        "Acampamento de Verão - Turma Junior",
        "Lazer",
        "Sítio São João",
      );
      expect(result).toBe("colonia-de-ferias");
    });

    it("NÃO confunde colônia com atividade-extra genérica", () => {
      // "colonia de ferias" deve vencer sobre "atividade" (regra de especificidade)
      const result = inferirCategoriaPorKeyword(
        "Colônia de Férias com Atividades Diversas",
        "Atividade",
        "Clube",
      );
      expect(result).toBe("colonia-de-ferias");
    });
  });

  // --- festa-junina ---

  describe("festa-junina", () => {
    it("infere festa-junina por 'Festa Junina' no nome", () => {
      const result = inferirCategoriaPorKeyword(
        "Festa Junina do Colégio São Bento",
        "Evento",
        "Botafogo",
      );
      expect(result).toBe("festa-junina");
    });

    it("infere festa-junina por 'arraial' no nome", () => {
      const result = inferirCategoriaPorKeyword(
        "Arraial das Crianças 2026",
        "Festa",
        "Praça da República",
      );
      expect(result).toBe("festa-junina");
    });
  });

  // --- futebol ---

  describe("futebol", () => {
    it("infere futebol por 'futebol' no nome", () => {
      const result = inferirCategoriaPorKeyword(
        "Escolinha de Futebol Fluminense",
        "Esporte",
        "Maracanã Jr.",
      );
      expect(result).toBe("futebol");
    });
  });

  // --- museu ---

  describe("museu", () => {
    it("infere museu por 'museu' no venue", () => {
      const result = inferirCategoriaPorKeyword(
        "Visita Guiada para Crianças",
        "Educativo",
        "Museu do Amanhã",
      );
      expect(result).toBe("museu");
    });

    it("infere museu por 'exposição' no nome", () => {
      const result = inferirCategoriaPorKeyword(
        "Exposição Interativa de Dinossauros",
        "Educação",
        "Centro Cultural",
      );
      expect(result).toBe("museu");
    });
  });

  // --- parque e pracinha ---

  describe("parque e pracinha", () => {
    it("infere pracinha por 'playground' (mais específico que parque)", () => {
      const result = inferirCategoriaPorKeyword(
        "Playground do Aterro",
        "Lazer ao Ar Livre",
        "Aterro do Flamengo",
      );
      expect(result).toBe("pracinha");
    });

    it("infere parque por 'parque' quando não é pracinha", () => {
      const result = inferirCategoriaPorKeyword(
        "Parque Lage — visitação livre",
        "Passeio",
        "Parque Lage",
      );
      expect(result).toBe("parque");
    });
  });

  // --- atividade-extra ---

  describe("atividade-extra", () => {
    it("infere atividade-extra por 'curso' no nome", () => {
      const result = inferirCategoriaPorKeyword(
        "Curso de Natação Infantil",
        "Esporte",
        "Grêmio Náutico União",
      );
      expect(result).toBe("atividade-extra");
    });

    it("infere atividade-extra por 'workshop'", () => {
      const result = inferirCategoriaPorKeyword(
        "Workshop de Pintura para Crianças",
        "Artes",
        "Ateliê Criativo",
      );
      expect(result).toBe("atividade-extra");
    });
  });

  // --- fallback: nenhum match ---

  describe("fallback", () => {
    it("retorna null quando nenhuma regra faz match", () => {
      const result = inferirCategoriaPorKeyword(
        "Nome Genérico XYZ-9999",
        "Categoria Desconhecida",
        "Venue Irreconhecível",
      );
      expect(result).toBeNull();
    });

    it("retorna null para strings vazias", () => {
      expect(inferirCategoriaPorKeyword("", "", "")).toBeNull();
    });
  });

  // --- sanidade das regras ---

  describe("sanidade do KEYWORD_RULES", () => {
    it("todas as categorias em KEYWORD_RULES são strings não-vazias", () => {
      for (const rule of KEYWORD_RULES) {
        expect(typeof rule.categoria).toBe("string");
        expect(rule.categoria.length).toBeGreaterThan(0);
        expect(rule.keywords.length).toBeGreaterThan(0);
      }
    });

    it("nenhuma keyword em KEYWORD_RULES está vazia", () => {
      for (const rule of KEYWORD_RULES) {
        for (const kw of rule.keywords) {
          expect(kw.trim().length, `keyword vazia na regra "${rule.categoria}"`).toBeGreaterThan(0);
        }
      }
    });

    it("colonia-de-ferias aparece antes de atividade-extra nas regras (especificidade)", () => {
      const idxColonia = KEYWORD_RULES.findIndex((r) => r.categoria === "colonia-de-ferias");
      const idxAtividade = KEYWORD_RULES.findIndex((r) => r.categoria === "atividade-extra");
      expect(idxColonia).toBeLessThan(idxAtividade);
    });

    it("pracinha aparece antes de parque nas regras", () => {
      const idxPracinha = KEYWORD_RULES.findIndex((r) => r.categoria === "pracinha");
      const idxParque = KEYWORD_RULES.findIndex((r) => r.categoria === "parque");
      expect(idxPracinha).toBeLessThan(idxParque);
    });
  });
});
