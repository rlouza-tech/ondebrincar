/**
 * Testes para readEnrichedCSV — cobertura de US-S61 (endereco descartado ao ler o
 * CSV enriquecido). Mesma classe de bug que US-S41 corrigiu em pipeline-ia/csv.ts,
 * aqui no parser do CSV já enriquecido (scripts/import-sanity/index.ts).
 */

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readEnrichedCSV } from "../index";

const HEADER =
  "nome,slug,categoria,idade_min,idade_max,duracao_min,preco_centavos,link_compra,origem,bairro,indoor_outdoor,descricao,mini_review,tipo_programacao,programacao_texto,proxima_data,foto_url,review_status,abstain_reasons,confidence,processed_at,source_url,ai_generated,ai_model,pipeline_failed";

function linhaBase(extra: { endereco?: string } = {}) {
  const cols = [
    "1a Edicao do Start Kids",
    "1a-edicao-do-start-kids",
    "evento",
    "4",
    "10",
    "60",
    "5000",
    "https://www.sympla.com.br/evento/exemplo/123",
    "sympla",
    "Realengo",
    "outdoor",
    "Descricao de teste.",
    "Mini review de teste.",
    "evento_unico",
    "Sáb 16h",
    "",
    "",
    "auto_ok",
    "",
    "5",
    "2026-07-16T14:09:15.045Z",
    "https://www.sympla.com.br/evento/exemplo/123",
    "true",
    "gemini-flash-2.5",
    "false",
  ];
  return { header: HEADER, cols, ...extra };
}

describe("readEnrichedCSV — endereco (US-S61)", () => {
  it("lê CSV com coluna endereco preenchida e propaga o valor para a linha", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "com-endereco.csv");
    const { cols } = linhaBase();
    await writeFile(
      path,
      `${HEADER},endereco\n${cols.join(",")},"Rua Professor Carlos Wenceslau, 290 — Realengo"\n`,
      "utf8",
    );

    const rows = await readEnrichedCSV(path);
    expect(rows).toHaveLength(1);
    expect(rows[0].endereco).toBe("Rua Professor Carlos Wenceslau, 290 — Realengo");
  });

  it("endereco fica undefined quando a coluna está ausente do CSV (fichas Clubinho)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "sem-endereco.csv");
    const { cols } = linhaBase();
    await writeFile(path, `${HEADER}\n${cols.join(",")}\n`, "utf8");

    const rows = await readEnrichedCSV(path);
    expect(rows).toHaveLength(1);
    expect(rows[0].endereco).toBeUndefined();
    // Resto da linha segue funcionando normalmente sem quebrar.
    expect(rows[0].nome).toBe("1a Edicao do Start Kids");
    expect(rows[0].slug).toBe("1a-edicao-do-start-kids");
  });

  it("endereco fica undefined quando a coluna existe mas está vazia", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "endereco-vazio.csv");
    const { cols } = linhaBase();
    await writeFile(path, `${HEADER},endereco\n${cols.join(",")},\n`, "utf8");

    const rows = await readEnrichedCSV(path);
    expect(rows[0].endereco).toBeUndefined();
  });
});

describe("readEnrichedCSV — idade_min/idade_max null (US-S20)", () => {
  it("idade_min e idade_max vazios no CSV → null, sem lançar erro", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "idade-vazia.csv");
    const { cols } = linhaBase();
    // idade_min (índice 3) e idade_max (índice 4)
    cols[3] = "";
    cols[4] = "";
    await writeFile(path, `${HEADER}\n${cols.join(",")}\n`, "utf8");

    const rows = await readEnrichedCSV(path);
    expect(rows).toHaveLength(1);
    expect(rows[0].idade_min).toBeNull();
    expect(rows[0].idade_max).toBeNull();
  });

  it("idade_min e idade_max preenchidos → propaga os números normalmente", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "idade-preenchida.csv");
    const { cols } = linhaBase();
    await writeFile(path, `${HEADER}\n${cols.join(",")}\n`, "utf8");

    const rows = await readEnrichedCSV(path);
    expect(rows[0].idade_min).toBe(4);
    expect(rows[0].idade_max).toBe(10);
  });
});

describe("readEnrichedCSV — data_fim (US-S37)", () => {
  it("data_fim ausente do CSV → null", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "sem-data-fim.csv");
    const { cols } = linhaBase();
    await writeFile(path, `${HEADER}\n${cols.join(",")}\n`, "utf8");

    const rows = await readEnrichedCSV(path);
    expect(rows[0].data_fim).toBeNull();
  });

  it("data_fim preenchida (evento multi-dia contínuo) → propaga a data", async () => {
    const dir = await mkdtemp(join(tmpdir(), "import-sanity-csv-"));
    const path = join(dir, "com-data-fim.csv");
    const { cols } = linhaBase();
    cols[15] = "2026-07-06"; // proxima_data
    await writeFile(
      path,
      `${HEADER},data_fim\n${cols.join(",")},2026-07-10\n`,
      "utf8",
    );

    const rows = await readEnrichedCSV(path);
    expect(rows[0].proxima_data).toBe("2026-07-06");
    expect(rows[0].data_fim).toBe("2026-07-10");
  });
});
