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

export const sanityClient = createClient({
  projectId: sanityConfig.projectId || "missing-project-id",
  dataset: sanityConfig.dataset,
  apiVersion: sanityConfig.apiVersion,
  useCdn: process.env.NODE_ENV === "production",
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
