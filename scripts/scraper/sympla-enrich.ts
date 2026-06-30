#!/usr/bin/env tsx
/**
 * sympla-enrich.ts — visita cada página de evento do pre-filter e extrai
 * a descrição completa para enriquecer descricao_raw.
 *
 * Uso:
 *   pnpm sympla-enrich                     # padrão: --headed, delay 2s
 *   pnpm sympla-enrich --delay 3           # delay customizado entre requests
 *   pnpm sympla-enrich --limit 10          # processa só os primeiros N eventos
 *
 * Input:  data/input/sympla-raw-pre-filter.json
 * Output: data/input/sympla-raw-enriquecido.json
 *
 * Log final: "N enriquecidos / N falhas / N sem melhora"
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createBrowserSession, gotoWithRetry } from "./browser";
import { isConteudoInfantil } from "./sympla-scrape";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const INPUT_PATH    = join(process.cwd(), "data", "input", "sympla-raw-pre-filter.json");
const OUTPUT_PATH   = join(process.cwd(), "data", "input", "sympla-raw-enriquecido.json");
export const PENDENTE_PATH = join(process.cwd(), "data", "input", "sympla-revisao-pendente.json");

/** Mínimo de chars para considerar a descrição extraída "útil" */
export const MIN_DESCRICAO_CHARS = 150;

/**
 * Seletores candidatos, em ordem de especificidade.
 *
 * Estrutura confirmada via DevTools em sympla.com.br/evento/:
 *   <section data-testid="event-info-section">
 *     <h3 data-testid="event-description-section">Descrição do evento</h3>
 *     <div>  ← irmão seguinte, contém os <p> com o texto real
 *       <p>...</p>
 *     </div>
 *   </section>
 *
 * O data-testid="event-info-section" engloba descrição + info do evento.
 * O data-testid="event-description-section" é o <h3> título — pegamos o
 * conteúdo do nextElementSibling via JS (ver extrairDescricao).
 */
export const DESCRICAO_SELECTORS = [
  // 1. Seletor primário confirmado: div irmão do h3 de descrição
  "[data-testid='event-description-section'] + div",
  // 2. Seção completa de info do evento (inclui descrição + outras infos)
  "[data-testid='event-info-section']",
  // 3. Fallback: qualquer elemento com data-testid contendo "description"
  "[data-testid*='description']",
  // 4. Padrões de class React (hasheadas, menos estáveis)
  "[class*='EventDescription']",
  "[class*='event-description']",
  "[class*='eventDescription']",
  // 5. Último recurso: parágrafos dentro da área principal
  "main p",
  "article p",
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOptions {
  delay: number;
  limit?: number;
}

export function parseArgs(argv = process.argv): CliOptions {
  const opts: CliOptions = { delay: 2 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--delay") {
      const val = Number.parseFloat(argv[i + 1] ?? "");
      if (Number.isNaN(val) || val < 0) {
        throw new Error("--delay precisa ser um número ≥ 0");
      }
      opts.delay = val;
      i++;
    } else if (arg === "--limit") {
      const val = Number.parseInt(argv[i + 1] ?? "", 10);
      if (Number.isNaN(val) || val < 1) {
        throw new Error("--limit precisa ser um inteiro positivo");
      }
      opts.limit = val;
      i++;
    } else {
      throw new Error(
        `Argumento desconhecido: "${arg}"\nUso: pnpm sympla-enrich [--delay N] [--limit N]`
      );
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Parser de descrição — lógica extraível e testável
// ---------------------------------------------------------------------------

/**
 * Recebe o texto bruto extraído de um seletor e normaliza:
 * - colapsa espaços/newlines excessivos
 * - remove artefatos comuns de SSR/SPA
 * - retorna null se o resultado for menor que MIN_DESCRICAO_CHARS
 */
export function parseDescricao(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")          // múltiplos espaços/tabs → 1 espaço
    .replace(/\n{3,}/g, "\n\n")       // mais de 2 newlines → 2
    .replace(/^\s+|\s+$/g, "")        // trim
    // Remove linhas que são puramente UI (ex: "Ver mais", "Compartilhar")
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.length === 0) return true; // mantém separadores de parágrafo
      const noise = ["ver mais", "compartilhar", "favoritar", "ingressos", "comprar", "aviso"];
      return !noise.some((n) => t.toLowerCase() === n);
    })
    .join("\n")
    .trim();

  return cleaned.length >= MIN_DESCRICAO_CHARS ? cleaned : null;
}

// ---------------------------------------------------------------------------
// Extração de preços via Playwright (roda no browser)
// ---------------------------------------------------------------------------

/**
 * Extrai preços de uma página de evento Sympla já carregada.
 * Busca padrões "R$ X,XX" no container de tickets.
 * Retorna o menor preço em centavos e se há múltiplas faixas.
 */
