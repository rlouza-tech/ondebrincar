#!/usr/bin/env tsx
/**
 * Processa a coleção "Onde Brincar" do Raindrop — US-S19
 *
 * Fluxo é manual assistido (decisão do Discovery 2026-06-11, reconfirmada no
 * spike da US-S19): Claude lê cada item pendente (API/WebFetch por padrão,
 * Chrome só quando o domínio exigir — ver Handoff-US-S19) e monta um JSON
 * com o formato canônico LinhaInput + raindrop_id. Este script pega esse
 * JSON e reaproveita o restante do pipeline (dedup, geo, link, Gemini,
 * quality gate, escrita no Sanity) sem CSV intermediário.
 *
 * Uso:
 *   pnpm raindrop-process --list
 *   pnpm raindrop-process <lote.json> --dry-run
 *   pnpm raindrop-process <lote.json> --execute
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityClient, sanityWriteClient } from "@/lib/sanity/client";
import {
  buildLinhaEnriquecida,
  buildSlug,
  resolveCategoria,
} from "@/scripts/pipeline-ia/index";
import { enrichLinha, waitForRateLimit, QuotaExhaustedError } from "@/scripts/pipeline-ia/gemini";
import { evaluate } from "@/scripts/pipeline-ia/quality-gate";
import { getReferenceDateIso } from "@/scripts/pipeline-ia/reference-date";
import { filterGeo } from "@/scripts/pipeline-ia/geo-filter";
import { filterLinkCompra } from "@/scripts/pipeline-ia/link-validator";
import {
  fetchExistingSlugs,
  fetchRejectedSlugs,
  generateAndAttachImage,
} from "@/scripts/import-sanity/index";
import { toSanityDoc } from "@/scripts/import-sanity/mapper";
import { filterExpiredPreGemini } from "./expired-filter";
import { listCollectionItems, moveToCollection, ONDE_BRINCAR_COLLECTION_ID } from "./raindrop-client";
import type { RaindropLinhaInput, RaindropOutcome, RaindropProcessResultItem } from "./types";

interface CliOptions {
  mode: "list" | "process";
  inputPath?: string;
  dryRun: boolean;
  execute: boolean;
  model: string;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: CliOptions = { mode: "process", dryRun: false, execute: false, model: "gemini-2.5-flash" };
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--list") {
      options.mode = "list";
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--execute") {
      options.execute = true;
    } else if (arg === "--model") {
      const next = args[index + 1];
      if (!next) throw new Error("--model precisa de um valor");
      options.model = next;
      index += 1;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (options.mode === "process") {
    if (positional.length === 0) {
      throw new Error(
        "Uso: pnpm raindrop-process --list\n" +
        "  ou: pnpm raindrop-process <lote.json> --dry-run\n" +
        "  ou: pnpm raindrop-process <lote.json> --execute",
      );
    }
    options.inputPath = positional[0];
    if (!options.dryRun && !options.execute) {
      throw new Error("Informe --dry-run (preview) ou --execute (grava no Sanity e move no Raindrop)");
    }
    if (options.dryRun && options.execute) {
      throw new Error("Use --dry-run OU --execute, não ambos");
    }
  }

  return options;
}

async function runList(): Promise<void> {
  const items = await listCollectionItems(ONDE_BRINCAR_COLLECTION_ID);
  console.log(`Itens pendentes em "Onde Brincar": ${items.length}\n`);
  for (const item of items) {
    console.log(`raindrop_id: ${item._id}`);
    console.log(`  title:  ${item.title}`);
    console.log(`  link:   ${item.link}`);
    console.log(`  domain: ${item.domain}`);
    console.log(`  excerpt: ${(item.excerpt || "").slice(0, 200)}`);
    console.log(`  cover:  ${item.cover || "(sem imagem)"}`);
    console.log();
  }
}

async function loadBatch(inputPath: string): Promise<RaindropLinhaInput[]> {
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Lote inválido: esperado um array de itens no JSON");
  }
  for (let index = 0; index < parsed.length; index += 1) {
    const row = parsed[index];
    for (const field of ["raindrop_id", "nome", "venue", "bairro", "url_origem"]) {
      if (row[field] === undefined || row[field] === null || row[field] === "") {
        throw new Error(`Item ${index} do lote sem campo obrigatório: ${field}`);
      }
    }
  }
  return parsed.map((row: Partial<RaindropLinhaInput>) => ({
    categoria_origem: "",
    dias_apresentacao: "",
    desconto_percentual: "",
    preco_bruto: "",
    ...row,
  })) as RaindropLinhaInput[];
}

async function runProcess(options: CliOptions): Promise<void> {
  if (!hasSanityConfig()) {
    throw new Error("Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.");
  }
  if (options.execute && !process.env.SANITY_API_TOKEN) {
    throw new Error("SANITY_API_TOKEN ausente (obrigatório fora de --dry-run)");
  }

  const batch = await loadBatch(options.inputPath!);
  const referenceDateIso = getReferenceDateIso(new Date());
  const results: RaindropProcessResultItem[] = [];

  console.log(`Lote: ${batch.length} item(ns) — ${options.dryRun ? "DRY-RUN" : "EXECUTE"}\n`);

  // slug -> raindrop_id: os filtros do pipeline-ia operam sobre LinhaInput (sem
  // raindrop_id), então mantemos o mapeamento à parte em vez de depender do tipo
  // devolvido pelos filtros para carregar esse campo extra.
  const slugToRaindropId = new Map<string, number>();
  for (const row of batch) {
    slugToRaindropId.set(buildSlug(row), row.raindrop_id);
  }

  // Dedup DENTRO do próprio lote: mais de um link do Raindrop pode apontar para o
  // mesmo evento (ex.: dois posts de Instagram diferentes divulgando a mesma
  // atração) — sem esse check, os dois gerariam o mesmo slug e o segundo
  // colidiria na escrita do Sanity. Mantém a primeira ocorrência.
  const seenSlugs = new Set<string>();
  const dedupedBatch = batch.filter((row) => {
    const slug = buildSlug(row);
    if (seenSlugs.has(slug)) {
      results.push({ raindrop_id: row.raindrop_id, slug, nome: row.nome, outcome: "rejected_dedup", detail: "duplicado_no_lote" });
      return false;
    }
    seenSlugs.add(slug);
    return true;
  });

  // Dedup contra Sanity (published + drafts + lista negra) — mesmo critério de import-sanity.
  const [existingSlugs, rejectedSlugs] = await Promise.all([
    fetchExistingSlugs(),
    fetchRejectedSlugs(),
  ]);

  const notDuplicated = dedupedBatch.filter((row) => {
    const slug = buildSlug(row);
    const isDup = existingSlugs.has(slug) || rejectedSlugs.has(slug);
    if (isDup) {
      results.push({ raindrop_id: row.raindrop_id, slug, nome: row.nome, outcome: "rejected_dedup", detail: "ja_existe_no_sanity" });
    }
    return !isDup;
  });

  // AC7: check de expiração ANTES do Gemini, só quando data_hint foi preenchido no lote.
  const { accepted: notExpired, rejected: expiredPreGemini } = filterExpiredPreGemini(
    notDuplicated,
    referenceDateIso,
  );
  for (const rej of expiredPreGemini) {
    const originalRow = batch.find((r) => r.raindrop_id === rej.raindrop_id)!;
    results.push({
      raindrop_id: rej.raindrop_id,
      slug: buildSlug(originalRow),
      nome: rej.nome,
      outcome: "rejected_expirado_pre_gemini",
      detail: `data_hint=${rej.data_hint} < referencia=${referenceDateIso}`,
    });
  }

  const { accepted: geoAcceptedRaw, rejected: geoRejected } = filterGeo(notExpired);
  const geoAccepted = geoAcceptedRaw as RaindropLinhaInput[];
  for (const rej of geoRejected) {
    results.push({ raindrop_id: slugToRaindropId.get(rej.slug)!, slug: rej.slug, nome: rej.nome, outcome: "rejected_geo", detail: rej.motivo });
  }

  const { accepted: linkAcceptedRaw, rejected: linkRejected } = filterLinkCompra(geoAccepted);
  const linkAccepted = linkAcceptedRaw as RaindropLinhaInput[];
  for (const rej of linkRejected) {
    results.push({ raindrop_id: slugToRaindropId.get(rej.slug)!, slug: rej.slug, nome: rej.nome, outcome: "rejected_link", detail: rej.motivo });
  }

  for (let index = 0; index < linkAccepted.length; index += 1) {
    const linha = linkAccepted[index];
    const slug = buildSlug(linha);

    let enrich: Awaited<ReturnType<typeof enrichLinha>>;
    try {
      enrich = await enrichLinha(linha, options.model, { slug });
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        console.log(`\n[raindrop-process] Cota diária do Gemini atingida — parando graciosamente.`);
        console.log(`[raindrop-process] Motivo: ${error.message}`);
        break;
      }
      throw error;
    }

    const gate = evaluate(linha, enrich.resposta, { referenceDate: new Date() });
    const catResolution = resolveCategoria(linha, enrich.resposta.categoria);
    if (catResolution.inferida) {
      console.log(`  ↩ categoria inferida por keyword "${catResolution.categoria}" (Gemini: "${enrich.resposta.categoria}")`);
    }

    const enriched = buildLinhaEnriquecida(
      linha,
      enrich.resposta,
      gate.status,
      gate.reasons,
      new Date().toISOString(),
      { ai_generated: enrich.ai_generated, ai_model: enrich.ai_model, pipeline_failed: enrich.pipeline_failed },
    );

    let outcome: RaindropOutcome = gate.status === "needs_human" ? "needs_human" : "created";
    let detail = gate.status === "needs_human" ? gate.reasons.join(", ") : undefined;

    if (!options.dryRun) {
      const draftId = `drafts.atracao-${enriched.slug}`;
      const publishedId = `atracao-${enriched.slug}`;
      try {
        const existingDraft = await sanityWriteClient.getDocument(draftId);
        const existingPublished = !existingDraft ? await sanityClient.getDocument(publishedId) : null;

        if (existingPublished) {
          outcome = "skipped_published_existe";
        } else {
          const doc = toSanityDoc(enriched);
          if (existingDraft) {
            const { _id, _type, ...patchFields } = doc;
            await sanityWriteClient.patch(draftId).set(patchFields).commit();
            outcome = "updated";
          } else {
            await sanityWriteClient.create(doc);
            outcome = gate.status === "needs_human" ? "needs_human" : "created";
          }
          await generateAndAttachImage(enriched, draftId);
        }
      } catch (error) {
        outcome = "error";
        detail = error instanceof Error ? error.message : "Erro desconhecido";
      }
    }

    results.push({ raindrop_id: linha.raindrop_id, slug: enriched.slug, nome: enriched.nome, outcome, detail });

    const mark = outcome === "error" ? "✗" : outcome === "needs_human" ? "⚠" : "✓";
    console.log(`${mark} [${index + 1}/${linkAccepted.length}] ${enriched.slug} — ${outcome}${detail ? ` (${detail})` : ""}`);

    if (index < linkAccepted.length - 1) {
      await waitForRateLimit();
    }
  }

  // AC5: move todos os itens que passaram pelo pipeline (criados, atualizados,
  // rejeitados por filtro ou needs_human) para "Processados" — evita reprocessar
  // o mesmo item pendente indefinidamente. Erros de escrita ficam de fora,
  // porque não foram de fato "processados".
  if (options.execute) {
    const toMove = results.filter((r) => r.outcome !== "error");
    for (const item of toMove) {
      await moveToCollection(item.raindrop_id);
    }
    console.log(`\n${toMove.length} item(ns) movido(s) para "Processados".`);
  }

  console.log("\nDetalhe por item (todas as saídas, inclusive as filtradas antes do Gemini):");
  for (const r of results) {
    console.log(`  raindrop_id=${r.raindrop_id} slug=${r.slug} nome="${r.nome}" outcome=${r.outcome}${r.detail ? ` detail="${r.detail}"` : ""}`);
  }

  console.log("\nResumo");
  const counts: Record<string, number> = {};
  for (const r of results) counts[r.outcome] = (counts[r.outcome] ?? 0) + 1;
  console.log(JSON.stringify(counts, null, 2));
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.mode === "list") {
    await runList();
  } else {
    await runProcess(options);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
