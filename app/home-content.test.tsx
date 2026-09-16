/**
 * HomeContent — testes unitários do card teaser "Ver tudo" (US-I56)
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "@/lib/sanity/types";

const mockReplace = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock("@/hooks/useAttractionView", () => ({
  useAttractionView: () => ({ current: null }),
}));

const { mockTrackEvent } = vi.hoisted(() => ({ mockTrackEvent: vi.fn() }));
vi.mock("@/lib/analytics", async () => {
  const actual = await vi.importActual<typeof import("@/lib/analytics")>(
    "@/lib/analytics",
  );
  return { ...actual, trackEvent: mockTrackEvent };
});

import { HomeContent } from "./home-content";
import type { CarrosselZona } from "@/lib/zonas";

function criarAtracao(overrides: Partial<Atracao>): Atracao {
  return {
    slug: "atracao-generica",
    titulo: "Atração genérica",
    categoria: "teatro",
    idadeMin: 4,
    idadeMax: 10,
    bairro: "Tijuca",
    precoTipo: "pago",
    precoLabel: "R$ 40",
    indoorOutdoor: "indoor",
    tipoProgramacao: "evento_recorrente",
    programacaoTexto: "Sábados e domingos",
    descricaoCurta: "Descrição curta.",
    imagemUrl: "/placeholder-atracao.svg",
    linkExterno: "https://exemplo.com",
    ...overrides,
  };
}

const atracoes: Atracao[] = [
  criarAtracao({ slug: "peca-circo", titulo: "Peça do Circo", bairro: "Tijuca" }),
  criarAtracao({ slug: "bosque-barra", titulo: "Bosque da Barra", bairro: "Barra da Tijuca" }),
];

const carrosseisZona: CarrosselZona[] = [
  {
    id: "zona-sul",
    atracoes: [atracoes[0]],
    total: 1,
    bairros: ["Tijuca"],
  },
];

let container: HTMLDivElement;
let root: Root;

function render(search = "") {
  mockUseSearchParams.mockReturnValue(new URLSearchParams(search));
  act(() => {
    root.render(
      <HomeContent
        atracoes={atracoes}
        bairros={["Tijuca", "Barra da Tijuca"]}
        destaques={[atracoes[0]]}
        carrosseisZona={carrosseisZona}
      />,
    );
  });
}

function getTeaserButton() {
  return Array.from(container.querySelectorAll("button")).find((btn) =>
    btn.textContent?.includes("toque pra ver todas"),
  );
}

function getFiltrosSection() {
  return container.querySelector("section[aria-label='Filtros de busca']");
}

function getGridItems() {
  return container.querySelectorAll("ul li");
}

function temEditorial() {
  return (
    container.querySelector('section[aria-label="Destaques da semana"]') !==
      null ||
    container.querySelector('section[aria-label="Zona Sul"]') !== null
  );
}

describe("HomeContent — card teaser Ver tudo (US-I56)", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
    vi.clearAllMocks();
  });

  it("estado colapsado: mostra o card teaser e não mostra filtro nem grid", () => {
    render("");
    expect(getTeaserButton()).not.toBeUndefined();
    expect(getFiltrosSection()).toBeNull();
    expect(getGridItems().length).toBe(0);
  });

  it("número do card teaser reflete a contagem real de atrações (AC2)", () => {
    render("");
    const teaser = getTeaserButton();
    expect(teaser?.textContent).toContain(String(atracoes.length));
  });

  it("clique no teaser expande: grid aparece, teaser vira cabeçalho, filtro aparece", () => {
    render("");
    act(() => {
      getTeaserButton()!.click();
    });

    expect(getTeaserButton()).toBeUndefined();
    expect(getFiltrosSection()).not.toBeNull();
    expect(getGridItems().length).toBe(atracoes.length);
    expect(container.textContent).toContain(
      `${atracoes.length} atrações encontradas`,
    );
  });

  it("clique no teaser dispara scroll suave até a seção revelada", () => {
    render("");
    act(() => {
      getTeaserButton()!.click();
    });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: "smooth" }),
    );
  });

  it("clique no teaser dispara evento de analytics ver_tudo_click", () => {
    render("");
    act(() => {
      getTeaserButton()!.click();
    });
    expect(mockTrackEvent).toHaveBeenCalledWith("ver_tudo_click", {
      results_count: atracoes.length,
    });
  });

  it("acesso direto via URL com filtro ativo: entra expandido, sem o card teaser", () => {
    render("bairro=Tijuca");

    expect(getTeaserButton()).toBeUndefined();
    expect(getFiltrosSection()).not.toBeNull();
    expect(getGridItems().length).toBe(1);
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("HomeContent — substituir o miolo (US-I57)", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    Element.prototype.scrollIntoView = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
      document.body.removeChild(container);
    });
    vi.clearAllMocks();
  });

  it("clique com substituir=1 (menu lateral / Ver todas) esconde Destaques e carrosséis", () => {
    render("categoria=teatro&substituir=1");

    expect(temEditorial()).toBe(false);
    expect(getTeaserButton()).toBeUndefined();
    expect(getFiltrosSection()).not.toBeNull();
    expect(getGridItems().length).toBe(atracoes.length);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "auto",
    });
  });

  it("link direto/compartilhado com o mesmo filtro expande embaixo, sem esconder o editorial", () => {
    render("categoria=teatro");

    expect(temEditorial()).toBe(true);
    expect(getFiltrosSection()).not.toBeNull();
    expect(getGridItems().length).toBe(atracoes.length);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("trocar de filtro depois de substituir não reexibe os carrosséis", () => {
    render("categoria=teatro&substituir=1");
    expect(temEditorial()).toBe(false);

    render("bairro=Tijuca&substituir=1");

    expect(temEditorial()).toBe(false);
    expect(getGridItems().length).toBe(1);
    expect(container.textContent).toContain("Peça do Circo");
  });

  it("Início / sem filtro ativo volta a mostrar Destaques e carrosséis", () => {
    render("categoria=teatro&substituir=1");
    expect(temEditorial()).toBe(false);

    render("");

    expect(temEditorial()).toBe(true);
    expect(getTeaserButton()).not.toBeUndefined();
    expect(getFiltrosSection()).toBeNull();
  });
});
