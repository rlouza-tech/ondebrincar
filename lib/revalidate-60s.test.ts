import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => true,
  sanityClient: { fetch: (...args: unknown[]) => mockFetch(...args) },
  sanityWriteClient: {},
}));

import { getAllAtracoes, getAtracaoBySlug } from "./atracoes";
import { getRecomendacoes } from "./recomendacoes";
import type { Atracao } from "./sanity/types";

const OPCAO = { next: { revalidate: 60 } };

describe("revalidate de 60 s na home e na ficha, com recomendações explícitas (US-O34)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue([]);
  });

  it("catálogo da home lê com 60 s", async () => {
    await getAllAtracoes();
    expect(mockFetch.mock.calls[0][2]).toEqual(OPCAO);
  });

  it("ficha por slug lê com 60 s", async () => {
    mockFetch.mockResolvedValue(null);
    await getAtracaoBySlug("qualquer-slug");
    expect(mockFetch.mock.calls[0][2]).toEqual(OPCAO);
  });

  it("recomendações da ficha leem com 60 s", async () => {
    await getRecomendacoes({
      slug: "x",
      categoria: "teatro",
      bairro: "Tijuca",
      tipoProgramacao: "datada",
    } as unknown as Atracao);
    expect(mockFetch).toHaveBeenCalled();
    for (const chamada of mockFetch.mock.calls) {
      expect(chamada[2]).toEqual(OPCAO);
    }
  });
});
