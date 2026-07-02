/**
 * AtracaoDetailActions — testes unitários (US-F1, revisado)
 * Botão Salvar: clique → toast "Favoritos em breve" + evento save_click.
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

function getToast() {
  return container.querySelector("[role='status']");
}

describe("AtracaoDetailActions — botão Salvar (US-F1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      document.body.removeChild(container);
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("renderiza o botão Salvar", () => {
    renderActions();
    expect(getSaveButton()).not.toBeNull();
  });

  it("botão Salvar está habilitado", () => {
    renderActions();
    expect(getSaveButton()!.disabled).toBe(false);
  });

  it("não exibe toast inicialmente", () => {
    renderActions();
    expect(getToast()).toBeNull();
  });

  it("exibe toast ao clicar no botão", () => {
    renderActions();
    act(() => {
      getSaveButton()!.click();
    });
    const toast = getToast();
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toContain("Favoritos em breve");
  });

  it("toast desaparece após 2.5s", () => {
    renderActions();
    act(() => { getSaveButton()!.click(); });
    expect(getToast()).not.toBeNull();

    act(() => { vi.advanceTimersByTime(2500); });
    expect(getToast()).toBeNull();
  });

  it("dispara evento save_click ao clicar", () => {
    renderActions();
    act(() => { getSaveButton()!.click(); });
    expect(trackEvent).toHaveBeenCalledWith("save_click", {
      attraction_id: mockAtracao.slug,
      attraction_name: mockAtracao.titulo,
      category: mockAtracao.categoria,
      view_source: "detail_page",
    });
  });

  it("clique repetido reinicia o timer sem duplicar toasts", () => {
    renderActions();
    const btn = getSaveButton()!;

    act(() => { btn.click(); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { btn.click(); });

    expect(container.querySelectorAll("[role='status']")).toHaveLength(1);

    act(() => { vi.advanceTimersByTime(2500); });
    expect(getToast()).toBeNull();
  });
});
