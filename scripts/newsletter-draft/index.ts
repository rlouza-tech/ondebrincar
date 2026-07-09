#!/usr/bin/env tsx
/**
 * newsletter-draft — US-N2
 *
 * Consulta o Sanity, classifica as atrações em 3 seções (Novidades / Só esse
 * fim de semana / Permanentes) e gera um arquivo HTML pronto pra copy-paste
 * no editor do Beehiiv — sem integração via API no MVP (AC3).
 *
 * Persiste a data desta rodada em data/newsletter-state.json (AC4) — a
 * próxima execução usa essa data como corte pra calcular "Novidades".
 *
 * Uso:
 *   pnpm newsletter-draft
 *
 * Pré-requisitos (DoR): US-N1 e US-N3 concluídas.
 */

import { fileURLToPath } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { hasSanityConfig, sanityClient } from "@/lib/sanity/client";
import { classificarAtracoes } from "./classify";
import { gerarHtml, contagemPorSecao } from "./format";
import { lerState, salvarState } from "./state";
import type { AtracaoNewsletter } from "./types";

async function fetchAtracoesElegiveis(): Promise<AtracaoNewsletter[]> {
  const groqQuery = `*[_type == "atracao"
    && !(_id in path("drafts.**"))
    && status == "operando"
  ]{
    _id,
    nome,
    "slug": slug.current,
    bairro,
    status,
    proxima_data,
    _createdAt,
    mini_review,
    descricao
  }`;

  return sanityClient.fetch<AtracaoNewsletter[]>(groqQuery);
}

async function salvarHtml(html: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });

  const filename = `newsletter-draft-${timestamp}.html`;
  const filepath = join(outputDir, filename);
  await writeFile(filepath, html, "utf-8");
  return filepath;
}

async function main(): Promise<void> {
  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  console.log("\n[newsletter-draft] Consultando Sanity...");
  const atracoes = await fetchAtracoesElegiveis();
  console.log(`[newsletter-draft] Atrações status=operando encontradas: ${atracoes.length}`);

  const state = await lerState();
  const lastDraftDate = state ? new Date(state.lastDraftDate) : null;
  if (lastDraftDate) {
    console.log(`[newsletter-draft] Último draft: ${lastDraftDate.toISOString()}`);
  } else {
    console.log(
      "[newsletter-draft] Nenhum draft anterior encontrado — primeira execução. " +
        "Usando fallback de 7 dias pra seção Novidades.",
    );
  }

  const now = new Date();
  const resultado = classificarAtracoes(atracoes, { now, lastDraftDate });

  const contagem = contagemPorSecao(resultado);
  if (contagem) {
    console.log(`[newsletter-draft] Classificação: ${contagem}`);
  } else {
    console.log("[newsletter-draft] Nenhuma atração elegível nesta rodada — todas as seções vazias.");
  }

  const html = gerarHtml(resultado);
  const filepath = await salvarHtml(html);
  console.log(`\n[newsletter-draft] Rascunho salvo em: ${filepath}`);
  console.log("[newsletter-draft] Abra o arquivo no navegador, selecione tudo (Ctrl/Cmd+A) e cole no editor do Beehiiv.");

  await salvarState({ lastDraftDate: now.toISOString() });
  console.log(`[newsletter-draft] Estado atualizado — próxima rodada considera "novidade" a partir de ${now.toISOString()}.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
