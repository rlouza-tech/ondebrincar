import { describe, it, expect } from "vitest";
import { filterGeo, GEO_EXCEPTIONS, buildSlug } from "../geo-filter";
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

// US-S26: buildSlug() aqui é réplica local de pipeline-ia/index.ts (evita
// import circular) — usada no log de rejeição e na comparação com
// GEO_EXCEPTIONS. Precisa truncar igual, senão uma exceção cadastrada com o
// slug truncado (formato que index.ts agora gera) nunca bate pra nomes+venue
// longos.
describe("buildSlug (geo-filter)", () => {
  it("não trunca nomes curtos", () => {
    const row = makeRow({ nome: "Peça de Teatro", venue: "Teatro Rival", bairro: "" });
    expect(buildSlug(row)).toBe("peca-de-teatro-teatro-rival");
  });

  it("trunca preservando palavra inteira — caso real Gracie Kore (128 chars)", () => {
    const row = makeRow({
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue: "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ",
      bairro: "",
    });
    const slug = buildSlug(row);
    expect(slug.length).toBeLessThanOrEqual(113);
    expect(`drafts.atracao-${slug}`.length).toBeLessThanOrEqual(128);
    expect(slug.endsWith("-")).toBe(false);
  });
});
