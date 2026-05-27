import type { Page } from "playwright";
import type { ListingPreview } from "./types";

const PRODUCT_PATH_PATTERN =
  /^https:\/\/clubinhodeofertas\.com\.br\/rio-de-janeiro\/[a-z0-9-]+-\d+$/i;

/**
 * Seletores de card de produto, em ordem de preferência.
 * Se o Clubinho renomear classes, o próximo seletor é tentado automaticamente.
 */
const CARD_SELECTORS = [
  "a.product-thumb[href]",
  "a[class*='product-thumb'][href]",
  "a[class*='product-card'][href]",
  "a[class*='offer-thumb'][href]",
  "a[class*='offer-card'][href]",
];

const WAIT_TIMEOUT_MS = 20_000;

/**
 * Aguarda até 20s pelo primeiro seletor de card que encontrar elementos.
 * Retorna o seletor que funcionou, ou null se nenhum encontrou.
 */
async function waitForCardSelector(page: Page): Promise<string | null> {
  // Tenta waitForSelector com o seletor principal primeiro (mais eficiente)
  try {
    await page.waitForSelector(CARD_SELECTORS[0], { timeout: WAIT_TIMEOUT_MS });
    return CARD_SELECTORS[0];
  } catch {
    // Seletor principal não apareceu — testa os alternativos no DOM atual
  }

  for (const sel of CARD_SELECTORS.slice(1)) {
    const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
    if (count > 0) {
      console.warn(`[scraper] Seletor principal não encontrado. Usando fallback: "${sel}" (${count} elementos)`);
      return sel;
    }
  }

  return null;
}

export async function scrapeListing(page: Page, listingUrl: string): Promise<ListingPreview[]> {
  const cardSelector = await waitForCardSelector(page);

  if (!cardSelector) {
    // Nenhum seletor funcionou — loga diagnóstico útil antes de retornar vazio
    const url = page.url();
    const title = await page.title();
    console.error(
      `[scraper] ERRO: Nenhum seletor de card encontrou elementos após ${WAIT_TIMEOUT_MS / 1000}s.\n` +
      `  URL atual: ${url}\n` +
      `  Título da página: "${title}"\n` +
      `  Hipóteses: (1) Cloudflare challenge ativo — tente --headed; ` +
      `(2) Mudança estrutural — rode scripts/scraper/diagnose-listing.ts`,
    );
    return [];
  }

  const previews = await page.evaluate((selector) => {
    // selector é passado como argumento para evitar closure sobre variável externa
    const results: Array<{
      url: string;
      nome: string;
      categoria_origem: string;
      venue: string;
      dias_apresentacao: string;
      desconto_percentual: string;
      preco_bruto: string;
    }> = [];

    const thumbs = document.querySelectorAll(selector);
    thumbs.forEach((anchor) => {
      const href = anchor.getAttribute("href") ?? "";
      const url = href.startsWith("http")
        ? href
        : `https://clubinhodeofertas.com.br${href}`;
      const nome = anchor.getAttribute("title") ?? "";
      const venue =
        anchor.querySelector(".product-thumb__venue")?.textContent?.trim() ?? "";
      const dias =
        anchor.querySelector(".product-thumb__days")?.textContent?.trim() ?? "";
      const descontoRaw =
        anchor.querySelector(".discount-tag__value")?.textContent?.trim() ?? "";
      const desconto = descontoRaw.includes("%") ? descontoRaw : `${descontoRaw}%`;
      const precoFull =
        anchor.querySelector(".product-thumb__price__full")?.textContent?.trim() ?? "";
      const precoSale =
        anchor.querySelector(".product-thumb__price__sale")?.textContent?.trim() ?? "";
      const preco_bruto = precoFull || precoSale;

      let categoria_origem = "Destaques";
      const section = anchor.closest("section, .home-section, .swiper");
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
  }, cardSelector);

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
