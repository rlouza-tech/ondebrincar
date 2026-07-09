import { describe, it, expect, afterEach } from "vitest";
import { readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { lerState, salvarState } from "../state";

const TMP_DIR = join(process.cwd(), "data", "__tmp_newsletter_state_test__");
const TMP_PATH = join(TMP_DIR, "state.json");

afterEach(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe("lerState", () => {
  it("retorna null quando o arquivo não existe (primeira execução)", async () => {
    const state = await lerState(TMP_PATH);
    expect(state).toBeNull();
  });

  it("retorna null quando o arquivo está corrompido, sem lançar", async () => {
    await mkdir(TMP_DIR, { recursive: true });
    await writeFile(TMP_PATH, "{ isso não é json válido", "utf-8");
    const state = await lerState(TMP_PATH);
    expect(state).toBeNull();
  });

  it("lê a data persistida corretamente", async () => {
    await mkdir(TMP_DIR, { recursive: true });
    await writeFile(TMP_PATH, JSON.stringify({ lastDraftDate: "2026-07-08T22:00:00.000Z" }), "utf-8");
    const state = await lerState(TMP_PATH);
    expect(state).toEqual({ lastDraftDate: "2026-07-08T22:00:00.000Z" });
  });
});

describe("salvarState", () => {
  it("cria o diretório e escreve o arquivo quando não existem", async () => {
    await salvarState({ lastDraftDate: "2026-07-08T22:00:00.000Z" }, TMP_PATH);
    const raw = await readFile(TMP_PATH, "utf-8");
    expect(JSON.parse(raw)).toEqual({ lastDraftDate: "2026-07-08T22:00:00.000Z" });
  });

  it("sobrescreve o state anterior", async () => {
    await salvarState({ lastDraftDate: "2026-07-01T10:00:00.000Z" }, TMP_PATH);
    await salvarState({ lastDraftDate: "2026-07-08T22:00:00.000Z" }, TMP_PATH);
    const state = await lerState(TMP_PATH);
    expect(state?.lastDraftDate).toBe("2026-07-08T22:00:00.000Z");
  });
});
