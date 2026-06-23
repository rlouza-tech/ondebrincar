import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { stringify } from "csv-stringify/sync";
import type { LinhaEnriquecida } from "./types";

export const CSV_COLUMNS: Array<keyof LinhaEnriquecida> = [
  "nome",
  "categoria_origem",
  "venue",
  "bairro",
  "dias_apresentacao",
  "desconto_percentual",
  "preco_bruto",
  "url_origem",
  "sinopse_oficial",
  "horarios_sessao",
  "duracao_minutos",
  "idade_minima",
  "idade_maxima",
  "preco_inteira_centavos",
  "url_ingresso",
  "preco_a_partir",
];

export async function writeScrapedCsv(
  outputPath: string,
  rows: LinhaEnriquecida[],
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  const output = stringify(rows, {
    header: true,
    columns: CSV_COLUMNS,
  });
  await writeFile(outputPath, output, "utf8");
}
