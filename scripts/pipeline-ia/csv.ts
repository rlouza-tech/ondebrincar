import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify/sync";
import type { LinhaEnriquecida, LinhaInput } from "./types";

const INPUT_COLUMNS: Array<keyof LinhaInput> = [
  "nome",
  "categoria_origem",
  "venue",
  "bairro",
  "dias_apresentacao",
  "desconto_percentual",
  "preco_bruto",
  "url_origem",
];

export async function readCSV(path: string): Promise<LinhaInput[]> {
  return new Promise((resolve, reject) => {
    const rows: LinhaInput[] = [];

    createReadStream(path)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (record: Record<string, string>) => {
        rows.push(
          Object.fromEntries(
            INPUT_COLUMNS.map((column) => [column, record[column] ?? ""]),
          ) as unknown as LinhaInput,
        );
      })
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

export async function writeCSV(
  path: string,
  rows: LinhaEnriquecida[],
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const output = stringify(
    rows.map((row) => ({
      ...row,
      abstain_reasons: row.abstain_reasons.join("|"),
    })),
    { header: true },
  );

  await writeFile(path, output, "utf8");
}
