/**
 * SearchButton — testes unitários
 * Usa react-dom/client + act (sem @testing-library/react) pois a lib não está instalada.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchButton } from "./SearchButton";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { trackEvent } from "@/lib/analytics";

let container: HTMLDivElement;

function renderSearchButton() {
  act(() => {
    createRoot(container).render(<SearchButton />);
  });
}

function getButton() {
  return container.querySelector("button[aria-label='Buscar']") as HTMLButtonElement;
}

function getToast() {
  return container.querySelector("[role='status']");
}

describe("SearchButton", () => {
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

  it("renderiza o botão de busca", () => {
    renderSearchButton();
    expect(getButton()).not.toBeNull();
  });

  it("não exibe toast inicialmente", () => {
    renderSearchButton();
    expect(getToast()).toBeNull();
  });

  it("exibe toast ao clicar no botão", () => {
    renderSearchButton();
    act(() => {
      getButton().click();
    });
    const toast = getToast();
    expect(toast).not.toBeNull();
    expect(toast!.textContent).toContain("Busca chegando em breve");
  });

  it("toast desaparece após 2.5s", () => {
    renderSearchButton();
    act(() => {
      getButton().click();
    });
    expect(getToast()).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(getToast()).toBeNull();
  });

  it("dispara evento search_attempted ao clicar", () => {
    renderSearchButton();
    act(() => {
      getButton().click();
    });
    expect(trackEvent).toHaveBeenCalledWith("search_attempted");
    expect(vi.mocked(trackEvent)).toHaveBeenCalledTimes(1);
  });

  it("clique repetido reinicia o timer sem duplicar toasts", () => {
    renderSearchButton();
    const btn = getButton();

    act(() => { btn.click(); });
    act(() => { vi.advanceTimersByTime(1000); });
    act(() => { btn.click(); }); // segundo clique antes de sumir

    // Apenas um toast
    expect(container.querySelectorAll("[role='status']")).toHaveLength(1);

    // Timer reiniciado: 2.5s a partir do segundo clique
    act(() => { vi.advanceTimersByTime(2500); });
    expect(getToast()).toBeNull();
  });
});
