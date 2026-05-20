import type { SanityClient } from "@sanity/client";

export function draftHasFoto(doc: Record<string, unknown> | null): boolean {
  if (!doc) {
    return false;
  }
  const foto = doc.foto as { asset?: { _ref?: string } } | undefined;
  return Boolean(foto?.asset?._ref);
}

export async function uploadFotoToDraft(
  client: SanityClient,
  draftId: string,
  buffer: Buffer,
  filename: string,
  alt: string,
): Promise<void> {
  const asset = await client.assets.upload("image", buffer, {
    filename,
    contentType: "image/webp",
  });

  await client
    .patch(draftId)
    .set({
      foto: {
        _type: "image",
        asset: {
          _type: "reference",
          _ref: asset._id,
        },
        alt,
      },
    })
    .commit();
}
