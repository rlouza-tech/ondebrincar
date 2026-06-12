#!/usr/bin/env tsx
/**
 * recategorizar-sprint8.ts
 * Re-categoriza fichas para as 3 novas categorias: futebol, restaurante, festa-junina.
 *
 * Uso:
 *   pnpm dotenv -e .env.local -- tsx scripts/recategorizar-sprint8.ts --dry-run
 *   pnpm dotenv -e .env.local -- tsx scripts/recategorizar-sprint8.ts --apply
 *
 * Flags:
 *   --dry-run   (padrão) Lista fichas que seriam alteradas, sem escrever no Sanity
 *   --apply     Aplica as mudanças em published + draft
 */

import { sanityClient, sanityWriteClient } from "@/lib/sanity/client";

const DRY_RUN = !process.argv.includes("--apply");

// ----------------------------------------------------------------
// Mapeamento slug → categoria
// Slugs são o identificador estável no Sanity.
// Use --dry-run primeiro para confirmar que os slugs batem.
// ----------------------------------------------------------------

const RECATEGORIZACOES: Record<string, string> = {
  // Futebol
  "museu-flamengo-imersivo-shopping-via-parque": "futebol",
  "museu-flamengo-imersivo-idolo-shopping-via-parque": "futebol",
  "tour-do-maracana-estadio-do-maracana": "futebol",
  "centro-cultural-candido-jose-de-araujo-espaco-candinho-rua-sacadura-cabral-345": "futebol",
  "tour-na-gavea-museu-flamengo": "futebol",
  // Restaurante
  "circus-trattoria-circus-trattoria-shopping-nova-america": "restaurante",
  // Festa Junina — adicionados por detecção automática (nomes contêm "junina")
};

// Regras de detecção automática para festa junina e restaurante
// (complementam o mapeamento manual acima)
function detectarCategoria(nome: string, slugAtual: string, categoriaAtual: string): string | null {
  const nLower = nome.toLowerCase();
  const sLower = slugAtual.toLowerCase();

  // Festa Junina: nomes com termos típicos
  const termosJuninos = ["festa junina", "são joão", "arraial", "forró", "junin", "caipira", "quadrilha"];
  if (termosJuninos.some((t) => nLower.includes(t) || sLower.includes(t))) {
    return "festa-junina";
  }

  // Restaurante: nomes com termos típicos
  const termosRestaurante = ["restaurante", "trattoria", "bistrô", "bistro", "cantina", "pizzaria", "brunch"];
  if (termosRestaurante.some((t) => nLower.includes(t))) {
    return "restaurante";
  }

  return null;
}

interface Atracao {
  _id: string;
  slug: { current: string };
  nome: string;
  categoria: string;
}

async function patchCategoria(
  baseId: string,
  novaCategoria: string,
): Promise<{ patched: number; skipped: number }> {
  const prefixes = ["", "drafts."];
  let patched = 0;
  let skipped = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      await sanityWriteClient.patch(id).set({ categoria: novaCategoria }).commit();
      console.log(`    ✓ patched ${id}`);
      patched++;
    } catch {
      // Versão pode não existir (ex: não tem draft) — ignora
      skipped++;
    }
  }

  return { patched, skipped };
}

