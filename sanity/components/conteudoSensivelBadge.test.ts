import { describe, expect, it } from "vitest";
import { conteudoSensivelBadge } from "./conteudoSensivelBadge";

describe("conteudoSensivelBadge (US-S75)", () => {
  it("ficha com motivo sensível → badge danger visível", () => {
    const result = conteudoSensivelBadge({
      draft: { has_conteudo_sensivel: true },
    } as unknown as Parameters<typeof conteudoSensivelBadge>[0]);

    expect(result).toEqual(
      expect.objectContaining({
        label: "Conteúdo sensível",
        color: "danger",
      }),
    );
  });

  it("ficha só com motivo de qualidade geral → sem badge", () => {
    const result = conteudoSensivelBadge({
      draft: { has_conteudo_sensivel: false },
    } as unknown as Parameters<typeof conteudoSensivelBadge>[0]);

    expect(result).toBeNull();
  });
});
