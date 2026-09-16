#!/usr/bin/env tsx
/**
 * reprocess-uhuu-local — US-S82
 *
 * Reprocessa fichas Uhuu já publicadas sem `local` (nome do espaço), rodando
 * o adapter de novo contra o `link_compra` — não edição manual no Sanity.
 *
 * Causa: o scraper já capturava `local_nome` da Uhuu em `venue`, mas não
 * persistia no campo `local` que o import-sanity grava. As 3 fichas
 * encontradas na revisão de 19/08 (Casa Encantada dos Gatinhos, Bento e
 * Totó, Gato Galáctico) caíram nesse buraco.
 *
 * --dry-run é o padrão. --execute só depois do dry-run validado (regra do
 * CLAUDE.md para escrita no Sanity).
 *
 * Uso:
 *   pnpm reprocess-uhuu-local                 # dry-run
 *   pnpm reprocess-uhuu-local --execute       # aplica (só após revisão)
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { parseEventDetail } from "./uhuu";

const DEFAULT_DELAY_MS = 400;

export interface FichaUhuuSemLocal {
  _id: string;
  nome: string;
  slug: string;
  link_compra?: string | null;
  local?: string | null;
}

/** Slugs das 3 fichas da revisão 19/08 que originaram a US-S82. */
export const ALVOS_US_S82 = [
  "a-casa-encantada-dos-gatinhos-teatro-bangu-shopping",
  "bento-e-toto-teatro-bangu-shopping",
  "gato-galactico-em-operacao-resgate-teatro-claro-mais-rj",
] as const;

export type ReprocessMotivo =
  | "patch_local"
  | "ja_tem_local"
  | "sem_url"
  | "url_nao_uhuu"
  | "fetch_falhou"
  | "venue_ausente";

export interface ReprocessDecisao {
  local: string | null;
  motivo: ReprocessMotivo;
}

export function isUhuuEventUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "uhuu.com";
  } catch {
    return false;
  }
}

export function fichaSemLocal(local: string | null | undefined): boolean {
  return !local?.trim();
}

/**
 * Decide se/como preencher `local` a partir do que o adapter capturou.
 * Pura — testável sem Sanity nem rede.
 *
 * `forceRefresh` cobre as 3 fichas da US-S82 que já receberam um `local`
 * manual incompleto (ex.: "Bangu Shopping" em vez de "Teatro Bangu Shopping"):
 * se o adapter capturar um nome, substitui; se a fonte falhar, preserva o
 * valor atual.
 */
export function decidirPatchLocal(opts: {
  localAtual: string | null | undefined;
  linkCompra: string | null | undefined;
  venueCapturado: string | null;
  fetchOk: boolean;
  forceRefresh?: boolean;
}): ReprocessDecisao {
  const atual = opts.localAtual?.trim() || null;
  const temLocal = Boolean(atual);

  if (temLocal && !opts.forceRefresh) {
    return { local: atual, motivo: "ja_tem_local" };
  }
  if (!opts.linkCompra?.trim()) {
    return { local: atual, motivo: temLocal ? "ja_tem_local" : "sem_url" };
  }
  if (!isUhuuEventUrl(opts.linkCompra)) {
    return { local: atual, motivo: temLocal ? "ja_tem_local" : "url_nao_uhuu" };
  }
  if (!opts.fetchOk) {
    return { local: atual, motivo: temLocal ? "ja_tem_local" : "fetch_falhou" };
  }
  const venue = opts.venueCapturado?.trim() ?? "";
  if (!venue) {
    return { local: atual, motivo: temLocal ? "ja_tem_local" : "venue_ausente" };
  }
  if (atual && atual === venue) {
    return { local: atual, motivo: "ja_tem_local" };
  }
  return { local: venue, motivo: "patch_local" };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseArgs(argv = process.argv): { execute: boolean; delayMs: number } {
  let execute = false;
  let delayMs = DEFAULT_DELAY_MS;
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--execute") execute = true;
    else if (arg === "--dry-run") execute = false;
    else if (arg === "--delay" && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        throw new Error("--delay precisa ser um número ≥ 0 (milissegundos)");
      }
      delayMs = parsed;
      i += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(
        `Argumento desconhecido: ${arg}\n  Uso: pnpm reprocess-uhuu-local [--dry-run|--execute] [--delay N]`,
      );
    }
  }
  return { execute, delayMs };
}

