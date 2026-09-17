import { describe, expect, it } from "vitest";
import {
  categorizeAbstainReason,
  categorizeAbstainReasons,
  groupAbstainReasons,
  hasConteudoSensivel,
  toSanityAbstainReasons,
} from "./abstain-reasons";

describe("categorizeAbstainReason (US-S75)", () => {
  it("mencao_persona_interna → conteudo_sensivel", () => {
    expect(categorizeAbstainReason("mencao_persona_interna")).toBe(
      "conteudo_sensivel",
    );
  });

  it("motivos de qualidade geral → qualidade_geral", () => {
    expect(categorizeAbstainReason("bairro_vazio")).toBe("qualidade_geral");
    expect(categorizeAbstainReason("categoria_invalida")).toBe("qualidade_geral");
    expect(categorizeAbstainReason("gemini_error:timeout")).toBe("qualidade_geral");
    expect(categorizeAbstainReason("abstencao_campo_critico:idade_min")).toBe(
      "qualidade_geral",
    );
  });
});

describe("hasConteudoSensivel / groupAbstainReasons (US-S75)", () => {
  it("lista com motivo sensível (misturado com qualidade geral) → flag true e grupo separado", () => {
    const reasons = ["bairro_vazio", "mencao_persona_interna", "categoria_invalida"];

    expect(hasConteudoSensivel(reasons)).toBe(true);
    expect(groupAbstainReasons(reasons)).toEqual({
      sensitive: ["mencao_persona_interna"],
      general: ["bairro_vazio", "categoria_invalida"],
    });
  });

  it("lista só com motivo de qualidade geral → flag false", () => {
    const reasons = ["bairro_vazio", "categoria_invalida"];

    expect(hasConteudoSensivel(reasons)).toBe(false);
    expect(groupAbstainReasons(reasons)).toEqual({
      sensitive: [],
      general: ["bairro_vazio", "categoria_invalida"],
    });
  });
});

describe("toSanityAbstainReasons (US-S75)", () => {
  it("persiste categoria própria em cada item, não só a string", () => {
    const items = toSanityAbstainReasons([
      "mencao_persona_interna",
      "bairro_vazio",
    ]);

    expect(items).toEqual([
      {
        _key: "mencao-persona-interna-0",
        code: "mencao_persona_interna",
        category: "conteudo_sensivel",
      },
      {
        _key: "bairro-vazio-1",
        code: "bairro_vazio",
        category: "qualidade_geral",
      },
    ]);
  });
});

describe("categorizeAbstainReasons", () => {
  it("preserva a ordem das reasons e anexa a categoria", () => {
    expect(
      categorizeAbstainReasons(["bairro_vazio", "mencao_persona_interna"]),
    ).toEqual([
      { code: "bairro_vazio", category: "qualidade_geral" },
      { code: "mencao_persona_interna", category: "conteudo_sensivel" },
    ]);
  });
});
