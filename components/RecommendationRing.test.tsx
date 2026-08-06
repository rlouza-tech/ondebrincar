/**
 * RecommendationRing — testes unitários (US-I33)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendationRing } from "./RecommendationRing";
import type { Recomendacao } from "@/lib/recomendacoes";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

import { trackEvent } from "@/lib/analytics";

const recomendacoes: Recomendacao[] = [
  {
    slug: "peca-circo",
    titulo: "Peça do Circo",
    categoria: "teatro",
    bairro: "Tijuca",
    proximaData: "2026-08-08",
    imagemUrl: "/foto-circo.jpg",
    eixo: "tema",
  },
  {
    slug: "show-parque",
    titulo: "Show no Parque",
    categoria: "show",
    bairro: "Copacabana",
    proximaData: "2026-08-09",
    imagemUrl: "/foto-show.jpg",
    eixo: "bairro",
  },
];

let container: HTMLDivElement;

function render(items: Recomendacao[]) {
  act(() => {
    createRoot(container).render(<RecommendationRing recomendacoes={items} />);
  });
}

describe("RecommendationRing — US-I33", () => {
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

  it("não renderiza nada quando não há recomendações", () => {
    render([]);
    expect(container.querySelector("section")).toBeNull();
  });

  it("renderiza o título 'Continue o programa'", () => {
    render(recomendacoes);
    expect(container.querySelector("h2")?.textContent).toBe("Continue o programa");
  });

  it("renderiza um card por recomendação", () => {
    render(recomendacoes);
    expect(container.querySelectorAll("a").length).toBe(2);
  });

  it("renderiza nome, bairro e data de cada card", () => {
    render(recomendacoes);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Peça do Circo");
    expect(texto).toContain("Tijuca");
    expect(texto).toContain("Show no Parque");
    expect(texto).toContain("Copacabana");
  });

  it("exibe badge 'Mesmo tema' para eixo tema", () => {
    render(recomendacoes);
    expect(container.textContent).toContain("Mesmo tema");
  });

  it("exibe badge 'Também em <bairro>' para eixo bairro", () => {
    render(recomendacoes);
    expect(container.textContent).toContain("Também em Copacabana");
  });

  it("dispara recommendation_click com posição e eixo ao clicar num card", () => {
    render(recomendacoes);
    const links = container.querySelectorAll("a");
    act(() => {
      links[1].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(trackEvent).toHaveBeenCalledWith(
      "recommendation_click",
      expect.objectContaining({
        attraction_id: "show-parque",
        attraction_name: "Show no Parque",
        category: "show",
        position: 1,
        axis: "bairro",
      }),
    );
  });

  it("liga cada card pra /atracao/<slug>", () => {
    render(recomendacoes);
    const links = container.querySelectorAll("a");
    expect(links[0].getAttribute("href")).toBe("/atracao/peca-circo");
    expect(links[1].getAttribute("href")).toBe("/atracao/show-parque");
  });
});
