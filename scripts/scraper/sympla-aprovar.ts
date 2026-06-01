#!/usr/bin/env tsx
/**
 * sympla-aprovar.ts — revisão interativa dos eventos pendentes.
 *
 * Lê data/input/sympla-revisao-pendente.json, abre cada link no browser
 * e pergunta no terminal se o evento deve ser aprovado para o pipeline de IA.
 *
 * Uso:
 *   pnpm sympla-aprovar
 *
 * Aprovados são adicionados a sympla-raw-enriquecido.json (sem revisao_manual).
 * O arquivo pendente é atualizado removendo os já revisados.
 */

import { createInterface } from "node:readline";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { SymplarRawEvent } from "./sympla-enrich";
import { PENDENTE_PATH } from "./sympla-enrich";

const execAsync = promisify(exec);

const ENRIQUECIDO_PATH = join(process.cwd(), "data", "input", "sympla-raw-enriquecido.json");

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function lerJSON<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function abrirLink(url: string): Promise<void> {
  try {
    await execAsync(`open "${url}"`); // macOS
  } catch {
    console.log(`   (não foi possível abrir automaticamente — acesse: ${url})`);
  }
}

function pergunta(rl: ReturnType<typeof createInterface>, texto: string): Promise<string> {
  return new Promise((resolve) => rl.question(texto, resolve));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const pendentes = lerJSON<SymplarRawEvent[]>(PENDENTE_PATH, []);

  if (pendentes.length === 0) {
    console.log("\n✅ Nenhum evento pendente de revisão.\n");
    process.exit(0);
  }

  console.log(`\n=== Revisão Manual — Sympla ===`);
  console.log(`${pendentes.length} evento(s) aguardando revisão.`);
  console.log(`Cada evento abre no browser. Você decide se aprova ou rejeita.\n`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const aprovados: SymplarRawEvent[] = [];
  const rejeitados: SymplarRawEvent[] = [];
  const pulados: SymplarRawEvent[] = [];

  for (let i = 0; i < pendentes.length; i++) {
    const ev = pendentes[i];
    console.log(`\n[${i + 1}/${pendentes.length}] ${ev.nome}`);
    console.log(`   Venue: ${ev.venue}`);
    console.log(`   Data:  ${ev.data}`);
    console.log(`   Link:  ${ev.link}`);

    await abrirLink(ev.link);

    const resposta = await pergunta(rl, `   Aprovar? [s = sim / n = não / p = pular para depois]: `);
    const r = resposta.trim().toLowerCase();

    if (r === "s") {
      const { revisao_manual: _, ...evSemFlag } = ev;
      aprovados.push(evSemFlag as SymplarRawEvent);
      console.log("   → Aprovado ✅");
    } else if (r === "n") {
      rejeitados.push(ev);
      console.log("   → Rejeitado 🚫");
    } else {
      pulados.push(ev);
      console.log("   → Pulado 🔁 (voltará na próxima rodada)");
    }
  }

  rl.close();

  // Atualiza enriquecido com aprovados
  if (aprovados.length > 0) {
    const enriquecido = lerJSON<SymplarRawEvent[]>(ENRIQUECIDO_PATH, []);
    const atualizado = [...enriquecido, ...aprovados];
    writeFileSync(ENRIQUECIDO_PATH, JSON.stringify(atualizado, null, 2), "utf-8");
    console.log(`\n📄  ${aprovados.length} evento(s) adicionado(s) ao enriquecido.`);
  }

  // Atualiza pendentes (só os pulados ficam)
  if (pulados.length > 0) {
    writeFileSync(PENDENTE_PATH, JSON.stringify(pulados, null, 2), "utf-8");
    console.log(`🔍  ${pulados.length} evento(s) continuam pendentes.`);
  } else {
    writeFileSync(PENDENTE_PATH, JSON.stringify([], null, 2), "utf-8");
    console.log(`✅  Fila de revisão zerada.`);
  }

  // Resumo
  console.log(`\n${"─".repeat(50)}`);
  console.log(`Aprovados: ${aprovados.length} | Rejeitados: ${rejeitados.length} | Pulados: ${pulados.length}`);
  console.log("─".repeat(50) + "\n");
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
