/**
 * AbstainReasonsInput — destaque visual no Studio (US-S75).
 * Usa react-dom/client + act (sem @testing-library/react).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AbstainReasonsInput } from "./AbstainReasonsInput";

let container: HTMLDivElement;

describe("AbstainReasonsInput (US-S75)", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("ficha com motivo sensível → banner vermelho de conteúdo sensível, distinto do de qualidade geral", () => {
    act(() => {
      createRoot(container).render(
        <AbstainReasonsInput
          value={[
            { _key: "a", code: "mencao_persona_interna", category: "conteudo_sensivel" },
            { _key: "b", code: "bairro_vazio", category: "qualidade_geral" },
          ]}
          renderDefault={() => null}
        />,
      );
    });

    expect(container.textContent).toMatch(/Conteúdo sensível — não aprove/);
    expect(container.textContent).toContain("mencao_persona_interna");
    expect(container.textContent).toContain("bairro_vazio");
    expect(container.textContent).not.toMatch(/Motivos de qualidade geral — conferir/);
  });

  it("ficha só com motivo de qualidade geral → banner âmbar, sem alerta de conteúdo sensível", () => {
    act(() => {
      createRoot(container).render(
        <AbstainReasonsInput
          value={[{ _key: "b", code: "bairro_vazio", category: "qualidade_geral" }]}
          renderDefault={() => null}
        />,
      );
    });

    expect(container.textContent).toMatch(/Motivos de qualidade geral — conferir/);
    expect(container.textContent).toContain("bairro_vazio");
    expect(container.textContent).not.toMatch(/não aprove sem corrigir/);
    expect(container.textContent).not.toContain("mencao_persona_interna");
  });
});
