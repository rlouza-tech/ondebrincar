/**
 * OutboundLink — testes unitários (US-I8.4, US-I5.4)
 * Verifica que outbound_click e buy_ticket_click são disparados corretamente,
 * e que o label CTA dinâmico é renderizado conforme tipo_programacao.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutboundLink } from "./OutboundLink";
import type { Atracao } from "@/lib/sanity/types";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  detectDestinationType: vi.fn(() => "sympla"),
}));

import { trackEvent, detectDestinationType } from "@/lib/analytics";

const mockAtracao: Atracao = {
  slug: "circo-teste",
  titulo: "Circo Teste",
  categoria: "circo",
  bairro: "Botafogo",
  precoTipo: "pago",
  indoorOutdoor: "outdoor",
  idadeMin: 3,
  idadeMax: 10,
  origem: "sympla",
  tipoProgramacao: "evento_pontual",
} as unknown as Atracao;

const mockAtracaoPermanente: Atracao = {
  slug: "parque-lage",
  titulo: "Parque Lage",
  categoria: "parque",
  bairro: "Jardim Botânico",
  precoTipo: "gratuito",
  indoorOutdoor: "outdoor",
  idadeMin: 0,
  idadeMax: 18,
  origem: undefined,
  tipoProgramacao: "permanente",
} as unknown as Atracao;

const mockAtracaoPermanenteSemLink: Atracao = {
  ...mockAtracaoPermanente,
  slug: "parque-sem-link",
  titulo: "Parque Sem Link",
  linkExterno: "",
} as unknown as Atracao;

const mockHref = "https://sympla.com.br/evento/circo-teste";

let container: HTMLDivElement;

function renderLink(isBuyTicket?: boolean) {
  act(() => {
    createRoot(container).render(
      <OutboundLink
        atracao={mockAtracao}
        href={mockHref}
        ctaLabel="Ver ingresso"
        isBuyTicket={isBuyTicket}
      >
        Ver ingresso
      </OutboundLink>,
    );
  });
}

function getLink() {
  return container.querySelector("a") as HTMLAnchorElement | null;
}

describe("OutboundLink — US-I8.4", () => {
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

  it("renderiza o link com href correto", () => {
    renderLink();
    expect(getLink()?.href).toBe(mockHref);
  });

  it("abre em nova aba", () => {
    renderLink();
    expect(getLink()?.target).toBe("_blank");
  });

  describe("sem isBuyTicket (padrão)", () => {
    it("dispara outbound_click ao clicar", () => {
      renderLink();
      act(() => { getLink()!.click(); });

      expect(trackEvent).toHaveBeenCalledTimes(1);
      expect(trackEvent).toHaveBeenCalledWith("outbound_click", expect.objectContaining({
        attraction_id: mockAtracao.slug,
        attraction_name: mockAtracao.titulo,
        category: mockAtracao.categoria,
        destination_url: mockHref,
        cta_label: "Ver ingresso",
        partner: mockAtracao.origem,
      }));
    });

    it("NÃO dispara buy_ticket_click", () => {
      renderLink();
      act(() => { getLink()!.click(); });

      const buyTicketCalls = (trackEvent as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([name]) => name === "buy_ticket_click",
      );
      expect(buyTicketCalls).toHaveLength(0);
    });
  });

  describe("com isBuyTicket=true", () => {
    it("dispara outbound_click ao clicar", () => {
      renderLink(true);
      act(() => { getLink()!.click(); });

      expect(trackEvent).toHaveBeenCalledWith("outbound_click", expect.objectContaining({
        attraction_id: mockAtracao.slug,
        attraction_name: mockAtracao.titulo,
      }));
    });

    it("dispara buy_ticket_click ao clicar", () => {
      renderLink(true);
      act(() => { getLink()!.click(); });

      expect(trackEvent).toHaveBeenCalledWith("buy_ticket_click", expect.objectContaining({
        attraction_id: mockAtracao.slug,
        attraction_name: mockAtracao.titulo,
        category: mockAtracao.categoria,
        destination_url: mockHref,
        cta_label: "Ver ingresso",
        partner: mockAtracao.origem,
      }));
    });

    it("dispara os dois eventos em cada clique (total 2 chamadas)", () => {
      renderLink(true);
      act(() => { getLink()!.click(); });

      expect(trackEvent).toHaveBeenCalledTimes(2);
    });

    it("buy_ticket_click não tem campo view_source", () => {
      renderLink(true);
      act(() => { getLink()!.click(); });

      const buyCall = (trackEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === "buy_ticket_click",
      );
      expect(buyCall).toBeDefined();
      expect(buyCall![1]).not.toHaveProperty("view_source");
    });

    it("outbound_click tem campo view_source", () => {
      renderLink(true);
      act(() => { getLink()!.click(); });

      const outboundCall = (trackEvent as ReturnType<typeof vi.fn>).mock.calls.find(
        ([name]) => name === "outbound_click",
      );
      expect(outboundCall).toBeDefined();
      expect(outboundCall![1]).toHaveProperty("view_source", "detail_page");
    });
  });

  it("detectDestinationType é chamado com o href", () => {
    renderLink(true);
    act(() => { getLink()!.click(); });

    expect(detectDestinationType).toHaveBeenCalledWith(mockHref);
  });
});

// ---------------------------------------------------------------------------
// US-I5.4 — Label CTA dinâmico: 3 cenários do DoD
// ---------------------------------------------------------------------------

describe("US-I5.4 — label CTA dinâmico", () => {
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

  describe("cenário 1: evento com link de ingresso", () => {
    it("renderiza label 'Ver ingressos'", () => {
      act(() => {
        createRoot(container).render(
          <OutboundLink
            atracao={mockAtracao}
            href={mockHref}
            ctaLabel="Ver ingressos"
            isBuyTicket
          >
            Ver ingressos
          </OutboundLink>,
        );
      });
      expect(container.querySelector("a")?.textContent).toBe("Ver ingressos");
    });

    it("dispara buy_ticket_click ao clicar (isBuyTicket=true)", () => {
      act(() => {
        createRoot(container).render(
          <OutboundLink
            atracao={mockAtracao}
            href={mockHref}
            ctaLabel="Ver ingressos"
            isBuyTicket
          >
            Ver ingressos
          </OutboundLink>,
        );
      });
      act(() => { container.querySelector("a")!.click(); });

      expect(trackEvent).toHaveBeenCalledWith("buy_ticket_click", expect.objectContaining({
        cta_label: "Ver ingressos",
      }));
    });
  });

  describe("cenário 2: local permanente com site oficial", () => {
    it("renderiza label 'Visitar site'", () => {
      act(() => {
        createRoot(container).render(
          <OutboundLink
            atracao={mockAtracaoPermanente}
            href="https://parquelage.rj.gov.br"
            ctaLabel="Visitar site"
            isBuyTicket={false}
          >
            Visitar site
          </OutboundLink>,
        );
      });
      expect(container.querySelector("a")?.textContent).toBe("Visitar site");
    });

    it("NÃO dispara buy_ticket_click (isBuyTicket=false)", () => {
      act(() => {
        createRoot(container).render(
          <OutboundLink
            atracao={mockAtracaoPermanente}
            href="https://parquelage.rj.gov.br"
            ctaLabel="Visitar site"
            isBuyTicket={false}
          >
            Visitar site
          </OutboundLink>,
        );
      });
      act(() => { container.querySelector("a")!.click(); });

      const buyTicketCalls = (trackEvent as ReturnType<typeof vi.fn>).mock.calls.filter(
        ([name]) => name === "buy_ticket_click",
      );
      expect(buyTicketCalls).toHaveLength(0);
    });
  });

  describe("cenário 3: local permanente sem link — botão não exibido", () => {
    it("não renderiza nenhum link quando linkExterno está vazio", () => {
      // Simula a lógica do page.tsx: {atracao.linkExterno ? <OutboundLink> : null}
      act(() => {
        createRoot(container).render(
          mockAtracaoPermanenteSemLink.linkExterno ? (
            <OutboundLink
              atracao={mockAtracaoPermanenteSemLink}
              href={mockAtracaoPermanenteSemLink.linkExterno}
              ctaLabel="Visitar site"
            >
              Visitar site
            </OutboundLink>
          ) : null,
        );
      });
      expect(container.querySelector("a")).toBeNull();
    });
  });
});
