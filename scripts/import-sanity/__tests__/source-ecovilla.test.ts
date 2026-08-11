/**
 * Testes US-E18 — suporte à fonte EcoVilla em scripts/import-sanity/index.ts (AC2).
 * Mesmo contrato das demais fontes: --source ecovilla exige --dry-run OU --execute,
 * e sempre resolve o CSV mais recente via --latest.
 */

import { describe, expect, it } from "vitest";
import { parseArgs } from "../index";

describe("parseArgs — --source ecovilla", () => {
  it("aceita --source ecovilla", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "ecovilla", "--dry-run"]);
    expect(options.source).toBe("ecovilla");
  });

  it("exige --dry-run ou --execute quando --source ecovilla é passado", () => {
    expect(() => parseArgs(["node", "import-sanity.ts", "--source", "ecovilla"])).toThrow(
      /--dry-run.*--execute/s,
    );
  });

  it("aceita --source ecovilla --execute", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "ecovilla", "--execute"]);
    expect(options.source).toBe("ecovilla");
    expect(options.execute).toBe(true);
  });

  it("resolve --latest automaticamente com --source ecovilla, igual às demais fontes", () => {
    const options = parseArgs(["node", "import-sanity.ts", "--source", "ecovilla", "--dry-run"]);
    expect(options.latest).toBe(true);
  });

  it("rejeita fonte desconhecida", () => {
    expect(() => parseArgs(["node", "import-sanity.ts", "--source", "invalida"])).toThrow(
      /ecovilla/,
    );
  });
});
