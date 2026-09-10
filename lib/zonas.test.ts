import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "./sanity/types";
import {
  bairrosDaZona,
  CAP_CARROSSEL_ZONA,
  montarCarrosseisZona,
  zonaPorBairro,
  zonaVerTodasHref,
  ZONA_ORDEM_PADRAO,
} from "./zonas";

function criarAtracao(overrides: Partial<Atracao>): Atracao {
  return {
    slug: "atracao-generica",
    titulo: "Atração genérica",
    categoria: "teatro",
    idadeMin: 4,
    idadeMax: 10,
    bairro: "Tijuca",
    precoTipo: "pago",
    precoLabel: "R$ 40",
    indoorOutdoor: "indoor",
    tipoProgramacao: "evento_recorrente",
    programacaoTexto: "Sábados e domingos",
    descricaoCurta: "Descrição curta.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://exemplo.com",
    ...overrides,
  };
}

describe("zonaPorBairro (US-I47)", () => {
  it("resolve bairro mapeado, ignorando maiúsculas/espaços", () => {
    expect(zonaPorBairro("Tijuca")).toBe("zona-norte");
    expect(zonaPorBairro("  copacabana ")).toBe("zona-sul");
    expect(zonaPorBairro("BANGU")).toBe("zona-oeste");
  });

  it("retorna undefined para bairro fora do dicionário (AC3)", () => {
    expect(zonaPorBairro("Bairro Inexistente")).toBeUndefined();
  });
});

describe("bairrosDaZona", () => {
  it("retorna a lista de bairros de uma zona válida", () => {
    expect(bairrosDaZona("zona-oeste")).toEqual(["Bangu", "Pedra de Guaratiba", "Realengo"]);
  });
});

describe("montarCarrosseisZona (US-I47)", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("agrupa atrações por zona na ordem recebida", () => {
    const atracoes = [
      criarAtracao({ slug: "a", bairro: "Tijuca" }), // zona-norte
      criarAtracao({ slug: "b", bairro: "Copacabana" }), // zona-sul
      criarAtracao({ slug: "c", bairro: "Centro" }), // zona-central
    ];

    const resultado = montarCarrosseisZona(atracoes, ["zona-sul", "zona-norte"]);

    expect(resultado.map((c) => c.id)).toEqual(["zona-sul", "zona-norte"]);
    expect(resultado[0].atracoes.map((a) => a.slug)).toEqual(["b"]);
    expect(resultado[1].atracoes.map((a) => a.slug)).toEqual(["a"]);
  });

  it("aplica o cap fixo de 8 cards por zona, mas mantém o total real", () => {
    const atracoes = Array.from({ length: 10 }, (_, i) =>
      criarAtracao({ slug: `atracao-${i}`, bairro: "Copacabana" }),
    );

    const [carrossel] = montarCarrosseisZona(atracoes, ["zona-sul"]);

    expect(carrossel.atracoes).toHaveLength(CAP_CARROSSEL_ZONA);
    expect(carrossel.total).toBe(10);
  });

  it("omite zonas sem nenhuma atração", () => {
    const atracoes = [criarAtracao({ slug: "a", bairro: "Tijuca" })];

    const resultado = montarCarrosseisZona(atracoes, ["zona-sul", "zona-norte"]);

    expect(resultado.map((c) => c.id)).toEqual(["zona-norte"]);
  });

  it("atração com bairro não mapeado não entra em nenhuma zona (AC3), sem quebrar o agrupamento", () => {
    const atracoes = [
      criarAtracao({ slug: "a", bairro: "Tijuca" }),
      criarAtracao({ slug: "orfa", bairro: "Bairro Inexistente" }),
    ];

    const resultado = montarCarrosseisZona(atracoes, ZONA_ORDEM_PADRAO);

    const todosSlugs = resultado.flatMap((c) => c.atracoes.map((a) => a.slug));
    expect(todosSlugs).toEqual(["a"]);
  });

  it("avisa via console.warn quando há atração ativa com bairro fora do dicionário (AC4)", () => {
    const atracoes = [criarAtracao({ slug: "orfa", bairro: "Bairro Inexistente" })];

    montarCarrosseisZona(atracoes, ZONA_ORDEM_PADRAO);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Bairro Inexistente");
  });

  it("não avisa quando todos os bairros estão mapeados", () => {
    const atracoes = [criarAtracao({ slug: "a", bairro: "Tijuca" })];

    montarCarrosseisZona(atracoes, ZONA_ORDEM_PADRAO);

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("avisa uma única vez por bairro não mapeado, mesmo com várias atrações nele", () => {
    const atracoes = [
      criarAtracao({ slug: "a", bairro: "Bairro Fantasma" }),
      criarAtracao({ slug: "b", bairro: "Bairro Fantasma" }),
    ];

    montarCarrosseisZona(atracoes, ZONA_ORDEM_PADRAO);

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("zonaVerTodasHref (AC5 — reaproveita filtro de bairro multi-select)", () => {
  it("monta a querystring com um bairro= por bairro da zona", () => {
    const href = zonaVerTodasHref(["Bangu", "Pedra de Guaratiba", "Realengo"]);
    expect(href).toBe("/?bairro=Bangu&bairro=Pedra+de+Guaratiba&bairro=Realengo");
  });
});
