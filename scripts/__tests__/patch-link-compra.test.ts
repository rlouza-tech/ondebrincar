import { describe, expect, it } from "vitest";
import { inferPartner, buildSlugFromRow } from "../patch-link-compra";

// US-S35: mesma correção do pipeline-ia/index.ts aplicada aqui, já que esta
// função é uma cópia duplicada usada só para o patch retroativo de link_compra.

describe("inferPartner (patch-link-compra)", () => {
  it("reconhece sympla", () => {
    expect(inferPartner("https://www.sympla.com.br/evento/123")).toBe("sympla");
  });

  it("reconhece eventim", () => {
    expect(inferPartner("https://www.eventim.com.br/event/nome")).toBe("eventim");
  });

  it("reconhece clubinho na URL real (Colônia de Férias Gecrear – Laranjeiras)", () => {
    expect(
      inferPartner(
        "https://clubinhodeofertas.com.br/rio-de-janeiro/colonia-de-ferias-gecrear-laranjeiras-1786",
      ),
    ).toBe("clubinho");
  });

  it("cai em outro para domínio desconhecido", () => {
    expect(inferPartner("https://www.ingresso.com/evento/123")).toBe("outro");
  });
});

// US-S26: buildSlugFromRow reconstrói o slug do CSV pra cruzar com o Sanity
// (comentário no código já documenta que é cópia proposital de
// pipeline-ia/index.ts::buildSlug). Sem o mesmo truncamento, o cruzamento
// quebra pra fichas com nome+venue longos, como o caso real Gracie Kore.
describe("buildSlugFromRow", () => {
  it("não trunca nomes curtos", () => {
    expect(buildSlugFromRow({ nome: "Peça de Teatro", venue: "Teatro Rival" })).toBe(
      "peca-de-teatro-teatro-rival",
    );
  });

  it("trunca preservando palavra inteira e anexa hash — caso real Gracie Kore (128 chars)", () => {
    const row = {
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue: "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ",
    };

    const slug = buildSlugFromRow(row);

    expect(slug.length).toBeLessThanOrEqual(113);
    expect(`drafts.atracao-${slug}`.length).toBeLessThanOrEqual(128);
    // AC2 (board Notion): formato "<prefixo-por-palavra>-<hash de 6 hex chars>".
    expect(slug).toMatch(/^[a-z0-9-]+-[0-9a-f]{6}$/);
    expect(slug.startsWith("colonia-de-ferias-gracie-kore-tema-anti-bullying")).toBe(true);
  });

  it("AC2: dois eventos com prefixo idêntico e sufixo diferente não colidem depois de truncar", () => {
    const venue = "Gracie Kore by Kyra Gracie - Vogue Square - Rio de Janeiro, RJ";
    const rowA = {
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você",
      venue,
    };
    const rowB = {
      nome: "Colônia de Férias Gracie Kore - TEMA: Anti-Bullying - Coragem para Ser Você (Turma B)",
      venue,
    };

    expect(buildSlugFromRow(rowA)).not.toBe(buildSlugFromRow(rowB));
  });
});