export async function extrairPrecos(
  page: import("playwright").Page
): Promise<{ minPriceCents: number | null; multiplasFaixas: boolean }> {
  return page.evaluate(() => {
    // Tenta escopar a busca à seção de tickets (mais preciso)
    const ticketSelectors = [
      "[data-testid*='ticket']",
      "[data-testid*='lot']",
      "[class*='TicketList']",
      "[class*='ticket-list']",
      "[class*='LotList']",
      // "Escolha uma opção" é o título da seção de tickets no Sympla
      "section:has(h2)",
    ];

    let searchEl: Element = document.body;
    for (const sel of ticketSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) { searchEl = el; break; }
      } catch { /* seletor inválido neste browser */ }
    }

    const text = (searchEl as HTMLElement).innerText ?? "";
    const matches = [...text.matchAll(/R\$\s*([\d.]+(?:,\d{2})?)/g)];
    const prices: number[] = [];
    for (const m of matches) {
      // Inline: converte "29,90" ou "29.990,00" → centavos
      const normalized = m[1].replace(/\./g, "").replace(",", ".");
      const value = Number.parseFloat(normalized);
      if (!Number.isNaN(value) && value > 0 && value <= 100000) {
        prices.push(Math.round(value * 100));
      }
    }

    if (prices.length === 0) return { minPriceCents: null, multiplasFaixas: false };
    const unique = [...new Set(prices)];
    return { minPriceCents: Math.min(...unique), multiplasFaixas: unique.length > 1 };
  });
}

// ---------------------------------------------------------------------------
// Extração via Playwright (roda no browser)
// ---------------------------------------------------------------------------

/**
 * Tenta extrair a descrição de uma página de evento Sympla já carregada.
 * Itera pelos seletores candidatos e retorna o primeiro texto útil encontrado.
 * Retorna { texto, seletor } ou { texto: null, seletor: null } se falhar.
 */
async function extrairDescricao(
  page: import("playwright").Page
): Promise<{ texto: string | null; seletor: string | null }> {
  const raw = await page.evaluate((selectors: string[]) => {
    // Caso especial: h3 com data-testid="event-description-section" seguido de div
    // O seletor CSS "+ div" nem sempre funciona — tentamos via nextElementSibling
    const h3 = document.querySelector("[data-testid='event-description-section']");
    if (h3) {
      const sibling = h3.nextElementSibling as HTMLElement | null;
      const texto = sibling?.innerText?.trim();
      if (texto && texto.length > 80) {
        return { texto, seletor: "[data-testid='event-description-section'] + sibling" };
      }
    }

    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        const textos = Array.from(els)
          .map((e) => (e as HTMLElement).innerText?.trim())
          .filter((t) => t && t.length > 80);

        if (textos.length > 0) {
          // Concatena parágrafos se forem múltiplos elementos curtos (ex: main p)
          const joined = textos.join("\n\n");
          if (joined.length > 80) return { texto: joined, seletor: sel };
        }
      } catch {
        // seletor inválido neste browser — pula
      }
    }
    return { texto: null, seletor: null };
  }, DESCRICAO_SELECTORS);

  return raw;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export interface SymplarRawEvent {
  nome: string;
  venue: string;
  data: string;
  link: string;
  descricao_raw: string;
  preco_raw: string;
  revisao_manual?: boolean;
  /** Menor preço disponível na página do evento (em centavos). Vazio se não detectado. */
  preco_inteira_centavos?: string;
  /** true quando há múltiplas faixas de preço (lotes, meia/inteira, etc.). */
  preco_a_partir?: boolean;
}

