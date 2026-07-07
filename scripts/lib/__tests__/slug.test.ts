import { describe, expect, it } from "vitest";
import { buildSlugFromParts, slugify } from "../slug";

// US-S26: buildSlugFromParts é usada em check-novidades/check-atualizacoes/
// venue-map.ts pra montar o slug candidato e comparar contra o que já está
// no Sanity. Precisa truncar do mesmo jeito que pipeline-ia/index.ts::buildSlug,
// senão o dedup passa a comparar slug não-truncado contra o truncado salvo
// no Sanity e trata fichas existentes como "novas".

describe("slugify", () => {
  it("remove acentos e normaliza espaços/pontuação", () => {
    expect(slugify("Colônia de Férias")).toBe("colonia-de-ferias");
  });
});

describe("buildSlugFromParts", () => {
  it("não trunca nomes curtos", () => {
    expect(buildSlugFromParts("Peça de Teatro", "Teatro Rival", "Centro")).toBe(
      "peca-de-teatro-teatro-rival",
    );
  });

  it("usa bairro como fallback quando venue está vazio", () => {
    expect(buildSlugFromParts("Feira de Arte", "", "Tijuca")).toBe("feira-de-arte-tijuca");
  });

  it("trunca preservando palavra inteira e anexa hash — caso real Gracie Kore (128 chars)", () => {
    // nome + venue reais do caso documentado em 06/07/2026 (Sympla).
    const nome =
      "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você";
    const venue = "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ";

    const slug = buildSlugFromParts(nome, venue, "");

    expect(slug.length).toBeLessThanOrEqual(113);
    // "drafts.atracao-" (15 chars) + slug não pode passar do limite de 128
    // chars de _id do Sanity.
    expect(`drafts.atracao-${slug}`.length).toBeLessThanOrEqual(128);
    // AC2: formato "<prefixo-truncado-por-palavra>-<hash de 6 hex chars>".
    expect(slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{6}$/);
    const prefixo = slug.slice(0, slug.lastIndexOf("-"));
    const naoTruncado = slugify([nome, venue].join(" "));
    // O prefixo (sem o hash) tem que ser um recorte por palavra inteira do
    // slug completo, não um pedaço partido no meio de uma palavra.
    expect(naoTruncado.startsWith(prefixo)).toBe(true);
    const proximoChar = naoTruncado[prefixo.length];
    expect(proximoChar === "-" || proximoChar === undefined).toBe(true);
  });

  it("AC2: dois eventos com prefixo idêntico e sufixo diferente não colidem depois de truncar", () => {
    const venue = "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ";
    const nomeA =
      "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você";
    const nomeB =
      "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você (Turma B)";

    const slugA = buildSlugFromParts(nomeA, venue, "");
    const slugB = buildSlugFromParts(nomeB, venue, "");

    expect(slugA).not.toBe(slugB);
  });

  it("não trunca quando o slug tem exatamente o limite", () => {
    const nome = "a".repeat(113);
    expect(buildSlugFromParts(nome, "", "")).toBe(nome);
  });
});
