/**
 * ZonaCarrossel — testes unitários (US-I47)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "@/lib/sanity/types";
import type { CarrosselZona } from "@/lib/zonas";

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

import { ZonaCarrossel } from "./ZonaCarrossel";

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

const carrosselZonaSul: CarrosselZona = {
  id: "zona-sul",
  atracoes: [
    criarAtracao({ slug: "peca-circo", titulo: "Peça do Circo", bairro: "Copacabana" }),
    criarAtracao({ slug: "bosque-barra", titulo: "Bosque da Barra", bairro: "Ipanema" }),
  ],
  total: 45,
  bairros: ["Botafogo", "Copacabana", "Ipanema"],
};

let container: HTMLDivElement;

function render(carrossel: CarrosselZona) {
  act(() => {
    createRoot(container).render(<ZonaCarrossel carrossel={carrossel} />);
  });
}

describe("ZonaCarrossel — US-I47", () => {
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

  it("renderiza o título da zona", () => {
    render(carrosselZonaSul);
    expect(container.querySelector("h2")?.textContent).toContain("Zona Sul");
  });

  it("renderiza um card por atração do carrossel (já capado a 8 pelo chamador)", () => {
    render(carrosselZonaSul);
    const links = container.querySelectorAll("a");
    // 2 cards de atração + 1 card "Ver todas"
    expect(links.length).toBe(3);
  });

  it('renderiza o card "Ver todas" com o total real da zona (AC do cap de 8)', () => {
    render(carrosselZonaSul);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Ver todas — Zona Sul");
    expect(texto).toContain("(45 no total)");
  });

  it('o link "Ver todas" aponta pro filtro de bairro multi-select da zona (AC5)', () => {
    render(carrosselZonaSul);
    const links = Array.from(container.querySelectorAll("a"));
    const verTodas = links.find((link) => link.textContent?.includes("Ver todas"));
    expect(verTodas?.getAttribute("href")).toBe(
      "/?bairro=Botafogo&bairro=Copacabana&bairro=Ipanema&substituir=1",
    );
  });

  it("aparece mesmo quando a zona já mostra tudo (menos que o cap, ex.: Zona Oeste)", () => {
    const carrosselZonaOeste: CarrosselZona = {
      id: "zona-oeste",
      atracoes: [criarAtracao({ slug: "unica", titulo: "Praça Única", bairro: "Bangu" })],
      total: 1,
      bairros: ["Bangu", "Pedra de Guaratiba", "Realengo"],
    };

    render(carrosselZonaOeste);

    const texto = container.textContent ?? "";
    expect(texto).toContain("Ver todas — Zona Oeste");
    expect(texto).toContain("(1 no total)");
  });

  it("dispara card_click com source_section=carrossel_zona-sul no clique do card (US-V11)", () => {
    render(carrosselZonaSul);
    expect(mockTrackEvent).not.toHaveBeenCalled();

    const cardLink = Array.from(container.querySelectorAll("a")).find((link) =>
      link.getAttribute("href")?.startsWith("/atracao/"),
    ) as HTMLAnchorElement;
    act(() => {
      cardLink.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith("card_click", {
      attraction_id: "peca-circo",
      attraction_name: "Peça do Circo",
      category: "teatro",
      source_section: "carrossel_zona-sul",
    });
  });
});
