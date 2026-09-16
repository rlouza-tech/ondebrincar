/**
 * AtracaoCardLink — clique no card dispara card_click (US-V11).
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Atracao } from "@/lib/sanity/types";

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

import { AtracaoCardLink } from "./AtracaoCardLink";

const atracao: Atracao = {
  slug: "peca-circo",
  titulo: "Peça do Circo",
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
};

let container: HTMLDivElement;

function render(sourceSection: "ver_todas" | "carrossel_zona-norte" = "ver_todas") {
  act(() => {
    createRoot(container).render(
      <AtracaoCardLink atracao={atracao} sourceSection={sourceSection} />,
    );
  });
}

function getCardLink() {
  return container.querySelector("a") as HTMLAnchorElement;
}

describe("AtracaoCardLink — card_click (US-V11)", () => {
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

  it("não dispara card_click só por exibir o card", () => {
    render();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it("dispara card_click com source_section=ver_todas no clique do Link", () => {
    render("ver_todas");
    act(() => {
      getCardLink().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith("card_click", {
      attraction_id: "peca-circo",
      attraction_name: "Peça do Circo",
      category: "teatro",
      source_section: "ver_todas",
    });
  });

  it("repassa source_section do carrossel de zona no clique", () => {
    render("carrossel_zona-norte");
    act(() => {
      getCardLink().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "card_click",
      expect.objectContaining({ source_section: "carrossel_zona-norte" }),
    );
  });

  it("não dispara card_click ao clicar em Salvar (stopPropagation)", () => {
    render();
    const salvar = container.querySelector("button[aria-pressed]") as HTMLButtonElement;
    act(() => {
      salvar.click();
    });

    expect(mockTrackEvent).toHaveBeenCalledWith("save_click", expect.anything());
    expect(mockTrackEvent).not.toHaveBeenCalledWith("card_click", expect.anything());
  });
});
