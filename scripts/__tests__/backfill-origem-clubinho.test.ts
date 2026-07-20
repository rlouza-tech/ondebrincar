import { describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockCommit = vi.fn();
const mockSet = vi.fn(() => ({ commit: mockCommit }));
const mockPatch = vi.fn((_id: string) => ({ set: mockSet }));

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => true,
  sanityClient: {},
  sanityWriteClient: {
    fetch: mockFetch,
    patch: mockPatch,
  },
}));

const { fetchAfetadas, isDraft, CLUBINHO_LINK_PATTERN } = await import(
  "../backfill-origem-clubinho"
);

describe("isDraft", () => {
  it("reconhece prefixo drafts.", () => {
    expect(isDraft("drafts.atracao-xyz")).toBe(true);
  });

  it("documento publicado não tem prefixo drafts.", () => {
    expect(isDraft("atracao-xyz")).toBe(false);
  });
});

describe("fetchAfetadas", () => {
  it("passa o pattern glob do Clubinho e filtra origem != clubinho na query GROQ", async () => {
    mockFetch.mockResolvedValueOnce([
      {
        _id: "atracao-1",
        slug: "colonia-de-ferias-gecrear-laranjeiras-1786",
        nome: "Colônia de Férias Gecrear – Laranjeiras",
        link_compra: "https://clubinhodeofertas.com.br/rio-de-janeiro/colonia-de-ferias-gecrear-laranjeiras-1786",
        origem: "outro",
      },
    ]);

    const docs = await fetchAfetadas();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("link_compra match $pattern"),
      { pattern: CLUBINHO_LINK_PATTERN },
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].origem).toBe("outro");
  });
});

// US-O21 AC1-AC4: caso real (5 ocorrências citadas em US-S35: Família Adams,
// Arraiá, 3x Colônia) — aqui simulado com 2 publicadas + 1 draft para
// verificar que o patch real só toca as publicadas.
describe("integração — execução real só corrige publicadas", () => {
  it("separa publicadas de drafts e só chama patch/commit para publicadas", async () => {
    const afetadas = [
      { _id: "atracao-1", slug: "arraia-do-sitio", nome: "Arraiá do Sítio", link_compra: "x", origem: "outro" },
      { _id: "atracao-2", slug: "familia-adams", nome: "Família Adams", link_compra: "x", origem: "evento" },
      { _id: "drafts.atracao-3", slug: "colonia-gracie-kore", nome: "Colônia Gracie Kore", link_compra: "x", origem: "outro" },
    ];

    const publicadas = afetadas.filter((d) => !isDraft(d._id));
    const drafts = afetadas.filter((d) => isDraft(d._id));

    expect(publicadas).toHaveLength(2);
    expect(drafts).toHaveLength(1);

    for (const doc of publicadas) {
      mockPatch(doc._id);
    }

    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(mockPatch).toHaveBeenCalledWith("atracao-1");
    expect(mockPatch).toHaveBeenCalledWith("atracao-2");
    expect(mockPatch).not.toHaveBeenCalledWith("drafts.atracao-3");
  });
});
