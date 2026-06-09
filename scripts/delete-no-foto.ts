#!/usr/bin/env tsx
/**
 * delete-no-foto.ts
 * Deleta todos os documentos do tipo `atracao` (publicados e drafts)
 * que não têm o campo `foto` definido no Sanity.
 *
 * Uso (na raiz do projeto Cursor):
 *   pnpm tsx scripts/delete-no-foto.ts
 */

import { sanityWriteClient } from "@/lib/sanity/client";

async function main() {
  // sanityWriteClient tem token — necessário para enxergar drafts
  const ids: string[] = await sanityWriteClient.fetch(
    `*[_type == "atracao" && !defined(foto)]._id`,
  );

  if (ids.length === 0) {
    console.log("Nenhum documento sem foto encontrado.");
    return;
  }

  console.log(`Encontrados ${ids.length} documentos sem foto. Deletando...`);

  let deleted = 0;
  for (const id of ids) {
    try {
      await sanityWriteClient.delete(id);
      console.log(`  ✓ deletado: ${id}`);
      deleted++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      console.error(`  ✗ erro ao deletar ${id}: ${message}`);
    }
  }

  console.log(`\nConcluído: ${deleted}/${ids.length} documentos deletados.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
