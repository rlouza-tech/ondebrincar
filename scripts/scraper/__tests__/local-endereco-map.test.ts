import { describe, expect, it } from "vitest";
import {
  lookupEnderecoPorLocal,
  lookupLocalPorEndereco,
  normalize,
  parseLocalEnderecoMap,
  upsertPar,
  type LocalEnderecoPair,
} from "../local-endereco-map";

describe("normalize", () => {
  it("remove acentos, pontuação e colapsa espaços, tudo em minúsculas", () => {
    expect(normalize("Shopping Nova Iguaçu — Centro")).toBe("shopping nova iguacu centro");
  });

  it("trata múltiplos espaços e espaços nas pontas", () => {
    expect(normalize("  Teatro   Bangu Shopping  ")).toBe("teatro bangu shopping");
  });
});

describe("parseLocalEnderecoMap", () => {
  it("retorna [] quando raw é null", () => {
    expect(parseLocalEnderecoMap(null)).toEqual([]);
  });

  it("retorna [] quando o JSON é inválido", () => {
    expect(parseLocalEnderecoMap("{not json")).toEqual([]);
  });

  it("retorna [] quando o JSON válido não é um array", () => {
    expect(parseLocalEnderecoMap('{"a": 1}')).toEqual([]);
  });

  it("faz parse de um array válido", () => {
    const raw = JSON.stringify([{ local: "Teatro X", endereco: "Rua Y, 1" }]);
    expect(parseLocalEnderecoMap(raw)).toEqual([{ local: "Teatro X", endereco: "Rua Y, 1" }]);
  });
});

describe("lookupEnderecoPorLocal / lookupLocalPorEndereco", () => {
  const tabela: LocalEnderecoPair[] = [
    { local: "Shopping Nova Iguaçu", endereco: "Avenida Abílio Augusto Távora, 1111 — Kinoplex — Centro" },
    { local: "Teatro Bangu Shopping", endereco: "Rua Fonseca, 240 — Bangu" },
  ];

  it("acha o endereço a partir do nome (case/acento-insensível)", () => {
    expect(lookupEnderecoPorLocal(tabela, "shopping nova iguaçu")).toBe(
      "Avenida Abílio Augusto Távora, 1111 — Kinoplex — Centro",
    );
  });

  it("acha o nome a partir do endereço (case/acento-insensível)", () => {
    expect(lookupLocalPorEndereco(tabela, "RUA FONSECA, 240 — BANGU")).toBe(
      "Teatro Bangu Shopping",
    );
  });

  it("retorna null quando não acha o par (fallback não bloqueia a ficha)", () => {
    expect(lookupEnderecoPorLocal(tabela, "Local Desconhecido")).toBeNull();
    expect(lookupLocalPorEndereco(tabela, "Rua Desconhecida, 999")).toBeNull();
  });

  it("retorna null para busca vazia", () => {
    expect(lookupEnderecoPorLocal(tabela, "   ")).toBeNull();
  });
});

describe("upsertPar", () => {
  it("adiciona um par novo quando o nome ainda não existe na tabela", () => {
    const resultado = upsertPar([], "Teatro Novo", "Rua Nova, 1");
    expect(resultado).toEqual([{ local: "Teatro Novo", endereco: "Rua Nova, 1" }]);
  });

  it("atualiza o endereço quando o nome já existe com endereço diferente", () => {
    const tabela: LocalEnderecoPair[] = [{ local: "Teatro X", endereco: "Endereço Antigo" }];
    const resultado = upsertPar(tabela, "Teatro X", "Endereço Novo");
    expect(resultado).toEqual([{ local: "Teatro X", endereco: "Endereço Novo" }]);
  });

  it("não muda (mesma referência) quando o par já existe idêntico", () => {
    const tabela: LocalEnderecoPair[] = [{ local: "Teatro X", endereco: "Rua Y, 1" }];
    const resultado = upsertPar(tabela, "Teatro X", "Rua Y, 1");
    expect(resultado).toBe(tabela);
  });

  it("não muda quando local ou endereco vêm vazios", () => {
    const tabela: LocalEnderecoPair[] = [];
    expect(upsertPar(tabela, "", "Rua Y, 1")).toBe(tabela);
    expect(upsertPar(tabela, "Teatro X", "   ")).toBe(tabela);
  });

  it("não muta a lista original (imutável)", () => {
    const tabela: LocalEnderecoPair[] = [{ local: "Teatro X", endereco: "Rua Y, 1" }];
    upsertPar(tabela, "Teatro Novo", "Rua Nova, 1");
    expect(tabela).toEqual([{ local: "Teatro X", endereco: "Rua Y, 1" }]);
  });
});
