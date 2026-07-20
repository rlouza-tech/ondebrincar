import { describe, expect, it } from "vitest";
import type { PipelineInput } from "@/lib/pipeline/types";
import { extrairSugestaoParaFicha } from "../index";

// US-S53: auto-avancar-datas ganhou a mesma extensão de check-atualizacoes —
// antes de cair no fallback de reler programacao_texto (Sanity), tenta a
// fonte viva (Clubinho/Sympla re-raspados no mesmo run), cruzada por slug.
// Decisão confirmada com o Rafa nesta sessão (assumption AC3 do card).

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

describe("extrairSugestaoParaFicha (US-S53)", () => {
  it("ficha com match na fonte viva e data futura válida → sugestão vem da fonte", () => {
    const slug = "show-relistado";
    const fonteViva = new Map<string, PipelineInput>([
      [slug, buildInput({ dias_apresentacao: "Datas: 25 e 26 de julho." })],
    ]);
    const ficha = { slug, programacao_texto: "Datas: 11 de julho." };

    const extraida = extrairSugestaoParaFicha(ficha, fonteViva, HOJE);

    expect(extraida?.data).toBe("2026-07-25");
    expect(extraida?.origem).toBe("fonte viva");
  });

  it("ficha sem match na fonte viva (não está no CSV/JSON desta rodada) → cai no fallback de programacao_texto", () => {
    const ficha = { slug: "nao-esta-na-fonte", programacao_texto: "Datas: 20 de julho." };
    const fonteViva = new Map<string, PipelineInput>();

    const extraida = extrairSugestaoParaFicha(ficha, fonteViva, HOJE);

    expect(extraida?.data).toBe("2026-07-20");
    expect(extraida?.origem).toBe("texto salvo");
  });

  it("ficha com match na fonte viva mas sem data futura ali (fonte não re-raspada recentemente) → cai no fallback de programacao_texto", () => {
    const slug = "fonte-sem-data-futura";
    const fonteViva = new Map<string, PipelineInput>([
      [slug, buildInput({ dias_apresentacao: "Dias 10" })],
    ]);
    const ficha = { slug, programacao_texto: "Datas: 20 de julho." };

    const extraida = extrairSugestaoParaFicha(ficha, fonteViva, HOJE);

    expect(extraida?.data).toBe("2026-07-20");
    expect(extraida?.origem).toBe("texto salvo");
  });

  it("sem data futura em nenhum lugar → null (comportamento atual mantido, sem inventar data)", () => {
    const slug = "sem-data-em-lugar-nenhum";
    const fonteViva = new Map<string, PipelineInput>([
      [slug, buildInput({ dias_apresentacao: "Dias 10" })],
    ]);
    const ficha = { slug, programacao_texto: "" };

    expect(extrairSugestaoParaFicha(ficha, fonteViva, HOJE)).toBeNull();
  });
});