async function fetchCandidatas(): Promise<FichaUhuuSemLocal[]> {
  return sanityWriteClient.fetch<FichaUhuuSemLocal[]>(
    `*[_type == "atracao" && !(_id in path("drafts.**")) && origem == "uhuu" && (
        !defined(local) || local == "" || slug.current in $alvos
      )] | order(nome asc) {
      _id,
      nome,
      "slug": slug.current,
      link_compra,
      local
    }`,
    { alvos: [...ALVOS_US_S82] },
  );
}

async function capturarVenue(
  url: string,
  fetchImpl: typeof fetch,
): Promise<{ ok: boolean; venue: string | null }> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return { ok: false, venue: null };
    const detail = parseEventDetail(await res.text());
    return { ok: true, venue: detail.venue || null };
  } catch {
    return { ok: false, venue: null };
  }
}

async function patchLocal(baseId: string, local: string, execute: boolean): Promise<number> {
  const prefixes = ["", "drafts."];
  let patched = 0;
  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      if (execute) {
        await sanityWriteClient.patch(id).set({ local }).commit();
      }
      patched += 1;
    } catch {
      // Documento não existe com esse prefixo — normal para drafts.
    }
  }
  return patched;
}

export async function reprocessarFichas(
  fichas: FichaUhuuSemLocal[],
  options: {
    execute: boolean;
    delayMs: number;
    fetchImpl?: typeof fetch;
    patch?: (id: string, local: string, execute: boolean) => Promise<number>;
  },
): Promise<{ patch_local: number; puladas: number; itens: Array<FichaUhuuSemLocal & ReprocessDecisao> }> {
  const doFetch = options.fetchImpl ?? fetch;
  const doPatch = options.patch ?? patchLocal;
  const itens: Array<FichaUhuuSemLocal & ReprocessDecisao> = [];
  let patchLocalCount = 0;
  let puladas = 0;

  for (const ficha of fichas) {
    let fetchOk = false;
    let venueCapturado: string | null = null;
    if (isUhuuEventUrl(ficha.link_compra)) {
      const capturado = await capturarVenue(ficha.link_compra as string, doFetch);
      fetchOk = capturado.ok;
      venueCapturado = capturado.venue;
      if (options.delayMs > 0) await delay(options.delayMs);
    }

    const decisao = decidirPatchLocal({
      localAtual: ficha.local,
      linkCompra: ficha.link_compra,
      venueCapturado,
      fetchOk,
      forceRefresh: (ALVOS_US_S82 as readonly string[]).includes(ficha.slug),
    });
    itens.push({ ...ficha, ...decisao });

    if (decisao.motivo === "patch_local" && decisao.local) {
      const n = await doPatch(ficha._id, decisao.local, options.execute);
      const era = ficha.local?.trim() ? ` (era "${ficha.local}")` : "";
      console.log(
        `  ${options.execute ? "✅" : "[DRY]"} ${ficha.nome} → local="${decisao.local}"${era} (${n} doc(s))`,
      );
      patchLocalCount += 1;
    } else {
      console.log(`  ⏭  ${ficha.nome} — ${decisao.motivo}`);
      puladas += 1;
    }
  }

  return { patch_local: patchLocalCount, puladas, itens };
}

async function main(): Promise<void> {
  const options = parseArgs();
  if (!hasSanityConfig()) {
    throw new Error("Sanity não configurado — verifique NEXT_PUBLIC_SANITY_PROJECT_ID em .env.local");
  }

  console.log(`\n=== Reprocess Uhuu local (US-S82) ===`);
  console.log(`Modo: ${options.execute ? "EXECUTE (escreve no Sanity)" : "DRY-RUN (não escreve)"}`);

  const fichas = await fetchCandidatas();
  console.log(`Candidatas (Uhuu sem local + alvos US-S82): ${fichas.length}\n`);

  if (fichas.length === 0) {
    console.log("Nada a reprocessar.");
    return;
  }

  const { patch_local, puladas } = await reprocessarFichas(fichas, options);

  console.log(`\nResumo: ${patch_local} a preencher, ${puladas} pulada(s).`);
  if (!options.execute && patch_local > 0) {
    console.log("Dry-run ok. Pra aplicar: pnpm reprocess-uhuu-local --execute");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
