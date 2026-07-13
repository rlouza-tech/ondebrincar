import { describe, expect, it } from "vitest";
import {
  parseDescricao,
  parseArgs,
  parsePrecos,
  isBiletoUrl,
  precisaRevisaoManual,
  parseEnderecoBileto,
  MIN_DESCRICAO_CHARS,
} from "../sympla-enrich";

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
// parsePrecos (US-S23)
// ---------------------------------------------------------------------------

describe("parsePrecos", () => {
  it("retorna null quando texto não tem preço", () => {
    expect(parsePrecos("Sem preço aqui")).toEqual({
      minPriceCents: null,
      multiplasFaixas: false,
    });
  });

  it("extrai preço único com centavos", () => {
    expect(parsePrecos("Ingresso: R$ 29,90")).toEqual({
      minPriceCents: 2990,
      multiplasFaixas: false,
    });
  });

  it("extrai preço sem centavos (R$ 30)", () => {
    expect(parsePrecos("Ingresso R$ 30")).toEqual({
      minPriceCents: 3000,
      multiplasFaixas: false,
    });
  });

  it("extrai menor de múltiplos preços e sinaliza multiplasFaixas", () => {
    expect(parsePrecos("Inteira: R$ 59,90\nMeia: R$ 29,90")).toEqual({
      minPriceCents: 2990,
      multiplasFaixas: true,
    });
  });

  it("preços iguais em lotes distintos não geram multiplasFaixas", () => {
    expect(parsePrecos("Lote 1: R$ 30,00\nLote 2: R$ 30,00")).toEqual({
      minPriceCents: 3000,
      multiplasFaixas: false,
    });
  });

  it("normaliza separador de milhar (R$ 1.000,00)", () => {
    expect(parsePrecos("Ingresso VIP R$ 1.000,00")).toEqual({
      minPriceCents: 100_000,
      multiplasFaixas: false,
    });
  });

  it("ignora R$ 0,00 (ingressos gratuitos — Gemini detecta via texto)", () => {
    expect(parsePrecos("Gratuito R$ 0,00")).toEqual({
      minPriceCents: null,
      multiplasFaixas: false,
    });
  });

  it("ignora valores acima de R$100.000 (limite anti-lixo)", () => {
    // R$ 150.000 → filtrado (acima do limite); R$ 50 fica
    expect(parsePrecos("VIP R$ 150.000,00\nGeral R$ 50,00")).toEqual({
      minPriceCents: 5000,
      multiplasFaixas: false,
    });
  });

  it("ignora valores acima de R$100.000 — só caros, retorna null", () => {
    expect(parsePrecos("Pacote R$ 200.000,00")).toEqual({
      minPriceCents: null,
      multiplasFaixas: false,
    });
  });

  it("múltiplos lotes com preços diferentes — retorna mais barato", () => {
    const texto = [
      "Lote Solidário R$ 49,90",
      "Lote 1 R$ 69,90",
      "Lote 2 R$ 89,90",
      "VIP R$ 150,00",
    ].join("\n");
    expect(parsePrecos(texto)).toEqual({
      minPriceCents: 4990,
      multiplasFaixas: true,
    });
  });

  it("R$ sem espaço (R$29,90)", () => {
    expect(parsePrecos("Ingresso R$29,90")).toEqual({
      minPriceCents: 2990,
      multiplasFaixas: false,
    });
  });
});

// ---------------------------------------------------------------------------
// isBiletoUrl + precisaRevisaoManual (US-S40)
// ---------------------------------------------------------------------------

describe("isBiletoUrl", () => {
  it("reconhece bileto.sympla.com.br/event/ID", () => {
    expect(isBiletoUrl("https://bileto.sympla.com.br/event/121678")).toBe(true);
  });

  it("reconhece path com /d/ e query params (fixtures reais)", () => {
    expect(
      isBiletoUrl("https://bileto.sympla.com.br/event/122583/d/393901/s/2597882"),
    ).toBe(true);
    expect(
      isBiletoUrl(
        "https://bileto.sympla.com.br/event/123227?mp_rloc=Festas+Juninas",
      ),
    ).toBe(true);
  });

  it("não marca URL padrão sympla.com.br/evento/...", () => {
    expect(
      isBiletoUrl(
        "https://www.sympla.com.br/evento/oficina-de-circo-em-familia/3484120",
      ),
    ).toBe(false);
  });

  it("não marca outros subdomínios sympla sem /event/ID", () => {
    expect(isBiletoUrl("https://bileto.sympla.com.br/")).toBe(false);
    expect(isBiletoUrl("https://www.sympla.com.br/")).toBe(false);
  });
});

