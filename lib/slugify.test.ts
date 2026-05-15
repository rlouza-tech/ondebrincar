import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("normalizes accents and spaces", () => {
    expect(slugify("Parque da Cidade")).toBe("parque-da-cidade");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(slugify("   ")).toBe("");
  });
});
