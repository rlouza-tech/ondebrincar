#!/usr/bin/env tsx
/**
 * mark-expired.ts
 * Lista atrações com proxima_data vencida e, opcionalmente, marca status = "encerrada".
 * Também reativa atrações encerradas cuja proxima_data foi atualizada para data futura.
 *
 * Uso:
 *   pnpm mark-expired --dry-run
 *   pnpm mark-expired --dry-run --mark-expired
 *   pnpm mark-expired --mark-expired
 *   pnpm mark-expired --dry-run --reactivate
 *   pnpm mark-expired --reactivate
 *
 * Flags:
 *   --dry-run        Lista sem escrever no Sanity (recomendado sempre rodar primeiro)
 *   --mark-expired   Atualiza status = "encerrada" em atrações com proxima_data vencida
 *   --reactivate     Reverte para status = "operando" atrações encerradas com proxima_data futura
 *
 * Sem nenhuma flag: apenas lista vencidas (sem escrita).
 *
 * Fluxo semanal sugerido:
 *   1. Edite proxima_data das atrações que voltaram a cartaz no Studio (aba ⚠️ Expiradas)
 *   2. pnpm mark-expired --reactivate --dry-run   → confere o que será reativado
 *   3. pnpm mark-expired --reactivate             → aplica
 *   4. pnpm mark-expired --mark-expired --dry-run → confere o que será expirado
 *   5. pnpm mark-expired --mark-expired           → aplica
 *
 * Lição US-P1: patch(id) não sincroniza o draft automaticamente.
 * Por isso iteramos ['', 'drafts.'] para cada doc encontrado.
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = process.argv.includes("--dry-run");
const MARK_EXPIRED = process.argv.includes("--mark-expired");
const REACTIVATE = process.argv.includes("--reactivate");

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

export function isFichaFechada(status?: string | null): boolean {
  return status === "encerrada" || status === "rejeitado";
}

// Dado o conjunto de atrações com proxima_data vencida, retorna só as que
// ainda devem ser marcadas como "encerrada" (fichas já fechadas — encerrada
// ou rejeitado — não são reclassificadas, preservando o motivo original).
export function selecionarParaEncerrar(
  docs: AtracaoVencida[],
): AtracaoVencida[] {
  return docs.filter((doc) => !isFichaFechada(doc.status));
}

async function patchBothVersions(
  baseId: string,
  fields: Record<string, string>,
): Promise<{ patched: number; skipped: number }> {
  const prefixes = ["", "drafts."];
  let patched = 0;
  let skipped = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      await sanityWriteClient.patch(id).set(fields).commit();
      console.log(`  ✓ ${id}`);
      patched++;
    } catch {
      // Documento pode não existir (ex: não tem draft) — ignora silenciosamente
      skipped++;
    }
  }

  return { patched, skipped };
}

async function runReactivate() {
  console.log(`\nModo: ${DRY_RUN ? "DRY RUN (sem escrita)" : "REACTIVATE (escrita real)"}`);
  console.log(`Data de referência: ${hoje}\n`);

  const docs = await sanityWriteClient.fetch<AtracaoVencida[]>(
    `*[_type == "atracao" && status == "encerrada" && defined(proxima_data) && proxima_data >= $hoje]
     | order(proxima_data asc)
     { _id, "slug": slug.current, nome, proxima_data, status }`,
    { hoje },
  );

  if (docs.length === 0) {
    console.log("Nenhuma atração encerrada com proxima_data futura. Nada a reativar.");
    return;
  }

  console.log(
    "SLUG".padEnd(36) + "NOME".padEnd(40) + "PROXIMA_DATA".padEnd(14) + "STATUS_ATUAL",
  );
  console.log("─".repeat(108));

  for (const doc of docs) {
    const slug = (doc.slug ?? "").slice(0, 34).padEnd(36);
    const nome = (doc.nome ?? "").slice(0, 38).padEnd(40);
    const data = (doc.proxima_data ?? "").padEnd(14);
    console.log(`${slug}${nome}${data}${doc.status}`);
  }

  console.log(`\nTotal: ${docs.length} atração(ões) a reativar.`);

  if (DRY_RUN) {
    console.log('\nDRY RUN: nenhuma alteração feita. Remova --dry-run para aplicar.');
    return;
  }

  let totalPatched = 0;
  console.log('\nReativando como "operando"...\n');

  for (const doc of docs) {
    const baseId = doc._id.replace(/^drafts\./, "");
    console.log(`→ ${doc.nome} (${baseId})`);
    const { patched } = await patchBothVersions(baseId, { status: "operando" });
    totalPatched += patched;
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões reativadas no Sanity: ${totalPatched}`);
}

async function main() {
  if (REACTIVATE) {
    await runReactivate();
    return;
  }

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

  const paraEncerrar = selecionarParaEncerrar(docs);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Seriam marcadas como "encerrada":`);
    for (const doc of paraEncerrar) {
      console.log(`  • ${doc._id}  (${doc.nome})`);
    }
    const jaFechadas = docs.length - paraEncerrar.length;
    console.log(`\n  Seriam atualizadas: ${paraEncerrar.length}`);
    console.log(`  Já encerradas/rejeitadas (ignoradas): ${jaFechadas}`);
    console.log("\nRemova --dry-run para aplicar.");
    return;
  }

  // Escrita real
  console.log(`\nMarcando como "encerrada"...\n`);

  let totalPatched = 0;
  const totalIgnoradas = docs.length - paraEncerrar.length;

  for (const doc of paraEncerrar) {
    // Remove prefixo "drafts." se presente para obter o ID base
    const baseId = doc._id.replace(/^drafts\./, "");

    console.log(`→ ${doc.nome} (${baseId})`);
    const { patched } = await patchBothVersions(baseId, { status: "encerrada" });
    totalPatched += patched;
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões atualizadas no Sanity       : ${totalPatched}`);
  console.log(`  Ignoradas (já encerradas/rejeitadas): ${totalIgnoradas}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
