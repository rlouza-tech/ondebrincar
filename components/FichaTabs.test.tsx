/**
 * FichaTabs — testes unitários (US-I52)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FichaTabs } from "./FichaTabs";

let container: HTMLDivElement;

function render() {
  act(() => {
    createRoot(container).render(
      <FichaTabs
        detalhes={<p data-testid="detalhes-content">Conteúdo de Detalhes</p>}
        sugestoes={<p data-testid="sugestoes-content">Conteúdo de Sugestões</p>}
      />,
    );
  });
}

describe("FichaTabs — US-I52", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      document.body.removeChild(container);
    });
  });

  it("abre na aba Detalhes por padrão", () => {
    render();

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[0].textContent).toBe("Detalhes");
    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    expect(tabs[1].getAttribute("aria-selected")).toBe("false");

    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels[0].className).toContain("block");
    expect(panels[0].className).not.toContain("hidden");
    expect(panels[1].className).toContain("hidden");
  });

  it("renderiza o conteúdo de Detalhes por padrão", () => {
    render();
    expect(container.querySelector('[data-testid="detalhes-content"]')).not.toBeNull();
  });

  it("troca para a aba Sugestões ao clicar, e mostra o conteúdo de recomendação", () => {
    render();

    const tabs = container.querySelectorAll('[role="tab"]');
    act(() => {
      tabs[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");

    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels[1].className).toContain("block");
    expect(panels[1].className).not.toContain("hidden");
    expect(panels[0].className).toContain("hidden");

    expect(container.querySelector('[data-testid="sugestoes-content"]')).not.toBeNull();
  });

  it("volta pra aba Detalhes ao clicar nela de novo", () => {
    render();

    const tabs = container.querySelectorAll('[role="tab"]');
    act(() => {
      tabs[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    act(() => {
      tabs[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(tabs[0].getAttribute("aria-selected")).toBe("true");
    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels[0].className).toContain("block");
  });
});
