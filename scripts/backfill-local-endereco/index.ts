#!/usr/bin/env tsx
/**
 * backfill-local-endereco — US-S78
 *
 * Backfill de `local` + tabela nome↔endereço nas fichas publicadas antes da
 * US-S76 (Sympla + Clubinho, status operando). Duas situações cobertas:
 *   1. Fichas anteriores à US-S76 nunca receberam `local` — campo nasce vazio.
 *   2. Fichas publicadas na janela entre o merge da US-S59 e da US-S76 podem
 *      ter `endereco` contaminado com só o nome do local (comportamento antigo
 *      da US-S59, revertido pela US-S76).
 *
 * Reaproveita a lógica de extração/decisão já existente:
 *   - Sympla:   extrairEndereco (scripts/scraper/sympla-enrich.ts) contra
 *               link_compra, via browser headed.
 *   - Clubinho: mesmo padrão de productApiPathFromUrl (scrape-atracao.ts),
 *               chamando a API real do produto.
 *   - Decisão:  resolverLocalEEndereco (scripts/scraper/sympla-enrich.ts),
 *               consultando/alimentando data/local-endereco-map.json.
 *
 * Contaminação (AC4): normaliza o `endereco` salvo hoje e compara com o nome
 * extraído ao vivo da fonte — se forem iguais, o valor salvo não é um
 * endereço real, é o nome do local vazado pelo bug da janela US-S59→US-S76.
 *
 * Falha ao abrir a página/API (404, timeout, bloqueio anti-bot) não trava o
 * backfill nem altera a ficha — loga e segue (AC6).
 *
 * --dry-run é o padrão: gera relatório (tabela + JSON) sem escrever no
 * Sanity nem na tabela nome↔endereço real. --execute só depois do dry-run
 * validado com o Rafa (regra do CLAUDE.md).
 *
 * Uso:
 *   pnpm backfill-local-endereco                    # dry-run, tudo
 *   pnpm backfill-local-endereco --limit 10          # dry-run, 10 fichas
 *   pnpm backfill-local-endereco --delay 3           # delay customizado
 *   pnpm backfill-local-endereco --execute           # aplica (só após revisão!)
 */

import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import {
  createBrowserSession,
  fetchProductApi,
  gotoWithRetry,
  type BrowserSession,
} from "@/scripts/scraper/browser";
import { extrairEndereco, resolverLocalEEndereco } from "@/scripts/scraper/sympla-enrich";
import {
  LOCAL_ENDERECO_MAP_PATH,
  loadLocalEnderecoMap,
  lookupEnderecoPorLocal,
  normalize,
  saveLocalEnderecoMap,
  upsertPar,
  type LocalEnderecoPair,
} from "@/scripts/scraper/local-endereco-map";
import type { ClubinhoProductApi } from "@/scripts/scraper/clubinho-api";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CandidataSanity {
  _id: string;
  slug: string;
  nome: string;
  origem: string;
  link_compra?: string | null;
  endereco?: string | null;
  local?: string | null;
}

export interface FichaAtual {
  local: string | null;
  endereco: string | null;
}

export interface ExtracaoLive {
  /** Nome do local extraído ao vivo da fonte (eventsAddress.name / venues[0].name). */
  nome: string | null;
  /** Endereço completo extraído ao vivo da fonte. */
  endereco: string | null;
  /** true quando não foi possível nem abrir a página/API (rede, timeout, bloqueio). */
  falhou: boolean;
}

export type CategoriaResultado =
  | "local_novo"
  | "endereco_corrigido"
  | "par_gravado"
  | "sem_mudanca"
  | "falhou";

export interface ResultadoDecisao {
  local: string | null;
  endereco: string | null;
  contaminado: boolean;
  novoPar: boolean;
  categoria: CategoriaResultado;
}

export interface ResultadoBackfillFicha extends CandidataSanity {
  decisao: ResultadoDecisao;
}

// ---------------------------------------------------------------------------
// Decisão — lógica pura, testável (AC4 + AC5)
// ---------------------------------------------------------------------------

/**
 * Decide o resultado final de `local`/`endereco` para uma ficha, reaproveitando
 * resolverLocalEEndereco (US-S76). `atual.local` tem prioridade como nome —
 * nunca fica contaminado (só `endereco` é vítima do bug da janela) — a
 * extração ao vivo só preenche o que falta ou substitui um `endereco`
 * contaminado. Falha total de extração preserva a ficha como está (AC6).
 */
