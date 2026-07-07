import { describe, expect, it } from "vitest";
import { buildSlug } from "../index";
import type { LinhaInput } from "../types";

// US-S26: buildSlug() é a função que de fato gera o slug gravado na ficha
// (via buildLinhaEnriquecida → CSV → import-sanity). Causa raiz real do caso
// Gracie Kore (06/07/2026): nome+venue geravam slug de 128 chars, que somado
// ao prefixo "drafts.atracao-" (15 chars) estourava o limite de _id do
// Sanity (128) e derrubava a ficha silenciosamente.

function baseLinha(overrides: Partial<LinhaInput> = {}): LinhaInput {
  return {
    nome: "Peça de Teatro",
    categoria_origem: "teatro",
    venue: "Teatro Rival",
    bairro: "Centro",
    dias_apresentacao: "",
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: "",
    ...overrides,
  };
}

describe("buildSlug", () => {
  it("não trunca nomes curtos", () => {
    expect(buildSlug(baseLinha())).toBe("peca-de-teatro-teatro-rival");
  });

  it("trunca preservando palavra inteira e anexa hash — caso real Gracie Kore (128 chars)", () => {
    const linha = baseLinha({
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue: "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ",
      bairro: "",
    });

    const slug = buildSlug(linha);

    expect(slug.length).toBeLessThanOrEqual(113);
    expect(`drafts.atracao-${slug}`.length).toBeLessThanOrEqual(128);
    // AC2 (board Notion): formato "<prefixo-por-palavra>-<hash de 6 hex chars>".
    expect(slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{6}$/);
    expect(slug.startsWith("colonia-de-ferias-gracie-kore-tema-anti-bullying")).toBe(true);
  });

  it("AC2: dois eventos com prefixo idêntico e sufixo diferente não colidem depois de truncar", () => {
    const venue = "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ";
    const linhaA = baseLinha({
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue,
      bairro: "",
    });
    const linhaB = baseLinha({
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você (Turma B)",
      venue,
      bairro: "",
    });

    expect(buildSlug(linhaA)).not.toBe(buildSlug(linhaB));
  });

  it("não trunca quando o slug tem exatamente o limite (113 chars)", () => {
    const nome = "a".repeat(113);
    const linha = baseLinha({ nome, venue: "", bairro: "" });
    expect(buildSlug(linha)).toBe(nome);
  });
});
