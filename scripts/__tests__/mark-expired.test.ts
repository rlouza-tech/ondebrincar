import { describe, expect, it } from "vitest";
import { selecionarParaEncerrar } from "../mark-expired";

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
