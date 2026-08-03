/**
 * Testes US-E16 — buildFonteVivaMap() inclui a fonte viva da Uhuu.
 *
 * A US-S53 cruzava fichas vencidas só com Clubinho + Sympla; uma ficha vinda
 * da Uhuu caía no mesmo bug que a US-S53 corrigiu pras outras duas fontes
 * (sugestão de data só via programacao_texto salvo, nunca via fonte
 * re-raspada). Este teste replica a estrutura do teste equivalente de
 * Clubinho/Sympla (fonte-viva-sugestao.test.ts) e do padrão de mock usado em
 * scripts/pipeline-ia/__tests__/source-uhuu.test.ts, mas cobrindo o ponto de
 * integração real: buildFonteVivaMap() precisa buscar e mesclar os dados da
 * Uhuu no mapa, não só Clubinho + Sympla.
 */

import { describe, expect, it, vi } from "vitest";
import type { PipelineInput } from "@/lib/pipeline/types";

const mockNormalizeClubinho = vi.fn();
const mockNormalizeSympla = vi.fn();
const mockNormalizeUhuu = vi.fn();

vi.mock("@/scripts/normalizer/clubinho", () => ({
  normalizeClubinho: (...args: unknown[]) => mockNormalizeClubinho(...args),
  DEFAULT_INPUT_PATH: "data/input/planilha-origem.csv",
}));
vi.mock("@/scripts/normalizer/sympla", () => ({
  normalizeSympla: (...args: unknown[]) => mockNormalizeSympla(...args),
  DEFAULT_INPUT_PATH: "data/input/sympla-raw.csv",
}));
vi.mock("@/scripts/normalizer/uhuu", () => ({
  normalizeUhuu: (...args: unknown[]) => mockNormalizeUhuu(...args),
  DEFAULT_INPUT_PATH: "data/input/uhuu-raw.csv",
}));

const { buildFonteVivaMap, extrairSugestaoParaFicha } = await import("../index");

const HOJE = "2026-08-03";

function buildInput(overrides: Partial<PipelineInput> = {}): PipelineInput {
  return {
    nome: "Ficha Teste",
    categoria_origem: "Destaques",
    venue: "Venue Teste",
    bairro: "Gávea",
    dias_apresentacao: "Dias 10",
    desconto_percentual: "10%",
    preco_bruto: "R$10",
    url_origem: "https://example.com/ficha-teste",
    ...overrides,
  };
}

describe("buildFonteVivaMap (US-E16) — inclui Uhuu", () => {
  it("mescla Clubinho + Sympla + Uhuu no mesmo mapa, cruzado por slug", async () => {
    mockNormalizeClubinho.mockResolvedValueOnce([]);
    mockNormalizeSympla.mockResolvedValueOnce([]);
    mockNormalizeUhuu.mockResolvedValueOnce([
      buildInput({
        nome: "Peça Uhuu Relistada",
        venue: "Teatro Uhuu",
        bairro: "",
        dias_apresentacao: "Datas: 25 e 26 de agosto.",
      }),
    ]);

    const mapa = await buildFonteVivaMap();

    expect(mockNormalizeUhuu).toHaveBeenCalled();
    expect(mapa.size).toBe(1);
    expect(mapa.get("peca-uhuu-relistada-teatro-uhuu")?.dias_apresentacao).toBe(
      "Datas: 25 e 26 de agosto.",
    );
  });

  it("AC3: ficha Uhuu vencida cuja fonte viva tem data futura → sugestão vem da fonte", async () => {
    const slug = "show-uhuu-relistado-teatro-uhuu";
    mockNormalizeClubinho.mockResolvedValueOnce([]);
    mockNormalizeSympla.mockResolvedValueOnce([]);
    mockNormalizeUhuu.mockResolvedValueOnce([
      buildInput({
        nome: "Show Uhuu Relistado",
        venue: "Teatro Uhuu",
        bairro: "",
        dias_apresentacao: "Datas: 25 e 26 de agosto.",
      }),
    ]);

    const fonteViva = await buildFonteVivaMap();
    const ficha = { slug, programacao_texto: "Datas: 10 de agosto." };

    const extraida = extrairSugestaoParaFicha(ficha, fonteViva, HOJE);

    expect(extraida?.data).toBe("2026-08-25");
    expect(extraida?.origem).toBe("fonte viva");
  });

  it("segue funcionando quando Uhuu falha ao carregar (catch retorna [])", async () => {
    mockNormalizeClubinho.mockResolvedValueOnce([]);
    mockNormalizeSympla.mockResolvedValueOnce([]);
    mockNormalizeUhuu.mockRejectedValueOnce(new Error("CSV não encontrado"));

    const mapa = await buildFonteVivaMap();

    expect(mapa.size).toBe(0);
  });
});
