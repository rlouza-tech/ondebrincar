import { describe, expect, it } from "vitest";
import { planejarMudancas, type FichaSanity } from "../recategorizar-sazonais";

function ficha(p: Partial<FichaSanity> & { nome: string }): FichaSanity {
  return {
    _id: `atracao-${p.slug ?? "x"}`,
    slug: "x",
    categoria: "teatro",
    local: "Teatro Qualquer",
    status: "operando",
    ...p,
  };
}

describe("planejarMudancas", () => {
  it("reclassifica Natal, Halloween e Dança em fichas operando", () => {
    const m = planejarMudancas([
      ficha({ nome: "O Brilho do Natal", slug: "a" }),
      ficha({ nome: "Halloween do Recreio", slug: "b", categoria: "evento" }),
      ficha({ nome: "Ballet Clássico", slug: "c" }),
    ]);
    expect(m.map((x) => x.para)).toEqual(["natal", "halloween", "danca"]);
    expect(m[1].de).toBe("evento");
  });

  it("ignora status diferente de operando", () => {
    const m = planejarMudancas([
      ficha({ nome: "Evento de Natal", slug: "a", status: "rejeitado" }),
      ficha({ nome: "Bob Zoom Natal", slug: "b", status: "duplicada" }),
      ficha({ nome: "Setembro em Dança", slug: "c", status: "encerrada" }),
    ]);
    expect(m).toEqual([]);
  });

  it("respeita os slugs excluídos", () => {
    const m = planejarMudancas([
      ficha({ nome: "Fossa Dançante", slug: "fossa-dancante" }),
      ficha({ nome: "Cypher do Passinho 30/10", slug: "cypher-do-passinho-halloween-dicro" }),
    ]);
    expect(m).toEqual([]);
  });

  it("não usa substring: Natalia e baleia não casam", () => {
    const m = planejarMudancas([
      ficha({ nome: "Natalia Show", slug: "a" }),
      ficha({ nome: "Passeio da baleia", slug: "b" }),
    ]);
    expect(m).toEqual([]);
  });

  it("não muda ficha que já está na categoria alvo", () => {
    expect(planejarMudancas([ficha({ nome: "Natal Mágico", categoria: "natal" })])).toEqual([]);
  });

  it("festa-junina vence sazonal e não é sobrescrita", () => {
    expect(planejarMudancas([ficha({ nome: "Arraial de Natal", categoria: "festa-junina" })])).toEqual([]);
  });

  it("agrupa published e draft e patcha as duas versões", () => {
    const m = planejarMudancas([
      ficha({ _id: "atracao-a", nome: "O Brilho do Natal", slug: "a" }),
      ficha({ _id: "drafts.atracao-a", nome: "O Brilho do Natal", slug: "a" }),
    ]);
    expect(m).toHaveLength(1);
    expect(m[0].ids).toEqual(["atracao-a", "drafts.atracao-a"]);
  });
});
