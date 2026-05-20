import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findImageForSlug } from "../images";

describe("findImageForSlug", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(tmpdir(), `associate-imagens-${Date.now()}`);
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("encontra primeira extensão disponível (jpg antes de png)", async () => {
    await writeFile(join(dir, "peca-teste.jpg"), "fake");
    await writeFile(join(dir, "peca-teste.png"), "fake");
    expect(await findImageForSlug(dir, "peca-teste")).toMatch(/peca-teste\.jpg$/);
  });

  it("retorna null quando nenhuma extensão existe", async () => {
    expect(await findImageForSlug(dir, "inexistente")).toBeNull();
  });
});
