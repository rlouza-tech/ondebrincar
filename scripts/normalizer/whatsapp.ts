import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import type { LinhaInput } from "@/scripts/pipeline-ia/types";

export const DEFAULT_INPUT_PATH = "data/input/whatsapp-triagem.csv";

interface WhatsappRow {
  nome: string;
  link: string;
  data: string;
  local_bairro: string;
  descricao_raw: string;
  preco_raw: string;
}

async function readWhatsappCSV(path: string): Promise<WhatsappRow[]> {
  return new Promise((resolve, reject) => {
    const rows: WhatsappRow[] = [];

    createReadStream(path)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }),
      )
      .on("data", (record: Record<string, string>) => {
        rows.push({
          nome: record["nome"] ?? "",
          link: record["link"] ?? "",
          data: record["data"] ?? "",
          local_bairro: record["local_bairro"] ?? "",
          descricao_raw: record["descricao_raw"] ?? "",
          preco_raw: record["preco_raw"] ?? "",
        });
      })
      .on("error", reject)
      .on("end", () => resolve(rows));
  });
}

export async function normalizeWhatsapp(path: string): Promise<LinhaInput[]> {
  const rows = await readWhatsappCSV(path);

  return rows.map((row) => ({
    nome: row.nome,
    url_origem: row.link,
    bairro: row.local_bairro,
    venue: "",
    categoria_origem: "",
    dias_apresentacao: row.data,
    desconto_percentual: "",
    preco_bruto: row.preco_raw,
    sinopse_oficial: row.descricao_raw,
  }));
}
