#!/usr/bin/env tsx
/**
 * publish-encerradas.ts
 * Publica em lote todos os drafts com status == "encerrada".
 * Resultado: saem de "📝 A publicar" e vão para "⏸ Fora do ar" no Studio.
 * Não afeta o site — a query atracoesAtivas filtra por status == "operando".
 *
 * Uso:
 *   pnpm tsx scripts/publish-encerradas.ts --dry-run
 *   pnpm tsx scripts/publish-encerradas.ts --execute
 *
 * Flags:
 *   --dry-run    Lista os drafts que seriam publicados (sem escrever nada)
 *   --execute    Publica de fato (createOrReplace publicado + delete draft)
 *
 * Sempre rode --dry-run antes do --execute.
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const EXECUTE = process.argv.includes("--execute");

if (!DRY_RUN && !EXECUTE) {
  console.log("Use --dry-run para listar ou --execute para publicar.");
  process.exit(0);
}

interface AtracaoDraft {
  _id: string;
  _type: string;
  nome: string;
  status: string;
  slug?: { current: string };
}

async function main() {
  const modeLabel = DRY_RUN ? "DRY RUN (sem escrita)" : "EXECUTE (escrita real)";
  console.log(`\nModo: ${modeLabel}\n`);

  // Busca todos os drafts de atracao com status encerrada
  const drafts = await sanityWriteClient.fetch<AtracaoDraft[]>(
    `*[_id in path("drafts.**") && _type == "atracao" && status == "encerrada"]
     | order(nome asc)
     { _id, _type, nome, status, slug }`,
  );

  if (drafts.length === 0) {
    console.log("Nenhum draft com status encerrada encontrado. Nada a fazer.");
    return;
  }

  console.log("DRAFT ID".padEnd(60) + "NOME".padEnd(50) + "STATUS");
  console.log("─".repeat(120));

  for (const doc of drafts) {
    const id = doc._id.slice(0, 58).padEnd(60);
    const nome = (doc.nome ?? "(sem nome)").slice(0, 48).padEnd(50);
    console.log(`${id}${nome}${doc.status}`);
  }

  console.log(`\nTotal: ${drafts.length} draft(s) com status encerrada.`);

  if (DRY_RUN) {
    console.log("\nDRY RUN: nenhuma alteração feita. Use --execute para publicar.");
    return;
  }

  // Publicar: para cada draft, createOrReplace no ID sem "drafts." e deleta o draft
  console.log("\nPublicando...\n");

  let publicados = 0;
  let erros = 0;

  for (const draft of drafts) {
    const draftId = draft._id;
    const publishedId = draftId.replace(/^drafts\./, "");

    try {
      // Busca o documento completo do draft
      const fullDoc = await sanityWriteClient.getDocument(draftId) as Record<string, unknown>;

      if (!fullDoc) {
        console.log(`  ⚠ Draft não encontrado: ${draftId}`);
        erros++;
        continue;
      }

      // Publica: cria/substitui o documento sem prefixo drafts. e deleta o draft
      await sanityWriteClient
        .transaction()
        .createOrReplace({ ...fullDoc, _id: publishedId })
        .delete(draftId)
        .commit();

      console.log(`  ✓ ${draft.nome} (${publishedId})`);
      publicados++;
    } catch (err) {
      console.log(
        `  ✗ Erro em ${draft.nome}: ${err instanceof Error ? err.message : String(err)}`,
      );
      erros++;
    }
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Publicados com sucesso : ${publicados}`);
  console.log(`  Erros                  : ${erros}`);

  if (publicados > 0) {
    console.log(
      "\nFichas movidas para ⏸ Fora do ar no Studio. Não aparecem no site.",
    );
  }
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
