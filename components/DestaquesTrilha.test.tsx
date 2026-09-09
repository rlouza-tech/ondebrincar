/**
 * DestaquesTrilha — testes unitários (US-I43)
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "@/lib/sanity/types";

vi.mock("@/hooks/useAttractionView", () => ({
  useAttractionView: () => ({ current: null }),
}));

import { DestaquesTrilha } from "./DestaquesTrilha";

function criarDestaque(overrides: Partial<Atracao>): Atracao {
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

const tresDestaques: Atracao[] = [
  criarDestaque({ slug: "peca-circo", titulo: "Peça do Circo", categoria: "teatro", bairro: "Tijuca" }),
  criarDestaque({
    slug: "bosque-barra",
    titulo: "Bosque da Barra",
    categoria: "parque",
    precoTipo: "gratuito",
    precoLabel: undefined,
  }),
  criarDestaque({ slug: "aquario", titulo: "AquaRio", categoria: "museu", bairro: "São Cristóvão" }),
];

const quatroDestaques: Atracao[] = [
  ...tresDestaques,
  criarDestaque({ slug: "ccbb", titulo: "CCBB", categoria: "museu", bairro: "Centro" }),
];

let container: HTMLDivElement;

function render(destaques: Atracao[]) {
  act(() => {
    createRoot(container).render(<DestaquesTrilha destaques={destaques} />);
  });
}

describe("DestaquesTrilha — US-I43", () => {
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

  it("não renderiza nada quando não há destaques (doc ausente no Sanity)", () => {
    render([]);
    expect(container.querySelector("section")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renderiza o título 'Destaques da semana'", () => {
    render(tresDestaques);
    expect(container.querySelector("h2")?.textContent).toContain("Destaques da semana");
  });

  it("renderiza um card por destaque com 3 itens (mínimo, AC2)", () => {
    render(tresDestaques);
    expect(container.querySelectorAll("a").length).toBe(3);
  });

  it("renderiza um card por destaque com 4 itens (máximo, AC2)", () => {
    render(quatroDestaques);
    expect(container.querySelectorAll("a").length).toBe(4);
  });

  it("respeita a ordem recebida (curadoria do Sanity, sem reordenar)", () => {
    render(quatroDestaques);
    const links = container.querySelectorAll("a");
    expect(links[0].getAttribute("href")).toBe("/atracao/peca-circo");
    expect(links[1].getAttribute("href")).toBe("/atracao/bosque-barra");
    expect(links[2].getAttribute("href")).toBe("/atracao/aquario");
    expect(links[3].getAttribute("href")).toBe("/atracao/ccbb");
  });

  it("renderiza nome, categoria e bairro/preço de cada card", () => {
    render(tresDestaques);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Peça do Circo");
    expect(texto).toContain("Teatro · Tijuca");
    expect(texto).toContain("Bosque da Barra");
    expect(texto).toContain("Parque · Grátis");
  });
});
