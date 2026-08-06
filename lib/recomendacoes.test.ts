import { describe, expect, it } from "vitest";
import { getFimDeSemanaReferencia, mesclarRecomendacoes } from "./recomendacoes";
import { recomendacoesPorBairro, recomendacoesPorTema } from "./sanity/queries";

describe("US-I33 — queries de recomendação — allowlist de status", () => {
  it("recomendacoesPorTema filtra por status == operando (allowlist)", () => {
    expect(recomendacoesPorTema).toContain('status == "operando"');
  });

  it("recomendacoesPorBairro filtra por status == operando (allowlist)", () => {
    expect(recomendacoesPorBairro).toContain('status == "operando"');
  });
});

describe("getFimDeSemanaReferencia", () => {
  it("retorna sáb/dom da mesma semana quando a data é uma quarta-feira", () => {
    // 2026-08-05 é uma quarta-feira
    expect(getFimDeSemanaReferencia("2026-08-05")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("mantém o próprio dia quando a data já é sábado", () => {
    // 2026-08-08 é sábado
    expect(getFimDeSemanaReferencia("2026-08-08")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("usa o sábado anterior quando a data é domingo", () => {
    // 2026-08-09 é domingo
    expect(getFimDeSemanaReferencia("2026-08-09")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("sem proximaData (atração permanente), usa o próximo fim de semana a partir de hoje", () => {
    const semData = getFimDeSemanaReferencia(undefined);
    const dataInicio = new Date(`${semData.inicio}T12:00:00`);
    const dataFim = new Date(`${semData.fim}T12:00:00`);
    expect(dataInicio.getDay()).toBe(6); // sábado
    expect(dataFim.getDay()).toBe(0); // domingo
  });
});

describe("mesclarRecomendacoes", () => {
  const candidata = (slug: string) => ({
    slug,
    titulo: `Atração ${slug}`,
    categoria: "teatro",
    bairro: "Tijuca",
    proximaData: "2026-08-08",
    imagemUrl: "/foto.jpg",
  });

  it("intercala tema e bairro, marcando o eixo de cada card", () => {
    const resultado = mesclarRecomendacoes(
      [candidata("tema-1"), candidata("tema-2")],
      [candidata("bairro-1"), candidata("bairro-2")],
    );

    expect(resultado.map((r) => r.slug)).toEqual([
      "tema-1",
      "bairro-1",
      "tema-2",
      "bairro-2",
    ]);
    expect(resultado.map((r) => r.eixo)).toEqual(["tema", "bairro", "tema", "bairro"]);
  });

  it("remove duplicatas por slug, mantendo o primeiro eixo encontrado", () => {
    const resultado = mesclarRecomendacoes(
      [candidata("compartilhada"), candidata("tema-2")],
      [candidata("compartilhada"), candidata("bairro-2")],
    );

    const slugs = resultado.map((r) => r.slug);
    expect(slugs.filter((s) => s === "compartilhada")).toHaveLength(1);
    expect(resultado.find((r) => r.slug === "compartilhada")?.eixo).toBe("tema");
  });

  it("respeita o máximo de cards (padrão 4)", () => {
    const porTema = ["a", "b", "c", "d"].map(candidata);
    const porBairro = ["e", "f", "g", "h"].map(candidata);
    const resultado = mesclarRecomendacoes(porTema, porBairro);
    expect(resultado).toHaveLength(4);
  });

  it("retorna array vazio quando não há candidatos em nenhum eixo", () => {
    expect(mesclarRecomendacoes([], [])).toEqual([]);
  });

  it("usa só o eixo disponível quando o outro está vazio", () => {
    const resultado = mesclarRecomendacoes([candidata("tema-1")], []);
    expect(resultado).toEqual([{ ...candidata("tema-1"), eixo: "tema" }]);
  });
});
