import { describe, expect, it } from "vitest";
import { estaVencida, selecionarParaEncerrar } from "../mark-expired";

// US-S43: mark-expired sobrescrevia qualquer status diferente de "encerrada"
// (incluindo "rejeitado", que é lista negra permanente do import-sanity, e
// "esgotada"/"em_obras") para "encerrada" ao tratar proxima_data vencida.
// Fix original (blocklist só encerrada+rejeitado) ainda deixava esgotada e
// em_obras passarem — corrigido para allowlist: só "operando" é elegível,
// mesmo critério já usado pelo Studio (sanity/structure.ts, aba Expiradas).

interface AtracaoVencidaFixture {
  _id: string;
  slug: string;
  nome: string;
  proxima_data: string;
  status: string;
}

function buildDoc(
  overrides: Partial<AtracaoVencidaFixture> = {},
): AtracaoVencidaFixture {
  return {
    _id: "atracao-teste",
    slug: "atracao-teste",
    nome: "Atração Teste",
    proxima_data: "2026-07-01",
    status: "operando",
    ...overrides,
  };
}

describe("selecionarParaEncerrar (US-S43)", () => {
  it("ficha rejeitado com proxima_data vencida é ignorada (não reclassificada)", () => {
    const docs = [buildDoc({ _id: "atracao-rejeitada", status: "rejeitado" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha encerrada com proxima_data vencida segue ignorada (comportamento já correto)", () => {
    const docs = [buildDoc({ _id: "atracao-encerrada", status: "encerrada" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha esgotada com proxima_data vencida é ignorada (não é operando)", () => {
    const docs = [buildDoc({ _id: "atracao-esgotada", status: "esgotada" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha em_obras com proxima_data vencida é ignorada (não é operando)", () => {
    const docs = [buildDoc({ _id: "atracao-em-obras", status: "em_obras" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha operando com proxima_data vencida continua sendo selecionada para encerrar", () => {
    const doc = buildDoc({ _id: "atracao-operando", status: "operando" });

    expect(selecionarParaEncerrar([doc])).toEqual([doc]);
  });

  it("mistura de status: só operando é selecionada, todo o resto fica de fora", () => {
    const rejeitada = buildDoc({ _id: "atracao-rejeitada", status: "rejeitado" });
    const encerrada = buildDoc({ _id: "atracao-encerrada", status: "encerrada" });
    const operando = buildDoc({ _id: "atracao-operando", status: "operando" });
    const esgotada = buildDoc({ _id: "atracao-esgotada", status: "esgotada" });
    const emObras = buildDoc({ _id: "atracao-em-obras", status: "em_obras" });

    const resultado = selecionarParaEncerrar([
      rejeitada,
      encerrada,
      operando,
      esgotada,
      emObras,
    ]);

    expect(resultado).toEqual([operando]);
  });
});

// US-S37: eventos multi-dia contínuos (ex.: colônia de férias) têm data_fim além de
// proxima_data — a data efetiva de vencimento passa a ser data_fim quando presente.
describe("estaVencida (US-S37)", () => {
  it("caso real — Colônia de Férias Gracie Kore (6 a 10/jul): não vencida no 2º dia", () => {
    // proxima_data é o 1º dia do intervalo (6/jul); data_fim é o último (10/jul).
    // Sem data_fim, o script marcaria encerrada já no dia 7 — exatamente o bug da story.
    const doc = { proxima_data: "2026-07-06", data_fim: "2026-07-10" };

    expect(estaVencida(doc, "2026-07-07")).toBe(false);
    expect(estaVencida(doc, "2026-07-10")).toBe(false);
  });

  it("caso real — Colônia de Férias Gracie Kore: vencida no dia seguinte ao data_fim", () => {
    const doc = { proxima_data: "2026-07-06", data_fim: "2026-07-10" };

    expect(estaVencida(doc, "2026-07-11")).toBe(true);
  });

  it("sem data_fim (comportamento anterior preservado): vencida assim que proxima_data passa", () => {
    const doc = { proxima_data: "2026-07-06", data_fim: undefined };

    expect(estaVencida(doc, "2026-07-06")).toBe(false);
    expect(estaVencida(doc, "2026-07-07")).toBe(true);
  });

  it("evento de um dia só (data_fim ausente): comportamento idêntico ao pré-US-S37", () => {
    const doc = { proxima_data: "2026-06-06" };

    expect(estaVencida(doc, "2026-06-06")).toBe(false);
    expect(estaVencida(doc, "2026-06-07")).toBe(true);
  });
});
