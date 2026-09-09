import { describe, expect, it } from "vitest";
import { destaquesSemana } from "../destaquesSemana";

describe("destaquesSemana schema (US-I51)", () => {
  it("é um documento único (type: document)", () => {
    expect(destaquesSemana.type).toBe("document");
  });

  it("tem campo atracoes: array de referências pra atracao", () => {
    const field = destaquesSemana.fields.find((f) => f.name === "atracoes") as
      | { type?: string; of?: Array<{ type: string; to?: Array<{ type: string }> }> }
      | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("array");
    expect(field?.of?.[0]?.type).toBe("reference");
    expect(field?.of?.[0]?.to?.[0]?.type).toBe("atracao");
  });

  it("tem campo ultimaCuradoria do tipo datetime, obrigatório", () => {
    const field = destaquesSemana.fields.find((f) => f.name === "ultimaCuradoria") as
      | { type?: string; validation?: unknown }
      | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("datetime");
    expect(typeof field?.validation).toBe("function");
  });
});
