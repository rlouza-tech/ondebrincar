import { describe, expect, it } from "vitest";
import { atracao } from "../atracao";
import {
  MENSAGEM_OBRIGATORIO,
  ehStatusDescarte,
  validarObrigatorioSalvoDescarte,
} from "../validacaoDescarte";

describe("validarObrigatorioSalvoDescarte (US-S72)", () => {
  it.each(["encerrada", "rejeitado", "duplicada"])("vazio + %s = ok", (status) => {
    expect(validarObrigatorioSalvoDescarte(undefined, status)).toBe(true);
    expect(validarObrigatorioSalvoDescarte("", status)).toBe(true);
  });

  it.each(["operando", "cancelada", "em_obras", "esgotada"])("vazio + %s = erro", (status) => {
    expect(validarObrigatorioSalvoDescarte(undefined, status)).toBe(MENSAGEM_OBRIGATORIO);
    expect(validarObrigatorioSalvoDescarte("", status)).toBe(MENSAGEM_OBRIGATORIO);
    expect(validarObrigatorioSalvoDescarte(null, status)).toBe(MENSAGEM_OBRIGATORIO);
  });

  it("status ausente segue obrigatório", () => {
    expect(validarObrigatorioSalvoDescarte(undefined, undefined)).toBe(MENSAGEM_OBRIGATORIO);
  });

  it("com valor passa em qualquer status", () => {
    expect(validarObrigatorioSalvoDescarte("Tijuca", "operando")).toBe(true);
    expect(validarObrigatorioSalvoDescarte("Tijuca", "encerrada")).toBe(true);
  });

  it("ehStatusDescarte só reconhece os três de descarte", () => {
    expect(["encerrada", "rejeitado", "duplicada"].every(ehStatusDescarte)).toBe(true);
    expect(["operando", "cancelada", "em_obras", "esgotada", undefined].some(ehStatusDescarte)).toBe(
      false,
    );
  });
});

/**
 * Rule mínimo que registra o encadeamento real do campo (.min/.max/.custom) e
 * o executa, para provar a fiação do schema sem subir o Studio.
 */
type CustomFn = (v: unknown, ctx: { document: { status: string } }) => true | string;

function validarCampo(nome: string, value: unknown, status: string): true | string {
  const campo = atracao.fields.find((f) => f.name === nome);
  if (!campo) throw new Error(`campo ${nome} não existe`);
  let min: number | undefined;
  let max: number | undefined;
  let custom: CustomFn | undefined;
  const rule = {
    min(n: number) {
      min = n;
      return rule;
    },
    max(n: number) {
      max = n;
      return rule;
    },
    custom(fn: CustomFn) {
      custom = fn;
      return rule;
    },
    required() {
      throw new Error(`campo ${nome} ainda usa Rule.required() fixo`);
    },
  };
  (campo.validation as unknown as (r: typeof rule) => unknown)(rule);
  if (typeof value === "string" && value !== "") {
    if (min !== undefined && value.length < min) return `min ${min}`;
    if (max !== undefined && value.length > max) return `max ${max}`;
  }
  return custom ? custom(value, { document: { status } }) : true;
}

describe("campos de conteúdo da ficha no schema (US-S72)", () => {
  it("bairro: vazio + encerrada = ok; vazio + duplicada = ok; vazio + operando = erro", () => {
    expect(validarCampo("bairro", undefined, "encerrada")).toBe(true);
    expect(validarCampo("bairro", undefined, "duplicada")).toBe(true);
    expect(validarCampo("bairro", undefined, "rejeitado")).toBe(true);
    expect(validarCampo("bairro", undefined, "operando")).toBe(MENSAGEM_OBRIGATORIO);
  });

  it.each(["operando", "cancelada", "em_obras", "esgotada"])(
    "bairro: vazio + %s continua obrigatório",
    (status) => {
      expect(validarCampo("bairro", undefined, status)).toBe(MENSAGEM_OBRIGATORIO);
    },
  );

  it("bairro: 1 caractere + encerrada = erro; 2 a 80 caracteres = ok; 81 = erro", () => {
    expect(validarCampo("bairro", "A", "encerrada")).not.toBe(true);
    expect(validarCampo("bairro", "AB", "encerrada")).toBe(true);
    expect(validarCampo("bairro", "x".repeat(80), "encerrada")).toBe(true);
    expect(validarCampo("bairro", "x".repeat(81), "encerrada")).not.toBe(true);
    expect(validarCampo("bairro", "A", "operando")).not.toBe(true);
  });

  it.each(["indoor_outdoor", "tipo_programacao", "programacao_texto", "descricao"])(
    "%s: vazio passa em descarte e continua obrigatório em operando",
    (nome) => {
      expect(validarCampo(nome, undefined, "encerrada")).toBe(true);
      expect(validarCampo(nome, undefined, "rejeitado")).toBe(true);
      expect(validarCampo(nome, undefined, "duplicada")).toBe(true);
      expect(validarCampo(nome, undefined, "operando")).toBe(MENSAGEM_OBRIGATORIO);
    },
  );

  it("limites de programacao_texto (5 a 200) e descricao (20 a 1000) valem em descarte", () => {
    expect(validarCampo("programacao_texto", "curto", "encerrada")).toBe(true);
    expect(validarCampo("programacao_texto", "abc", "encerrada")).not.toBe(true);
    expect(validarCampo("descricao", "x".repeat(19), "encerrada")).not.toBe(true);
    expect(validarCampo("descricao", "x".repeat(20), "encerrada")).toBe(true);
  });

  it("nome, slug, categoria e status continuam sempre obrigatórios", () => {
    for (const nome of ["nome", "slug", "categoria", "status"]) {
      expect(() => validarCampo(nome, undefined, "encerrada")).toThrow(/Rule\.required|custom/);
    }
  });
});
