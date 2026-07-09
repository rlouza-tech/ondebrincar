import { describe, it, expect } from "vitest";
import {
  classificarAtracoes,
  getJanelaFimDeSemana,
  aplicarLimitePorSecao,
  quantidadeParaSecao,
  META_POR_SECAO,
  FALLBACK_POR_SECAO,
  BOOTSTRAP_NOVIDADES_DIAS,
} from "../classify";
import type { AtracaoNewsletter } from "../types";

// Referência fixa: quinta-feira 09/07/2026 20:00 (evita flakiness de datas)
const QUINTA_REF = new Date(2026, 6, 9, 20, 0, 0);

function makeAtracao(overrides: Partial<AtracaoNewsletter>): AtracaoNewsletter {
  return {
    _id: "atracao-1",
    nome: "Atração Teste",
    slug: "atracao-teste",
    bairro: "Tijuca",
    status: "operando",
    proxima_data: null,
    _createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("getJanelaFimDeSemana", () => {
  it("a partir de uma quinta, a janela começa na própria quinta e termina no domingo seguinte", () => {
    const { inicio, fim } = getJanelaFimDeSemana(QUINTA_REF);
    expect(inicio.getDate()).toBe(9);
    expect(inicio.getMonth()).toBe(6); // julho (0-indexed)
    expect(fim.getDate()).toBe(12);
  });

  it("a partir de uma segunda, a janela aponta pra quinta da mesma semana", () => {
    const segunda = new Date(2026, 6, 6, 10, 0, 0); // segunda 06/07/2026
    const { inicio, fim } = getJanelaFimDeSemana(segunda);
    expect(inicio.getDate()).toBe(9);
    expect(fim.getDate()).toBe(12);
  });

  it("a partir de um domingo dentro da janela, mantém a janela corrente (não pula pra próxima semana)", () => {
    const domingo = new Date(2026, 6, 12, 10, 0, 0); // domingo 12/07/2026
    const { inicio, fim } = getJanelaFimDeSemana(domingo);
    expect(inicio.getDate()).toBe(9);
    expect(fim.getDate()).toBe(12);
  });
});

describe("classificarAtracoes — Novidades", () => {
  it("classifica como novidade quando _createdAt é depois do lastDraftDate", () => {
    const lastDraftDate = new Date(2026, 6, 1);
    const atracao = makeAtracao({ _createdAt: "2026-07-05T10:00:00.000Z" });
    const resultado = classificarAtracoes([atracao], { now: QUINTA_REF, lastDraftDate });
    expect(resultado.novidades).toHaveLength(1);
    expect(resultado.novidades[0]._id).toBe("atracao-1");
  });

  it("não classifica como novidade quando _createdAt é antes do lastDraftDate", () => {
    const lastDraftDate = new Date(2026, 6, 5);
    const atracao = makeAtracao({ _createdAt: "2026-07-01T10:00:00.000Z" });
    const resultado = classificarAtracoes([atracao], { now: QUINTA_REF, lastDraftDate });
    expect(resultado.novidades).toHaveLength(0);
  });

  it("primeira execução (sem lastDraftDate): usa fallback de 7 dias como corte", () => {
    const criadaHaSeisDias = new Date(QUINTA_REF);
    criadaHaSeisDias.setDate(criadaHaSeisDias.getDate() - (BOOTSTRAP_NOVIDADES_DIAS - 1));
    const criadaHaDezDias = new Date(QUINTA_REF);
    criadaHaDezDias.setDate(criadaHaDezDias.getDate() - (BOOTSTRAP_NOVIDADES_DIAS + 3));

    const atracaoRecente = makeAtracao({
      _id: "recente",
      _createdAt: criadaHaSeisDias.toISOString(),
    });
    const atracaoAntiga = makeAtracao({
      _id: "antiga",
      _createdAt: criadaHaDezDias.toISOString(),
    });

    const resultado = classificarAtracoes([atracaoRecente, atracaoAntiga], {
      now: QUINTA_REF,
      lastDraftDate: null,
    });

    expect(resultado.novidades.map((a) => a._id)).toEqual(["recente"]);
  });
});

describe("classificarAtracoes — Fim de semana", () => {
  it("classifica quando proxima_data cai dentro da janela quinta-domingo", () => {
    const atracao = makeAtracao({ proxima_data: "2026-07-11" }); // sábado dentro da janela
    const resultado = classificarAtracoes([atracao], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 8),
    });
    expect(resultado.fimDeSemana.map((a) => a._id)).toEqual(["atracao-1"]);
  });

  it("não classifica quando proxima_data está fora da janela", () => {
    const atracao = makeAtracao({ proxima_data: "2026-07-20" });
    const resultado = classificarAtracoes([atracao], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 8),
    });
    expect(resultado.fimDeSemana).toHaveLength(0);
  });

  it("classifica independente de tipo_programacao — critério é só a data, recorrência não desqualifica", () => {
    // O nome da seção foi "Fim de semana" (não "Só esse fim de semana")
    // justamente pra deixar claro que uma atração recorrente que também
    // acontece esse fim de semana entra normalmente — não existe campo de
    // recorrência no filtro, só proxima_data.
    const atracao = makeAtracao({ proxima_data: "2026-07-11" });
    const resultado = classificarAtracoes([atracao], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 8),
    });
    expect(resultado.fimDeSemana.map((a) => a._id)).toEqual(["atracao-1"]);
  });
});

