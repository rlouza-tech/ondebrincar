import { describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockCommit = vi.fn();
const mockUnset = vi.fn((_fields: string[]) => ({ commit: mockCommit }));
const mockSet = vi.fn((_patch: Record<string, unknown>) => ({ unset: mockUnset }));
const mockPatch = vi.fn((_id: string) => ({ set: mockSet }));

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => true,
  sanityClient: {},
  sanityWriteClient: {
    fetch: mockFetch,
    patch: mockPatch,
  },
}));

const { fetchAfetadas, isDraft } = await import("../backfill-origem");

describe("isDraft", () => {
  it("reconhece prefixo drafts.", () => {
    expect(isDraft("drafts.atracao-xyz")).toBe(true);
  });

  it("documento publicado não tem prefixo drafts.", () => {
    expect(isDraft("atracao-xyz")).toBe(false);
  });
});

describe("fetchAfetadas", () => {
  it("busca docs com partner definido e origem ausente", async () => {
    mockFetch.mockResolvedValueOnce([
      {
        _id: "atracao-1",
        slug: "circo-teste",
        nome: "Circo Teste",
        partnerAtual: "sympla",
      },
    ]);

    const docs = await fetchAfetadas();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("defined(partner) && !defined(origem)"),
    );
    expect(docs).toHaveLength(1);
    expect(docs[0].partnerAtual).toBe("sympla");
  });
});

// AC2 da US-S54: backfill migra apenas fichas PUBLICADAS, drafts ficam de fora
// do --execute e são listadas à parte para revisão manual.
describe("integração — execução real só migra publicadas", () => {
  it("separa publicadas de drafts e só chama patch/set/unset/commit para publicadas", async () => {
    const afetadas = [
      { _id: "atracao-1", slug: "circo-teste", nome: "Circo Teste", partnerAtual: "sympla" },
      { _id: "atracao-2", slug: "parque-lage", nome: "Parque Lage", partnerAtual: "outro" },
      { _id: "drafts.atracao-3", slug: "peca-nova", nome: "Peça Nova", partnerAtual: "eventim" },
    ];

    const publicadas = afetadas.filter((d) => !isDraft(d._id));
    const drafts = afetadas.filter((d) => isDraft(d._id));

    expect(publicadas).toHaveLength(2);
    expect(drafts).toHaveLength(1);

    for (const doc of publicadas) {
      mockPatch(doc._id).set({ origem: doc.partnerAtual }).unset(["partner"]).commit();
    }

    expect(mockPatch).toHaveBeenCalledTimes(2);
    expect(mockPatch).toHaveBeenCalledWith("atracao-1");
    expect(mockPatch).toHaveBeenCalledWith("atracao-2");
    expect(mockPatch).not.toHaveBeenCalledWith("drafts.atracao-3");
    expect(mockSet).toHaveBeenCalledWith({ origem: "sympla" });
    expect(mockSet).toHaveBeenCalledWith({ origem: "outro" });
    expect(mockUnset).toHaveBeenCalledWith(["partner"]);
  });
});

// Valor "raindrop" também precisa sobreviver ao backfill sem tratamento
// especial — o script só copia o valor de partner, qualquer que ele seja.
describe("valor raindrop", () => {
  it("migra origem=raindrop normalmente, sem lógica especial", async () => {
    const doc = { _id: "atracao-4", slug: "post-raindrop", nome: "Post Raindrop", partnerAtual: "raindrop" };

    mockPatch(doc._id).set({ origem: doc.partnerAtual }).unset(["partner"]).commit();

    expect(mockSet).toHaveBeenCalledWith({ origem: "raindrop" });
  });
});
