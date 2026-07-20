#!/usr/bin/env tsx
/**
 * patch-link-compra.ts
 * Corrige fichas Sanity cujo link_compra aponta para URL de listagem
 * (ex: clubinhodeofertas.com.br/rio-de-janeiro) em vez da URL de produto
 * (ex: clubinhodeofertas.com.br/rio-de-janeiro/nome-da-peca-1234).
 *
 * Estratégia:
 *  1. Busca todos os docs `atracao` com link_compra inválido no Sanity.
 *  2. Carrega planilha-origem.csv (scraper v2) para montar mapa slug → url_origem.
 *  3. Para cada doc inválido, tenta cruzar pelo slug.
 *  4. Encontrado: patch link_compra + origem. Não encontrado: imprime para revisão manual.
 *
 * Uso (na raiz do projeto Cursor):
 *   pnpm tsx scripts/patch-link-compra.ts
 *   pnpm tsx scripts/patch-link-compra.ts --dry-run   # apenas lista, não patcha
 */

import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { sanityWriteClient } from "@/lib/sanity/client";

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const CSV_PATH = path.resolve(
  import.meta.dirname,
  "../data/input/planilha-origem.csv",
);

// Padrão de URL de PRODUTO válida do Clubinho
// Ex: https://clubinhodeofertas.com.br/rio-de-janeiro/nome-da-peca-3701
const PRODUCT_URL_PATTERN =
  /clubinhodeofertas\.com\.br\/rio-de-janeiro\/[a-z0-9-]+-\d+/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function inferOrigem(url: string): "sympla" | "eventim" | "clubinho" | "outro" {
  if (/sympla\.com\.br/i.test(url)) return "sympla";
  if (/eventim\.com\.br/i.test(url)) return "eventim";
  if (/clubinhodeofertas\.com\.br/i.test(url)) return "clubinho";
  return "outro";
}

function slugify(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// US-S26: mesmo truncamento de pipeline-ia/index.ts::buildSlug e
// lib/slug.ts::buildSlugFromParts, replicado aqui de propósito (comentário
// acima já documenta que esta função reconstrói o slug do mesmo jeito, pra
// não quebrar o cruzamento CSV↔Sanity). Limite de 113 chars = 128 (limite de
// _id do Sanity) - 15 ("drafts.atracao-").
const SLUG_MAX_LENGTH = 113;
const HASH_LENGTH = 6;

function truncateSlug(slug: string): string {
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  const hash = createHash("sha1").update(slug).digest("hex").slice(0, HASH_LENGTH);
  const suffix = `-${hash}`;
  const targetLength = SLUG_MAX_LENGTH - suffix.length;
  const cut = slug.slice(0, targetLength);
  const lastDash = cut.lastIndexOf("-");
  // Corta na última palavra inteira em vez de partir uma palavra ao meio.
  const trimmed = lastDash > 0 ? cut.slice(0, lastDash) : cut;
  return `${trimmed}${suffix}`;
}

// Reconstrói slug da mesma forma que pipeline-ia/index.ts: slugify(nome + " " + venue)
export function buildSlugFromRow(row: Record<string, string>): string {
  const nome = row["nome"] ?? "";
  const venue = row["venue"] ?? row["bairro"] ?? "";
  return truncateSlug(slugify([nome, venue].filter(Boolean).join(" ")));
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sem escrita)" : "PATCH real"}\n`);

  // 1. Carrega CSV → mapa slug → url_ingresso (ou url_origem como fallback)
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV não encontrado: ${CSV_PATH}`);
    console.error(
      "Execute pnpm scrape para gerar a planilha-origem.csv atualizada.",
    );
    process.exit(1);
  }

  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const rows: Record<string, string>[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  const urlBySlug = new Map<string, string>();
  for (const row of rows) {
    const slug = buildSlugFromRow(row);
    // Prefere url_ingresso; cai pra url_origem se não existir ou for listagem
    const url = row["url_ingresso"] || row["url_origem"] || "";
    if (PRODUCT_URL_PATTERN.test(url)) {
      urlBySlug.set(slug, url);
    }
  }
  console.log(`CSV carregado: ${urlBySlug.size} fichas com URL de produto válida.\n`);

  // 2. Busca docs Sanity com link_compra inválido (drafts + publicados)
  const docs: Array<{ _id: string; slug: string; nome: string; link_compra: string }> =
    await sanityWriteClient.fetch(
      `*[_type == "atracao"]{_id, "slug": slug.current, nome, link_compra}`,
    );

  const invalidos = docs.filter(
    (d) => !PRODUCT_URL_PATTERN.test(d.link_compra ?? ""),
  );

  console.log(
    `Docs Sanity: ${docs.length} total | ${invalidos.length} com link_compra inválido.\n`,
  );

  if (invalidos.length === 0) {
    console.log("Nenhum doc para corrigir. Tudo ok!");
    return;
  }

  // 3. Cruza e patcha
  let patched = 0;
  let notFound = 0;
  const semCruz: string[] = [];

  for (const doc of invalidos) {
    const slug = doc.slug ?? "";
    const novaUrl = urlBySlug.get(slug);

    if (!novaUrl) {
      semCruz.push(`${doc._id}  (slug: ${slug})`);
      notFound++;
      continue;
    }

    const origem = inferOrigem(novaUrl);
    console.log(
      `${DRY_RUN ? "[DRY]" : "PATCH"} ${doc._id}\n` +
        `  de: ${doc.link_compra}\n` +
        `  para: ${novaUrl}  (origem: ${origem})\n`,
    );

    if (!DRY_RUN) {
      await sanityWriteClient
        .patch(doc._id)
        .set({ link_compra: novaUrl, origem })
        .commit();
    }
    patched++;
  }

  // 4. Relatório final
  console.log("\n─── Resultado ───────────────────────────────────────────");
  console.log(`  Corrigidos: ${patched}`);
  console.log(`  Sem cruzamento (revisar manualmente): ${notFound}`);

  if (semCruz.length > 0) {
    console.log("\n  Fichas sem URL encontrada no CSV:");
    semCruz.forEach((s) => console.log(`    • ${s}`));
    console.log(
      "\n  Ação: rode pnpm scrape --headed para atualizar o CSV e execute este script novamente.",
    );
  }

  if (DRY_RUN && patched > 0) {
    console.log("\nDRY RUN: nenhuma alteração foi feita. Remova --dry-run para aplicar.");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  });
}