describe("classificarAtracoes — Permanentes", () => {
  it("classifica atração status=operando sem proxima_data como permanente", () => {
    const atracao = makeAtracao({ proxima_data: null });
    const resultado = classificarAtracoes([atracao], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 8),
    });
    expect(resultado.permanentes.map((a) => a._id)).toEqual(["atracao-1"]);
  });

  it("ordena permanentes em ordem alfabética", () => {
    const b = makeAtracao({ _id: "b", nome: "Bela e a Fera" });
    const a = makeAtracao({ _id: "a", nome: "Aquário Marinho" });
    const resultado = classificarAtracoes([b, a], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 8),
    });
    expect(resultado.permanentes.map((x) => x._id)).toEqual(["a", "b"]);
  });
});

describe("classificarAtracoes — filtro de status", () => {
  it("exclui atrações com status diferente de operando de todas as seções", () => {
    const encerrada = makeAtracao({
      status: "encerrada",
      _createdAt: "2026-07-08T10:00:00.000Z",
    });
    const resultado = classificarAtracoes([encerrada], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 1),
    });
    expect(resultado.novidades).toHaveLength(0);
    expect(resultado.fimDeSemana).toHaveLength(0);
    expect(resultado.permanentes).toHaveLength(0);
  });
});

describe("classificarAtracoes — sem duplicação entre seções", () => {
  it("atração nova E dentro da janela de fim de semana aparece só em Novidades (prioridade)", () => {
    const atracao = makeAtracao({
      _createdAt: "2026-07-08T10:00:00.000Z",
      proxima_data: "2026-07-11",
    });
    const resultado = classificarAtracoes([atracao], {
      now: QUINTA_REF,
      lastDraftDate: new Date(2026, 6, 1),
    });
    expect(resultado.novidades).toHaveLength(1);
    expect(resultado.fimDeSemana).toHaveLength(0);
  });
});

describe("classificarAtracoes — seções vazias", () => {
  it("não falha e retorna arrays vazios quando não há nenhuma atração elegível", () => {
    const resultado = classificarAtracoes([], { now: QUINTA_REF, lastDraftDate: new Date() });
    expect(resultado).toEqual({ novidades: [], fimDeSemana: [], permanentes: [] });
  });
});

describe("quantidadeParaSecao", () => {
  it(`mostra a meta (${META_POR_SECAO}) quando tem disponibilidade suficiente`, () => {
    expect(quantidadeParaSecao(4)).toBe(4);
    expect(quantidadeParaSecao(9)).toBe(4);
  });

  it(`mostra só o fallback (${FALLBACK_POR_SECAO}) quando tem menos que a meta mas 2 ou mais`, () => {
    expect(quantidadeParaSecao(3)).toBe(2);
    expect(quantidadeParaSecao(2)).toBe(2);
  });

  it("mostra 1 quando só tem 1 disponível, em vez de omitir a seção à toa", () => {
    expect(quantidadeParaSecao(1)).toBe(1);
  });

  it("mostra 0 quando não tem nenhuma disponível", () => {
    expect(quantidadeParaSecao(0)).toBe(0);
  });
});

describe("aplicarLimitePorSecao", () => {
  function makeN(prefix: string, n: number): AtracaoNewsletter[] {
    return Array.from({ length: n }, (_, i) => makeAtracao({ _id: `${prefix}-${i}`, nome: `${prefix}-${i}` }));
  }

  it("cada seção é cortada de forma independente — sem orçamento compartilhado", () => {
    const resultado = aplicarLimitePorSecao(
      { novidades: makeN("nov", 8), fimDeSemana: makeN("fds", 5), permanentes: makeN("perm", 5) },
    );
    expect(resultado.novidades).toHaveLength(4);
    expect(resultado.fimDeSemana).toHaveLength(4);
    expect(resultado.permanentes).toHaveLength(4);
  });

  it("uma seção cheia não afeta o corte das outras (novidades não rouba espaço de fim de semana)", () => {
    const resultado = aplicarLimitePorSecao(
      { novidades: makeN("nov", 15), fimDeSemana: makeN("fds", 3), permanentes: makeN("perm", 1) },
    );
    expect(resultado.novidades).toHaveLength(4);
    expect(resultado.fimDeSemana).toHaveLength(2); // 3 disponíveis, menos que a meta → fallback 2
    expect(resultado.permanentes).toHaveLength(1); // só 1 disponível → mostra 1
  });

  it("três seções cheias podem somar mais que o antigo teto de 10 (até 12)", () => {
    const resultado = aplicarLimitePorSecao(
      { novidades: makeN("nov", 6), fimDeSemana: makeN("fds", 6), permanentes: makeN("perm", 6) },
    );
    const total =
      resultado.novidades.length + resultado.fimDeSemana.length + resultado.permanentes.length;
    expect(total).toBe(12);
  });

  it("não corta nada quando já está dentro da meta", () => {
    const resultado = aplicarLimitePorSecao(
      { novidades: makeN("nov", 2), fimDeSemana: makeN("fds", 4), permanentes: makeN("perm", 0) },
    );
    expect(resultado.novidades).toHaveLength(2);
    expect(resultado.fimDeSemana).toHaveLength(4);
    expect(resultado.permanentes).toHaveLength(0);
  });
});
