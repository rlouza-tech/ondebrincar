/**
 * Testes para backfill-endereco — cobertura de US-S62 (backfill retroativo do
 * campo `endereco` em fichas Sympla/Clubinho criadas vazias pelo bug do
 * US-S61). Cobre só as funções puras de matching CSV → doc, sem I/O real
 * (sem Sanity, sem filesystem) — AC5 da story.
 */

import { describe, expect, it } from "vitest";
import {
  csvTimestampFromFilename,
  findEnderecoNoCsv,
  findSourceCsvForSlug,
  matchCandidateToEndereco,
  type CsvDisponivel,
  type ImportReportLike,
} from "../backfill-endereco";

describe("findSourceCsvForSlug", () => {
  it("acha o source_csv do report que criou o slug (status created, sem dry_run)", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-A.csv",
        started_at: "2026-07-20T21-38-47.000Z",
        items: [{ slug: "lilo-e-stitch", status: "created" }],
      },
    ];

    expect(findSourceCsvForSlug("lilo-e-stitch", reports)).toBe("/data/output/planilha-A.csv");
  });

  it("ignora reports de dry-run (reason dry_run)", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-preview.csv",
        started_at: "2026-07-20T11-52-09.000Z",
        items: [{ slug: "arraia-do-apaga-fogo", status: "created", reason: "dry_run" }],
      },
      {
        source_csv: "/data/output/planilha-real.csv",
        started_at: "2026-07-20T11-53-11.000Z",
        items: [{ slug: "arraia-do-apaga-fogo", status: "created" }],
      },
    ];

    expect(findSourceCsvForSlug("arraia-do-apaga-fogo", reports)).toBe(
      "/data/output/planilha-real.csv",
    );
  });

  it("com mais de um report real, prefere o mais recente", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-antiga.csv",
        started_at: "2026-07-10T10-00-00.000Z",
        items: [{ slug: "peca-x", status: "created" }],
      },
      {
        source_csv: "/data/output/planilha-nova.csv",
        started_at: "2026-07-20T10-00-00.000Z",
        items: [{ slug: "peca-x", status: "created" }],
      },
    ];

    expect(findSourceCsvForSlug("peca-x", reports)).toBe("/data/output/planilha-nova.csv");
  });

  it("retorna null quando nenhum report criou o slug", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-A.csv",
        started_at: "2026-07-20T21-38-47.000Z",
        items: [{ slug: "outra-ficha", status: "created" }],
      },
    ];

    expect(findSourceCsvForSlug("lilo-e-stitch", reports)).toBeNull();
  });

  it("ignora items com status diferente de created (ex: skipped, error)", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-A.csv",
        started_at: "2026-07-20T21-38-47.000Z",
        items: [{ slug: "ficha-erro", status: "error" }],
      },
    ];

    expect(findSourceCsvForSlug("ficha-erro", reports)).toBeNull();
  });
});

describe("findEnderecoNoCsv", () => {
  it("acha o endereco da linha com o slug", () => {
    const rows = [
      { slug: "outra", endereco: "Rua X, 1" },
      { slug: "lilo-e-stitch", endereco: "Rua Marquês de São Vicente, 52 — Gávea" },
    ];
    expect(findEnderecoNoCsv("lilo-e-stitch", rows)).toBe(
      "Rua Marquês de São Vicente, 52 — Gávea",
    );
  });

  it("retorna null quando o slug não está no CSV", () => {
    const rows = [{ slug: "outra", endereco: "Rua X, 1" }];
    expect(findEnderecoNoCsv("lilo-e-stitch", rows)).toBeNull();
  });

  it("retorna null quando a linha existe mas endereco está vazio/ausente — não inventa dado", () => {
    const rows = [{ slug: "lilo-e-stitch", endereco: "" }, { slug: "outra-sem-campo" }];
    expect(findEnderecoNoCsv("lilo-e-stitch", rows)).toBeNull();
    expect(findEnderecoNoCsv("outra-sem-campo", rows)).toBeNull();
  });

  it("faz trim do endereco antes de retornar", () => {
    const rows = [{ slug: "peca-x", endereco: "  Rua Y, 2 — Centro  " }];
    expect(findEnderecoNoCsv("peca-x", rows)).toBe("Rua Y, 2 — Centro");
  });
});

