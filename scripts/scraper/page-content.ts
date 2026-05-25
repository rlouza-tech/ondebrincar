import type { Page } from "playwright";

const RENDER_TIMEOUT_MS = 10_000;

export interface PageRenderedData {
  fullText: string;
  ldJson: unknown[];
}

/** Espera o SPA Vue renderizar o conteúdo da ficha antes de extrair texto. */
export async function waitForRenderedProductPage(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: RENDER_TIMEOUT_MS }).catch(() => {
    /* networkidle pode falhar em páginas com polling — segue com seletores */
  });

  await page
    .getByText("Sobre o espetáculo", { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: RENDER_TIMEOUT_MS })
    .catch(() => null);

  await page
    .locator(".product-page__content__header__title")
    .first()
    .waitFor({ state: "visible", timeout: RENDER_TIMEOUT_MS })
    .catch(() => null);
}

export async function extractPageRenderedData(page: Page): Promise<PageRenderedData> {
  const payload = await page.evaluate(() => {
    const main =
      document.querySelector(".main-content") ??
      document.querySelector(".product-page") ??
      document.querySelector("#app") ??
      document.body;

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const ldJson = Array.from(scripts)
      .map((script) => {
        try {
          return JSON.parse(script.textContent ?? "");
        } catch {
          return null;
        }
      })
      .filter((item): item is unknown => item !== null);

    return {
      fullText: main?.innerText ?? "",
      ldJson,
    };
  });

  return payload;
}
