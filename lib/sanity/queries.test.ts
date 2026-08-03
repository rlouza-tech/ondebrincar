import { describe, expect, it } from "vitest";
import { atracoesAtivas, atracoesPorBairro, slugsAtivos } from "./queries";

/**
 * US-S64 — as queries públicas usam allowlist (status == "operando"), não
 * denylist de status individuais. Por isso qualquer status novo — incluindo
 * "duplicada" — já fica de fora da home, do filtro por bairro e do sitemap
 * sem precisar de mudança nessas queries. Este teste garante que a allowlist
 * segue como está, e não vira denylist por acidente no futuro.
 */
describe("queries públicas — allowlist de status (US-S64)", () => {
  it("atracoesAtivas filtra por status == operando (allowlist)", () => {
    expect(atracoesAtivas).toContain('status == "operando"');
  });

  it("atracoesPorBairro filtra por status == operando (allowlist)", () => {
    expect(atracoesPorBairro).toContain('status == "operando"');
  });

  it("slugsAtivos filtra por status == operando (allowlist)", () => {
    expect(slugsAtivos).toContain('status == "operando"');
  });
});
