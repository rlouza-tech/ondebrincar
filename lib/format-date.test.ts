import { describe, expect, it } from "vitest";
import { formatadorDeData } from "./format-date";

describe("formatadorDeData", () => {
  it("formata data ISO em pt-BR com dia da semana", () => {
    expect(formatadorDeData("2026-05-23")).toBe("23 de maio (sáb)");
  });
});
