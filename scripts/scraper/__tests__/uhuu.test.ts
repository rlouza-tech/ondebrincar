import { describe, expect, it, vi } from "vitest";
import {
  extractSinopseUhuu,
  parseEventDetail,
  parseListingPage,
  parseParentalRating,
  parsePrecoCentavos,
  scrapeUhuu,
} from "../uhuu";

/**
 * Fixtures reduzidas, fiéis à estrutura real confirmada via curl em
 * uhuu.com durante a investigação técnica desta story (US-S28) — ver
 * docs/discovery/DISCOVERY-2026-07-22-scraper-uhuu.md.
 */
function buildCardHtml(overrides: Partial<{
  href: string;
  itemName: string;
  localNome: string;
  localCidade: string;
  localUf: string;
  parentalRating: string;
  price: string;
  eventDate: string;
  eventHour: string;
}> = {}): string {
  const o = {
    href: "/evento/rj/rio-de-janeiro/turminha-do-teatro-uma-aventura-jurassica-15615",
    itemName: "Turminha do Teatro - Uma Aventura Jurássica",
    localNome: "Teatro Bangu Shopping",
    localCidade: "Rio de Janeiro",
    localUf: "RJ",
    parentalRating: "Livre",
    price: "40,00",
    eventDate: "25/07/2026",
    eventHour: "15:00",
    ...overrides,
  };

  return `
    <div class="item card-evento" id="portal-card-event-15615">
      <a class="link" id="portal-card-event-15615-link" href="${o.href}">
        <span class="evento-nome" title="${o.itemName}">${o.itemName.slice(0, 20)}...</span>
        <span class="local-nome">${o.localNome}</span>
      </a>
      <script>
        document.getElementById('portal-card-event-15615-link')
          .addEventListener('click', () => {
            gtag('event', 'select_item', {
              item_list_id: '15615',
              items: [{
                sku: '15615',
                item_name: '${o.itemName}',
                item_brand: 'Produtora X',
                parental_rating: '${o.parentalRating}',
                price: '${o.price}',
                event_date: '${o.eventDate}',
                event_hour: '${o.eventHour}',
                local_nome: '${o.localNome}',
                local_cidade: '${o.localCidade}',
                local_uf: '${o.localUf}',
              }],
            });
          });
      </script>
    </div>
  `;
}

function buildListingHtml(cards: string[]): string {
  return `<!DOCTYPE html><html><body><div class="conteudo limite-pg">${cards.join("\n")}</div></body></html>`;
}

const EVENT_DETAIL_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="event-page">
    <h1 class="event-title">Turminha do Teatro - Uma Aventura Jurássica</h1>
    <span class="event-category">Família / Infantil</span>
    <div class="tabs-content-item sobre active">
      <p><strong>Abertura da casa</strong>: 01h00 antes do início da sessão.</p>
      <p>"UMA AVENTURA JURÁSSICA" Beto e Maju são irmãos e vivem brincando em seu quintal.</p>
      <p>INFORMAÇÕES IMPORTANTES:</p>
      <p>CLASSIFICAÇÃO INDICATIVA: Livre</p>
      <p>DURAÇÃO APROXIMADA: 60 minutos</p>
      <p>CAPACIDADE DO TEATRO: 532 lugares</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Fixture com o link "Ver localização" do Google Maps, no formato confirmado
 * em execução real contra uhuu.com durante a investigação desta story
 * (US-S74) — ver docs/discovery/DISCOVERY-2026-08-11-uhuu-geocoding.md.
 */
const EVENT_DETAIL_HTML_COM_MAPA = `
<!DOCTYPE html>
<html>
<body>
  <div class="event-page">
    <h1 class="event-title">Maria Clara &amp; JP - Brincar e Imaginar</h1>
    <span class="event-category">Família / Infantil</span>
    <div class="event-details">
      <i class="icon-pin"></i>
      <div>
        <p><strong id="pageEventLocal">Teatro Claro MAIS RJ</strong><br>Rio de Janeiro/RJ</p>
        <a href="https://www.google.com/maps/place/-22.9663958,-43.1875042" target="_blank" class="btn-outline">Ver localização</a>
      </div>
    </div>
    <div class="tabs-content-item sobre active">
      <p><strong>Abertura da casa</strong>: 30min antes do início da sessão.</p>
      <p>"MARIA CLARA & JP" um espetáculo para toda a família.</p>
      <p>INFORMAÇÕES IMPORTANTES:</p>
      <p>CLASSIFICAÇÃO INDICATIVA: Livre</p>
      <p>DURAÇÃO APROXIMADA: 50 minutos</p>
    </div>
  </div>
</body>
</html>
`;

