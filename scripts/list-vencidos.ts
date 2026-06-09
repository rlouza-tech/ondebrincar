#!/usr/bin/env tsx
/**
 * list-vencidos.ts
 * Lista atrações publicadas cuja proxima_data já passou.
 * Uso: pnpm tsx scripts/list-vencidos.ts
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

async function main() {
  const docs = await sanityWriteClient.fetch<
    Array<{ _id: string; nome: string; bairro: string; proxima_data: string }>
  >(
    `*[_type == "atracao" && defined(proxima_data) && proxima_data < $hoje]
     | order(proxima_data asc)
     { _id, nome, bairro, proxima_data }`,
    { hoje },
  );

  if (docs.length === 0) {
    console.log("Nenhuma atração com data vencida encontrada.");
    return;
  }

  console.log(`\n${docs.length} atração(ões) com proxima_data vencida:\n`);
  console.log(
    "STATUS".padEnd(12) +
      "DATA".padEnd(14) +
      "NOME".padEnd(40) +
      "BAIRRO",
  );
  console.log("─".repeat(90));

  for (const doc of docs) {
    const isDraft = doc._id.startsWith("drafts.");
    const status = isDraft ? "draft" : "publicado";
    console.log(
      status.padEnd(12) +
        doc.proxima_data.padEnd(14) +
        doc.nome.slice(0, 38).padEnd(40) +
        doc.bairro,
    );
  }

  console.log("\nIDs para referência:");
  for (const doc of docs) {
    console.log(`  ${doc._id}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
