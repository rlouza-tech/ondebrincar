#!/usr/bin/env tsx
/**
 * mark-expired.ts
 * Lista atrações com proxima_data vencida e, opcionalmente, marca status = "encerrada".
 *
 * Uso:
 *   pnpm dotenv -e .env.local -- tsx scripts/mark-expired.ts --dry-run
 *   pnpm dotenv -e .env.local -- tsx scripts/mark-expired.ts --dry-run --mark-expired
 *   pnpm dotenv -e .env.local -- tsx scripts/mark-expired.ts --mark-expired
 *
 * Flags:
 *   --dry-run        Lista sem escrever no Sanity (recomendado sempre rodar primeiro)
 *   --mark-expired   Atualiza status = "encerrada" em published + draft
 *
 * Sem nenhuma flag: apenas lista (equivalente a --dry-run implícito).
 *
 * Lição US-P1: patch(id) não sincroniza o draft automaticamente.
 * Por isso iteramos ['', 'drafts.'] para cada doc encontrado.
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const MARK_EXPIRED = process.argv.includes("--mark-expired");

// Sem --mark-expired, o script só lista (safe by default)
const WILL_WRITE = MARK_EXPIRED && !DRY_RUN;

const hoje = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

interface AtracaoVencida {
  _id: string;
  slug: string;
  nome: string;
  proxima_data: string;
  status: string;
}

async function patchBothVersions(baseId: string): Promise<{ patched: number; skipped: number }> {
  const prefixes = ["", "drafts."];
  let patched = 0;
  let skipped = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      await sanityWriteClient.patch(id).set({ status: "encerrada" }).commit();
      console.log(`  ✓ ${id}`);
      patched++;
    } catch {
      // Documento pode não existir (ex: não tem draft) — ignora silenciosamente
      skipped++;
    }
  }

  return { patched, skipped };
}

async function main() {
  const modeLabel = WILL_WRITE
    ? "MARK-EXPIRED (escrita real)"
    : DRY_RUN
      ? "DRY RUN (sem escrita)"
      : "LISTAGEM (sem escrita)";

  console.log(`\nModo: ${modeLabel}`);
  console.log(`Data de referência: ${hoje}\n`);

  const docs = await sanityWriteClient.fetch<AtracaoVencida[]>(
    `*[_type == "atracao" && defined(proxima_data) && proxima_data < $hoje]
     | order(proxima_data asc)
     { _id, "slug": slug.current, nome, proxima_data, status }`,
    { hoje },
  );

  if (docs.length === 0) {
    console.log("Nenhuma atração com proxima_data vencida. Tudo ok!");
    return;
  }

  // Cabeçalho da tabela
  console.log(
    "SLUG".padEnd(36) +
      "NOME".padEnd(40) +
      "PROXIMA_DATA".padEnd(14) +
      "STATUS_ATUAL",
  );
  console.log("─".repeat(108));

  for (const doc of docs) {
    const slug = (doc.slug ?? "").slice(0, 34).padEnd(36);
    const nome = (doc.nome ?? "").slice(0, 38).padEnd(40);
    const data = (doc.proxima_data ?? "").padEnd(14);
    const status = doc.status ?? "(sem status)";
    console.log(`${slug}${nome}${data}${status}`);
  }

  console.log(`\nTotal: ${docs.length} atração(ões) com proxima_data vencida.`);

  if (!MARK_EXPIRED) {
    console.log("\nNenhuma alteração feita. Use --mark-expired para atualizar status.");
    return;
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Seriam marcadas como "encerrada":`);
    for (const doc of docs) {
      if (doc.status !== "encerrada") {
        console.log(`  • ${doc._id}  (${doc.nome})`);
      }
    }
    const jaEncerradas = docs.filter((d) => d.status === "encerrada").length;
    const pendentes = docs.filter((d) => d.status !== "encerrada").length;
    console.log(`\n  Seriam atualizadas: ${pendentes}`);
    console.log(`  Já encerradas (ignoradas): ${jaEncerradas}`);
    console.log("\nRemova --dry-run para aplicar.");
    return;
  }

  // Escrita real
  console.log(`\nMarcando como "encerrada"...\n`);

  let totalPatched = 0;
  let totalIgnoradas = 0;

  for (const doc of docs) {
    if (doc.status === "encerrada") {
      totalIgnoradas++;
      continue;
    }

    // Remove prefixo "drafts." se presente para obter o ID base
    const baseId = doc._id.replace(/^drafts\./, "");

    console.log(`→ ${doc.nome} (${baseId})`);
    const { patched } = await patchBothVersions(baseId);
    totalPatched += patched;
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões atualizadas no Sanity : ${totalPatched}`);
  console.log(`  Ignoradas (já encerradas)     : ${totalIgnoradas}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