export function decidirBackfill(
  atual: FichaAtual,
  extracao: ExtracaoLive,
  tabela: LocalEnderecoPair[],
): ResultadoDecisao {
  if (extracao.falhou) {
    return {
      local: atual.local,
      endereco: atual.endereco,
      contaminado: false,
      novoPar: false,
      categoria: "falhou",
    };
  }

  const contaminado =
    Boolean(atual.endereco) &&
    Boolean(extracao.nome) &&
    normalize(atual.endereco!) === normalize(extracao.nome!);

  // Endereço salvo só é "válido como ponto de partida" se não estiver contaminado.
  const enderecoAtualValido = contaminado ? null : atual.endereco ?? null;
  const nomeBase = atual.local?.trim() || "";
  const enderecoParaResolver = extracao.endereco ?? enderecoAtualValido;

  const resolved = resolverLocalEEndereco(nomeBase, enderecoParaResolver, extracao.nome, tabela);

  // resolverLocalEEndereco sinaliza novoPar sempre que nome+endereço vêm
  // juntos, mesmo quando o par já é idêntico ao que já está na ficha e na
  // tabela (idempotente) — não é por si só uma "mudança". Só vira categoria
  // própria (par_gravado) quando a ficha não mudou mas o par ainda não
  // constava na tabela real (caso comum: ficha já correta, tabela nasceu vazia).
  const fichaMudou = resolved.local !== atual.local || resolved.endereco !== enderecoAtualValido;
  const parJaConhecido =
    resolved.novoPar &&
    resolved.local !== null &&
    resolved.endereco !== null &&
    lookupEnderecoPorLocal(tabela, resolved.local) === resolved.endereco;

  let categoria: CategoriaResultado;
  if (contaminado) {
    categoria = "endereco_corrigido";
  } else if (fichaMudou) {
    categoria = !atual.local && resolved.local ? "local_novo" : "endereco_corrigido";
  } else if (resolved.novoPar && !parJaConhecido) {
    categoria = "par_gravado";
  } else {
    categoria = "sem_mudanca";
  }

  return {
    local: resolved.local,
    endereco: resolved.endereco,
    contaminado,
    novoPar: resolved.novoPar,
    categoria,
  };
}

// ---------------------------------------------------------------------------
// Extração — Sympla
// ---------------------------------------------------------------------------

async function extrairSympla(session: BrowserSession, url: string): Promise<ExtracaoLive> {
  try {
    await gotoWithRetry(session.page, url, 25_000);
    const { endereco, nomeLocal } = await extrairEndereco(session.page, url);
    return { nome: nomeLocal, endereco, falhou: false };
  } catch {
    return { nome: null, endereco: null, falhou: true };
  }
}

// ---------------------------------------------------------------------------
// Extração — Clubinho (mesmo padrão de productApiPathFromUrl, scrape-atracao.ts)
// ---------------------------------------------------------------------------

function apiPathFromUrl(url: string): string {
  return `/api${new URL(url).pathname}`;
}

type ClubinhoVenueAddress = NonNullable<
  NonNullable<ClubinhoProductApi["venues"]>[number]["address"]
>;

/** Mesma composição de endereço de scrape-atracao.ts (mapToLinha). */
export function composeEnderecoClubinho(
  venueAddress: ClubinhoVenueAddress | undefined,
): string | null {
  if (!venueAddress?.street && !venueAddress?.number) return null;
  const rua = [venueAddress.street?.trim(), venueAddress.number].filter(Boolean).join(", ");
  const localizacao = [venueAddress.complement, venueAddress.neighborhood]
    .filter(Boolean)
    .join(" — ");
  return [rua, localizacao].filter(Boolean).join(" — ") || null;
}

async function extrairClubinho(session: BrowserSession, url: string): Promise<ExtracaoLive> {
  try {
    await gotoWithRetry(session.page, url, 25_000);
    const apiPath = apiPathFromUrl(url);
    const { status, data } = await fetchProductApi<ClubinhoProductApi>(session.page, apiPath);
    if (status !== 200 || !data) return { nome: null, endereco: null, falhou: true };

    const venue = data.venues?.[0];
    const nome = venue?.name?.trim() || null;
    const endereco = composeEnderecoClubinho(venue?.address);
    return { nome, endereco, falhou: false };
  } catch {
    return { nome: null, endereco: null, falhou: true };
  }
}

// ---------------------------------------------------------------------------
// Sanity — busca de candidatas (AC1) e patch (published + drafts)
// ---------------------------------------------------------------------------