async function main() {
  console.log(`\n=== recategorizar-sprint8 — ${DRY_RUN ? "DRY RUN" : "APPLY"} ===\n`);

  const atracoes: Atracao[] = await sanityClient.fetch(
    `*[_type == "atracao"] { _id, slug, nome, categoria } | order(nome asc)`,
  );

  console.log(`Total de fichas no Sanity: ${atracoes.length}\n`);

  // Monta lista de mudanças propostas
  type Mudanca = { id: string; nome: string; slug: string; de: string; para: string };
  const mudancas: Mudanca[] = [];

  for (const a of atracoes) {
    const slug = a.slug?.current ?? "";
    const baseId = a._id.replace(/^drafts\./, "");

    // Prioridade 1: mapeamento manual por slug
    const categoriaPorSlug = RECATEGORIZACOES[slug];
    if (categoriaPorSlug && categoriaPorSlug !== a.categoria) {
      mudancas.push({ id: baseId, nome: a.nome, slug, de: a.categoria, para: categoriaPorSlug });
      continue;
    }

    // Prioridade 2: detecção automática por nome/slug
    const categoriaDetectada = detectarCategoria(a.nome, slug, a.categoria);
    if (categoriaDetectada && categoriaDetectada !== a.categoria) {
      mudancas.push({ id: baseId, nome: a.nome, slug, de: a.categoria, para: categoriaDetectada });
    }
  }

  if (mudancas.length === 0) {
    console.log("Nenhuma mudança necessária (todos os slugs já têm a categoria correta, ou não foram encontrados).\n");
    console.log("Dica: rode sem flags para ver todas as fichas e seus slugs atuais:\n");
    console.log("  pnpm dotenv -e .env.local -- tsx scripts/recategorizar-sprint8.ts --dry-run\n");

    // Lista as fichas existentes que têm termos futebol/restaurante/junina para diagnóstico
    const relevantes = atracoes.filter((a) => {
      const n = a.nome.toLowerCase();
      return (
        n.includes("flamengo") || n.includes("maracanã") || n.includes("maracana") ||
        n.includes("vasco") || n.includes("candinho") ||
        n.includes("circus") || n.includes("trattoria") ||
        n.includes("junin") || n.includes("arraial") || n.includes("são joão")
      );
    });

    if (relevantes.length > 0) {
      console.log("Fichas com nomes relevantes encontradas (slug atual → categoria atual):");
      relevantes.forEach((a) => {
        console.log(`  "${a.nome}"  →  slug: ${a.slug?.current}  |  categoria: ${a.categoria}`);
      });
      console.log("\nAtualize RECATEGORIZACOES no script com os slugs corretos e rode novamente.");
    }
    return;
  }

  // Diagnóstico de futebol: mostra fichas com termos relevantes independente do mapeamento
  const candidatasFutebol = atracoes.filter((a) => {
    const n = a.nome.toLowerCase();
    const s = a.slug?.current?.toLowerCase() ?? "";
    return (
      n.includes("flamengo") || n.includes("maracanã") || n.includes("maracana") ||
      n.includes("vasco") || n.includes("candinho") ||
      s.includes("flamengo") || s.includes("maracana") || s.includes("vasco")
    );
  });

  if (candidatasFutebol.length > 0) {
    console.log(`Fichas com nomes de futebol (${candidatasFutebol.length}) — confirme slugs para o mapeamento:`);
    candidatasFutebol.forEach((a) => {
      const mapeado = RECATEGORIZACOES[a.slug?.current ?? ""] ? "✓ mapeado" : "⚠ não mapeado";
      console.log(`  ${mapeado}  "${a.nome}"  →  slug: ${a.slug?.current}  |  categoria atual: ${a.categoria}`);
    });
    console.log("");
  } else {
    console.log("⚠ Nenhuma ficha de futebol encontrada (Flamengo/Maracanã/Vasco). Ainda não estão no Sanity?\n");
  }

  // Exibe resumo das mudanças
  console.log(`Mudanças propostas (${mudancas.length}):\n`);

  const porCategoria: Record<string, Mudanca[]> = {};
  for (const m of mudancas) {
    porCategoria[m.para] = [...(porCategoria[m.para] ?? []), m];
  }

  for (const [cat, lista] of Object.entries(porCategoria)) {
    console.log(`  ${cat.toUpperCase()} (${lista.length}):`);
    lista.forEach((m) => console.log(`    • "${m.nome}"  [${m.de} → ${m.para}]  slug: ${m.slug}`));
  }

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Nenhuma alteração feita. Use --apply para aplicar.\n");
    return;
  }

  // Aplica
  console.log("\nAplicando...\n");
  // Deduplica por baseId (a query retorna published; drafts são tratados dentro de patchCategoria)
  const vistos = new Set<string>();
  let totalPatched = 0;
  let totalSkipped = 0;

  for (const m of mudancas) {
    if (vistos.has(m.id)) continue;
    vistos.add(m.id);

    console.log(`  "${m.nome}"  [${m.de} → ${m.para}]`);
    const { patched, skipped } = await patchCategoria(m.id, m.para);
    totalPatched += patched;
    totalSkipped += skipped;
  }

  console.log(`\nConcluído. ${totalPatched} patches aplicados, ${totalSkipped} versões inexistentes ignoradas.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
