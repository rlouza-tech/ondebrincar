/**
 * Testes de scrapeAtracao — retry por item quando fetchProductApi falhar
 * (US-S39). Cobre os 3 desfechos do AC5 (primeira tentativa, recuperada via
 * retry, falhou após retry) e a reabertura de sessão headed do AC1.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClubinhoProductApi } from "../clubinho-api";
import type { BrowserSession } from "../browser";
import type { ListingPreview } from "../types";

const mockFetchProductApi = vi.fn();
const mockGotoWithRetry = vi.fn().mockResolvedValue(undefined);
const mockCreateBrowserSession = vi.fn();

vi.mock("../browser", () => ({
  fetchProductApi: (...args: unknown[]) => mockFetchProductApi(...args),
  gotoWithRetry: (...args: unknown[]) => mockGotoWithRetry(...args),
  createBrowserSession: (...args: unknown[]) => mockCreateBrowserSession(...args),
}));

const mockWaitForRenderedProductPage = vi.fn().mockResolvedValue(undefined);
const mockExtractPageRenderedData = vi.fn().mockResolvedValue({ fullText: "", ldJson: [] });

vi.mock("../page-content", () => ({
  waitForRenderedProductPage: (...args: unknown[]) => mockWaitForRenderedProductPage(...args),
  extractPageRenderedData: (...args: unknown[]) => mockExtractPageRenderedData(...args),
}));

const { scrapeAtracao } = await import("../scrape-atracao");

function fakeSession(headless: boolean): BrowserSession {
  return {
    browser: { close: vi.fn().mockResolvedValue(undefined) } as unknown as BrowserSession["browser"],
    page: {} as unknown as BrowserSession["page"],
    headless,
  };
}

function apiFixture(): ClubinhoProductApi {
  return {
    product: { title: "Peça Teste", slug: "peca-teste", content: { body: "", excerpt: "" } },
    venues: [
      {
        name: "Teatro Teste",
        address: { street: "Rua Teste", number: "10", neighborhood: "Centro" },
      },
    ],
    genres: [{ name: "Teatro" }],
    lowestPrice: { sale: 5000, full: 6000 },
  };
}

const preview: ListingPreview = {
  url: "https://clubinhodeofertas.com.br/rio-de-janeiro/peca-teste",
  nome: "Peça Teste",
  categoria_origem: "",
  venue: "",
  dias_apresentacao: "",
  desconto_percentual: "",
  preco_bruto: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGotoWithRetry.mockResolvedValue(undefined);
  mockWaitForRenderedProductPage.mockResolvedValue(undefined);
  mockExtractPageRenderedData.mockResolvedValue({ fullText: "", ldJson: [] });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("scrapeAtracao — retry por item (US-S39)", () => {
  it("usa o resultado da 1ª tentativa quando fetchProductApi já retorna 200 (AC5: primeira-tentativa)", async () => {
    mockFetchProductApi.mockResolvedValueOnce({ status: 200, data: apiFixture() });
    const session = fakeSession(false);

    const result = await scrapeAtracao(session, preview);

    expect(mockFetchProductApi).toHaveBeenCalledTimes(1);
    expect(mockCreateBrowserSession).not.toHaveBeenCalled();
    expect(result.row._apiOutcome).toBe("primeira-tentativa");
    expect(result.row._apiStatus).toBe(200);
    expect(result.session).toBe(session);
  });

  it("faz 1 retry após ~2.5s quando a 1ª chamada falha (status != 200) e recupera na 2ª (AC1, AC2, AC5, AC6)", async () => {
    mockFetchProductApi
      .mockResolvedValueOnce({ status: 500, data: null })
      .mockResolvedValueOnce({ status: 200, data: apiFixture() });
    const session = fakeSession(false); // já headed — não precisa reabrir

    const resultPromise = scrapeAtracao(session, preview);
    await vi.advanceTimersByTimeAsync(2_500);
    const result = await resultPromise;

    expect(mockFetchProductApi).toHaveBeenCalledTimes(2);
    expect(mockCreateBrowserSession).not.toHaveBeenCalled();
    expect(result.row._apiOutcome).toBe("recuperada-via-retry");
    expect(result.row._apiStatus).toBe(200);
    expect(result.row.endereco).toContain("Rua Teste");
    expect(result.session).toBe(session);
  });

  it("cai no fallback (sem endereço) quando a retentativa também falha (AC4, AC5)", async () => {
    mockFetchProductApi
      .mockResolvedValueOnce({ status: 500, data: null })
      .mockResolvedValueOnce({ status: 500, data: null });
    const session = fakeSession(false);

    const resultPromise = scrapeAtracao(session, preview);
    await vi.advanceTimersByTimeAsync(2_500);
    const result = await resultPromise;

    expect(mockFetchProductApi).toHaveBeenCalledTimes(2);
    expect(result.row._apiOutcome).toBe("falhou-apos-retry");
    expect(result.row.endereco).toBeUndefined();
  });

  it("reabre sessão headed antes do retry quando a sessão original é headless (AC1)", async () => {
    mockFetchProductApi
      .mockResolvedValueOnce({ status: 0, data: null }) // timeout/erro de rede
      .mockResolvedValueOnce({ status: 200, data: apiFixture() });
    const headlessSession = fakeSession(true);
    const headedSession = fakeSession(false);
    mockCreateBrowserSession.mockResolvedValueOnce(headedSession);

    const resultPromise = scrapeAtracao(headlessSession, preview);
    await vi.advanceTimersByTimeAsync(2_500);
    const result = await resultPromise;

    expect(mockCreateBrowserSession).toHaveBeenCalledWith(true);
    expect(headlessSession.browser.close).toHaveBeenCalledTimes(1);
    expect(result.session).toBe(headedSession);
    expect(result.row._apiOutcome).toBe("recuperada-via-retry");
  });

  it("não reabre sessão quando já está headed, mesmo após falha na 1ª tentativa (AC1)", async () => {
    mockFetchProductApi
      .mockResolvedValueOnce({ status: 403, data: null })
      .mockResolvedValueOnce({ status: 200, data: apiFixture() });
    const session = fakeSession(false);

    const resultPromise = scrapeAtracao(session, preview);
    await vi.advanceTimersByTimeAsync(2_500);
    await resultPromise;

    expect(mockCreateBrowserSession).not.toHaveBeenCalled();
    expect(session.browser.close).not.toHaveBeenCalled();
  });
});