describe("precisaRevisaoManual", () => {
  it("marca bileto quando não há endereço extraído (temEndereco omitido = false)", () => {
    expect(
      precisaRevisaoManual(
        "Soldadinho de Chumbo e a Bonequinha",
        "https://bileto.sympla.com.br/event/121678",
      ),
    ).toBe(true);
  });

  it("marca bileto quando temEndereco é explicitamente false (US-S51: extração falhou)", () => {
    expect(
      precisaRevisaoManual(
        "Soldadinho de Chumbo e a Bonequinha",
        "https://bileto.sympla.com.br/event/121678",
        false,
      ),
    ).toBe(true);
  });

  it("NÃO marca bileto quando temEndereco é true (US-S51: extração via shadow DOM funcionou)", () => {
    expect(
      precisaRevisaoManual(
        "Soldadinho de Chumbo e a Bonequinha",
        "https://bileto.sympla.com.br/event/121678",
        true,
      ),
    ).toBe(false);
  });

  it("mantém regra de escola/colégio pelo nome, mesmo com endereço extraído", () => {
    expect(
      precisaRevisaoManual(
        "Colônia Eleva Champions Camp",
        "https://www.sympla.com.br/evento/eleva-camp/1",
        true,
      ),
    ).toBe(true);
    expect(
      precisaRevisaoManual(
        "Peça da Escola Municipal",
        "https://www.sympla.com.br/evento/peca/1",
      ),
    ).toBe(true);
  });

  it("não marca evento normal sympla.com.br/evento/...", () => {
    expect(
      precisaRevisaoManual(
        "Oficina de circo em família",
        "https://www.sympla.com.br/evento/ato-021-oficina/3484120",
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseEnderecoBileto (US-S51)
// ---------------------------------------------------------------------------

describe("parseEnderecoBileto", () => {
  it("retorna null para entrada nula/undefined/vazia", () => {
    expect(parseEnderecoBileto(null)).toBeNull();
    expect(parseEnderecoBileto(undefined)).toBeNull();
    expect(parseEnderecoBileto("")).toBeNull();
  });

  it("retorna null para texto curto demais para ser endereço", () => {
    expect(parseEnderecoBileto("N/A")).toBeNull();
  });

  it("limpa o texto real do fixture 121678 (Soldadinho de Chumbo)", () => {
    const raw =
      "Rua Marques São Vicente , 52 - 3º andar Loja 371,\n" +
      "                              Rio de Janeiro -\n" +
      "                              Rio de Janeiro";
    expect(parseEnderecoBileto(raw)).toBe(
      "Rua Marques São Vicente, 52 - 3º andar Loja 371, Rio de Janeiro - Rio de Janeiro",
    );
  });

  it("limpa o texto real do fixture 122583 (Arraiá da Lona)", () => {
    const raw =
      "Praça Primeiro de Maio, s/n,\n" +
      "                              Rio de Janeiro -\n" +
      "                              Rio de Janeiro";
    expect(parseEnderecoBileto(raw)).toBe(
      "Praça Primeiro de Maio, s/n, Rio de Janeiro - Rio de Janeiro",
    );
  });

  it("limpa o texto real do fixture 123227 (EcoFeira Julina) — corrige vírgula colada", () => {
    const raw =
      "Parque Poeta Manuel Bandeira,0,\n" +
      "                              Rio de Janeiro -\n" +
      "                              Rio de Janeiro";
    expect(parseEnderecoBileto(raw)).toBe(
      "Parque Poeta Manuel Bandeira, 0, Rio de Janeiro - Rio de Janeiro",
    );
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