async function fetchCandidatas(limit?: number): Promise<CandidataSanity[]> {
  const groqQuery = `*[_type == "atracao"
    && !(_id in path("drafts.**"))
    && origem in ["sympla", "clubinho"]
    && status == "operando"
  ] | order(slug.current asc) {
    _id,
    "slug": slug.current,
    nome,
    origem,
    link_compra,
    endereco,
    local
  }${limit !== undefined ? `[0...${limit}]` : ""}`;

  return sanityWriteClient.fetch<CandidataSanity[]>(groqQuery);
}

async function patchFicha(
  baseId: string,
  local: string | null,
  endereco: string | null,
  execute: boolean,
): Promise<{ patched: number; skipped: number }> {
  const set: Record<string, string> = {};
  const unset: string[] = [];
  if (local !== null) set.local = local;
  else unset.push("local");
  if (endereco !== null) set.endereco = endereco;
  else unset.push("endereco");

  const prefixes = ["", "drafts."];
  let patched = 0;
  let skipped = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      if (execute) {
        let mutation = sanityWriteClient.patch(id);
        if (Object.keys(set).length > 0) mutation = mutation.set(set);
        if (unset.length > 0) mutation = mutation.unset(unset);
        await mutation.commit();
      }
      patched++;
    } catch {
      // Documento não existe com esse prefixo — normal para drafts.
      skipped++;
    }
  }

  return { patched, skipped };
}

// ---------------------------------------------------------------------------
// Saída — tabela e JSON
// ---------------------------------------------------------------------------

function padRight(str: string, len: number): string {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len - 1) + " " : s + " ".repeat(len - s.length);
}

function fmt(before: string | null, after: string | null): string {
  if (before === after) return before ?? "—";
  return `${before ?? "—"} → ${after ?? "—"}`;
}

const CATEGORIA_LABEL: Record<CategoriaResultado, string> = {
  local_novo: "✅ local novo",
  endereco_corrigido: "✅ endereço corrigido",
  par_gravado: "✅ par gravado na tabela",
  sem_mudanca: "→ sem mudança",
  falhou: "❌ falhou",
};

function printTable(resultados: ResultadoBackfillFicha[]): void {
  const SEP = "─".repeat(180);
  console.log("\n" + SEP);
  console.log(
    padRight("slug", 40) +
      padRight("origem", 10) +
      padRight("categoria", 24) +
      padRight("local (antes → depois)", 50) +
      "endereco (antes → depois)",
  );
  console.log(SEP);
  for (const r of resultados) {
    console.log(
      padRight(r.slug, 40) +
        padRight(r.origem, 10) +
        padRight(CATEGORIA_LABEL[r.decisao.categoria], 24) +
        padRight(fmt(r.local ?? null, r.decisao.local).slice(0, 48), 50) +
        fmt(r.endereco ?? null, r.decisao.endereco),
    );
  }
  console.log(SEP);
}

