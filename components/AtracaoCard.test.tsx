/**
 * AtracaoCard — testes unitários
 * Usa react-dom/client + act (sem @testing-library/react).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AtracaoCard } from "./AtracaoCard";

const BASE_PROPS = {
  name: "Circo da Magia",
  ageRange: "3–10 anos",
  price: "R$ 80",
  imageUrl: "/placeholder.jpg",
  imageAlt: "Foto: Circo da Magia",
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function render(props: Partial<React.ComponentProps<typeof AtracaoCard>> = {}) {
  act(() => {
    root = createRoot(container);
    root.render(<AtracaoCard {...BASE_PROPS} {...props} />);
  });
}

describe("AtracaoCard", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
  });

  it("renderiza o nome da atração", () => {
    render();
    expect(container.querySelector("h3")?.textContent).toBe("Circo da Magia");
  });

  it("renderiza faixa etária e preço", () => {
    render();
    const texts = container.textContent ?? "";
    expect(texts).toContain("3–10 anos");
    expect(texts).toContain("R$ 80");
  });

  it("exibe proxima_data formatada quando fornecida", () => {
    render({ proximaData: "2026-06-07" });
    const texts = container.textContent ?? "";
    // Deve conter o dia e mês no formato pt-BR curto
    expect(texts).toContain("7");
    expect(texts).toMatch(/jun/i);
  });

  it("não exibe campo de data quando proxima_data é nulo", () => {
    render({ proximaData: null });
    // Apenas 2 parágrafos: ageRange e price (sem data)
    const paras = container.querySelectorAll("p");
    const textos = Array.from(paras).map((p) => p.textContent ?? "");
    expect(textos.some((t) => /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(t))).toBe(false);
  });

  it("não exibe campo de data quando proxima_data é undefined", () => {
    render();
    const paras = container.querySelectorAll("p");
    const textos = Array.from(paras).map((p) => p.textContent ?? "");
    expect(textos.some((t) => /jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez/i.test(t))).toBe(false);
  });

  it("exibe botão de favorito quando onFavoriteToggle é fornecido", () => {
    render({ onFavoriteToggle: () => {} });
    const btn = container.querySelector("button[aria-pressed]");
    expect(btn).not.toBeNull();
  });

  it("não exibe botão de favorito quando onFavoriteToggle é omitido", () => {
    render();
    const btn = container.querySelector("button[aria-pressed]");
    expect(btn).toBeNull();
  });

  // US-I5 — CategoriaBadge
  it("exibe badge com label correto para categoria 'teatro'", () => {
    render({ categoria: "teatro" });
    expect(container.textContent).toContain("Teatro");
  });

  it("exibe badge com label correto para categoria 'show'", () => {
    render({ categoria: "show" });
    expect(container.textContent).toContain("Show");
  });

  it("exibe badge com label 'Atividade' para categoria 'atividade-extra'", () => {
    render({ categoria: "atividade-extra" });
    expect(container.textContent).toContain("Atividade");
  });

  it("não exibe badge quando categoria é null", () => {
    render({ categoria: null });
    const spans = Array.from(container.querySelectorAll("span"));
    const badgeTexts = ["Teatro", "Show", "Atividade", "Museu", "Parque", "Pracinha", "Praia", "Evento"];
    expect(spans.some((s) => badgeTexts.includes(s.textContent ?? ""))).toBe(false);
  });

  it("não exibe badge quando categoria é undefined", () => {
    render();
    const spans = Array.from(container.querySelectorAll("span"));
    const badgeTexts = ["Teatro", "Show", "Atividade", "Museu", "Parque", "Pracinha", "Praia", "Evento"];
    expect(spans.some((s) => badgeTexts.includes(s.textContent ?? ""))).toBe(false);
  });

  it("não exibe badge para categoria desconhecida", () => {
    render({ categoria: "categoria-inexistente" });
    const spans = Array.from(container.querySelectorAll("span"));
    const badgeTexts = ["Teatro", "Show", "Atividade", "Museu", "Parque", "Pracinha", "Praia", "Evento"];
    expect(spans.some((s) => badgeTexts.includes(s.textContent ?? ""))).toBe(false);
  });
});
