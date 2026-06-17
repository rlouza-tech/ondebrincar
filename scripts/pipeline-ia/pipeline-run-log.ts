import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface PipelineRunEntry {
  timestamp: string;
  source: string;
  fichas_processadas: number;
  fichas_novas: number;
  dedup_ignored: number;
  geo_rejected: number;
  custo_estimado_usd: number;
  latencia_media_ms: number;
  erros: string[];
  prompt_version: string;
}

export const PIPELINE_RUNS_LOG_PATH = join(
  process.cwd(),
  "data",
  "logs",
  "pipeline-runs.json",
);

export async function appendPipelineRun(
  entry: PipelineRunEntry,
  logPath: string = PIPELINE_RUNS_LOG_PATH,
): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}
