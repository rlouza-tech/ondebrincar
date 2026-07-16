/**
 * Testes de fetchProductApi — condições de falha do AC3 de US-S39.
 *
 * page.evaluate() de verdade roda no contexto do browser Playwright; aqui
 * simulamos isso chamando a função passada diretamente no Node, já que ela
 * só depende de fetch/AbortController/setTimeout (globais disponíveis nos
 * dois ambientes) e dos parâmetros recebidos — não referencia `page`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Page } from "playwright";
import { fetchProductApi } from "../browser";

function fakePage(): Page {
  return {
    evaluate: (fn: (arg: unknown) => unknown, arg: unknown) => fn(arg),
  } as unknown as Page;
}

describe("fetchProductApi — condições de falha (US-S39 AC3)", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("retorna status e data quando a resposta é 200 com JSON válido", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    }) as unknown as typeof fetch;

    const result = await fetchProductApi(fakePage(), "/api/x");
    expect(result).toEqual({ status: 200, data: { ok: true } });
  });

  it("retorna data null quando status HTTP != 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;

    const result = await fetchProductApi(fakePage(), "/api/x");
    expect(result).toEqual({ status: 403, data: null });
  });

  it("retorna data null quando o corpo é vazio/inválido (JSON parse falha)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected end of JSON input");
      },
    }) as unknown as typeof fetch;

    const result = await fetchProductApi(fakePage(), "/api/x");
    expect(result).toEqual({ status: 200, data: null });
  });

  it("retorna status 0 quando fetch lança erro de rede/timeout", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;

    const result = await fetchProductApi(fakePage(), "/api/x");
    expect(result).toEqual({ status: 0, data: null });
  });
});
