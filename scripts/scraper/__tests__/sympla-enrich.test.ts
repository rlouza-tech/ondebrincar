import { describe, expect, it } from "vitest";
import { parseDescricao, parseArgs, MIN_DESCRICAO_CHARS } from "../sympla-enrich";

// ---------------------------------------------------------------------------
// parseDescricao
// ---------------------------------------------------------------------------

describe("parseDescricao", () => {
  it("retorna null para entrada nula", () => {
    expect(parseDescricao(null)).toBeNull();
  });

  it("retorna null para string vazia", () => {
    expect(parseDescricao("")).toBeNull();
  });

  it("retorna null se texto limpo < MIN_DESCRICAO_CHARS", () => {
    expect(parseDescricao("Texto curto demais")).toBeNull();
  });

  it("retorna o texto limpo quando tem conteúdo suficiente", () => {
    const longo = "A".repeat(MIN_DESCRICAO_CHARS);
    expect(parseDescricao(longo)).toBe(longo);
  });

  it("colapsa múltiplos espaços e tabs", () => {
    const entrada = "  Texto   com    espaços\t\texcessivos  " + "x".repeat(MIN_DESCRICAO_CHARS);
    const resultado = parseDescricao(entrada);
    expect(resultado).not.toMatch(/  /); // sem duplo espaço
    expect(resultado).not.toMatch(/\t/);  // sem tab
  });

  it("colapsa mais de 2 newlines consecutivos em 2", () => {
    const entrada = "Parágrafo 1\n\n\n\n\nParágrafo 2\n" + "x".repeat(MIN_DESCRICAO_CHARS);
    const resultado = parseDescricao(entrada);
    expect(resultado).not.toMatch(/\n{3,}/);
  });

  it("remove linhas de ruído UI ('Ver mais', 'Compartilhar', etc.)", () => {
    const entrada = [
      "Descrição do evento que explica o que vai acontecer.",
      "Ver mais",
      "Compartilhar",
      "Um show incrível para toda a família curtir junto.",
      "Favoritar",
      "Ingressos",
    ].join("\n") + " " + "x".repeat(MIN_DESCRICAO_CHARS);
    const resultado = parseDescricao(entrada);
    expect(resultado).not.toMatch(/^Ver mais$/m);
    expect(resultado).not.toMatch(/^Compartilhar$/m);
    expect(resultado).not.toMatch(/^Favoritar$/m);
  });

  it("preserva palavras válidas que contêm substrings de ruído", () => {
    // "ingressos" como linha isolada é removido, mas texto normal é mantido
    const entrada = "Compre seus ingressos antecipados para garantir lugar." + "x".repeat(MIN_DESCRICAO_CHARS);
    const resultado = parseDescricao(entrada);
    expect(resultado).toContain("ingressos antecipados");
  });

  it("faz trim no início e fim", () => {
    const entrada = "\n\n  " + "A".repeat(MIN_DESCRICAO_CHARS) + "  \n\n";
    const resultado = parseDescricao(entrada)!;
    expect(resultado[0]).not.toBe(" ");
    expect(resultado[resultado.length - 1]).not.toBe(" ");
  });

  it("normaliza \\r\\n (Windows) para \\n", () => {
    const entrada = "Linha 1\r\nLinha 2\r\n" + "x".repeat(MIN_DESCRICAO_CHARS);
    const resultado = parseDescricao(entrada);
    expect(resultado).not.toMatch(/\r/);
  });
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------

describe("parseArgs", () => {
  it("retorna defaults sem argumentos", () => {
    const opts = parseArgs(["node", "sympla-enrich.ts"]);
    expect(opts.delay).toBe(2);
    expect(opts.limit).toBeUndefined();
  });

  it("aceita --delay com valor decimal", () => {
    const opts = parseArgs(["node", "sympla-enrich.ts", "--delay", "0.5"]);
    expect(opts.delay).toBe(0.5);
  });

  it("aceita --limit", () => {
    const opts = parseArgs(["node", "sympla-enrich.ts", "--limit", "10"]);
    expect(opts.limit).toBe(10);
  });

  it("aceita --delay e --limit juntos", () => {
    const opts = parseArgs(["node", "sympla-enrich.ts", "--delay", "3", "--limit", "5"]);
    expect(opts.delay).toBe(3);
    expect(opts.limit).toBe(5);
  });

  it("lança erro para --delay inválido", () => {
    expect(() => parseArgs(["node", "sympla-enrich.ts", "--delay", "abc"])).toThrow("--delay");
  });

  it("lança erro para --limit inválido", () => {
    expect(() => parseArgs(["node", "sympla-enrich.ts", "--limit", "-1"])).toThrow("--limit");
  });

  it("lança erro para argumento desconhecido", () => {
    expect(() => parseArgs(["node", "sympla-enrich.ts", "--foo"])).toThrow("--foo");
  });
});
