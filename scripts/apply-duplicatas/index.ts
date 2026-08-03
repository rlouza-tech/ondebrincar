#!/usr/bin/env tsx
/**
 * apply-duplicatas/index.ts
 * US-S64 — aplica status = "duplicada" a slugs informados manualmente pelo Rafa.
 *
 * O relatório do check-duplicatas-cross-fonte.ts (US-S63) lista pares
 * candidatos (A, B), mas não decide qual dos dois é o duplicado — isso é
 * sempre decisão manual do Rafa (mesmo princípio do check-atualizacoes
 * --fix-dates: nunca auto-aplica sozinho). Este script recebe o(s) slug(s)
 * escolhido(s) e só então escreve no Sanity.
 *
 * Uso:
 *   pnpm apply-duplicatas --slug <slug> --dry-run
 *   pnpm apply-duplicatas --slug <slug> --execute
 *   pnpm apply-duplicatas --slug <slug-a>,<slug-b> --execute
 *   pnpm apply-duplicatas --slug <slug-a> --slug <slug-b> --execute
 *
 * Flags:
 *   --slug      Slug a marcar como duplicada. Repetível e/ou separado por
 *               vírgula. Obrigatório, pelo menos um.
 *   --execute   Escreve de fato no Sanity. Sem essa flag, o script sempre
 *               roda em modo dry-run (safe by default, mesmo padrão do
 *               mark-expired.ts).
 *   --dry-run   Aceito explicitamente por clareza no comando, mas não muda
 *               comportamento — é o padrão sem --execute.
 *
 * Lição US-P1 (replicada do mark-expired.ts): patch(id) não sincroniza o
 * draft automaticamente no Sanity. Por isso iteramos ['', 'drafts.'] para
 * cada doc encontrado.
 */

import { sanityWriteClient } from "@/lib/sanity/client";

const EXECUTE = process.argv.includes("--execute");

export interface AtracaoParaMarcar {
  _id: string;
  slug: string;
  nome: string;
  status: string;
}

/** Extrai os slugs de --slug (repetível e/ou separado por vírgula), sem duplicatas. */
export function parseSlugsArg(argv: string[]): string[] {
  const slugs = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== "--slug") continue;
    const valor = argv[i + 1];
    if (!valor || valor.startsWith("--")) continue;
    for (const slug of valor.split(",")) {
      const trimmed = slug.trim();
      if (trimmed) slugs.add(trimmed);
    }
  }

  return Array.from(slugs);
}

/** Separa quem já está duplicada (nada a fazer) de quem precisa ser marcado. */
export function planejarAplicacao(docs: AtracaoParaMarcar[]): {
  aMarcar: AtracaoParaMarcar[];
  jaDuplicadas: AtracaoParaMarcar[];
} {
  const aMarcar = docs.filter((d) => d.status !== "duplicada");
  const jaDuplicadas = docs.filter((d) => d.status === "duplicada");
  return { aMarcar, jaDuplicadas };
}

async function fetchAtracoesPorSlugs(slugs: string[]): Promise<AtracaoParaMarcar[]> {
  return sanityWriteClient.fetch<AtracaoParaMarcar[]>(
    `*[_type == "atracao" && slug.current in $slugs && !(_id in path("drafts.**"))]{
      _id, "slug": slug.current, nome, status
    }`,
    { slugs },
  );
}

async function patchBothVersions(baseId: string): Promise<number> {
  const prefixes = ["", "drafts."];
  let patched = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      await sanityWriteClient.patch(id).set({ status: "duplicada" }).commit();
      console.log(`  ✓ ${id}`);
      patched++;
    } catch {
      // Documento pode não existir (ex: não tem draft) — ignora silenciosamente
    }
  }

  return patched;
}

async function main() {
  const slugs = parseSlugsArg(process.argv);

  if (slugs.length === 0) {
    console.error("Nenhum --slug informado. Uso: pnpm apply-duplicatas --slug <slug> --dry-run");
    process.exitCode = 1;
    return;
  }

  console.log(`\nModo: ${EXECUTE ? "EXECUTE (escrita real)" : "DRY RUN (sem escrita)"}`);
  console.log(`Slugs informados: ${slugs.join(", ")}\n`);

  const docs = await fetchAtracoesPorSlugs(slugs);
  const encontrados = new Set(docs.map((d) => d.slug));
  const naoEncontrados = slugs.filter((s) => !encontrados.has(s));

  for (const doc of docs) {
    console.log(`  ${doc.slug.padEnd(40)} status atual: ${doc.status}`);
  }
  for (const slug of naoEncontrados) {
    console.log(`  ${slug.padEnd(40)} ⚠ não encontrado no Sanity (published)`);
  }

  const { aMarcar, jaDuplicadas } = planejarAplicacao(docs);

  console.log(`\nA marcar como "duplicada": ${aMarcar.length}`);
  console.log(`Já duplicada (ignoradas): ${jaDuplicadas.length}`);
  console.log(`Não encontradas: ${naoEncontrados.length}`);

  if (!EXECUTE) {
    console.log('\nDRY RUN: nenhuma alteração feita. Rode com --execute para aplicar.');
    return;
  }

  console.log('\nAplicando status = "duplicada"...\n');

  let totalPatched = 0;
  for (const doc of aMarcar) {
    const baseId = doc._id.replace(/^drafts\./, "");
    console.log(`→ ${doc.nome} (${baseId})`);
    totalPatched += await patchBothVersions(baseId);
  }

  console.log("\n─── Resultado ───────────────────────────────────────────────");
  console.log(`  Versões atualizadas no Sanity: ${totalPatched}`);
  console.log(`  Já duplicadas (ignoradas)     : ${jaDuplicadas.length}`);
  console.log(`  Não encontradas               : ${naoEncontrados.length}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
