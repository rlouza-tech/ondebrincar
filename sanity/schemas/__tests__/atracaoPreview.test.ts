import { describe, expect, it } from "vitest";
import { prepareAtracaoPreview } from "../atracaoPreview";

describe("prepareAtracaoPreview (US-S75)", () => {
  it("ficha com motivo sensível → subtítulo de conteúdo sensível, distinto do bairro sozinho", () => {
    const prepared = prepareAtracaoPreview({
      title: "O Mágico de Oz",
      bairro: "Gávea",
      hasConteudoSensivel: true,
    });

    expect(prepared.subtitle).toBe("⚠ Conteúdo sensível — Gávea");
    expect(prepared.title).toBe("O Mágico de Oz");
  });

  it("ficha só com motivo de qualidade geral (flag false) → subtítulo é só o bairro", () => {
    const prepared = prepareAtracaoPreview({
      title: "O Mágico de Oz",
      bairro: "Gávea",
      hasConteudoSensivel: false,
    });

    expect(prepared.subtitle).toBe("Gávea");
    expect(prepared.subtitle).not.toMatch(/sensível/i);
  });
});
