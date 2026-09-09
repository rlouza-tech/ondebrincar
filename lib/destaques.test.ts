import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SanityAtracaoDocument } from "./sanity/types";

const mockFetch = vi.fn();
const mockHasSanityConfig = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => mockHasSanityConfig(),
  sanityClient: { fetch: (...args: unknown[]) => mockFetch(...args) },
  sanityWriteClient: {},
}));

import {
  getDestaquesSemana,
  MIN_DESTAQUES,
  precisaRotacionar,
  ROTATION_STALE_DAYS,
  sortearNovaCuradoria,
} from "./destaques";

describe("precisaRotacionar (US-I51)", () => {
  it("não rotaciona quando a curadoria manual é recente (2 dias atrás)", () => {
    const agora = new Date("2026-09-09T12:00:00Z");
    const ultimaCuradoria = "2026-09-07T12:00:00Z";
    expect(precisaRotacionar(ultimaCuradoria, agora)).toBe(false);
  });

  it(`rotaciona quando passaram ${ROTATION_STALE_DAYS}+ dias sem curadoria manual`, () => {
    const agora = new Date("2026-09-09T12:00:00Z");
    const ultimaCuradoria = "2026-09-02T12:00:00Z"; // exatamente 7 dias
    expect(precisaRotacionar(ultimaCuradoria, agora)).toBe(true);
  });

  it("rotaciona quando nunca houve curadoria (doc inexistente/bootstrap)", () => {
    expect(precisaRotacionar(undefined)).toBe(true);
    expect(precisaRotacionar(null)).toBe(true);
  });

  it("não rotaciona no limite exato antes de completar 7 dias (6 dias e 23h)", () => {
    const agora = new Date("2026-09-09T11:00:00Z");
    const ultimaCuradoria = "2026-09-02T12:00:00Z";
    expect(precisaRotacionar(ultimaCuradoria, agora)).toBe(false);
  });
});

describe("sortearNovaCuradoria (US-I51)", () => {
  it("sorteia a quantidade pedida, sem repetição", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const resultado = sortearNovaCuradoria(ids, MIN_DESTAQUES, () => 0);
    expect(resultado).toHaveLength(MIN_DESTAQUES);
    expect(new Set(resultado).size).toBe(MIN_DESTAQUES);
    resultado.forEach((id) => expect(ids).toContain(id));
  });

  it("nunca escolhe o mesmo id duas vezes mesmo com rand determinístico em 0", () => {
    const ids = ["a", "b", "c", "d"];
    const resultado = sortearNovaCuradoria(ids, 4, () => 0);
    expect(resultado).toEqual(["a", "b", "c", "d"]);
  });

  it("retorna no máximo o tamanho do pool elegível quando o catálogo ativo é menor que o pedido", () => {
    const ids = ["a", "b"];
    const resultado = sortearNovaCuradoria(ids, MIN_DESTAQUES, () => 0);
    expect(resultado).toHaveLength(2);
  });

  it("usa MIN_DESTAQUES (3) como quantidade padrão", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const resultado = sortearNovaCuradoria(ids);
    expect(resultado).toHaveLength(3);
  });
});

const atracaoDocFixture: SanityAtracaoDocument = {
  _id: "atracao-1",
  nome: "Peça do Circo",
  slug: { current: "peca-circo" },
  categoria: "teatro",
  bairro: "Tijuca",
  indoor_outdoor: "indoor",
  status: "operando",
  descricao: "Descrição completa.",
};

describe("getDestaquesSemana (US-I43) — front-end lê a curadoria do Sanity", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockHasSanityConfig.mockReset();
  });

  it("retorna [] sem Sanity configurado — trilha some (AC5)", async () => {
    mockHasSanityConfig.mockReturnValue(false);
    const resultado = await getDestaquesSemana();
    expect(resultado).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("retorna [] quando o documento destaquesSemana ainda não existe (AC5)", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockResolvedValue(null);
    const resultado = await getDestaquesSemana();
    expect(resultado).toEqual([]);
  });

  it("retorna [] quando o fetch falha, sem propagar o erro", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockRejectedValue(new Error("timeout"));
    const resultado = await getDestaquesSemana();
    expect(resultado).toEqual([]);
  });

  it("mapeia as atrações resolvidas na ordem devolvida pela query (curadoria manual, AC2/AC3)", async () => {
    mockHasSanityConfig.mockReturnValue(true);
    mockFetch.mockResolvedValue({
      ultimaCuradoria: "2026-09-08T12:00:00Z",
      atracoes: [
        atracaoDocFixture,
        { ...atracaoDocFixture, _id: "atracao-2", nome: "Bosque da Barra", slug: { current: "bosque-barra" } },
      ],
    });

    const resultado = await getDestaquesSemana();

    expect(resultado).toHaveLength(2);
    expect(resultado[0].slug).toBe("peca-circo");
    expect(resultado[0].titulo).toBe("Peça do Circo");
    expect(resultado[1].slug).toBe("bosque-barra");
  });
});
