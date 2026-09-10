import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
const mockHasSanityConfig = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => mockHasSanityConfig(),
  sanityClient: { fetch: (...args: unknown[]) => mockFetch(...args) },
  sanityWriteClient: {},
}));

import { getConfigHomeAtual } from "./config-home";

describe("getConfigHomeAtual (US-I47) — lê o painel de curadoria da US-I46", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockHasSanityConfig.mockReset();
  });

  it("retorna null sem Sanity configurado — chamador cai no fallback padrão", async () => {
    mockHasSanityConfig.mockReturnValue(false);
    const resultado = await getConfigHomeAtual();
    expect(resultado).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retorna null quando o documento configHome ainda não existe (Rafa não abriu o painel)", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockResolvedValue(null);
    const resultado = await getConfigHomeAtual();
    expect(resultado).toBeNull();
  });

  it("retorna null quando o fetch falha, sem propagar o erro", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockRejectedValue(new Error("timeout"));
    const resultado = await getConfigHomeAtual();
    expect(resultado).toBeNull();
  });

  it("retorna o documento com carrosseisAtivos quando existe", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockResolvedValue({ carrosseisAtivos: ["zona-sul", "zona-norte"] });
    const resultado = await getConfigHomeAtual();
    expect(resultado).toEqual({ carrosseisAtivos: ["zona-sul", "zona-norte"] });
  });
});
