import { describe, expect, it } from "vitest";
import { isFichaFechada, selecionarParaEncerrar } from "../mark-expired";

// US-S43: mark-expired sobrescrevia status "rejeitado" para "encerrada" ao
// tratar atrações com proxima_data vencida, apagando o sinal de rejeição
// deliberada (conteúdo adulto, duplicata, qualidade). Fichas "encerrada"
// já eram corretamente ignoradas; fichas "rejeitado" devem seguir o mesmo
// caminho, tanto no dry-run quanto na escrita real.

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
});

describe("selecionarParaEncerrar (US-S43)", () => {
  it("ficha rejeitado com proxima_data vencida é ignorada (não reclassificada)", () => {
    const docs = [buildDoc({ _id: "atracao-rejeitada", status: "rejeitado" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha encerrada com proxima_data vencida segue ignorada (comportamento já correto)", () => {
    const docs = [buildDoc({ _id: "atracao-encerrada", status: "encerrada" })];

    expect(selecionarParaEncerrar(docs)).toEqual([]);
  });

  it("ficha operando com proxima_data vencida continua sendo selecionada para encerrar", () => {
    const doc = buildDoc({ _id: "atracao-operando", status: "operando" });

    expect(selecionarParaEncerrar([doc])).toEqual([doc]);
  });

  it("mistura de status: só as ativas (não fechadas) são selecionadas", () => {
    const rejeitada = buildDoc({ _id: "atracao-rejeitada", status: "rejeitado" });
    const encerrada = buildDoc({ _id: "atracao-encerrada", status: "encerrada" });
    const operando = buildDoc({ _id: "atracao-operando", status: "operando" });
    const esgotada = buildDoc({ _id: "atracao-esgotada", status: "esgotada" });

    const resultado = selecionarParaEncerrar([
      rejeitada,
      encerrada,
      operando,
      esgotada,
    ]);

    expect(resultado).toEqual([operando, esgotada]);
  });
});
