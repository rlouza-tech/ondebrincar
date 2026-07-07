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

import { createHash } from "node:crypto";
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

// US-S26: mesmo truncamento de pipeline-ia/index.ts::buildSlug, replicado
// aqui (assim como slugify acima) pra evitar import circular. Sem isso, um
// slug adicionado em GEO_EXCEPTIONS no formato truncado (o que index.ts
// agora gera) nunca bateria contra o slug não-truncado calculado aqui pra
// nomes+venue longos. Limite: 128 (limite de _id do Sanity) - 15
// ("drafts.atracao-") = 113. AC2 (board Notion): anexa hash de 6 hex chars
// quando trunca, pra evitar colisão entre eventos com nome+venue idênticos
// nos primeiros ~106 chars.
const SLUG_MAX_LENGTH = 113;
const HASH_LENGTH = 6;

function truncateSlug(slug: string): string {
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  const hash = createHash("sha1").update(slug).digest("hex").slice(0, HASH_LENGTH);
  const suffix = `-${hash}`;
  const targetLength = SLUG_MAX_LENGTH - suffix.length;
  const cut = slug.slice(0, targetLength);
  const lastDash = cut.lastIndexOf("-");
  const trimmed = lastDash > 0 ? cut.slice(0, lastDash) : cut;
  return `${trimmed}${suffix}`;
}

export function buildSlug(linha: PipelineInput): string {
  return truncateSlug(slugify([linha.nome, linha.venue || linha.bairro].filter(Boolean).join(" ")));
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
