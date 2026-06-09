#!/usr/bin/env tsx
/**
 * cleanup-proxima-data.ts
 * Corrige atrações permanentes e recorrentes que têm proxima_data preenchida
 * indevidamente — campo só faz sentido pra evento_pontual.
 *
 * O que faz:
 *   1. Busca atrações com tipo_programacao = "permanente" | "evento_recorrente"
 *      que tenham proxima_data definida.
 *   2. Zera proxima_data (unset).
 *   3. Se status = "encerrada", reverte para "operando" (assumindo que foi
 *      expirada erroneamente por causa da proxima_data incorreta).
 *   4. Aplica em published + draft (lição US-P1).
 *
 * Uso:
 *   pnpm cleanup-proxima-data --dry-run    → lista sem escrever
 *   pnpm cleanup-proxima-data              → aplica
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");

const hoje = new Date().toISOString().slice(0, 10);

interface AtracaoParaLimpar {
  _id: string;
  slug: string;
  nome: string;
  tipo_programacao: string;
  proxima_data: string;
  status: string;
}

async function patchBothVersions(
  baseId: string,
  set: Record<string, string>,
  unset: string[],
): Promise<number> {
  const prefixes = ["", "drafts."];
  let patched = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      let mutation = sanityWriteClient.patch(id);
      if (Object.keys(set).length > 0) mutation = mutation.set(set);
      if (unset.length > 0) mutation = mutation.unset(unset);
      await mutation.commit();
      console.log(`  ✓ ${id}`);
      patched++;
    } catch {
      // Documento não existe (sem draft) — ok
    }
  }

  return patched;
}

async function main() {
  console.log(`\nModo: ${DRY_RUN ? "DRY RUN (sem escrita)" : "LIMPEZA (escrita real)"}`);
  console.log(`Data de referência: ${hoje}\n`);

  const docs = await sanityWriteClient.fetch<AtracaoParaLimpar[]>(
    `*[_type == "atracao"
       && tipo_programacao in ["permanente", "evento_recorrente"]
       && defined(proxima_data)]
     | order(tipo_programacao asc, nome asc)
     { _id, "slug": slug.current, nome, tipo_programacao, proxima_data, status }`,
  );

  if (docs.length === 0) {
    console.log("Nenhuma atração permanente/recorrente com proxima_data. Tudo ok!");
    return;
  }

  console.log(
    "TIPO".padEnd(20) +
      "NOME".padEnd(40) +
      "PROXIMA_DATA".padEnd(14) +
      "STATUS_ATUAL",
  );
  console.log("─".repeat(100));

  let reativar = 0;
  for (const doc of docs) {
    const tipo = doc.tipo_programacao.padEnd(20);
    const nome = (doc.nome ?? "").slice(0, 38).padEnd(40);
    const data = (doc.proxima_data ?? "").padEnd(14);
    const status = doc.status ?? "(sem status)";
    const flag = doc.status === "encerrada" ? "  ← será reativada" : "";
    console.log(`${tipo}${nome}${data}${status}${flag}`);
    if (doc.status === "encerrada") reativar++;
  }

  console.log(`\nTotal: ${docs.length} atração(ões) para limpar.`);
  console.log(`Serão reativadas (encerrada → operando): ${reativar}`);

  if (DRY_RUN) {
    console.log("\nDRY RUN: nenhuma alteração feita. Remova --dry-run para aplicar.");
    return;
  }

  console.log("\nAplicando limpeza...\n");

  let totalPatched = 0;

  for (const doc of docs) {
    const baseId = doc._id.replace(/^drafts\./, "");
    const set: Record<string, string> = {};
    if (doc.status === "encerrada") set.status = "operando";

    console.log(`→ ${doc.nome} (${doc.tipo_programacao})`);
    totalPatched += await patchBothVersions(baseId, set, ["proxima_data"]);
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões atualizadas no Sanity: ${totalPatched}`);
  console.log(`  proxima_data zerada em: ${docs.length} atrações`);
  console.log(`  Reativadas (encerrada → operando): ${reativar}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
