/**
 * HomeFilters — testes unitários do gatilho de categoria vindo do
 * menu inferior mobile (US-I42): ?abrirCategoria=1 deve abrir o dropdown
 * de categoria já existente, sem duplicar a lógica de seleção.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}));

import { HomeFilters } from "./HomeFilters";

let container: HTMLDivElement;
let root: Root;

function render(search = "") {
  mockUseSearchParams.mockReturnValue(new URLSearchParams(search));
  act(() => {
    root = createRoot(container);
    root.render(<HomeFilters bairros={[]} atracoes={[]} />);
  });
}

function getListbox() {
  return document.body.querySelector("[role='listbox']");
}

describe("HomeFilters — gatilho abrirCategoria (US-I42)", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
    vi.clearAllMocks();
  });

  it("abre o dropdown de categoria quando ?abrirCategoria=1 está presente", () => {
    render("abrirCategoria=1");
    const listbox = getListbox();
    expect(listbox).not.toBeNull();
    expect(listbox?.textContent).toContain("Teatro");
  });

  it("remove abrirCategoria da URL depois de abrir o dropdown", () => {
    render("abrirCategoria=1");
    expect(mockReplace).toHaveBeenCalledWith("/", { scroll: false });
  });

  it("preserva outros filtros já ativos ao remover abrirCategoria da URL", () => {
    render("abrirCategoria=1&bairro=Tijuca");
    expect(mockReplace).toHaveBeenCalledWith("/?bairro=Tijuca", {
      scroll: false,
    });
  });

  it("não abre o dropdown nem mexe na URL quando abrirCategoria não está presente", () => {
    render("");
    expect(getListbox()).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
