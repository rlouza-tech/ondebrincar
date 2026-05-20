import { describe, expect, it } from "vitest";
import {
  collectSizeWarnings,
  MAX_IMAGE_BYTES,
  MIN_IMAGE_BYTES,
} from "../images";

describe("collectSizeWarnings", () => {
  it("alerta arquivo grande (>5MB)", () => {
    const warnings = collectSizeWarnings(MAX_IMAGE_BYTES + 1);
    expect(warnings).toContain(`arquivo_grande:${MAX_IMAGE_BYTES + 1}b`);
  });

  it("alerta arquivo pequeno (<100KB)", () => {
    const warnings = collectSizeWarnings(MIN_IMAGE_BYTES - 1);
    expect(warnings).toContain(`arquivo_pequeno:${MIN_IMAGE_BYTES - 1}b`);
  });

  it("não alerta tamanho dentro do padrão", () => {
    const warnings = collectSizeWarnings(500 * 1024);
    expect(warnings).toHaveLength(0);
  });
});
