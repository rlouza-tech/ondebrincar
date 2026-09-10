/**
 * ZonaCarrosselMobile — testes unitários (US-I50)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "@/lib/sanity/types";
import type { CarrosselZona } from "@/lib/zonas";

vi.mock("@/hooks/useAttractionView", () => ({
  useAttractionView: () => ({ current: null }),
}));

import { ZonaCarrosselMobile } from "./ZonaCarrosselMobile";

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

const oitoAtracoesZonaSul: CarrosselZona = {
  id: "zona-sul",
  atracoes: [
    criarAtracao({ slug: "a1", titulo: "Atração 1", bairro: "Copacabana" }),
    criarAtracao({ slug: "a2", titulo: "Atração 2", bairro: "Ipanema" }),
    criarAtracao({ slug: "a3", titulo: "Atração 3", bairro: "Leblon" }),
    criarAtracao({ slug: "a4", titulo: "Atração 4", bairro: "Botafogo" }),
    criarAtracao({ slug: "a5", titulo: "Atração 5", bairro: "Flamengo" }),
    criarAtracao({ slug: "a6", titulo: "Atração 6", bairro: "Urca" }),
    criarAtracao({ slug: "a7", titulo: "Atração 7", bairro: "Lagoa" }),
    criarAtracao({ slug: "a8", titulo: "Atração 8", bairro: "Gávea" }),
  ],
  total: 45,
  bairros: ["Botafogo", "Copacabana", "Ipanema"],
};

let container: HTMLDivElement;

function render(carrossel: CarrosselZona) {
  act(() => {
    createRoot(container).render(<ZonaCarrosselMobile carrossel={carrossel} />);
  });
}

describe("ZonaCarrosselMobile — US-I50", () => {
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

  it("renderiza o título da zona e o total real", () => {
    render(oitoAtracoesZonaSul);
    expect(container.querySelector("h2")?.textContent).toContain("Zona Sul");
    expect(container.textContent).toContain("45 atrações");
  });

  it('aplica o cap mobile de 4, mesmo recebendo os 8 já capados pelo desktop (AC "cap fechado em 4")', () => {
    render(oitoAtracoesZonaSul);
    const links = container.querySelectorAll("a");
    // 4 cards de atração + 1 card "Ver todas"
    expect(links.length).toBe(5);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Atração 1");
    expect(texto).toContain("Atração 4");
    expect(texto).not.toContain("Atração 5");
  });

  it('renderiza o card "Ver todas" com o total real da zona', () => {
    render(oitoAtracoesZonaSul);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Ver todas");
    expect(texto).toContain("(45 no total)");
  });

  it('o link "Ver todas" aponta pro filtro de bairro multi-select da zona (mesmo AC5 herdado de US-I47)', () => {
    render(oitoAtracoesZonaSul);
    const links = Array.from(container.querySelectorAll("a"));
    const verTodas = links.find((link) => link.textContent?.includes("Ver todas"));
    expect(verTodas?.getAttribute("href")).toBe(
      "/?bairro=Botafogo&bairro=Copacabana&bairro=Ipanema",
    );
  });

  it("aparece mesmo quando a zona tem menos que o cap mobile (ex.: Zona Oeste)", () => {
    const carrosselZonaOeste: CarrosselZona = {
      id: "zona-oeste",
      atracoes: [criarAtracao({ slug: "unica", titulo: "Praça Única", bairro: "Bangu" })],
      total: 1,
      bairros: ["Bangu", "Pedra de Guaratiba", "Realengo"],
    };

    render(carrosselZonaOeste);

    const links = container.querySelectorAll("a");
    expect(links.length).toBe(2); // 1 card + "Ver todas"
    expect(container.textContent).toContain("(1 no total)");
  });

  it("não renderiza setinhas de rolagem (swipe nativo, Discovery 19/08 Grupo 2)", () => {
    render(oitoAtracoesZonaSul);
    const botoes = container.querySelectorAll("button");
    expect(botoes.length).toBe(0);
  });
});
