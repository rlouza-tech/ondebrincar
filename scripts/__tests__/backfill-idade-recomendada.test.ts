/**
 * Testes para backfill-idade-recomendada — cobertura de US-S77 (backfill
 * retroativo da separação classificação oficial vs. idade recomendada em
 * fichas publicadas com o comportamento antigo da US-S20). Cobre só as
 * funções puras de matching CSV → doc e resolução, sem I/O real (sem
 * Sanity, sem filesystem) — mesmo padrão de backfill-endereco.test.ts.
 */

import { describe, expect, it } from "vitest";
import {
  findIdadeInfoNoCsv,
  matchCandidateToIdadeInfo,
  resolverBackfill,
  type CsvDisponivelIdade,
  type CsvIdadeRow,
} from "../backfill-idade-recomendada";
import type { ImportReportLike } from "../backfill-endereco";

describe("findIdadeInfoNoCsv", () => {
  it("acha a linha do slug", () => {
    const rows: CsvIdadeRow[] = [
      { slug: "outra", idade_min: 0, idade_max: 3, idade_inferida_por_contexto: false },
      { slug: "luluca-o-show", idade_min: 4, idade_max: 12, idade_inferida_por_contexto: true },
    ];
    expect(findIdadeInfoNoCsv("luluca-o-show", rows)).toEqual({
      slug: "luluca-o-show",
      idade_min: 4,
      idade_max: 12,
      idade_inferida_por_contexto: true,
    });
  });

  it("retorna null quando o slug não está no CSV", () => {
    const rows: CsvIdadeRow[] = [
      { slug: "outra", idade_min: 0, idade_max: 3, idade_inferida_por_contexto: false },
    ];
    expect(findIdadeInfoNoCsv("luluca-o-show", rows)).toBeNull();
  });
});

describe("matchCandidateToIdadeInfo", () => {
  it("resolve via import-report quando o CSV de origem tem a linha", () => {
    const reports: ImportReportLike[] = [
      {
        source_csv: "/data/output/planilha-enriquecida-2026-08-11T22-00-00-000Z.csv",
        started_at: "2026-08-11T22-00-00.000Z",
        items: [{ slug: "luluca-o-show", status: "created" }],
      },
    ];
    const csvs: CsvDisponivelIdade[] = [
      {
        path: "/data/output/planilha-enriquecida-2026-08-11T22-00-00-000Z.csv",
        timestamp: "2026-08-11T22:00:00.000Z",
        rows: [
          { slug: "luluca-o-show", idade_min: 4, idade_max: 12, idade_inferida_por_contexto: true },
        ],
      },
    ];

    const result = matchCandidateToIdadeInfo(
      "luluca-o-show",
      "2026-08-11T22:05:00.000Z",
      reports,
      csvs,
    );

    expect(result.metodo).toBe("import-report");
    expect(result.csvRow).toEqual({
      slug: "luluca-o-show",
      idade_min: 4,
      idade_max: 12,
      idade_inferida_por_contexto: true,
    });
  });

  it("fallback: quando não há report, varre CSVs disponíveis pelo slug (mais recente <= createdAt)", () => {
    const csvs: CsvDisponivelIdade[] = [
      {
        path: "/data/output/planilha-antiga.csv",
        timestamp: "2026-08-11T21:30:00.000Z",
        rows: [
          { slug: "peca-y", idade_min: 3, idade_max: 10, idade_inferida_por_contexto: false },
        ],
      },
      {
        path: "/data/output/planilha-futura.csv",
        timestamp: "2026-08-12T10:00:00.000Z", // depois do createdAt — não deve ser usada
        rows: [
          { slug: "peca-y", idade_min: 0, idade_max: 18, idade_inferida_por_contexto: false },
        ],
      },
    ];

    const result = matchCandidateToIdadeInfo("peca-y", "2026-08-12T00:00:00.000Z", [], csvs);

    expect(result.metodo).toBe("csv-scan");
    expect(result.csvPath).toBe("/data/output/planilha-antiga.csv");
    expect(result.csvRow?.idade_min).toBe(3);
  });

  it("retorna sem-fonte quando nenhum report nem CSV cobre o slug — não inventa dado", () => {
    const result = matchCandidateToIdadeInfo("ficha-fantasma", "2026-08-12T00:00:00.000Z", [], []);
    expect(result).toEqual({ csvRow: null, csvPath: null, metodo: "sem-fonte" });
  });
});

describe("resolverBackfill", () => {
  it("csvRow com idade_inferida_por_contexto=true → reverte oficial pra null, migra pra recomendada", () => {
    const result = resolverBackfill(
      { idade_min: 4, idade_max: 12 },
      { slug: "luluca-o-show", idade_min: 4, idade_max: 12, idade_inferida_por_contexto: true },
    );

    expect(result).toEqual({
      idade_min: null,
      idade_max: null,
      idade_recomendada_min: 4,
      idade_recomendada_max: 12,
      acao: "reverter_para_null",
    });
  });

  it("csvRow com idade_inferida_por_contexto=false → mantém oficial, copia pra recomendada", () => {
    const result = resolverBackfill(
      { idade_min: 3, idade_max: 10 },
      { slug: "colonia-kapim", idade_min: 3, idade_max: 10, idade_inferida_por_contexto: false },
    );

    expect(result).toEqual({
      idade_min: 3,
      idade_max: 10,
      idade_recomendada_min: 3,
      idade_recomendada_max: 10,
      acao: "copiar",
    });
  });

  it("respeita o valor ATUAL do Sanity (possível edição manual), não o valor histórico do CSV", () => {
    // CSV original tinha 3-10, mas o Rafa editou no Studio pra 4-8 depois.
    const result = resolverBackfill(
      { idade_min: 4, idade_max: 8 },
      { slug: "colonia-kapim", idade_min: 3, idade_max: 10, idade_inferida_por_contexto: false },
    );

    expect(result.idade_min).toBe(4);
    expect(result.idade_max).toBe(8);
    expect(result.idade_recomendada_min).toBe(4);
    expect(result.idade_recomendada_max).toBe(8);
  });

  it("csvRow null (sem fonte) → copia sem certeza, não mexe em idade_min/idade_max", () => {
    const result = resolverBackfill({ idade_min: 14, idade_max: null }, null);

    expect(result).toEqual({
      idade_min: 14,
      idade_max: null,
      idade_recomendada_min: 14,
      idade_recomendada_max: null,
      acao: "copiar_sem_certeza",
    });
  });
});
