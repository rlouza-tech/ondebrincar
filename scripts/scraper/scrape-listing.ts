import type { Page } from "playwright";
import type { ListingPreview } from "./types";

const PRODUCT_PATH_PATTERN =
  /^https:\/\/clubinhodeofertas\.com\.br\/rio-de-janeiro\/[a-z0-9-]+-\d+$/i;

export async function scrapeListing(page: Page, listingUrl: string): Promise<ListingPreview[]> {
  await page.waitForTimeout(3000);

  const previews = await page.evaluate(() => {
    const results: Array<{
      url: string;
      nome: string;
      categoria_origem: string;
      venue: string;
      dias_apresentacao: string;
      desconto_percentual: string;
      preco_bruto: string;
    }> = [];

    const thumbs = document.querySelectorAll("a.product-thumb[href]");
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
  });

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
