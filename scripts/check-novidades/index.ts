#!/usr/bin/env tsx
/**
 * check-novidades — pré-checagem do pipeline-ia
 *
 * Compara os slugs candidatos do CSV/JSON de origem com os slugs já
 * existentes no Sanity (published + drafts). Se não houver nenhuma
 * ficha nova, o pipeline-ia pode ser evitado — economizando créditos Gemini.
 *
 * Uso:
 *   pnpm check-novidades --source clubinho
 *   pnpm check-novidades --source sympla
 *   pnpm check-novidades --source manual
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { buildSlugFromParts } from "@/scripts/lib/slug";
import {
  normalizeClubinho,
  DEFAULT_INPUT_PATH as CLUBINHO_PATH,
} from "@/scripts/normalizer/clubinho";
import {
  normalizeSympla,
  DEFAULT_INPUT_PATH as SYMPLA_PATH,
} from "@/scripts/normalizer/sympla";
import {
  normalizeManual,
  DEFAULT_INPUT_PATH as MANUAL_PATH,
} from "@/scripts/normalizer/manual";
import type { PipelineInput } from "@/lib/pipeline/types";

type Source = "clubinho" | "sympla" | "manual";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { source: Source } {
  const args = argv.slice(2);
  let source: Source | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--source") {
      if (next !== "clubinho" && next !== "sympla" && next !== "manual") {
        throw new Error(
          `--source aceita "clubinho", "sympla" ou "manual" — recebido: "${next ?? ""}"\n` +
          `  Exemplo: pnpm check-novidades --source clubinho`,
        );
      }
      source = next as Source;
      i++;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!source) {
    throw new Error(
      "Argumento --source é obrigatório.\n" +
      "  Uso: pnpm check-novidades --source clubinho|sympla|manual",
    );
  }

  return { source };
}

// ---------------------------------------------------------------------------
// Carregar candidatos via normalizer
// ---------------------------------------------------------------------------

async function loadCandidates(
  source: Source,
): Promise<Array<{ nome: string; slug: string }>> {
  let rows: PipelineInput[];
  let inputPath: string;

  switch (source) {
    case "clubinho":
      rows = await normalizeClubinho();
      inputPath = CLUBINHO_PATH;
      break;
    case "sympla":
      rows = await normalizeSympla();
      inputPath = SYMPLA_PATH;
      break;
    case "manual":
      rows = await normalizeManual();
      inputPath = MANUAL_PATH;
      break;
  }

  console.log(`Fonte: ${source} (${inputPath})`);
  console.log(`Candidatos lidos: ${rows.length}`);

  return rows.map((r) => ({
    nome: r.nome,
    slug: buildSlugFromParts(r.nome, r.venue, r.bairro),
  }));
}

// ---------------------------------------------------------------------------
// Buscar slugs existentes no Sanity (published + drafts)
// ---------------------------------------------------------------------------

async function fetchExistingSlugs(): Promise<Set<string>> {
  const docs = await sanityWriteClient.fetch<Array<{ slug?: { current?: string } }>>(
    `*[_type == "atracao"]{slug}`,
  );
  const slugs = new Set<string>();
  for (const doc of docs) {
    const s = doc.slug?.current;
    if (s) slugs.add(s);
  }
  return slugs;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { source } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const candidates = await loadCandidates(source);

  console.log("Buscando slugs existentes no Sanity...");
  const existingSlugs = await fetchExistingSlugs();
  console.log(`Slugs no Sanity: ${existingSlugs.size}`);

  const novas = candidates.filter((c) => !existingSlugs.has(c.slug));

  console.log("");

  if (novas.length === 0) {
    console.log("Nenhuma ficha nova — pipeline-ia não é necessário.");
    // exit 2 = parada limpa por ausência de novidades (exit 0 = fichas encontradas, exit 1 = erro)
    process.exit(2);
  }

  console.log(`${novas.length} ficha(s) nova(s) encontrada(s):`);
  for (const item of novas) {
    console.log(`  • ${item.nome} (${item.slug})`);
  }
  console.log("");
  console.log(`Sugestão: pnpm pipeline-ia --source ${source}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