async function main() {
  const opts = parseArgs();

  // Lê input
  let eventos: SymplarRawEvent[];
  try {
    eventos = JSON.parse(readFileSync(INPUT_PATH, "utf-8")) as SymplarRawEvent[];
  } catch (e) {
    console.error(`\n❌ Não foi possível ler ${INPUT_PATH}`);
    console.error("   Execute pnpm sympla-scrape primeiro para gerar o pre-filter.");
    process.exit(1);
  }

  const alvo = opts.limit ? eventos.slice(0, opts.limit) : eventos;

  console.log("\n=== Sympla Enricher ===");
  console.log(`Input:   ${INPUT_PATH} (${eventos.length} eventos)`);
  console.log(`Alvo:    ${alvo.length} eventos`);
  console.log(`Delay:   ${opts.delay}s entre requisições`);
  console.log(`Output:  ${OUTPUT_PATH}\n`);

  // Sempre --headed: Sympla bloqueia headless com captcha
  const { browser, page } = await createBrowserSession(true);

  let nEnriquecidos = 0;
  let nFalhas = 0;
  let nSemMelhora = 0;
  let nDescartados = 0;
  let nRevisao = 0;

  /**
   * Escolas conhecidas que usam o Sympla para eventos (possivelmente privados).
   * Adicione novos nomes aqui conforme forem identificados.
   */
  const ESCOLAS_CONHECIDAS = [
    "maple bear",
    "eleva",
  ];

  /** Retorna true se o nome do evento sugere evento de escola (possivelmente privado) */
  const precisaRevisaoManual = (nome: string) => {
    const nomeLower = nome.toLowerCase();
    if (/escola|col[eé]gio/i.test(nome)) return true;
    if (ESCOLAS_CONHECIDAS.some((e) => nomeLower.includes(e))) return true;
    return false;
  };

  const resultados: SymplarRawEvent[] = [];

  try {
    for (let i = 0; i < alvo.length; i++) {
      const ev = alvo[i];
      process.stdout.write(`[${i + 1}/${alvo.length}] ${ev.nome.substring(0, 60)}... `);

      try {
        await gotoWithRetry(page, ev.link, 25_000);

        const { texto, seletor } = await extrairDescricao(page);
        const descricaoLimpa = parseDescricao(texto);
        const { minPriceCents, multiplasFaixas } = await extrairPrecos(page);

        // Campos de preço extraídos da página do evento
        const precoExtra: Pick<SymplarRawEvent, "preco_inteira_centavos" | "preco_a_partir"> = {
          ...(minPriceCents !== null ? { preco_inteira_centavos: String(minPriceCents) } : {}),
          preco_a_partir: multiplasFaixas,
        };

        if (descricaoLimpa) {
          const evEnriquecido = descricaoLimpa.length > ev.descricao_raw.length
            ? { ...ev, descricao_raw: descricaoLimpa, ...precoExtra }
            : { ...ev, ...precoExtra };

          if (!isConteudoInfantil(evEnriquecido.nome, evEnriquecido.descricao_raw)) {
            process.stdout.write(`🚫 descartado (não infantil)\n`);
            nDescartados++;
          } else {
            const revisao = precisaRevisaoManual(evEnriquecido.nome);
            const evFinal = revisao ? { ...evEnriquecido, revisao_manual: true } : evEnriquecido;
            if (descricaoLimpa.length > ev.descricao_raw.length) {
              const precoLog = minPriceCents ? ` R$${(minPriceCents/100).toFixed(0)}${multiplasFaixas ? "+" : ""}` : "";
              process.stdout.write(`✅ (${seletor}, ${descricaoLimpa.length} chars${precoLog})${revisao ? " 🔍 revisão manual" : ""}\n`);
              nEnriquecidos++;
            } else {
              process.stdout.write(`→ sem melhora${revisao ? " 🔍 revisão manual" : ""}\n`);
              nSemMelhora++;
            }
            resultados.push(evFinal);
            if (revisao) nRevisao++;
          }
        } else {
          // Sem descrição extraída: aplica filtro na descrição original
          if (!isConteudoInfantil(ev.nome, ev.descricao_raw)) {
            process.stdout.write(`🚫 descartado (não infantil, sem descrição)\n`);
            nDescartados++;
          } else {
            const revisao = precisaRevisaoManual(ev.nome);
            const evFinal = revisao ? { ...ev, ...precoExtra, revisao_manual: true } : { ...ev, ...precoExtra };
            process.stdout.write(`⚠ nenhum seletor retornou ≥${MIN_DESCRICAO_CHARS} chars${revisao ? " 🔍 revisão manual" : ""}\n`);
            resultados.push(evFinal);
            nFalhas++;
            if (revisao) nRevisao++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message.split("\n")[0] : String(err);
        process.stdout.write(`❌ ${msg}\n`);
        resultados.push(ev);
        nFalhas++;
      }

      // Delay entre requisições (exceto na última)
      if (i < alvo.length - 1 && opts.delay > 0) {
        await page.waitForTimeout(opts.delay * 1000);
      }
    }

    // Separa aprovados dos pendentes de revisão
    const aprovados  = resultados.filter((e) => !e.revisao_manual);
    const pendentes  = resultados.filter((e) => e.revisao_manual);

    // Salva aprovados
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(aprovados, null, 2), "utf-8");

    // Salva pendentes (se houver)
    if (pendentes.length > 0) {
      writeFileSync(PENDENTE_PATH, JSON.stringify(pendentes, null, 2), "utf-8");
    }

    // Log final
    console.log(`\n${"─".repeat(50)}`);
    console.log(`✅  ${nEnriquecidos} enriquecidos / ${nSemMelhora} sem melhora / ${nFalhas} falhas / ${nDescartados} descartados (não infantil) / ${nRevisao} para revisão manual`);
    console.log(`📄  Aprovados: ${OUTPUT_PATH} (${aprovados.length} eventos)`);
    if (pendentes.length > 0) {
      console.log(`🔍  Revisão pendente: ${PENDENTE_PATH} (${pendentes.length} eventos)`);
      console.log(`    → rode pnpm sympla-aprovar para revisar e aprovar`);
    }
    console.log("─".repeat(50) + "\n");

  } finally {
    await browser.close();
  }
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
