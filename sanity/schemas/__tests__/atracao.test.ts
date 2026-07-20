import { describe, expect, it } from "vitest";
import { atracao } from "../atracao";

/**
 * Sanity's `Rule` builder só existe de verdade dentro do runtime do Studio.
 * Para testar a regra de validação de `duracao_min` sem subir o Studio,
 * simulamos aqui um Rule mínimo que reproduz o comportamento real de
 * `.integer().min().max()` — encadeia os métodos e valida um valor contra
 * o que foi configurado, igual ao validador real faria.
 */
function createFakeRule() {
  let requireInteger = false;
  let minValue: number | undefined;
  let maxValue: number | undefined;

  const rule = {
    integer() {
      requireInteger = true;
      return rule;
    },
    min(value: number) {
      minValue = value;
      return rule;
    },
    max(value: number) {
      maxValue = value;
      return rule;
    },
    validate(value: number): true | string {
      if (requireInteger && !Number.isInteger(value)) {
        return "Deve ser um número inteiro.";
      }
      if (typeof minValue === "number" && value < minValue) {
        return `Deve ser maior ou igual a ${minValue}.`;
      }
      if (typeof maxValue === "number" && value > maxValue) {
        return `Deve ser menor ou igual a ${maxValue}.`;
      }
      return true;
    },
  };

  return rule;
}

function getDuracaoMinValidation() {
  const field = atracao.fields.find((f) => f.name === "duracao_min");
  if (!field || typeof field.validation !== "function") {
    throw new Error("Campo duracao_min ou sua validação não foi encontrado no schema atracao.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return field.validation as unknown as (rule: ReturnType<typeof createFakeRule>) => any;
}

describe("atracao schema — duracao_min (US-S48)", () => {
  it("aceita a duração real do Arraial do Planetário (660 min) sem erro de validação", () => {
    const validation = getDuracaoMinValidation();
    const rule = createFakeRule();
    validation(rule);

    expect(rule.validate(660)).toBe(true);
  });

  it("aceita o novo teto de 990 min (16,5h)", () => {
    const validation = getDuracaoMinValidation();
    const rule = createFakeRule();
    validation(rule);

    expect(rule.validate(990)).toBe(true);
  });

  it("continua rejeitando valores absurdos acima do teto (ex.: 10000 min)", () => {
    const validation = getDuracaoMinValidation();
    const rule = createFakeRule();
    validation(rule);

    expect(rule.validate(10000)).not.toBe(true);
  });

  it("rejeita qualquer valor acima de 990 min", () => {
    const validation = getDuracaoMinValidation();
    const rule = createFakeRule();
    validation(rule);

    expect(rule.validate(991)).not.toBe(true);
  });
});

describe("atracao schema — origem (US-S54: renomeado de partner)", () => {
  it("não tem mais campo partner", () => {
    const field = atracao.fields.find((f) => f.name === "partner");
    expect(field).toBeUndefined();
  });

  it("tem campo origem com title 'Origem'", () => {
    const field = atracao.fields.find((f) => f.name === "origem");
    expect(field).toBeDefined();
    expect(field?.title).toBe("Origem");
  });

  it("inclui a opção Raindrop na lista de valores", () => {
    const field = atracao.fields.find((f) => f.name === "origem") as
      | { options?: { list?: Array<{ title: string; value: string }> } }
      | undefined;
    const values = field?.options?.list?.map((option) => option.value) ?? [];

    expect(values).toContain("raindrop");
  });

  it("mantém as demais opções históricas (sympla, eventim, clubinho, outro)", () => {
    const field = atracao.fields.find((f) => f.name === "origem") as
      | { options?: { list?: Array<{ title: string; value: string }> } }
      | undefined;
    const values = field?.options?.list?.map((option) => option.value) ?? [];

    expect(values).toEqual(["sympla", "eventim", "clubinho", "raindrop", "outro"]);
  });
});
