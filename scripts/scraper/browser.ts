import { chromium, type Browser, type Page } from "playwright";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PAGE_TIMEOUT_MS = 10_000;

export interface BrowserSession {
  browser: Browser;
  page: Page;
  headless: boolean;
}

export async function createBrowserSession(headed: boolean): Promise<BrowserSession> {
  const headless = !headed;
  const browser = await chromium.launch({
    headless,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = await browser.newPage({
    userAgent: USER_AGENT,
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
    extraHTTPHeaders: { "Accept-Language": "pt-BR,pt;q=0.9" },
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });
  });
  return { browser, page, headless };
}

export async function gotoWithRetry(
  page: Page,
  url: string,
  timeoutMs = PAGE_TIMEOUT_MS,
): Promise<void> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  } catch (firstError) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    } catch {
      throw firstError;
    }
  }
}

const API_FETCH_TIMEOUT_MS = 10_000;

/**
 * status 0 sinaliza falha antes de qualquer resposta HTTP (timeout ou erro de
 * rede) — nunca vem de um fetch() que completou, então não colide com status
 * HTTP reais. Corpo vazio/inválido (JSON parse falhou) preserva o status HTTP
 * recebido, mas data vem null — trata-se como falha igual (US-S39, AC3).
 */
export async function fetchProductApi<T>(
  page: Page,
  apiPath: string,
): Promise<{ status: number; data: T | null }> {
  try {
    return await page.evaluate(
      async ({ path, timeoutMs }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const response = await fetch(path, {
            credentials: "include",
            signal: controller.signal,
          });
          if (!response.ok) {
            return { status: response.status, data: null };
          }
          try {
            const data = await response.json();
            return { status: response.status, data };
          } catch {
            return { status: response.status, data: null };
          }
        } finally {
          clearTimeout(timeoutId);
        }
      },
      { path: apiPath, timeoutMs: API_FETCH_TIMEOUT_MS },
    );
  } catch {
    return { status: 0, data: null };
  }
}
