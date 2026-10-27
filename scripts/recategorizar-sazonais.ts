#!/usr/bin/env tsx
/**
 * recategorizar-sazonais.ts
 * US-I60 AC5 — Recategoriza fichas já publicadas para as categorias
 * "natal", "halloween" e "danca" (criadas na US-I60).
 *
 * Estratégia:
 *  1. Busca todas as fichas `atracao` (publicadas + drafts) no Sanity.
 *  2. Aplica a MESMA inferência do pipeline (inferirCategoriaPorKeyword, palavra
 *     inteira, sobre nome + local). Só interessa quando o resultado é uma das 3
 *     categorias novas; festa-junina e colonia-de-ferias vencem as sazonais na
 *     ordem das regras, então não são sobrescritas.
 *  3. Agrupa published + draft pelo id base: o patch vai nas duas versões que
 *     existirem. Erro de patch NÃO é engolido.
 *  4. --dry-run lista tudo e salva JSON em data/output/; --execute aplica.
 *
 * Uso (raiz do projeto Cursor):
 *   pnpm recategorizar-sazonais --dry-run | tee data/output/recategorizar-sazonais-dry-run.log
 *   pnpm recategorizar-sazonais --execute
 *
 * Protocolo: sempre --dry-run primeiro, validar a lista com o Rafa, só então
 * --execute (CLAUDE.md). Não chama LLM.
 */

import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { inferirCategoriaPorKeyword } from "./pipeline-ia/categoria-inferencia";

export const CATEGORIAS_ALVO = ["natal", "halloween", "danca"] as const;
type CategoriaAlvo = (typeof CATEGORIAS_ALVO)[number];

export interface FichaSanity {
  _id: string;
  nome: string;
  slug: string | null;
  categoria: string | null;
  local: string | null;
  status: string | null;
}

export interface Mudanca {
  baseId: string;
  slug: string;
  nome: string;
  local: string;
  status: string;
  de: string;
  para: CategoriaAlvo;
  /** Ids existentes a receber o patch (published e/ou draft). */
  ids: string[];
}

/** Decisão do Rafa (27/10/2026): só fichas em operação entram na recategorização. */
const STATUS_ELEGIVEL = "operando";

/** Casos duvidosos excluídos pelo Rafa (27/10/2026): festa/show, não espetáculo; slug aponta Halloween. */
export const SLUGS_EXCLUIDOS = ["fossa-dancante", "cypher-do-passinho-halloween-dicro"];

const QUERY =`*[_type == "atracao"]{ _id, nome, "slug": slug.current, categoria, local, status } | order(nome asc)`;

function ehAlvo(c: string | null): c is CategoriaAlvo {
  return c !== null && (CATEGORIAS_ALVO as readonly string[]).includes(c);
}

/** Pura: decide quais fichas mudam de categoria. Agrupa published + draft. */
export function planejarMudancas(fichas: FichaSanity[]): Mudanca[] {
  const porBase = new Map<string, FichaSanity[]>();
  for (const f of fichas) {
    const base = f._id.replace(/^drafts\./, "");
    porBase.set(base, [...(porBase.get(base) ?? []), f]);
  }

  const mudancas: Mudanca[] = [];
  for (const [baseId, versoes] of Array.from(porBase.entries())) {
    // Draft é a versão mais recente em edição; senão a publicada.
    const ref = versoes.find((v) => v._id.startsWith("drafts.")) ?? versoes[0];
    if (ref.status !== STATUS_ELEGIVEL || SLUGS_EXCLUIDOS.includes(ref.slug ?? "")) continue;
    const inferida = inferirCategoriaPorKeyword(ref.nome ?? "", "", ref.local ?? "");
    if (!ehAlvo(inferida) || inferida === ref.categoria) continue;
    mudancas.push({
      baseId,
      slug: ref.slug ?? "",
      nome: ref.nome,
      local: ref.local ?? "",
      status: ref.status ?? "",
      de: ref.categoria ?? "",
      para: inferida,
      ids: versoes.map((v) => v._id),
    });
  }
  return mudancas;
}

function parseArgs(argv: string[]): { dryRun: boolean; execute: boolean } {
  const dryRun = argv.includes("--dry-run");
  const execute = argv.includes("--execute");
  if (!dryRun && !execute) {
    throw new Error("Uso: informe --dry-run (preview) ou --execute (aplica patches).");
  }
  if (dryRun && execute) throw new Error("Use --dry-run OU --execute, não ambos.");
  return { dryRun, execute };
}

async function main() {
  const { dryRun, execute } = parseArgs(process.argv);
  if (!hasSanityConfig()) throw new Error("Config do Sanity ausente (.env.local).");
  if (execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório com --execute)");
  }

  console.log(`\n[recategorizar-sazonais] Modo: ${dryRun ? "DRY-RUN" : "EXECUTE ⚠️"}`);

  const fichas = await sanityWriteClient.fetch<FichaSanity[]>(QUERY);
  const bases = new Set(fichas.map((f) => f._id.replace(/^drafts\./, "")));
  console.log(`Documentos lidos: ${fichas.length} (${bases.size} fichas distintas)\n`);

  const mudancas = planejarMudancas(fichas);
  console.log(`Mudanças propostas: ${mudancas.length}\n`);
  for (const alvo of CATEGORIAS_ALVO) {
    const lista = mudancas.filter((m) => m.para === alvo);
    console.log(`${alvo.toUpperCase()} (${lista.length}):`);
    for (const m of lista) {
      console.log(
        `  • "${m.nome}" [${m.de} → ${m.para}] status=${m.status} local="${m.local}" slug=${m.slug} ids=${m.ids.join(",")}`,
      );
    }
    console.log("");
  }

  const dir = join(process.cwd(), "data", "output");
  await mkdir(dir, { recursive: true });
  const arquivo = join(dir, `recategorizar-sazonais-${dryRun ? "dry-run" : "execute"}.json`);
  await writeFile(arquivo, JSON.stringify(mudancas, null, 2) + "\n", "utf8");
  console.log(`JSON salvo em ${arquivo}`);

  if (dryRun) {
    console.log("\n[DRY-RUN] Nenhuma alteração feita. Valide a lista com o Rafa antes do --execute.\n");
    return;
  }

  let patches = 0;
  for (const m of mudancas) {
    for (const id of m.ids) {
      await sanityWriteClient.patch(id).set({ categoria: m.para }).commit();
      patches++;
      console.log(`  ✓ ${id}: ${m.de} → ${m.para}`);
    }
  }
  console.log(`\nConcluído: ${patches} patch(es) em ${mudancas.length} ficha(s).\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
