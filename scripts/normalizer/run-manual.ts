/**
 * CLI — Normalizer manual
 *
 * Lê data/input/manual-raw.csv, normaliza para PipelineInput[] e imprime
 * o resultado em stdout (JSON). Termina com exit 1 se houver erro.
 *
 * Uso:
 *   pnpm pipeline:manual
 *   pnpm pipeline:manual data/input/outro-arquivo.csv
 */

import { normalizeManual, DEFAULT_INPUT_PATH } from "./manual";

const inputPath = process.argv[2] ?? DEFAULT_INPUT_PATH;

normalizeManual(inputPath)
  .then((items) => {
    console.log(JSON.stringify(items, null, 2));
    console.error(`[pipeline:manual] OK — ${items.length} itens normalizados de "${inputPath}"`);
  })
  .catch((err: unknown) => {
    console.error("[pipeline:manual] ERRO:", err);
    process.exit(1);
  });
