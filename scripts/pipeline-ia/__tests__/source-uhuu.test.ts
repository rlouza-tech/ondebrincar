/**
 * Testes US-E13 — suporte à fonte Uhuu em scripts/pipeline-ia/index.ts.
 * Cobre AC1 (Source/--source aceitam 'uhuu', loadInput() usa normalizeUhuu()).
 * AC4 (inferOrigem detecta uhuu.com) está coberto em origem.test.ts.
 */

import { describe, expect, it, vi } from "vitest";
import type { LinhaInput } from "../types";

const mockNormalizeUhuu = vi.fn();

vi.mock("@/scripts/normalizer/uhuu", () => ({
  normalizeUhuu: (...args: unknown[]) => mockNormalizeUhuu(...args),
  DEFAULT_INPUT_PATH: "data/input/uhuu-raw.csv",
}));

const { parseArgs, loadInput } = await import("../index");

describe("parseArgs — --source uhuu", () => {
  it("aceita --source uhuu", () => {
    const options = parseArgs(["node", "pipeline-ia.ts", "--source", "uhuu"]);
    expect(options.source).toBe("uhuu");
  });

  it("rejeita fonte desconhecida com mensagem citando uhuu como opção válida", () => {
    expect(() => parseArgs(["node", "pipeline-ia.ts", "--source", "invalida"])).toThrow(
      /uhuu/,
    );
  });
});

describe("loadInput — source uhuu", () => {
  it("chama normalizeUhuu() e rotula o label com prefixo uhuu:", async () => {
    const rows: LinhaInput[] = [
      {
        nome: "Peça Uhuu Exemplo",
        categoria_origem: "Teatro",
        venue: "Teatro Exemplo",
        bairro: "",
        dias_apresentacao: "Dias 10",
        desconto_percentual: "",
        preco_bruto: "R$ 40,00",
        url_origem: "https://www.uhuu.com/evento/exemplo",
      },
    ];
    mockNormalizeUhuu.mockResolvedValueOnce(rows);

    const result = await loadInput({ source: "uhuu", model: "gemini-2.5-flash" });

    expect(mockNormalizeUhuu).toHaveBeenCalledWith("data/input/uhuu-raw.csv");
    expect(result.rows).toBe(rows);
    expect(result.label).toBe("uhuu:data/input/uhuu-raw.csv");
  });

  it("usa inputPath explícito quando informado, em vez do default", async () => {
    mockNormalizeUhuu.mockResolvedValueOnce([]);

    await loadInput({ source: "uhuu", inputPath: "data/input/custom-uhuu.csv", model: "gemini-2.5-flash" });

    expect(mockNormalizeUhuu).toHaveBeenCalledWith("data/input/custom-uhuu.csv");
  });
});
