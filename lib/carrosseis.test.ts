import { describe, expect, it } from "vitest";
import { CARROSSEL_POOL, carrosseisAtivosOrdenados } from "./carrosseis";

describe("carrosseisAtivosOrdenados (US-I46)", () => {
  it("retorna só os carrosséis ligados, na ordem do array de configuração", () => {
    const resultado = carrosseisAtivosOrdenados(["zona-norte", "zona-sul"]);
    expect(resultado.map((c) => c.id)).toEqual(["zona-norte", "zona-sul"]);
  });

  it("uma zona desligada (fora do array) não aparece no resultado", () => {
    const resultado = carrosseisAtivosOrdenados(["zona-sul"]);
    const ids = resultado.map((c) => c.id);
    expect(ids).toContain("zona-sul");
    expect(ids).not.toContain("zona-oeste");
    expect(ids).not.toContain("categoria");
  });

  it("reflete uma reordenação do array de configuração", () => {
    const resultado = carrosseisAtivosOrdenados(["categoria", "zona-central"]);
    expect(resultado.map((c) => c.id)).toEqual(["categoria", "zona-central"]);
  });

  it("ignora um id desconhecido sem quebrar (defensivo)", () => {
    const resultado = carrosseisAtivosOrdenados(["zona-sul", "zona-inexistente"]);
    expect(resultado.map((c) => c.id)).toEqual(["zona-sul"]);
  });

  it("retorna vazio quando a configuração não existe ainda (doc singleton não criado)", () => {
    expect(carrosseisAtivosOrdenados(undefined)).toEqual([]);
    expect(carrosseisAtivosOrdenados(null)).toEqual([]);
  });

  it("o pool cobre as 5 zonas do Discovery (19/08) + categoria, sem Destaques", () => {
    const ids = CARROSSEL_POOL.map((c) => c.id);
    expect(ids).toEqual([
      "zona-sul",
      "zona-sudoeste",
      "zona-norte",
      "zona-central",
      "zona-oeste",
      "categoria",
    ]);
  });
});
