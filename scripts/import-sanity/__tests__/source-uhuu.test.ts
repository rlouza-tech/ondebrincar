/**
 * Testes US-E13 — suporte à fonte Uhuu em scripts/import-sanity/index.ts (AC2).
 * Mesmo contrato das demais fontes: --source uhuu exige --dry-run OU --execute,
 * e sempre resolve o CSV mais recente via --latest.
 */

import { describe, expect, it } from "vitest";
import { parseArgs } from "../index";

describe("parseArgs — --source uhuu", () => {
  it("aceita --source uhuu", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "uhuu", "--dry-run"]);
    expect(options.source).toBe("uhuu");
  });

  it("exige --dry-run ou --execute quando --source uhuu é passado", () => {
    expect(() => parseArgs(["node", "import-sanity.ts", "--source", "uhuu"])).toThrow(
      /--dry-run.*--execute/s,
    );
  });

  it("aceita --source uhuu --execute", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "uhuu", "--execute"]);
    expect(options.source).toBe("uhuu");
    expect(options.execute).toBe(true);
  });

  it("resolve --latest automaticamente com --source uhuu, igual às demais fontes", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "uhuu", "--dry-run"]);
    expect(options.latest).toBe(true);
  });

  it("rejeita fonte desconhecida", () => {
    expect(() => parseArgs(["node", "import-sanity.ts", "--source", "invalida"])).toThrow(
      /uhuu/,
    );
  });
});
