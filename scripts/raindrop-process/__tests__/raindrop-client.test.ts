import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  listCollectionItems,
  moveToCollection,
  ONDE_BRINCAR_COLLECTION_ID,
  PROCESSADOS_COLLECTION_ID,
} from "../raindrop-client";

const originalToken = process.env.RAINDROP_API_TOKEN;

beforeEach(() => {
  process.env.RAINDROP_API_TOKEN = "test-token";
});

afterEach(() => {
  process.env.RAINDROP_API_TOKEN = originalToken;
  vi.unstubAllGlobals();
});

describe("listCollectionItems", () => {
  it("retorna os itens de uma única página quando count <= perpage", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ _id: 1, title: "A", excerpt: "", note: "", link: "https://a.com", domain: "a.com", cover: "", created: "" }],
        count: 1,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const items = await listCollectionItems(ONDE_BRINCAR_COLLECTION_ID);

    expect(items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain(`/raindrops/${ONDE_BRINCAR_COLLECTION_ID}`);
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-token" });
  });

  it("pagina até coletar todos os itens (count > perpage)", async () => {
    const page0 = { items: new Array(50).fill(0).map((_, i) => ({ _id: i, title: "", excerpt: "", note: "", link: "", domain: "", cover: "", created: "" })), count: 55 };
    const page1 = { items: new Array(5).fill(0).map((_, i) => ({ _id: 50 + i, title: "", excerpt: "", note: "", link: "", domain: "", cover: "", created: "" })), count: 55 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => page0 })
      .mockResolvedValueOnce({ ok: true, json: async () => page1 });
    vi.stubGlobal("fetch", fetchMock);

    const items = await listCollectionItems();

    expect(items).toHaveLength(55);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lança erro quando a API responde com status não-ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "Unauthorized" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(listCollectionItems()).rejects.toThrow(/401/);
  });

  it("lança erro quando RAINDROP_API_TOKEN não está configurado", async () => {
    delete process.env.RAINDROP_API_TOKEN;
    await expect(listCollectionItems()).rejects.toThrow(/RAINDROP_API_TOKEN/);
  });
});

describe("moveToCollection", () => {
  it("faz PUT para o raindrop com o id da coleção alvo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    await moveToCollection(123, PROCESSADOS_COLLECTION_ID);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/raindrop/123");
    expect((init as RequestInit).method).toBe("PUT");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      collection: { $id: PROCESSADOS_COLLECTION_ID },
    });
  });

  it("lança erro quando a API responde com status não-ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => "Not found" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(moveToCollection(999)).rejects.toThrow(/404/);
  });
});