describe("parseListingPage", () => {
  it("extrai os campos do payload de analytics embutido no card", () => {
    const html = buildListingHtml([buildCardHtml()]);
    const items = parseListingPage(html);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      url: "https://uhuu.com/evento/rj/rio-de-janeiro/turminha-do-teatro-uma-aventura-jurassica-15615",
      nome: "Turminha do Teatro - Uma Aventura Jurássica",
      venue: "Teatro Bangu Shopping",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      data: "25/07/2026",
      hora: "15:00",
      precoRaw: "40,00",
      parentalRating: "Livre",
    });
  });

  it("decodifica entidades HTML no payload do gtag (ex.: '&amp;' → '&')", () => {
    const html = buildListingHtml([buildCardHtml({ itemName: "Maria Clara &amp; JP - Brincar e Imaginar" })]);
    const items = parseListingPage(html);
    expect(items[0].nome).toBe("Maria Clara & JP - Brincar e Imaginar");
  });

  it("ignora cards sem link", () => {
    const html = `<div class="item card-evento"><span>sem link</span></div>`;
    expect(parseListingPage(html)).toEqual([]);
  });

  it("processa múltiplos cards, mantendo URLs absolutas quando já vêm absolutas", () => {
    const html = buildListingHtml([
      buildCardHtml({ href: "https://uhuu.com/evento/sp/sao-paulo/outro-evento-1", localCidade: "São Paulo", localUf: "SP" }),
      buildCardHtml(),
    ]);
    const items = parseListingPage(html);
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe("https://uhuu.com/evento/sp/sao-paulo/outro-evento-1");
  });
});

describe("parseParentalRating", () => {
  it('"Livre" vira idade_minima 0 / idade_maxima 18 (convenção editorial)', () => {
    expect(parseParentalRating("Livre")).toEqual({ idade_minima: "0", idade_maxima: "18" });
  });

  it('"14 Anos" vira idade_minima 14, idade_maxima vazia (sem teto declarado)', () => {
    expect(parseParentalRating("14 Anos")).toEqual({ idade_minima: "14", idade_maxima: "" });
  });

  it("classificação vazia/desconhecida retorna ambos vazios", () => {
    expect(parseParentalRating("")).toEqual({ idade_minima: "", idade_maxima: "" });
  });
});

describe("parsePrecoCentavos", () => {
  it("converte '40,00' para centavos", () => {
    expect(parsePrecoCentavos("40,00")).toBe("4000");
  });

  it("converte preço com milhar '1.250,50'", () => {
    expect(parsePrecoCentavos("1.250,50")).toBe("125050");
  });

  it("retorna vazio para entrada vazia ou inválida", () => {
    expect(parsePrecoCentavos("")).toBe("");
    expect(parsePrecoCentavos("grátis")).toBe("");
  });
});

describe("extractSinopseUhuu", () => {
  it("remove a linha de abertura da casa e corta antes de 'Informações importantes'", () => {
    const texto =
      "Abertura da casa: 01h00 antes do início da sessão. \"UMA AVENTURA JURÁSSICA\" Beto e Maju são irmãos. INFORMAÇÕES IMPORTANTES: CLASSIFICAÇÃO INDICATIVA: Livre";
    const sinopse = extractSinopseUhuu(texto);
    expect(sinopse).toContain("UMA AVENTURA JURÁSSICA");
    expect(sinopse).not.toContain("Abertura da casa");
    expect(sinopse).not.toContain("INFORMAÇÕES IMPORTANTES");
  });
});

describe("parseEventDetail", () => {
  it("extrai categoria, sinopse e duração da página do evento", () => {
    const detail = parseEventDetail(EVENT_DETAIL_HTML);
    expect(detail.categoria_origem).toBe("Família / Infantil");
    expect(detail.duracao_minutos).toBe("60");
    expect(detail.sinopse_oficial).toContain("UMA AVENTURA JURÁSSICA");
  });

  it("página sem link de mapa retorna latitude/longitude vazios", () => {
    const detail = parseEventDetail(EVENT_DETAIL_HTML);
    expect(detail.latitude).toBe("");
    expect(detail.longitude).toBe("");
  });

  it("extrai latitude/longitude do link 'Ver localização' do Google Maps (AC1 — caso real Maria Clara & JP)", () => {
    const detail = parseEventDetail(EVENT_DETAIL_HTML_COM_MAPA);
    expect(detail.latitude).toBe("-22.9663958");
    expect(detail.longitude).toBe("-43.1875042");
  });
});

