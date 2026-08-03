import { describe, expect, it } from "vitest";
import { parseSlugsArg, planejarAplicacao } from "../index";

describe("parseSlugsArg (US-S64)", () => {
  it("extrai um único --slug", () => {
    expect(parseSlugsArg(["--slug", "atracao-a", "--dry-run"])).toEqual(["atracao-a"]);
  });

  it("extrai múltiplos --slug repetidos", () => {
    expect(parseSlugsArg(["--slug", "atracao-a", "--slug", "atracao-b"])).toEqual([
      "atracao-a",
      "atracao-b",
    ]);
  });

  it("extrai múltiplos slugs separados por vírgula num único --slug", () => {
    expect(parseSlugsArg(["--slug", "atracao-a,atracao-b"])).toEqual([
      "atracao-a",
      "atracao-b",
    ]);
  });

  it("combina --slug repetido e separado por vírgula, sem duplicar", () => {
    expect(
      parseSlugsArg(["--slug", "atracao-a,atracao-b", "--slug", "atracao-b", "--execute"]),
    ).toEqual(["atracao-a", "atracao-b"]);
  });

  it("ignora espaços em branco ao redor dos slugs", () => {
    expect(parseSlugsArg(["--slug", " atracao-a , atracao-b "])).toEqual([
      "atracao-a",
      "atracao-b",
    ]);
  });

  it("retorna lista vazia quando --slug não é informado", () => {
    expect(parseSlugsArg(["--dry-run"])).toEqual([]);
  });

  it("ignora --slug sem valor (seguido de outra flag ou nada)", () => {
    expect(parseSlugsArg(["--slug", "--execute"])).toEqual([]);
    expect(parseSlugsArg(["--slug"])).toEqual([]);
  });
});

describe("planejarAplicacao (US-S64)", () => {
  it("separa docs a marcar dos que já estão duplicada", () => {
    const docs = [
      { _id: "a1", slug: "atracao-a", nome: "Atração A", status: "operando" },
      { _id: "a2", slug: "atracao-b", nome: "Atração B", status: "duplicada" },
    ];

    const { aMarcar, jaDuplicadas } = planejarAplicacao(docs);

    expect(aMarcar).toEqual([docs[0]]);
    expect(jaDuplicadas).toEqual([docs[1]]);
  });

  it("qualquer status diferente de duplicada entra em aMarcar (encerrada, rejeitado, etc.)", () => {
    const docs = [
      { _id: "a1", slug: "atracao-a", nome: "Atração A", status: "encerrada" },
      { _id: "a2", slug: "atracao-b", nome: "Atração B", status: "rejeitado" },
    ];

    const { aMarcar, jaDuplicadas } = planejarAplicacao(docs);

    expect(aMarcar).toEqual(docs);
    expect(jaDuplicadas).toEqual([]);
  });

  it("lista vazia retorna ambos os grupos vazios", () => {
    expect(planejarAplicacao([])).toEqual({ aMarcar: [], jaDuplicadas: [] });
  });
});
