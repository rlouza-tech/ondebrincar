import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MIN_IMAGE_BYTES = 100 * 1024;

export async function findImageForSlug(
  imagensDir: string,
  slug: string,
): Promise<string | null> {
  for (let index = 0; index < IMAGE_EXTENSIONS.length; index += 1) {
    const extension = IMAGE_EXTENSIONS[index];
    const candidate = join(imagensDir, `${slug}.${extension}`);
    try {
      await access(candidate, constants.R_OK);
      return candidate;
    } catch {
      // tenta próxima extensão
    }
  }
  return null;
}

export function collectSizeWarnings(fileSizeBytes: number): string[] {
  const warnings: string[] = [];
  if (fileSizeBytes > MAX_IMAGE_BYTES) {
    warnings.push(`arquivo_grande:${fileSizeBytes}b`);
  }
  if (fileSizeBytes < MIN_IMAGE_BYTES) {
    warnings.push(`arquivo_pequeno:${fileSizeBytes}b`);
  }
  return warnings;
}

export async function optimizeImageToWebp(filePath: string): Promise<Buffer> {
  return sharp(filePath)
    .resize(1200, 800, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();
}
