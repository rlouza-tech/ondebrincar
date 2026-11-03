import { describe, expect, it } from "vitest";
import { sanityClient, sanityPreviewClient, sanityWriteClient } from "./client";

describe("clientes Sanity (US-O34)", () => {
  it("leituras públicas usam a CDN", () => {
    expect(sanityClient.config().useCdn).toBe(true);
  });

  it("cliente de preview não usa CDN e lê rascunhos", () => {
    const config = sanityPreviewClient.config();
    expect(config.useCdn).toBe(false);
    expect(config.perspective).toBe("previewDrafts");
  });

  it("cliente de escrita não usa CDN", () => {
    expect(sanityWriteClient.config().useCdn).toBe(false);
  });
});
