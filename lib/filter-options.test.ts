import { describe, expect, it } from "vitest";
import {
  getActiveFiltersFromParams,
  getFilterDisplayLabel,
} from "./filter-options";

describe("getFilterDisplayLabel", () => {
  it("exibe bairro como valor legível", () => {
    expect(getFilterDisplayLabel("bairro", "Tijuca")).toBe("Tijuca");
  });

  it("exibe faixa etária legível", () => {
    expect(getFilterDisplayLabel("idade", "5")).toBe("3–5 anos");
  });

  it("exibe categoria legível", () => {
    expect(getFilterDisplayLabel("categoria", "teatro")).toBe("Teatro");
  });

  it("exibe preço legível", () => {
    expect(getFilterDisplayLabel("preco", "gratuito")).toBe("Gratuito");
  });

  it("exibe ambos como indoor e outdoor", () => {
    expect(getFilterDisplayLabel("ambiente", "ambos")).toBe("Indoor e outdoor");
  });
});

describe("getActiveFiltersFromParams", () => {
  it("retorna lista vazia sem params", () => {
    expect(getActiveFiltersFromParams(new URLSearchParams())).toEqual([]);
  });

  it("retorna filtros ativos na ordem esperada", () => {
    const params = new URLSearchParams("bairro=Tijuca&categoria=teatro");
    const active = getActiveFiltersFromParams(params);

    expect(active).toHaveLength(2);
    expect(active[0]).toMatchObject({ key: "bairro", label: "Tijuca" });
    expect(active[1]).toMatchObject({ key: "categoria", label: "Teatro" });
  });
});
