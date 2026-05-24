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

export async function fetchProductApi<T>(
  page: Page,
  apiPath: string,
): Promise<{ status: number; data: T | null }> {
  return page.evaluate(async (path) => {
    const response = await fetch(path, { credentials: "include" });
    if (!response.ok) {
      return { status: response.status, data: null };
    }
    const data = (await response.json()) as T;
    return { status: response.status, data };
  }, apiPath);
}
