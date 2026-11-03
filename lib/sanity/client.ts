import { createClient } from "@sanity/client";
import { createImageUrlBuilder } from "@sanity/image-url";

export const sanityConfig = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-05-15",
};

export function hasSanityConfig(): boolean {
  return Boolean(sanityConfig.projectId && sanityConfig.dataset);
}

/**
 * US-O34 — leituras públicas (só documentos publicados) pela CDN da Sanity, que tem cota
 * própria (1.000.000) separada da cota de API (250.000). O atraso da CDN medido na US-O35 foi
 * ~1,3 s. Rascunho nunca passa por aqui: use `sanityPreviewClient`.
 */
export const sanityClient = createClient({
  projectId: sanityConfig.projectId || "missing-project-id",
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: true,
});

/**
 * US-O34 — cliente para rascunho/preview: sem CDN, com token e perspectiva `previewDrafts`.
 * Nenhuma rota pública usa este cliente; ele existe para uma futura rota de preview.
 */
export const sanityPreviewClient = createClient({
  projectId: sanityConfig.projectId || "missing-project-id",
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  perspective: "previewDrafts",
});

export const sanityWriteClient = createClient({
  projectId: sanityConfig.projectId || "missing-project-id",
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const builder = createImageUrlBuilder(sanityClient);

export function urlForImage(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}
