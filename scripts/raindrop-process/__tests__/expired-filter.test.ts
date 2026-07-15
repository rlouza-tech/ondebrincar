import { describe, it, expect } from "vitest";
import { filterExpiredPreGemini } from "../expired-filter";
import type { RaindropLinhaInput } from "../types";

function makeRow(overrides: Partial<RaindropLinhaInput>): RaindropLinhaInput {
  return {
    raindrop_id: 1,
    nome: "Evento Teste",
    categoria_origem: "",
    venue: "Teatro Municipal",
    bairro: "Centro",
    dias_apresentacao: "",
    desconto_percentual: "",
    preco_bruto: "",
    url_origem: "https://exemplo.com/evento",
    ...overrides,
  };
}

describe("filterExpiredPreGemini", () => {
  it("mantém itens sem data_hint (segue para o Gemini normalmente)", () => {
    const rows = [makeRow({ raindrop_id: 1 })];
    const result = filterExpiredPreGemini(rows, "2026-07-13");
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("mantém itens com data_hint futura", () => {
    const rows = [makeRow({ raindrop_id: 2, data_hint: "2026-07-20" })];
    const result = filterExpiredPreGemini(rows, "2026-07-13");
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("mantém itens com data_hint igual à data de referência", () => {
    const rows = [makeRow({ raindrop_id: 3, data_hint: "2026-07-13" })];
    const result = filterExpiredPreGemini(rows, "2026-07-13");
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
  });

  it("rejeita itens com data_hint no passado", () => {
    const rows = [makeRow({ raindrop_id: 4, nome: "Festival Vencido", data_hint: "2026-06-07" })];
    const result = filterExpiredPreGemini(rows, "2026-07-13");
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toEqual([
      { raindrop_id: 4, nome: "Festival Vencido", data_hint: "2026-06-07" },
    ]);
  });

  it("separa corretamente um lote misto", () => {
    const rows = [
      makeRow({ raindrop_id: 1 }),
      makeRow({ raindrop_id: 2, data_hint: "2026-06-01" }),
      makeRow({ raindrop_id: 3, data_hint: "2026-08-01" }),
    ];
    const result = filterExpiredPreGemini(rows, "2026-07-13");
    expect(result.accepted.map((r) => r.raindrop_id)).toEqual([1, 3]);
    expect(result.rejected.map((r) => r.raindrop_id)).toEqual([2]);
  });
});
