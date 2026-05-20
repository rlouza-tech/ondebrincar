import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import type { AssociateRow } from "./types";

export async function readEnrichedRows(csvPath: string): Promise<AssociateRow[]> {
  const rows: AssociateRow[] = [];

  await new Promise<void>((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (record: Record<string, string>) => {
        rows.push({
          slug: record.slug ?? "",
          nome: record.nome ?? "",
          bairro: record.bairro ?? "",
          venue: "",
        });
      })
      .on("error", reject)
      .on("end", () => resolve());
  });

  return rows.filter((row) => row.slug.length > 0);
}
