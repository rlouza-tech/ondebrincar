import { describe, expect, it } from "vitest";
import { buildFotoAlt } from "../alt";

describe("buildFotoAlt", () => {
  it("usa venue quando presente", () => {
    expect(
      buildFotoAlt(
        "O Mágico de Oz",
        "Teatro Clara Nunes - Shopping da Gávea",
        "Gávea",
      ),
    ).toBe("Foto: O Mágico de Oz em Teatro Clara Nunes - Shopping da Gávea");
  });

  it("cai para bairro quando venue vazio", () => {
    expect(buildFotoAlt("Parque", "", "Tijuca")).toBe("Foto: Parque em Tijuca");
  });

  it("trunca em 160 caracteres", () => {
    const nome = "A".repeat(80);
    const venue = "B".repeat(100);
    const alt = buildFotoAlt(nome, venue, "Centro");
    expect(alt.length).toBeLessThanOrEqual(160);
    expect(alt.endsWith("…")).toBe(true);
  });
});
