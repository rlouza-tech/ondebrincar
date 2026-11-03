import { describe, expect, it } from "vitest";
import { rodadaPipeline, STATUS_RODADA } from "../rodadaPipeline";
import { schemas } from "../index";

type Campo = { name: string; type?: string; fields?: Campo[]; of?: Array<{ type: string }> };

describe("rodadaPipeline schema (US-S5)", () => {
  const campos = rodadaPipeline.fields as unknown as Campo[];
  const nomes = campos.map((f) => f.name);

  it("é documento só leitura e está registrado em schemas", () => {
    expect(rodadaPipeline.type).toBe("document");
    expect((rodadaPipeline as { readOnly?: boolean }).readOnly).toBe(true);
    expect(schemas).toContain(rodadaPipeline);
  });

  it("tem os campos do AC1", () => {
    expect(nomes).toEqual(["fonte", "modo", "inicio", "fim", "status", "totais", "needsHuman", "slugsParaRevisar"]);
    const totais = campos.find((f) => f.name === "totais");
    expect(totais?.fields?.map((f) => f.name)).toEqual(["recebido", "aprovados", "processadosComSucesso", "errosProcessamento"]);
    expect(campos.find((f) => f.name === "slugsParaRevisar")?.of?.[0]?.type).toBe("string");
  });

  it("não guarda texto-fonte nem decisões do Curador", () => {
    for (const proibido of ["fontes", "decisoesCurador", "cards", "decisoesNovidade"]) {
      expect(nomes).not.toContain(proibido);
    }
  });

  it("lista os 4 status, com os mesmos valores que o Agentes grava", () => {
    expect(STATUS_RODADA.map((s) => s.value)).toEqual(["ok", "intervencao_necessaria", "com_erros", "com_erro"]);
  });

  it("preview mostra fonte, status, data e contagem de needs_human", () => {
    const prepare = (rodadaPipeline as unknown as { preview: { prepare: (v: Record<string, unknown>) => { title: string; subtitle: string } } }).preview.prepare;
    const r = prepare({ fonte: "sympla", status: "intervencao_necessaria", inicio: "2026-11-03T12:00:00.000Z", needsHuman: 3 });
    expect(r.title).toBe("sympla · Intervenção necessária");
    expect(r.subtitle).toContain("3 para revisar");
    expect(r.subtitle).toContain("2026");
  });
});
