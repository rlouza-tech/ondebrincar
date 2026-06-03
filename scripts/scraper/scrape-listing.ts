import type { Page } from "playwright";
import type { ListingPreview } from "./types";

const PRODUCT_PATH_PATTERN =
  /^https:\/\/clubinhodeofertas\.com\.br\/rio-de-janeiro\/[a-z0-9-]+-\d+$/i;

/**
 * Seletor de card do novo layout "shop-new" (jun/2026).
 * O Clubinho migrou para Tailwind + novo bundle CSS — todas as classes
 * semânticas antigas (.product-thumb, etc.) foram removidas.
 * Novo identificador estável: atributo aria-labelledby no <a> de cada card.
 *
 * Se o layout mudar novamente, rode scripts/scraper/diagnose-listing.ts
 * para mapear os novos seletores antes de editar aqui.
 */
const CARD_SELECTOR = 'article:has(a[aria-labelledby^="shop-new-offer-card-title-"])';

const WAIT_TIMEOUT_MS = 20_000;

/**
 * Aguarda até 20s pelo seletor de card.
 * Retorna true se encontrou elementos, false caso contrário.
 */
async function waitForCardSelector(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector(CARD_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

export async function scrapeListing(page: Page, listingUrl: string): Promise<ListingPreview[]> {
  const found = await waitForCardSelector(page);

  if (!found) {
    const url = page.url();
    const title = await page.title();
    console.error(
      `[scraper] ERRO: Nenhum card encontrado após ${WAIT_TIMEOUT_MS / 1000}s.\n` +
      `  URL atual: ${url}\n` +
      `  Título da página: "${title}"\n` +
      `  Hipóteses: (1) Cloudflare challenge ativo — tente --headed; ` +
      `(2) Mudança estrutural — rode scripts/scraper/diagnose-listing.ts`,
    );
    return [];
  }

  const previews = await page.evaluate((cardSel) => {
    const results: Array<{
      url: string;
      nome: string;
      categoria_origem: string;
      venue: string;
      dias_apresentacao: string;
      desconto_percentual: string;
      preco_bruto: string;
    }> = [];

    const cards = document.querySelectorAll(cardSel);
    cards.forEach((article) => {
      // URL: href do <a aria-labelledby>
      const anchor = article.querySelector('a[aria-labelledby^="shop-new-offer-card-title-"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const url = href.startsWith("http")
        ? href
        : `https://clubinhodeofertas.com.br${href}`;

      // Nome: <h3 id="shop-new-offer-card-title-*">
      const nome =
        article.querySelector('h3[id^="shop-new-offer-card-title-"]')?.textContent?.trim() ?? "";

      // Venue e dias: dentro de div.space-y-2
      // Estrutura: <div class="space-y-2"><p>…<span>dias</span></p><p>…<span>venue</span></p></div>
      const spaceY2 = article.querySelector("div.space-y-2");
      const paragraphs = spaceY2 ? Array.from(spaceY2.querySelectorAll(":scope > p")) : [];
      const dias =
        paragraphs[0]?.querySelector("span:last-child")?.textContent?.trim() ?? "";
      const venue =
        paragraphs[1]?.querySelector("span:last-child")?.textContent?.trim() ?? "";

      // Preço: span com font-semibold na área de preço
      const preco_bruto =
        article.querySelector("span.font-semibold")?.textContent?.trim() ?? "";

      // Desconto: badge com rounded-full > span com font-bold
      const descontoRaw =
        article.querySelector("div.rounded-full span.font-bold")?.textContent?.trim() ?? "";
      const desconto = descontoRaw
        ? descontoRaw.includes("%") ? descontoRaw : `${descontoRaw}%`
        : "";

      // Categoria: heading da section/swiper mais próxima
      let categoria_origem = "Destaques";
      const section = article.closest("section, .home-section, .swiper");
      const heading = section?.querySelector("h2, h3");
      if (heading?.textContent?.trim()) {
        categoria_origem = heading.textContent.trim();
      }

      results.push({
        url,
        nome,
        categoria_origem,
        venue,
        dias_apresentacao: dias,
        desconto_percentual: desconto,
        preco_bruto,
      });
    });

    return results;
  }, CARD_SELECTOR);

  const byUrl = new Map<string, ListingPreview>();
  for (const preview of previews) {
    if (!PRODUCT_PATH_PATTERN.test(preview.url)) {
      continue;
    }
    if (!byUrl.has(preview.url)) {
      byUrl.set(preview.url, preview);
    }
  }

  return Array.from(byUrl.values());
}
