import { createReadStream } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse";
import { buildSlugFromParts } from "../lib/slug";

export async function loadVenueBySlug(
  originCsvPath = join(process.cwd(), "data", "input", "planilha-origem.csv"),
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  await new Promise<void>((resolve, reject) => {
    createReadStream(originCsvPath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (record: Record<string, string>) => {
        const nome = record.nome ?? "";
        const venue = record.venue ?? "";
        const bairro = record.bairro ?? "";
        const slug = buildSlugFromParts(nome, venue, bairro);
        if (slug) {
          map.set(slug, venue);
        }
      })
      .on("error", reject)
      .on("end", () => resolve());
  });

  return map;
}