async function saveJson(resultados: ResultadoBackfillFicha[]): Promise<string> {
  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = join(outputDir, `backfill-local-endereco-${timestamp}.json`);
  await writeFile(
    filepath,
    JSON.stringify({ gerado_em: new Date().toISOString(), resultados }, null, 2),
    "utf-8",
  );
  return filepath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOptions {
  execute: boolean;
  delay: number;
  limit?: number;
}

export function parseArgs(argv = process.argv): CliOptions {
  const opts: CliOptions = { execute: false, delay: 2 };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--execute") {
      opts.execute = true;
    } else if (arg === "--delay") {
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
        `Argumento desconhecido: "${arg}"\nUso: pnpm backfill-local-endereco [--execute] [--delay N] [--limit N]`,
      );
    }
  }
  return opts;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { execute, delay, limit } = parseArgs();
  const dryRun = !execute;

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }
  if (execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório com --execute)");
  }

  console.log(`\n[backfill-local-endereco] Modo: ${dryRun ? "DRY-RUN" : "EXECUTE ⚠️"}`);
  if (limit !== undefined) console.log(`[backfill-local-endereco] Limit: ${limit} fichas`);
  console.log(`[backfill-local-endereco] Delay: ${delay}s entre requisições`);

  console.log("\nBuscando candidatas no Sanity (sympla/clubinho, operando)...");
  const candidatas = await fetchCandidatas(limit);
  console.log(`Candidatas encontradas: ${candidatas.length}`);

  if (candidatas.length === 0) {
    console.log("\n✅ Nenhuma candidata encontrada. Nada a fazer.");
    return;
  }

  // Tabela carregada 1x e atualizada progressivamente durante a rodada — um
  // par descoberto numa ficha pode beneficiar uma ficha posterior na mesma
  // execução. Só persistida no disco com --execute (dry-run não deve gravar
  // nada, nem a tabela).
  let tabela = loadLocalEnderecoMap();
  let tabelaMudou = false;

  const resultados: ResultadoBackfillFicha[] = [];

  const { browser, page } = await createBrowserSession(true);
  const session: BrowserSession = { browser, page, headless: false };

  try {
    for (let i = 0; i < candidatas.length; i++) {
      const c = candidatas[i];
      process.stdout.write(`[${i + 1}/${candidatas.length}] ${c.slug} (${c.origem}) `);

      const atual: FichaAtual = { local: c.local ?? null, endereco: c.endereco ?? null };

      let extracao: ExtracaoLive;
      if (!c.link_compra) {
        extracao = { nome: null, endereco: null, falhou: true };
      } else if (c.origem === "sympla") {
        extracao = await extrairSympla(session, c.link_compra);
      } else {
        extracao = await extrairClubinho(session, c.link_compra);
      }

      const decisao = decidirBackfill(atual, extracao, tabela);

      if (decisao.novoPar && decisao.local && decisao.endereco) {
        const antes = tabela;
        tabela = upsertPar(tabela, decisao.local, decisao.endereco);
        if (tabela !== antes) tabelaMudou = true;
      }

      resultados.push({ ...c, decisao });
      process.stdout.write(`${CATEGORIA_LABEL[decisao.categoria]}\n`);

      if (i < candidatas.length - 1 && delay > 0) {
        await page.waitForTimeout(delay * 1000);
      }
    }
  } finally {
    await browser.close();
  }

  printTable(resultados);

  const stats = {
    total: resultados.length,
    local_novo: resultados.filter((r) => r.decisao.categoria === "local_novo").length,
    endereco_corrigido: resultados.filter((r) => r.decisao.categoria === "endereco_corrigido").length,
    par_gravado: resultados.filter((r) => r.decisao.categoria === "par_gravado").length,
    sem_mudanca: resultados.filter((r) => r.decisao.categoria === "sem_mudanca").length,
    falhou: resultados.filter((r) => r.decisao.categoria === "falhou").length,
  };

  console.log(`\nResumo:`);
  console.log(`  Total processadas:   ${stats.total}`);
  console.log(`  local novo:          ${stats.local_novo}`);
  console.log(`  endereço corrigido:  ${stats.endereco_corrigido}`);
  console.log(`  par gravado:         ${stats.par_gravado}`);
  console.log(`  sem mudança:         ${stats.sem_mudanca}`);
  console.log(`  falhou:              ${stats.falhou}`);

  const jsonPath = await saveJson(resultados);
  console.log(`\nJSON salvo em: ${jsonPath}`);

  if (dryRun) {
    const paraAplicar = resultados.filter(
      (r) => r.decisao.categoria !== "sem_mudanca" && r.decisao.categoria !== "falhou",
    );
    console.log(
      `\n[DRY-RUN] Nenhuma alteração feita — nem Sanity, nem ${LOCAL_ENDERECO_MAP_PATH}.\n` +
        `Para aplicar ${paraAplicar.length} mudança(s), revise o JSON acima com o Rafa e rode com --execute.`,
    );
    return;
  }

  // --execute: aplica patches no Sanity
  const paraPatch = resultados.filter(
    (r) => r.decisao.categoria !== "sem_mudanca" && r.decisao.categoria !== "falhou",
  );
  console.log(`\n🔧 --execute: aplicando ${paraPatch.length} patch(es) no Sanity...\n`);

  let patchCount = 0;
  let skipCount = 0;
  for (const r of paraPatch) {
    const { patched, skipped } = await patchFicha(r._id, r.decisao.local, r.decisao.endereco, execute);
    console.log(
      `  ${patched > 0 ? "✅" : "⚠️ "} ${r.slug} — ${patched} doc(s) atualizado(s), ${skipped} ignorado(s)`,
    );
    patchCount += patched;
    skipCount += skipped;
  }
  console.log(`\nPatch completo: ${patchCount} documento(s) atualizado(s), ${skipCount} ignorado(s).`);

  if (tabelaMudou) {
    saveLocalEnderecoMap(tabela);
    console.log(`📍  Tabela nome↔endereço: ${LOCAL_ENDERECO_MAP_PATH} (${tabela.length} par(es) total)`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
