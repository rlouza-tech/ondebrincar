/**
 * BottomNav — testes unitários (US-I42)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

import { BottomNav } from "./BottomNav";

let container: HTMLDivElement;

function render() {
  act(() => {
    createRoot(container).render(<BottomNav />);
  });
}

function setRoute(pathname: string, search = "") {
  mockUsePathname.mockReturnValue(pathname);
  mockUseSearchParams.mockReturnValue(new URLSearchParams(search));
}

function getLinks() {
  return Array.from(container.querySelectorAll("a"));
}

describe("BottomNav — US-I42", () => {
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

  it("renderiza os 4 atalhos fixos, na ordem esperada", () => {
    setRoute("/");
    render();
    const labels = getLinks().map((link) => link.textContent);
    expect(labels).toEqual([
      "Início",
      "Categorias",
      "Esse fim de semana",
      "Grátis",
    ]);
  });

  it("'Início' navega para /", () => {
    setRoute("/atracao/peca-circo");
    render();
    expect(getLinks()[0].getAttribute("href")).toBe("/");
  });

  it("'Esse fim de semana' aplica ?data=fim-de-semana", () => {
    setRoute("/");
    render();
    expect(getLinks()[2].getAttribute("href")).toBe("/?data=fim-de-semana");
  });

  it("'Grátis' aplica ?preco=gratuito", () => {
    setRoute("/");
    render();
    expect(getLinks()[3].getAttribute("href")).toBe("/?preco=gratuito");
  });

  it("'Categorias' aponta para o gatilho que reabre o seletor existente do HomeFilters", () => {
    setRoute("/");
    render();
    expect(getLinks()[1].getAttribute("href")).toBe("/?abrirCategoria=1");
  });

  it("preserva outros filtros já ativos ao aplicar um atalho na home", () => {
    setRoute("/", "bairro=Tijuca");
    render();
    expect(getLinks()[3].getAttribute("href")).toBe(
      "/?bairro=Tijuca&preco=gratuito",
    );
  });

  it("não carrega query params de outra página ao montar o link a partir da ficha", () => {
    setRoute("/atracao/peca-circo", "ref=bairro%3DTijuca");
    render();
    expect(getLinks()[3].getAttribute("href")).toBe("/?preco=gratuito");
  });

  it("destaca 'Início' quando nenhum atalho está ativo", () => {
    setRoute("/");
    render();
    const links = getLinks();
    expect(links[0].getAttribute("aria-current")).toBe("page");
    expect(links[1].getAttribute("aria-current")).toBeNull();
    expect(links[2].getAttribute("aria-current")).toBeNull();
    expect(links[3].getAttribute("aria-current")).toBeNull();
  });

  it("destaca 'Esse fim de semana' quando data=fim-de-semana está ativo", () => {
    setRoute("/", "data=fim-de-semana");
    render();
    const links = getLinks();
    expect(links[2].getAttribute("aria-current")).toBe("page");
    expect(links[0].getAttribute("aria-current")).toBeNull();
  });

  it("destaca 'Grátis' quando preco=gratuito está ativo", () => {
    setRoute("/", "preco=gratuito");
    render();
    expect(getLinks()[3].getAttribute("aria-current")).toBe("page");
  });

  it("destaca 'Categorias' quando categoria está ativo", () => {
    setRoute("/", "categoria=teatro");
    render();
    expect(getLinks()[1].getAttribute("aria-current")).toBe("page");
  });

  it("nenhum item fica ativo fora da home", () => {
    setRoute("/sobre");
    render();
    for (const link of getLinks()) {
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });
});