describe("scrapeUhuu (orquestração)", () => {
  it("filtra por município do RJ e enriquece só os itens aceitos", async () => {
    const listingHtmlPage1 = buildListingHtml([
      buildCardHtml(), // RJ — aceito
      buildCardHtml({
        href: "/evento/sp/sao-paulo/outro-evento-2",
        itemName: "Evento em São Paulo",
        localCidade: "São Paulo",
        localUf: "SP",
      }), // fora do RJ — rejeitado
    ]);

    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("page=1")) {
        return new Response(listingHtmlPage1, { status: 200 });
      }
      if (u.includes("page=2")) {
        return new Response(buildListingHtml([]), { status: 200 });
      }
      if (u.includes("/evento/")) {
        return new Response(EVENT_DETAIL_HTML, { status: 200 });
      }
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const { rows, stats } = await scrapeUhuu({ fetchImpl, delayMs: 0 });

    expect(stats.totalListados).toBe(2);
    expect(stats.totalRj).toBe(1);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe("Turminha do Teatro - Uma Aventura Jurássica");
    expect(rows[0].venue).toBe("Teatro Bangu Shopping");
    expect(rows[0].idade_minima).toBe("0");
    expect(rows[0].idade_maxima).toBe("18");
    expect(rows[0].preco_inteira_centavos).toBe("4000");
    expect(rows[0].duracao_minutos).toBe("60");
    expect(rows[0].categoria_origem).toBe("Família / Infantil");
  });

  it("segue sem sinopse/duração quando a busca da página de detalhe falha", async () => {
    const listingHtmlPage1 = buildListingHtml([buildCardHtml()]);
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("page=1")) return new Response(listingHtmlPage1, { status: 200 });
      if (u.includes("page=2")) return new Response(buildListingHtml([]), { status: 200 });
      if (u.includes("/evento/")) return new Response("", { status: 500 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const { rows } = await scrapeUhuu({ fetchImpl, delayMs: 0 });
    expect(rows).toHaveLength(1);
    expect(rows[0].sinopse_oficial).toBe("");
    expect(rows[0].duracao_minutos).toBe("");
  });

  it("evento com coordenadas dispara geocoding e preenche bairro/endereço (AC2 — caso real Maria Clara & JP)", async () => {
    const listingHtmlPage1 = buildListingHtml([
      buildCardHtml({
        href: "/evento/rj/rio-de-janeiro/maria-clara-jp-brincar-e-imaginar-16532",
        itemName: "Maria Clara &amp; JP - Brincar e Imaginar",
        localNome: "Teatro Claro MAIS RJ",
      }),
    ]);
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("page=1")) return new Response(listingHtmlPage1, { status: 200 });
      if (u.includes("page=2")) return new Response(buildListingHtml([]), { status: 200 });
      if (u.includes("/evento/")) return new Response(EVENT_DETAIL_HTML_COM_MAPA, { status: 200 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const geocodeFetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ address: { suburb: "Copacabana", road: "Rua Siqueira Campos", house_number: "143" } }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;

    const { rows } = await scrapeUhuu({ fetchImpl, geocodeFetchImpl, delayMs: 0, geocodeDelayMs: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0].bairro).toBe("Copacabana");
    expect(rows[0].endereco).toBe("Rua Siqueira Campos, 143");
    expect(geocodeFetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("lat=-22.9663958&lon=-43.1875042"),
      expect.anything(),
    );
  });

  it("evento sem link de mapa não chama geocoding e mantém bairro vazio", async () => {
    const listingHtmlPage1 = buildListingHtml([buildCardHtml()]);
    const fetchImpl = vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes("page=1")) return new Response(listingHtmlPage1, { status: 200 });
      if (u.includes("page=2")) return new Response(buildListingHtml([]), { status: 200 });
      if (u.includes("/evento/")) return new Response(EVENT_DETAIL_HTML, { status: 200 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;
    const geocodeFetchImpl = vi.fn();

    const { rows } = await scrapeUhuu({ fetchImpl, geocodeFetchImpl, delayMs: 0 });

    expect(rows).toHaveLength(1);
    expect(rows[0].bairro).toBe("");
    expect(rows[0].endereco).toBeUndefined();
    expect(geocodeFetchImpl).not.toHaveBeenCalled();
  });
});
