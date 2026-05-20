import { describe, expect, it } from "vitest";
import {
  inputListaDiasSemHorario,
  isProximaDataNoPassado,
  programacaoSinalizaLacunaHorario,
} from "../programacao-helpers";

describe("programacao-helpers", () => {
  it("detecta dias pontuais sem horário no input", () => {
    expect(inputListaDiasSemHorario("Dias 23, 30, 31")).toBe(true);
    expect(inputListaDiasSemHorario("Somente dia 24")).toBe(true);
  });

  it("não marca como lacuna quando input já tem horário", () => {
    expect(inputListaDiasSemHorario("Sábados e domingos 16h")).toBe(false);
    expect(inputListaDiasSemHorario("Aberto 10h-18h")).toBe(false);
  });

  it("detecta transparência de horário no programacao_texto", () => {
    expect(
      programacaoSinalizaLacunaHorario(
        "Sessões nos dias 23 e 24. Consulte horário ao clicar em 'Ver ingresso'.",
      ),
    ).toBe(true);
    expect(programacaoSinalizaLacunaHorario("Sessões nos dias 23 e 24")).toBe(
      false,
    );
  });

  it("proxima_data no passado em relação à referência", () => {
    expect(isProximaDataNoPassado("2023-10-23", "2026-05-20")).toBe(true);
    expect(isProximaDataNoPassado("2026-05-23", "2026-05-20")).toBe(false);
  });
});