describe("csvTimestampFromFilename", () => {
  it("converte o timestamp do nome do arquivo de volta pra ISO 8601", () => {
    expect(csvTimestampFromFilename("planilha-enriquecida-2026-07-20T21-38-47-339Z.csv")).toBe(
      "2026-07-20T21:38:47.339Z",
    );
  });

  it("retorna null para nomes fora do padrão (ex: FILTRADA)", () => {
    expect(csvTimestampFromFilename("planilha-enriquecida-FILTRADA.csv")).toBeNull();
  });

  it("retorna null para nomes que não são CSVs enriquecidos", () => {
    expect(csvTimestampFromFilename("import-report-2026-07-20T21-38-47-339Z.json")).toBeNull();
  });
});

describe("matchCandidateToEndereco", () => {
  it("resolve via import-report quando o CSV de origem tem endereco preenchido", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-enriquecida-2026-07-20T21-38-47-339Z.csv",
        started_at: "2026-07-20T21-38-47.000Z",
        items: [{ slug: "lilo-e-stitch", status: "created" }],
      },
    ];
    const csvs: CsvDisponivel[] = [
      {
        path: "/data/output/planilha-enriquecida-2026-07-20T21-38-47-339Z.csv",
        timestamp: "2026-07-20T21:38:47.339Z",
        rows: [{ slug: "lilo-e-stitch", endereco: "R. Marquês de São Vicente, 52 — Gávea" }],
      },
    ];

    const result = matchCandidateToEndereco(
      "lilo-e-stitch",
      "2026-07-20T21:41:00.000Z",
      reports,
      csvs,
    );

    expect(result).toEqual({
      endereco: "R. Marquês de São Vicente, 52 — Gávea",
      csvPath: "/data/output/planilha-enriquecida-2026-07-20T21-38-47-339Z.csv",
      metodo: "import-report",
    });
  });

  it("cai pra sem-fonte quando o report existe mas o CSV não tem endereco — não inventa dado", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-sem-endereco.csv",
        started_at: "2026-07-16T14-09-15.000Z",
        items: [{ slug: "ficha-vazia", status: "created" }],
      },
    ];
    const csvs: CsvDisponivel[] = [
      {
        path: "/data/output/planilha-sem-endereco.csv",
        timestamp: "2026-07-16T14:09:15.045Z",
        rows: [{ slug: "ficha-vazia", endereco: "" }],
      },
    ];

    const result = matchCandidateToEndereco("ficha-vazia", "2026-07-16T18:00:00.000Z", reports, csvs);

    expect(result.endereco).toBeNull();
    expect(result.metodo).toBe("sem-fonte");
  });

  it("fallback: quando não há report, varre CSVs disponíveis pelo slug (mais recente <= createdAt)", () => {
    const reports: ImportReportLike[] = []; // nenhum report cobre esse slug
    const csvs: CsvDisponivel[] = [
      {
        path: "/data/output/planilha-antiga.csv",
        timestamp: "2026-07-10T10:00:00.000Z",
        rows: [{ slug: "peca-y", endereco: "Endereco antigo" }],
      },
      {
        path: "/data/output/planilha-nova.csv",
        timestamp: "2026-07-19T10:00:00.000Z",
        rows: [{ slug: "peca-y", endereco: "Endereco novo" }],
      },
      {
        path: "/data/output/planilha-futura.csv",
        timestamp: "2026-07-25T10:00:00.000Z", // depois do createdAt — não deve ser usada
        rows: [{ slug: "peca-y", endereco: "Endereco futuro (nao deveria aparecer)" }],
      },
    ];

    const result = matchCandidateToEndereco("peca-y", "2026-07-20T00:00:00.000Z", reports, csvs);

    expect(result).toEqual({
      endereco: "Endereco novo",
      csvPath: "/data/output/planilha-nova.csv",
      metodo: "csv-scan",
    });
  });

  it("retorna sem-fonte quando nenhum report nem CSV cobre o slug", () => {
    const result = matchCandidateToEndereco("ficha-fantasma", "2026-07-20T00:00:00.000Z", [], []);

    expect(result).toEqual({ endereco: null, csvPath: null, metodo: "sem-fonte" });
  });
});
