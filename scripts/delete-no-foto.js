/**
 * delete-no-foto.js
 * Deleta todos os documentos do tipo `atracao` (publicados e drafts)
 * que não têm o campo `foto` definido no Sanity.
 *
 * Uso (na raiz do projeto Cursor):
 *   node scripts/delete-no-foto.js
 *
 * Requer SANITY_API_TOKEN no .env.local
 */

const { createClient } = require("@sanity/client");
const { config } = require("dotenv");
const { join } = require("node:path");

config({ path: join(__dirname, "../.env.local") });

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const token = process.env.SANITY_API_TOKEN;

if (!projectId) {
  console.error("NEXT_PUBLIC_SANITY_PROJECT_ID não definido no .env.local");
  process.exit(1);
}
if (!token) {
  console.error("SANITY_API_TOKEN não definido no .env.local");
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: "2024-01-01",
  useCdn: false,
});

async function main() {
  // Busca ids de publicados e drafts sem foto
  const ids = await client.fetch(
    `*[_type == "atracao" && !defined(foto)]._id`
  );

  if (ids.length === 0) {
    console.log("Nenhum documento sem foto encontrado.");
    return;
  }

  console.log(`Encontrados ${ids.length} documentos sem foto. Deletando...`);

  let deleted = 0;
  for (const id of ids) {
    try {
      await client.delete(id);
      console.log(`  ✓ deletado: ${id}`);
      deleted++;
    } catch (err) {
      console.error(`  ✗ erro ao deletar ${id}:`, err.message);
    }
  }

  console.log(`\nConcluído: ${deleted}/${ids.length} documentos deletados.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
