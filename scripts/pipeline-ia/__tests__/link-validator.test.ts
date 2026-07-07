import { describe, it, expect } from "vitest";
import { validateLinkCompra, filterLinkCompra, buildSlugLocal } from "../link-validator";
import type { LinhaInput } from "../types";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<LinhaInput>): LinhaInput {
  return {
    nome: "Evento Teste",
    categoria_origem: "Teatro Infantil",
    venue: "Teatro Municipal",
    bairro: "Centro",
    dias_apresentacao: "Sábados",
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: "https://sympla.com.br/evento/123",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateLinkCompra — casos unitários
// ---------------------------------------------------------------------------

describe("validateLinkCompra", () => {
  // --- Caso de borda DoD #1: URL válida ---
  it("aceita URL com domínio real (sympla)", () => {
    expect(validateLinkCompra("https://www.sympla.com.br/evento/12345")).toBeNull();
  });

  it("aceita URL com domínio real (eventim)", () => {
    expect(validateLinkCompra("https://www.eventim.com.br/ingresso/show")).toBeNull();
  });

  it("aceita URL com domínio real (http)", () => {
    expect(validateLinkCompra("http://clubinhodobebe.com.br/evento")).toBeNull();
  });

  it("aceita URL com subdomínio e path complexo", () => {
    expect(validateLinkCompra("https://eventos.rio.rj.gov.br/museu/abc?ref=123")).toBeNull();
  });

  // --- Caso de borda DoD #2: URL com domínio inválido ---
  it("rejeita URL com localhost", () => {
    const motivo = validateLinkCompra("http://localhost:3000/evento");
    expect(motivo).toBe("hostname_localhost");
  });

  it("rejeita URL com IP numérico", () => {
    const motivo = validateLinkCompra("http://192.168.1.50/evento");
    expect(motivo).toBe("hostname_ip_numerico");
  });

  it("rejeita URL com IP numérico público", () => {
    const motivo = validateLinkCompra("https://34.200.10.5/comprar");
    expect(motivo).toBe("hostname_ip_numerico");
  });

  it("rejeita string sem schema (não parseável como URL)", () => {
    const motivo = validateLinkCompra("sympla.com.br/evento");
    expect(motivo).toBe("url_nao_parseavel");
  });

  it("rejeita string com typo que não parseia", () => {
    const motivo = validateLinkCompra("htps://sympla.com.br/evento");
    // "htps:" não é http/https
    expect(motivo).not.toBeNull();
  });

  it("rejeita URL com protocolo inválido (ftp)", () => {
    const motivo = validateLinkCompra("ftp://arquivos.exemplo.com/evento");
    expect(motivo).toMatch(/protocolo_invalido/);
  });

  it("rejeita placeholder example.com", () => {
    const motivo = validateLinkCompra("https://example.com/evento");
    expect(motivo).toMatch(/hostname_placeholder/);
  });

  it("rejeita placeholder example.com.br", () => {
    // exemplo.com (sem .br) é placeholder; exemplo.com.br não é — não deve rejeitar
    const motivo = validateLinkCompra("https://exemplo.com/evento");
    expect(motivo).toMatch(/hostname_placeholder/);
  });

  // --- Caso de borda DoD #3: campo vazio ---
  it("aceita string vazia (ausência de link é legítima)", () => {
    expect(validateLinkCompra("")).toBeNull();
  });

  it("aceita string com apenas espaços (equivalente a vazio)", () => {
    expect(validateLinkCompra("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// filterLinkCompra — integração com LinhaInput
// ---------------------------------------------------------------------------

describe("filterLinkCompra", () => {
  it("aceita linha com url_ingresso válida", () => {
    const row = makeRow({ url_ingresso: "https://sympla.com.br/evento/99" });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("aceita linha sem url_ingresso e url_origem válida", () => {
    const row = makeRow({
      url_ingresso: undefined,
      url_origem: "https://clubinhodobebe.com.br/show",
    });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("aceita linha sem nenhum link (url_ingresso e url_origem vazios)", () => {
    const row = makeRow({ url_ingresso: undefined, url_origem: "" });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(0);
  });

  it("rejeita linha com url_ingresso localhost", () => {
    const row = makeRow({ url_ingresso: "http://localhost/teste" });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].motivo).toBe("hostname_localhost");
    expect(rejected[0].url).toBe("http://localhost/teste");
    expect(rejected[0].nome).toBe("Evento Teste");
  });

  it("rejeita linha com url_ingresso IP numérico", () => {
    const row = makeRow({ url_ingresso: "http://10.0.0.1/comprar" });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].motivo).toBe("hostname_ip_numerico");
  });

  it("rejeita linha com url_ingresso não parseável", () => {
    const row = makeRow({ url_ingresso: "sem-schema/caminho" });
    const { accepted, rejected } = filterLinkCompra([row]);
    expect(accepted).toHaveLength(0);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].motivo).toBe("url_nao_parseavel");
  });

  it("processa mix: uma válida e uma inválida", () => {
    const validRow = makeRow({ nome: "Evento A", url_ingresso: "https://sympla.com.br/a" });
    const invalidRow = makeRow({ nome: "Evento B", url_ingresso: "http://localhost/b" });
    const { accepted, rejected } = filterLinkCompra([validRow, invalidRow]);
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(accepted[0].nome).toBe("Evento A");
    expect(rejected[0].nome).toBe("Evento B");
  });

  it("inclui slug e nome no objeto de rejeição", () => {
    const row = makeRow({
      nome: "Show Infantil",
      venue: "Teatro da Tijuca",
      url_ingresso: "http://192.168.0.1/ingresso",
    });
    const { rejected } = filterLinkCompra([row]);
    expect(rejected[0].slug).toBe("show-infantil-teatro-da-tijuca");
    expect(rejected[0].nome).toBe("Show Infantil");
  });
});

// US-S26: buildSlugLocal() é réplica local de pipeline-ia/index.ts::buildSlug
// (evita import circular), usada só pra popular o slug no log de rejeição.
describe("buildSlugLocal", () => {
  it("não trunca nomes curtos", () => {
    const row = makeRow({ nome: "Peça de Teatro", venue: "Teatro Rival", bairro: "" });
    expect(buildSlugLocal(row)).toBe("peca-de-teatro-teatro-rival");
  });

  it("trunca preservando palavra inteira — caso real Gracie Kore (128 chars)", () => {
    const row = makeRow({
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue: "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ",
      bairro: "",
    });
    const slug = buildSlugLocal(row);
    expect(slug.length).toBeLessThanOrEqual(113);
    expect(`drafts.atracao-${slug}`.length).toBeLessThanOrEqual(128);
    expect(slug.endsWith("-")).toBe(false);
  });
});
