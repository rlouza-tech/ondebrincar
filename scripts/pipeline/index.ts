#!/usr/bin/env tsx
/**
 * pipeline — orquestrador end-to-end
 *
 * Sequência: check-novidades → pipeline-ia → import-sanity
 *
 * Uso:
 *   pnpm pipeline --source clubinho
 *   pnpm pipeline --source sympla
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { appendPipelineRun } from "@/scripts/pipeline-ia/pipeline-run-log";
import { PROMPT_VERSION } from "@/scripts/pipeline-ia/prompt";

type Source = "clubinho" | "sympla" | "manual";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { source: Source } {
  const args = argv.slice(2);
  let source: Source | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--source") {
      if (next !== "clubinho" && next !== "sympla" && next !== "manual") {
        throw new Error(
          `--source aceita "clubinho", "sympla" ou "manual" — recebido: "${next ?? ""}"\n` +
          `  Exemplo: pnpm pipeline --source clubinho`,
        );
      }
      source = next as Source;
      i++;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  if (!source) {
    throw new Error(
      "Argumento --source é obrigatório.\n" +
      "  Uso: pnpm pipeline --source clubinho|sympla|manual",
    );
  }

  return { source };
}

// ---------------------------------------------------------------------------
// Subprocess helper
// ---------------------------------------------------------------------------

interface StepResult {
  exitCode: number;
  stdout: string;
}

function runStep(pnpmScript: string, extraArgs: string[]): Promise<StepResult> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const child = spawn(
      "pnpm",
      [pnpmScript, ...extraArgs],
      {
        stdio: ["inherit", "pipe", "inherit"],
        env: process.env,
      },
    );

    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      chunks.push(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(chunks).toString("utf8"),
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Parsers de stdout
// ---------------------------------------------------------------------------

function parseCheckNovidades(stdout: string): { fichasNovas: number } {
  const match = stdout.match(/(\d+) ficha\(s\) nova\(s\)/);
  return { fichasNovas: match ? Number.parseInt(match[1], 10) : 0 };
}

function parsePipelineIa(stdout: string): {
  processadas: number;
  dedupIgnored: number;
  geoRejected: number;
} {
  const dedupMatch = stdout.match(/Dedup: (\d+) ignoradas.*?(\d+) a processar/);
  const geoMatch = stdout.match(/Filtro geográfico: (\d+) ficha\(s\) rejeitada\(s\)/);
  const totalMatch = stdout.match(/Total processado: (\d+)/);
  return {
    processadas: totalMatch ? Number.parseInt(totalMatch[1], 10) : 0,
    dedupIgnored: dedupMatch ? Number.parseInt(dedupMatch[1], 10) : 0,
    geoRejected: geoMatch ? Number.parseInt(geoMatch[1], 10) : 0,
  };
}

function parseImportSanity(stdout: string): { draftsCreated: number } {
  const match = stdout.match(/Criados: (\d+)/);
  return { draftsCreated: match ? Number.parseInt(match[1], 10) : 0 };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

function separator() {
  console.log("\n" + "─".repeat(60) + "\n");
}

async function main() {
  const { source } = parseArgs(process.argv);
  const startedAt = new Date().toISOString();

  console.log(`\n🚀 Pipeline Onde Brincar — source: ${source}`);
  console.log(`   Iniciado em ${startedAt}`);

  // ── Etapa 1: check-novidades ────────────────────────────────────────────

  separator();
  console.log("▶ Etapa 1/3 — check-novidades\n");

  const checkResult = await runStep("check-novidades", ["--source", source]);

  if (checkResult.exitCode === 2) {
    const summary = "check-novidades: 0 fichas novas encontradas — pipeline encerrado.";
    separator();
    console.log("✅ " + summary);

    await appendPipelineRun({
      timestamp: startedAt,
      source,
      fichas_processadas: 0,
      fichas_novas: 0,
      dedup_ignored: 0,
      geo_rejected: 0,
      custo_estimado_usd: 0,
      latencia_media_ms: 0,
      erros: [],
      prompt_version: PROMPT_VERSION,
    });

    return;
  }

  if (checkResult.exitCode !== 0) {
    console.error(`\n❌ check-novidades falhou com exit code ${checkResult.exitCode}`);
    process.exit(1);
  }

  const { fichasNovas } = parseCheckNovidades(checkResult.stdout);

  // ── Etapa 2: pipeline-ia ────────────────────────────────────────────────

  separator();
  console.log("▶ Etapa 2/3 — pipeline-ia\n");

  const pipelineResult = await runStep("pipeline-ia", ["--source", source]);

  if (pipelineResult.exitCode !== 0) {
    console.error(`\n❌ pipeline-ia falhou com exit code ${pipelineResult.exitCode}`);
    process.exit(1);
  }

  const { processadas, dedupIgnored, geoRejected } = parsePipelineIa(pipelineResult.stdout);

  // ── Etapa 3: import-sanity ──────────────────────────────────────────────

  separator();
  console.log("▶ Etapa 3/3 — import-sanity\n");

  const importResult = await runStep("import-sanity", [
    "--source", source,
    "--execute",
  ]);

  if (importResult.exitCode !== 0) {
    console.error(`\n❌ import-sanity falhou com exit code ${importResult.exitCode}`);
    process.exit(1);
  }

  const { draftsCreated } = parseImportSanity(importResult.stdout);

  // ── Resumo final ────────────────────────────────────────────────────────

  const finishedAt = new Date().toISOString();
  const elapsedMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  separator();
  console.log("✅ Pipeline concluído\n");
  console.log(`   check-novidades : ${fichasNovas} ficha(s) nova(s) encontrada(s)`);
  console.log(`   pipeline-ia     : ${processadas} processada(s), ${dedupIgnored} ignorada(s) (dedup), ${geoRejected} rejeitada(s) (geo)`);
  console.log(`   import-sanity   : ${draftsCreated} draft(s) criado(s) no Sanity`);
  console.log(`\n   Duração total: ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`   Sem publicação automática — revisar drafts no Studio antes de publicar.`);

  await appendPipelineRun({
    timestamp: startedAt,
    source,
    fichas_processadas: processadas,
    fichas_novas: fichasNovas,
    dedup_ignored: dedupIgnored,
    geo_rejected: geoRejected,
    custo_estimado_usd: 0,
    latencia_media_ms: Math.round(elapsedMs / Math.max(processadas, 1)),
    erros: [],
    prompt_version: PROMPT_VERSION,
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
