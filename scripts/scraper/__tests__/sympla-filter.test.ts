import { describe, expect, it } from "vitest";
import { isConteudoInfantil } from "../sympla-scrape";

describe("isConteudoInfantil", () => {
  // ── Positivos ──────────────────────────────────────────────────────────────

  it("aceita evento com 'infantil' no nome", () => {
    expect(isConteudoInfantil("Peça Infantil de Teatro", "")).toBe(true);
  });

  it("aceita evento com 'kids' na descrição", () => {
    expect(isConteudoInfantil("Show Musical", "Espetáculo kids voltado para a família")).toBe(true);
  });

  it("aceita evento com 'família' no nome (sem acento)", () => {
    expect(isConteudoInfantil("Festival Familia RJ", "")).toBe(true);
  });

  it("aceita evento com 'mirim' na descrição", () => {
    expect(isConteudoInfantil("Campeonato de Xadrez", "Categoria mirim — até 12 anos")).toBe(true);
  });

  it("aceita evento com 'criança' na descrição (case insensitivo)", () => {
    expect(isConteudoInfantil("Teatro Experimental", "Indicado para CRIANÇA de 3 a 8 anos")).toBe(true);
  });

  it("aceita evento com 'para crianças' na descrição", () => {
    expect(isConteudoInfantil("Espetáculo de Dança", "Um show para crianças e seus pais")).toBe(true);
  });

  // ── Negativos ─────────────────────────────────────────────────────────────

  it("rejeita evento adulto sem nenhuma palavra-chave", () => {
    expect(isConteudoInfantil("Stand-up Comedy", "Humor adulto, linguagem livre")).toBe(false);
  });

  it("rejeita peça teatral adulta sem referência infantil", () => {
    expect(isConteudoInfantil("Hamlet — Temporada 2026", "Drama shakespeariano com elenco profissional")).toBe(false);
  });

  it("rejeita evento de educação corporativa", () => {
    expect(isConteudoInfantil("Workshop de Liderança", "Treinamento para gestores e líderes de equipe")).toBe(false);
  });

  it("rejeita evento sem texto algum", () => {
    expect(isConteudoInfantil("", "")).toBe(false);
  });
});
