import { describe, expect, it } from "vitest";
import { configHome } from "../configHome";

describe("configHome schema (US-I46)", () => {
  it("é um documento único (type: document)", () => {
    expect(configHome.type).toBe("document");
  });

  it("tem campo carrosseisAtivos: array de string com options.list de 6 candidatos", () => {
    const field = configHome.fields.find((f) => f.name === "carrosseisAtivos") as
      | {
          type?: string;
          of?: Array<{ type: string; options?: { list?: Array<{ value: string }> } }>;
        }
      | undefined;
    expect(field).toBeDefined();
    expect(field?.type).toBe("array");
    expect(field?.of?.[0]?.type).toBe("string");

    const values = field?.of?.[0]?.options?.list?.map((o) => o.value) ?? [];
    expect(values).toEqual([
      "zona-sul",
      "zona-sudoeste",
      "zona-norte",
      "zona-central",
      "zona-oeste",
      "categoria",
    ]);
  });
});
