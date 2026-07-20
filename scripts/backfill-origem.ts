#!/usr/bin/env tsx
/**
 * backfill-origem.ts
 * US-S54 — Backfill retroativo do campo `origem` (renomeado de `partner` no
 * schema Sanity) para fichas já publicadas ANTES da migração de schema desta
 * story. O schema Studio já usa só `origem`, mas documentos publicados antes
 * da migração ainda têm o valor gravado sob a chave legada `partner`.
 *
 * Estratégia (mesmo padrão de scripts/backfill-origem-clubinho.ts):
 *  1. Busca docs `atracao` PUBLICADOS no Sanity com `partner` definido e
 *     `origem` ainda não definido.
 *  2. --dry-run: lista quantidade + slugs + valor de partner atual,
 *     sem escrever nada.
 *  3. --execute: copia partner -> origem e remove o campo legado `partner`,
 *     apenas nas fichas PUBLICADAS (escopo declarado no AC2 da story —
 *     drafts são listados à parte para o Rafa decidir manualmente).
 *  4. Pós-execução: reconfirma que não sobra nenhuma ficha publicada
 *     divergente.
 *
 * Uso (na raiz do projeto Cursor — precisa do dotenv-cli pra carregar
 * NEXT_PUBLIC_SANITY_PROJECT_ID/SANITY_API_TOKEN de .env.local, mesmo padrão
 * dos outros scripts do package.json):
 *   pnpm dotenv -e .env.local -- tsx scripts/backfill-origem.ts --dry-run
 *   pnpm dotenv -e .env.local -- tsx scripts/backfill-origem.ts --execute
 */

import { fileURLToPath } from "node:url";
import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const EXECUTE = process.argv.includes("--execute");

// GROQ: docs com o campo legado `partner` ainda presente e `origem` ausente.
const QUERY = `*[_type == "atracao" && defined(partner) && !defined(origem)]{
  _id, "slug": slug.current, nome, "partnerAtual": partner
}`;

export type AtracaoDocLegado = {
  _id: string;
  slug: string | null;
  nome: string;
  partnerAtual: string;
};

export async function fetchAfetadas(): Promise<AtracaoDocLegado[]> {
  return sanityWriteClient.fetch(QUERY);
}

export function isDraft(id: string): boolean {
  return id.startsWith("drafts.");
}

function printLista(label: string, docs: AtracaoDocLegado[]) {
  console.log(`${label}:`);
  docs.forEach((d) =>
    console.log(
      `  • ${d._id}  slug: ${d.slug ?? "(sem slug)"}  partner atual: ${d.partnerAtual}  nome: ${d.nome}`,
    ),
  );
}

async function main() {
  if (!DRY_RUN && !EXECUTE) {
    console.error("Uso: informe --dry-run ou --execute.");
    process.exit(1);
  }

  const afetadas = await fetchAfetadas();
  const publicadas = afetadas.filter((d) => !isDraft(d._id));
  const drafts = afetadas.filter((d) => isDraft(d._id));

  console.log(`Modo: ${DRY_RUN ? "DRY RUN (sem escrita)" : "EXECUTE (patch real)"}\n`);
  console.log(
    `Total afetadas: ${afetadas.length} (publicadas: ${publicadas.length} | drafts: ${drafts.length})\n`,
  );

  if (afetadas.length === 0) {
    console.log("Nenhuma ficha para migrar. Tudo ok!");
    return;
  }

  printLista("Publicadas (escopo desta story)", publicadas);
  if (drafts.length > 0) {
    console.log(
      "\nDrafts com o mesmo campo legado (fora do escopo declarado no AC2 — listadas à parte):",
    );
    printLista("Drafts", drafts);
  }

  if (DRY_RUN) {
    console.log(
      "\nDRY RUN: nenhuma alteração feita. Valide a lista acima com o Rafa antes de rodar --execute.",
    );
    return;
  }

  // EXECUTE: só migra as publicadas — escopo declarado no AC2 da story.
  let patched = 0;
  for (const doc of publicadas) {
    await sanityWriteClient
      .patch(doc._id)
      .set({ origem: doc.partnerAtual })
      .unset(["partner"])
      .commit();
    console.log(`PATCH ${doc._id} -> origem: "${doc.partnerAtual}" (partner removido)`);
    patched++;
  }
  console.log(`\nMigradas: ${patched}`);

  // Pós-execução: reconfirma que não sobra ficha publicada divergente.
  const restantes = (await fetchAfetadas()).filter((d) => !isDraft(d._id));
  if (restantes.length === 0) {
    console.log("Pós-execução: nenhuma ficha publicada com partner definido e origem ausente. OK.");
  } else {
    console.error(`Pós-execução: ainda restam ${restantes.length} fichas publicadas divergentes!`);
    printLista("Restantes", restantes);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Erro fatal:", err);
    process.exit(1);
  });
}
