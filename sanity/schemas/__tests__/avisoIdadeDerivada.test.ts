import { describe, expect, it } from "vitest";
import {
  avisoIdadeDerivadaLivre,
  deveAvisarIdadeDerivadaLivre,
  MENSAGEM_IDADE_DERIVADA_LIVRE,
} from "../avisoIdadeDerivada";

const base = {
  idade_origem: "derivado_livre",
  idade_recomendada_min: 0,
  idade_recomendada_max: 18,
  idade_valor_extrator_min: 0,
  idade_valor_extrator_max: 18,
  review_status: "needs_human",
};

describe("aviso de idade 0–18 derivada de Livre (US-A127)", () => {
  it("dispara: derivado de Livre, idade igual à do Extrator, não aprovada", () => {
    expect(deveAvisarIdadeDerivadaLivre(base)).toBe(true);
    expect(avisoIdadeDerivadaLivre(0, { document: base })).toBe(MENSAGEM_IDADE_DERIVADA_LIVRE);
    expect(MENSAGEM_IDADE_DERIVADA_LIVRE).toBe(
      "0–18 veio de Livre; confira se a faixa serve ou estreite antes de aprovar.",
    );
  });

  it("dispara também com auto_ok (qualquer status diferente de human_approved)", () => {
    expect(deveAvisarIdadeDerivadaLivre({ ...base, review_status: "auto_ok" })).toBe(true);
  });

  it("não dispara: idade editada (min ou max difere do Extrator)", () => {
    expect(deveAvisarIdadeDerivadaLivre({ ...base, idade_recomendada_max: 8 })).toBe(false);
    expect(deveAvisarIdadeDerivadaLivre({ ...base, idade_recomendada_min: 3 })).toBe(false);
    expect(avisoIdadeDerivadaLivre(8, { document: { ...base, idade_recomendada_max: 8 } })).toBe(true);
  });

  it("não dispara: ficha aprovada (aprovar sem mexer confirma 0–18)", () => {
    expect(deveAvisarIdadeDerivadaLivre({ ...base, review_status: "human_approved" })).toBe(false);
  });

  it("não dispara: origem fonte", () => {
    expect(deveAvisarIdadeDerivadaLivre({ ...base, idade_origem: "fonte" })).toBe(false);
  });

  it("não dispara: ficha antiga sem idade_origem nem valores do Extrator", () => {
    expect(
      deveAvisarIdadeDerivadaLivre({
        idade_recomendada_min: 0,
        idade_recomendada_max: 18,
        review_status: "needs_human",
      }),
    ).toBe(false);
    expect(deveAvisarIdadeDerivadaLivre(undefined)).toBe(false);
    expect(avisoIdadeDerivadaLivre(undefined, {})).toBe(true);
  });
});
