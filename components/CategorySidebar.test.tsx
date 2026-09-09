/**
 * CategorySidebar — testes unitários (US-I44)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

import { CategorySidebar } from "./CategorySidebar";

let container: HTMLDivElement;

function render() {
  act(() => {
    createRoot(container).render(<CategorySidebar />);
  });
}

function setSearch(search = "") {
  mockUseSearchParams.mockReturnValue(new URLSearchParams(search));
}

function getLinks() {
  return Array.from(container.querySelectorAll("a"));
}

describe("CategorySidebar — US-I44", () => {
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

  it("renderiza os 3 atalhos de Explorar seguidos das 11 categorias, em ordem alfabética", () => {
    setSearch();
    render();
    const labels = getLinks().map((link) => link.textContent);
    expect(labels).toEqual([
      "Início",
      "Esse fim de semana",
      "Grátis",
      "Atividade extra",
      "Colônia de Férias",
      "Evento",
      "Festa Junina",
      "Futebol",
      "Museu",
      "Parque",
      "Pracinha",
      "Praia",
      "Restaurante",
      "Teatro",
    ]);
  });

  it("clicar numa categoria aplica ?categoria= reaproveitando o mesmo parâmetro do filtro Tipo", () => {
    setSearch();
    render();
    const parqueLink = getLinks().find((link) => link.textContent === "Parque");
    expect(parqueLink?.getAttribute("href")).toBe("/?categoria=parque");
  });

  it("destaca a categoria ativa e faz o link dela desmarcar o filtro (toggle)", () => {
    setSearch("categoria=parque");
    render();
    const parqueLink = getLinks().find((link) => link.textContent === "Parque");
    expect(parqueLink?.getAttribute("aria-current")).toBe("page");
    expect(parqueLink?.getAttribute("href")).toBe("/");
  });

  it("categoria ativa não acende nenhum item de Explorar — mesma fonte de verdade, sem estados divergentes", () => {
    setSearch("categoria=parque");
    render();
    const links = getLinks();
    expect(links[0].getAttribute("aria-current")).toBeNull();
    expect(links[1].getAttribute("aria-current")).toBeNull();
    expect(links[2].getAttribute("aria-current")).toBeNull();
  });

  it("preserva outros filtros já ativos ao selecionar uma categoria", () => {
    setSearch("bairro=Tijuca");
    render();
    const teatroLink = getLinks().find((link) => link.textContent === "Teatro");
    expect(teatroLink?.getAttribute("href")).toBe(
      "/?bairro=Tijuca&categoria=teatro",
    );
  });

  it("destaca 'Início' quando nenhum atalho está ativo", () => {
    setSearch();
    render();
    expect(getLinks()[0].getAttribute("aria-current")).toBe("page");
  });

  it("destaca 'Esse fim de semana' quando data=fim-de-semana está ativo", () => {
    setSearch("data=fim-de-semana");
    render();
    expect(getLinks()[1].getAttribute("aria-current")).toBe("page");
  });

  it("destaca 'Grátis' quando preco=gratuito está ativo", () => {
    setSearch("preco=gratuito");
    render();
    expect(getLinks()[2].getAttribute("aria-current")).toBe("page");
  });
});
