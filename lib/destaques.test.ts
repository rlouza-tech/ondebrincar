import { describe, expect, it } from "vitest";
import {
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
