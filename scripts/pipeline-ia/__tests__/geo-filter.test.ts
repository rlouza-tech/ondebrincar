import { describe, it, expect } from "vitest";
import { filterGeo, GEO_EXCEPTIONS } from "../geo-filter";
import type { PipelineInput } from "@/lib/pipeline/types";

function makeRow(overrides: Partial<PipelineInput>): PipelineInput {
  return {
    nome: "Evento Teste",
    categoria_origem: "Teatro Infantil",
    venue: "Teatro Vannucci - Shopping da Gávea",
    bairro: "Gávea",
    dias_apresentacao: "Sábados",
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: "https://exemplo.com",
    ...overrides,
  };
}

describe("filterGeo", () => {
  it("aceita ficha com bairro carioca reconhecido", () => {
    const row = makeRow({ bairro: "Botafogo", venue: "Teatro X - Botafogo" });
    const { accepted, rejected } = filterGeo([row]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejeita ficha com venue em São Paulo", () => {
    const row = makeRow({
      nome: "Show SP",
      venue: "Teatro Alfa - São Paulo, SP",
      bairro: "",
    });
    const { accepted, rejected } = filterGeo([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].slug).toBe("show-sp-teatro-alfa-sao-paulo-sp");
    expect(rejected[0].motivo).toContain("validar manualmente");
  });

  it("rejeita ficha com venue em Niterói", () => {
    const row = makeRow({
      nome: "Circo Niterói",
      venue: "Espaço Cultural Niterói",
      bairro: "Niterói",
    });
    const { accepted, rejected } = filterGeo([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it("rejeita ficha sem evidência de localização", () => {
    const row = makeRow({ venue: "Espaço Genérico", bairro: "" });
    const { accepted, rejected } = filterGeo([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
  });

  it("aceita ficha em exceção configurada mesmo sem bairro carioca", () => {
    GEO_EXCEPTIONS.push("evento-teste-espaco-niteroi");
    const row = makeRow({ nome: "Evento Teste", venue: "Espaço Niterói", bairro: "Niterói" });
    const { accepted, rejected } = filterGeo([row]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
    GEO_EXCEPTIONS.pop();
  });

  it("log inclui slug, venue e bairro da ficha rejeitada", () => {
    const row = makeRow({
      nome: "Peça SP",
      venue: "Teatro Municipal - São Paulo, SP",
      bairro: "",
    });
    const { rejected } = filterGeo([row]);
    expect(rejected[0].venue).toBe("Teatro Municipal - São Paulo, SP");
    expect(rejected[0].bairro).toBe("");
  });

  it("processa mix de fichas aceitas e rejeitadas corretamente", () => {
    const rj = makeRow({ bairro: "Ipanema", venue: "Teatro Ipanema" });
    const sp = makeRow({ nome: "Show SP", venue: "Arena SP", bairro: "São Paulo, SP" });
    const { accepted, rejected } = filterGeo([rj, sp]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});
