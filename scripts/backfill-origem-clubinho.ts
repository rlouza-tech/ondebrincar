#!/usr/bin/env tsx
/**
 * backfill-origem-clubinho.ts (renomeado de backfill-partner-clubinho.ts em US-S54)
 * US-O21 — Backfill retroativo do campo `origem` (à época `partner`, renomeado
 * em US-S54) para fichas Clubinho já publicadas antes do fix de US-S35
 * (inferOrigem() não reconhecia URLs do Clubinho de Ofertas e gravava
 * origem: "outro"), distorcendo o histórico dos eventos GA4
 * outbound_click/buy_ticket_click por canal de venda.
 *
 * Estratégia (reaproveita o padrão de scripts/patch-link-compra.ts, sem
 * decisão de arquitetura nova — conforme assumption da story):
 *  1. Busca docs `atracao` no Sanity com link_compra contendo
 *     clubinhodeofertas.com.br e origem != "clubinho".
 *  2. --dry-run: lista quantidade + slugs (publicadas e drafts separados),
 *     sem escrever nada.
 *  3. --execute: corrige origem -> "clubinho" apenas nas fichas PUBLICADAS
 *     (escopo declarado no título da story). Drafts são listadas à parte
 *     para o Rafa decidir manualmente se quer incluir.
 *  4. Pós-execução: reconfirma que não sobra nenhuma ficha publicada
 *     divergente (AC4).
 *
 * Uso (na raiz do projeto Cursor — precisa do dotenv-cli pra carregar
 * NEXT_PUBLIC_SANITY_PROJECT_ID/SANITY_API_TOKEN de .env.local, mesmo padrão
 * dos outros scripts do package.json):
 *   pnpm dotenv -e .env.local -- tsx scripts/backfill-origem-clubinho.ts --dry-run
 *   pnpm dotenv -e .env.local -- tsx scripts/backfill-origem-clubinho.ts --execute
 */

import { fileURLToPath } from "node:url";
import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const EXECUTE = process.argv.includes("--execute");

// GROQ match usa glob simples (*), não regex.
export const CLUBINHO_LINK_PATTERN = "*clubinhodeofertas.com.br*";

export type AtracaoDoc = {
  _id: string;
  slug: string | null;
  nome: string;
  link_compra: string | null;
  origem: string | null;
};

export async function fetchAfetadas(): Promise<AtracaoDoc[]> {
  return sanityWriteClient.fetch(
    `*[_type == "atracao" && link_compra match $pattern && origem != "clubinho"]{
      _id, "slug": slug.current, nome, link_compra, origem
    }`,
    { pattern: CLUBINHO_LINK_PATTERN },
  );
}

export function isDraft(id: string): boolean {
  return id.startsWith("drafts.");
}

function printLista(label: string, docs: AtracaoDoc[]) {
  console.log(`${label}:`);
  docs.forEach((d) =>
    console.log(
      `  • ${d._id}  slug: ${d.slug ?? "(sem slug)"}  origem atual: ${d.origem ?? "(vazio)"}  nome: ${d.nome}`,
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
    console.log("Nenhuma ficha para corrigir. Tudo ok!");
    return;
  }

  printLista("Publicadas (escopo desta story)", publicadas);
  if (drafts.length > 0) {
    console.log(
      "\nDrafts com o mesmo problema (fora do escopo declarado no título da story — listadas à parte):",
    );
    printLista("Drafts", drafts);
  }

  if (DRY_RUN) {
    console.log(
      "\nDRY RUN: nenhuma alteração feita. Valide a lista acima com o Rafa antes de rodar --execute.",
    );
    return;
  }

  // EXECUTE: só corrige as publicadas — escopo declarado no título da story.
  let patched = 0;
  for (const doc of publicadas) {
    await sanityWriteClient.patch(doc._id).set({ origem: "clubinho" }).commit();
    console.log(`PATCH ${doc._id} -> origem: "clubinho"`);
    patched++;
  }
  console.log(`\nCorrigidas: ${patched}`);

  // AC4: pós-execução, reconfirma que não sobra ficha publicada divergente.
  const restantes = (await fetchAfetadas()).filter((d) => !isDraft(d._id));
  if (restantes.length === 0) {
    console.log('Pós-execução: nenhuma ficha Clubinho publicada com origem != "clubinho". OK.');
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
