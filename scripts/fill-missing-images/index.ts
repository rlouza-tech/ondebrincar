#!/usr/bin/env tsx
/**
 * fill-missing-images — gera e anexa imagens em drafts sem foto
 *
 * Varre todos os drafts no Sanity sem campo `foto` e tenta gerar imagem
 * via Gemini. Usa o fallback anônimo (sem nome da atração) quando a geração
 * com nome é recusada (ex: fichas com IP protegido como Disney).
 *
 * Uso:
 *   pnpm fill-missing-images              ← dry-run: lista os drafts sem foto
 *   pnpm fill-missing-images --execute    ← gera e anexa imagens
 *   pnpm fill-missing-images --limit N    ← limita a N fichas (útil pra testar)
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { buildImagePrompt, buildImagePromptAnonymous } from "@/lib/prompts/image-adapter";
import { generateImage } from "@/scripts/pipeline-ia/imagen";
import type { Categoria } from "@/scripts/pipeline-ia/types";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface DraftSemFoto {
  _id: string;
  slug: string;
  nome: string;
  categoria: Categoria;
  descricao: string | null;
}

interface ImagemResult {
  slug: string;
  status: "ok" | "ok_fallback" | "failed" | "skipped";
  error?: string;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { execute: boolean; limit?: number } {
  const args = argv.slice(2);
  let execute = false;
  let limit: number | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--execute") {
      execute = true;
    } else if (arg === "--limit") {
      const val = parseInt(args[++i] ?? "", 10);
      if (isNaN(val) || val < 1) throw new Error("--limit precisa ser um inteiro positivo");
      limit = val;
    } else if (arg.startsWith("-")) {
      throw new Error(
        `Argumento desconhecido: ${arg}\n` +
        `  Uso: pnpm fill-missing-images [--execute] [--limit N]`,
      );
    }
  }

  return { execute, limit };
}

// ---------------------------------------------------------------------------
// Buscar drafts sem foto
// ---------------------------------------------------------------------------

async function fetchDocsSemFoto(): Promise<DraftSemFoto[]> {
  return sanityWriteClient.fetch<DraftSemFoto[]>(
    `*[_type == "atracao"
      && !defined(foto)
    ]{
      _id,
      "slug": slug.current,
      nome,
      categoria,
      descricao
    } | order(nome asc)`,
  );
}

// ---------------------------------------------------------------------------
// Gerar e anexar imagem para um draft
// ---------------------------------------------------------------------------

async function processarDraft(draft: DraftSemFoto): Promise<ImagemResult> {
  // Tenta com prompt completo (com nome)
  const primaryPrompt = buildImagePrompt(draft.nome, draft.categoria, draft.descricao ?? undefined);
  let result = await generateImage(primaryPrompt);
  let usedFallback = false;

  if (result.failed || !result.imageBuffer) {
    console.log(`    ⚠ primary_failed: ${result.error} — tentando fallback anônimo...`);
    const anonymousPrompt = buildImagePromptAnonymous(draft.categoria, draft.descricao ?? undefined);
    result = await generateImage(anonymousPrompt);
    usedFallback = true;
  }

  if (result.failed || !result.imageBuffer) {
    console.log(`    ✗ image_gen_failed (primary + fallback): ${result.error}`);
    return { slug: draft.slug, status: "failed", error: result.error };
  }

  try {
    const asset = await sanityWriteClient.assets.upload(
      "image",
      result.imageBuffer,
      {
        filename: `${draft.slug}.png`,
        contentType: result.mimeType,
      },
    );

    const fotoField = {
      _type: "image",
      asset: { _type: "reference", _ref: asset._id },
      alt: `Ilustração de ${draft.nome}`,
    };

    // Patch no documento encontrado (pode ser published ou draft)
    await sanityWriteClient.patch(draft._id).set({ foto: fotoField }).commit();

    // Se o documento encontrado é o publicado, patcha o draft correspondente também
    // (lição técnica: patch no publicado não atualiza o draft automaticamente)
    if (!draft._id.startsWith("drafts.")) {
      const draftId = `drafts.${draft._id}`;
      const draftDoc = await sanityWriteClient.getDocument(draftId);
      if (draftDoc) {
        await sanityWriteClient.patch(draftId).set({ foto: fotoField }).commit();
      }
    }

    const status = usedFallback ? "ok_fallback" : "ok";
    const label = usedFallback ? "✓ (fallback anônimo)" : "✓";
    console.log(`    ${label} imagem anexada (${asset._id})`);
    return { slug: draft.slug, status };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.log(`    ✗ falha no upload/patch: ${message}`);
    return { slug: draft.slug, status: "failed", error: message };
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { execute, limit } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  if (execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório em --execute)");
  }

  if (execute && !process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY ausente (obrigatório em --execute)");
  }

  console.log(`\n${"═".repeat(70)}`);
  console.log(`fill-missing-images  |  ${execute ? "MODO EXECUTE ⚡" : "dry-run (sem escrita)"}`);
  if (limit) console.log(`limite: ${limit} fichas`);
  console.log(`${"═".repeat(70)}`);

  console.log("\nBuscando atrações sem foto no Sanity (drafts + publicadas)...");
  let drafts = await fetchDocsSemFoto();

  if (limit) {
    drafts = drafts.slice(0, limit);
  }

  console.log(`Atrações sem foto encontradas: ${drafts.length}`);

  if (drafts.length === 0) {
    console.log("\n✅ Nenhuma atração sem foto. Nada a fazer.");
    process.exit(0);
  }

  console.log(`\n${"─".repeat(70)}`);

  if (!execute) {
    console.log("Drafts que receberiam imagem:\n");
    for (const d of drafts) {
      console.log(`  • ${d.slug}  [${d.categoria}]  "${d.nome}"`);
    }
    console.log(`\n${"─".repeat(70)}`);
    console.log(`\nDry-run concluído. ${drafts.length} draft(s) sem foto.`);
    console.log(`Para gerar as imagens: pnpm fill-missing-images --execute\n`);
    process.exit(0);
  }

  // Execute
  console.log(`\n⚡ Gerando imagens para ${drafts.length} draft(s)...\n`);
  const resultados: ImagemResult[] = [];

  for (let i = 0; i < drafts.length; i++) {
    const draft = drafts[i];
    console.log(`[${i + 1}/${drafts.length}] ${draft.slug}  [${draft.categoria}]`);
    const resultado = await processarDraft(draft);
    resultados.push(resultado);
  }

  // Resumo
  const ok       = resultados.filter((r) => r.status === "ok").length;
  const fallback = resultados.filter((r) => r.status === "ok_fallback").length;
  const failed   = resultados.filter((r) => r.status === "failed");

  console.log(`\n${"═".repeat(70)}`);
  console.log(`Resumo:`);
  console.log(`  ✓ Geradas com nome:     ${ok}`);
  console.log(`  ✓ Geradas (fallback):   ${fallback}`);
  console.log(`  ✗ Falhas:               ${failed.length}`);
  if (failed.length > 0) {
    console.log(`\nFalhas:`);
    for (const f of failed) {
      console.log(`  • ${f.slug}: ${f.error}`);
    }
  }
  console.log();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
