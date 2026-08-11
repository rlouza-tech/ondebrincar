/**
 * Testes US-E18 — suporte à fonte EcoVilla em scripts/pipeline-ia/index.ts.
 * Cobre AC1 (Source/--source aceitam 'ecovilla', loadInput() usa normalizeEcovilla()).
 * AC4 (inferOrigem detecta ecovillarihappy) está coberto em origem.test.ts.
 */

import { describe, expect, it, vi } from "vitest";
import type { LinhaInput } from "../types";

const mockNormalizeEcovilla = vi.fn();

vi.mock("@/scripts/normalizer/ecovilla", () => ({
  normalizeEcovilla: (...args: unknown[]) => mockNormalizeEcovilla(...args),
  DEFAULT_INPUT_PATH: "data/input/ecovilla-raw.csv",
}));

const { parseArgs, loadInput } = await import("../index");

describe("parseArgs — --source ecovilla", () => {
  it("aceita --source ecovilla", () => {
    const options = parseArgs(["node", "pipeline-ia.ts", "--source", "ecovilla"]);
    expect(options.source).toBe("ecovilla");
  });

  it("rejeita fonte desconhecida com mensagem citando ecovilla como opção válida", () => {
    expect(() => parseArgs(["node", "pipeline-ia.ts", "--source", "invalida"])).toThrow(
      /ecovilla/,
    );
  });
});

describe("loadInput — source ecovilla", () => {
  it("chama normalizeEcovilla() e rotula o label com prefixo ecovilla:", async () => {
    const rows: LinhaInput[] = [
      {
        nome: "Peça EcoVilla Exemplo",
        categoria_origem: "Teatro Infantil",
        venue: "Teatro EcoVilla Ri Happy",
        bairro: "Jardim Botânico",
        dias_apresentacao: "Dias 10",
        desconto_percentual: "",
        preco_bruto: "",
        url_origem: "https://ecovillarihappy.com.br/programacao/",
      },
    ];
    mockNormalizeEcovilla.mockResolvedValueOnce(rows);

    const result = await loadInput({ source: "ecovilla", model: "gemini-2.5-flash" });

    expect(mockNormalizeEcovilla).toHaveBeenCalledWith("data/input/ecovilla-raw.csv");
    expect(result.rows).toBe(rows);
    expect(result.label).toBe("ecovilla:data/input/ecovilla-raw.csv");
  });

  it("usa inputPath explícito quando informado, em vez do default", async () => {
    mockNormalizeEcovilla.mockResolvedValueOnce([]);

    await loadInput({
      source: "ecovilla",
      inputPath: "data/input/custom-ecovilla.csv",
      model: "gemini-2.5-flash",
    });

    expect(mockNormalizeEcovilla).toHaveBeenCalledWith("data/input/custom-ecovilla.csv");
  });
});
