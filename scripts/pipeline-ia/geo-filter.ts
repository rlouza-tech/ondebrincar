/**
 * Filtro geográfico do pipeline-ia — US-S1
 *
 * Rejeita fichas que não pertencem ao município do Rio de Janeiro antes de
 * chamar o Gemini, economizando crédito e evitando lixo no catálogo.
 *
 * Reutiliza isLocalizacaoRioDeJaneiro() do scraper (whitelist de bairros
 * cariocas + detecção de outros estados/municípios fluminenses).
 *
 * Fichas sem evidência clara são rejeitadas (comportamento conservador da
 * função base). Para casos ambíguos legítimos, adicione o slug em GEO_EXCEPTIONS.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { isLocalizacaoRioDeJaneiro } from "@/scripts/scraper/parse";
import type { PipelineInput } from "@/lib/pipeline/types";

export const GEO_REJECTED_LOG_PATH = join(
  process.cwd(),
  "data",
  "logs",
  "geo-rejected.jsonl",
);

export interface GeoRejectionLogEntry extends GeoRejection {
  timestamp: string;
  source: string;
}

export async function appendGeoRejections(
  rejections: GeoRejection[],
  source: string,
  logPath: string = GEO_REJECTED_LOG_PATH,
): Promise<void> {
  if (rejections.length === 0) return;
  const timestamp = new Date().toISOString();
  await mkdir(dirname(logPath), { recursive: true });
  const lines = rejections
    .map((r) => JSON.stringify({ timestamp, source, ...r }))
    .join("\n");
  await appendFile(logPath, lines + "\n", "utf8");
}

/**
 * Slugs explicitamente permitidos mesmo que não passem no filtro automático.
 * Usar para eventos regionais com relevância editorial explícita para o público
 * carioca (ex: evento em Niterói com grande cobertura no Rio).
 *
 * Formato: slug da ficha (mesmo gerado por buildSlug em index.ts).
 */
export const GEO_EXCEPTIONS: string[] = [
  // Adicionar slugs conforme necessário, ex:
  // "cirque-du-soleil-niteroi",
];

export interface GeoRejection {
  slug: string;
  nome: string;
  venue: string;
  bairro: string;
  motivo: string;
}

export interface GeoFilterResult {
  accepted: PipelineInput[];
  rejected: GeoRejection[];
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSlug(linha: PipelineInput): string {
  return slugify([linha.nome, linha.venue || linha.bairro].filter(Boolean).join(" "));
}

export function filterGeo(rows: PipelineInput[]): GeoFilterResult {
  const accepted: PipelineInput[] = [];
  const rejected: GeoRejection[] = [];

  for (const linha of rows) {
    const slug = buildSlug(linha);

    if (GEO_EXCEPTIONS.includes(slug)) {
      accepted.push(linha);
      continue;
    }

    if (isLocalizacaoRioDeJaneiro(linha.venue, linha.bairro)) {
      accepted.push(linha);
    } else {
      rejected.push({
        slug,
        nome: linha.nome,
        venue: linha.venue,
        bairro: linha.bairro,
        motivo: "localização não reconhecida como município do Rio de Janeiro — validar manualmente",
      });
    }
  }

  return { accepted, rejected };
}
