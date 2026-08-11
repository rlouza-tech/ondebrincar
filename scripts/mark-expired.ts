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
  data_fim?: string;
  status: string;
}

// US-S37: eventos multi-dia contínuos (ex.: colônia de férias 6-10/jul) ganham data_fim —
// a data efetiva de encerramento passa a ser data_fim (último dia), não proxima_data
// (que é só o 1º dia). Sem data_fim, comportamento anterior é preservado.
export function estaVencida(
  doc: Pick<AtracaoVencida, "proxima_data" | "data_fim">,
  hoje: string,
): boolean {
  const dataEfetiva = doc.data_fim ?? doc.proxima_data;
  return dataEfetiva < hoje;
}

// Dado o conjunto de atrações com proxima_data vencida, retorna só as que
// devem ser marcadas como "encerrada": somente status "operando" — mesmo
// critério já usado pelo Studio (sanity/structure.ts, aba ⚠️ Expiradas).
// Qualquer outro status (rejeitado, em_obras, esgotada, etc.) é allowlist,
// não blocklist: não reclassificamos por exclusão, só por inclusão
// explícita, pra não repetir o mesmo tipo de bug se um novo status surgir.
export function selecionarParaEncerrar(
  docs: AtracaoVencida[],
): AtracaoVencida[] {
  return docs.filter((doc) => doc.status === "operando");
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

  // Busca um superconjunto (proxima_data futura OU data_fim futura) e refina com
  // estaVencida em JS — mesmo padrão do runReactivate/main, testável sem GROQ.
  const candidatos = await sanityWriteClient.fetch<AtracaoVencida[]>(
    `*[_type == "atracao" && status == "encerrada" && defined(proxima_data)
       && (proxima_data >= $hoje || (defined(data_fim) && data_fim >= $hoje))]
     | order(proxima_data asc)
     { _id, "slug": slug.current, nome, proxima_data, data_fim, status }`,
    { hoje },
  );
  const docs = candidatos.filter((doc) => !estaVencida(doc, hoje));

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

  // proxima_data < hoje é superconjunto de "vencida" (data_fim, quando presente, é sempre
  // >= proxima_data) — refinamos com estaVencida em JS pra excluir eventos multi-dia ainda
  // em curso (US-S37).
  const candidatos = await sanityWriteClient.fetch<AtracaoVencida[]>(
    `*[_type == "atracao" && defined(proxima_data) && proxima_data < $hoje]
     | order(proxima_data asc)
     { _id, "slug": slug.current, nome, proxima_data, data_fim, status }`,
    { hoje },
  );
  const docs = candidatos.filter((doc) => estaVencida(doc, hoje));

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
  const jaEncerradas = docs.filter((d) => d.status === "encerrada").length;
  const outrosIgnorados = docs.length - paraEncerrar.length - jaEncerradas;

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Seriam marcadas como "encerrada":`);
    for (const doc of paraEncerrar) {
      console.log(`  • ${doc._id}  (${doc.nome})`);
    }
    console.log(`\n  Seriam atualizadas: ${paraEncerrar.length}`);
    console.log(`  Já encerradas (ignoradas): ${jaEncerradas}`);
    console.log(`  Outros status ignorados: ${outrosIgnorados}`);
    console.log("\nRemova --dry-run para aplicar.");
    return;
  }

  // Escrita real
  console.log(`\nMarcando como "encerrada"...\n`);

  let totalPatched = 0;

  for (const doc of paraEncerrar) {
    // Remove prefixo "drafts." se presente para obter o ID base
    const baseId = doc._id.replace(/^drafts\./, "");

    console.log(`→ ${doc.nome} (${baseId})`);
    const { patched } = await patchBothVersions(baseId, { status: "encerrada" });
    totalPatched += patched;
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões atualizadas no Sanity : ${totalPatched}`);
  console.log(`  Já encerradas (ignoradas)     : ${jaEncerradas}`);
  console.log(`  Outros status ignorados       : ${outrosIgnorados}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
