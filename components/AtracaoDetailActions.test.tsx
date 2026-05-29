/**
 * AtracaoDetailActions — testes unitários (US-F1)
 * Garante que o botão Salvar está desabilitado e não dispara save_click.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AtracaoDetailActions } from "./AtracaoDetailActions";
import type { Atracao } from "@/lib/sanity/types";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  trackShareClick: vi.fn(),
}));

import { trackEvent } from "@/lib/analytics";

const mockAtracao: Atracao = {
  slug: "teatro-teste",
  titulo: "Teatro Teste",
  categoria: "teatro",
  bairro: "Tijuca",
  precoTipo: "pago",
  indoorOutdoor: "indoor",
  idadeMin: 4,
  idadeMax: 12,
} as unknown as Atracao;

let container: HTMLDivElement;

function renderActions() {
  act(() => {
    createRoot(container).render(<AtracaoDetailActions atracao={mockAtracao} />);
  });
}

function getSaveButton() {
  return container.querySelector(
    "button[aria-label*='Salvar']",
  ) as HTMLButtonElement | null;
}

describe("AtracaoDetailActions — botão Salvar (US-F1)", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      document.body.removeChild(container);
    });
    vi.clearAllMocks();
  });

  it("renderiza o botão Salvar", () => {
    renderActions();
    expect(getSaveButton()).not.toBeNull();
  });

  it("botão Salvar está desabilitado", () => {
    renderActions();
    expect(getSaveButton()!.disabled).toBe(true);
  });

  it("botão Salvar exibe o texto 'Salvar'", () => {
    renderActions();
    expect(getSaveButton()!.textContent).toContain("Salvar");
  });

  it("clique no botão desabilitado NÃO dispara save_click", () => {
    renderActions();
    act(() => {
      getSaveButton()!.click();
    });
    expect(trackEvent).not.toHaveBeenCalledWith(
      "save_click",
      expect.anything(),
    );
  });

  it("botão Salvar tem title 'Em breve'", () => {
    renderActions();
    expect(getSaveButton()!.title).toBe("Em breve");
  });
});
