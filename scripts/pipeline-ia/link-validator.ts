/**
 * Validação de link_compra antes do Gemini — US-S17
 *
 * Rejeita URLs com domínio inválido (localhost, IP numérico, não-parseável,
 * placeholder) antes de consumir cota do Gemini ou gravar no Sanity.
 *
 * URLs vazias são aceitas silenciosamente: muitas fichas não têm link de compra
 * (parques gratuitos, museus, pracinhas) — ausência é legítima.
 *
 * Padrão análogo ao geo-filter.ts.
 */

import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LinhaInput } from "./types";

export const LINK_REJECTED_LOG_PATH = join(
  process.cwd(),
  "data",
  "logs",
  "link-rejected.jsonl",
);

export interface LinkRejection {
  slug: string;
  nome: string;
  url: string;
  motivo: string;
}

export interface LinkRejectionLogEntry extends LinkRejection {
  timestamp: string;
  source: string;
}

export interface LinkFilterResult {
  accepted: LinhaInput[];
  rejected: LinkRejection[];
}

/**
 * Regex para detectar endereços IP numéricos (v4).
 * Rejeita IPs como 192.168.0.1, 10.0.0.1, etc.
 */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

/**
 * Placeholders conhecidos que aparecem quando a fonte não tem link real.
 * Case-insensitive, comparado contra o hostname.
 */
const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "exemplo.com",
  "test.com",
  "placeholder.com",
  "domain.com",
  "seusite.com.br",
]);

/**
 * Valida se uma URL de link_compra é aceitável para importação.
 *
 * Retorna null se válida, ou string com o motivo de rejeição.
 *
 * Regras:
 * - String vazia → aceita (ausência de link é legítima)
 * - Não parseia como URL válida → rejeita
 * - Protocolo diferente de http/https → rejeita
 * - Hostname vazio → rejeita
 * - Hostname = "localhost" → rejeita
 * - Hostname é IP numérico (v4) → rejeita
 * - Hostname em lista de placeholders conhecidos → rejeita
 */
export function validateLinkCompra(url: string): string | null {
  const trimmed = url.trim();

  // URL vazia é válida — ausência de link de compra é legítima
  if (trimmed === "") {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "url_nao_parseavel";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `protocolo_invalido:${parsed.protocol}`;
  }

  const host = parsed.hostname.toLowerCase();

  if (host === "") {
    return "hostname_vazio";
  }

  if (host === "localhost") {
    return "hostname_localhost";
  }

  if (IP_REGEX.test(host)) {
    return "hostname_ip_numerico";
  }

  if (PLACEHOLDER_HOSTS.has(host)) {
    return `hostname_placeholder:${host}`;
  }

  return null;
}

/**
 * Filtra linhas pelo link_compra (url_ingresso ?? url_origem).
 * Linhas com link inválido vão para `rejected`; as demais para `accepted`.
 *
 * O slug é construído aqui apenas para fins de log — a função buildSlug
 * canônica vive em index.ts; esta replica a mesma lógica localmente para
 * evitar acoplamento circular.
 */
export function filterLinkCompra(
  rows: LinhaInput[],
): LinkFilterResult {
  const accepted: LinhaInput[] = [];
  const rejected: LinkRejection[] = [];

  for (const linha of rows) {
    const url = (linha.url_ingresso ?? linha.url_origem ?? "").trim();
    const motivo = validateLinkCompra(url);
    const slug = buildSlugLocal(linha);

    if (motivo === null) {
      accepted.push(linha);
    } else {
      rejected.push({ slug, nome: linha.nome, url, motivo });
    }
  }

  return { accepted, rejected };
}

/**
 * Persiste rejeições em NDJSON (append).
 */
export async function appendLinkRejections(
  rejections: LinkRejection[],
  source: string,
  logPath: string = LINK_REJECTED_LOG_PATH,
): Promise<void> {
  if (rejections.length === 0) return;
  const timestamp = new Date().toISOString();
  await mkdir(dirname(logPath), { recursive: true });
  const lines = rejections
    .map((r) => JSON.stringify({ timestamp, source, ...r }))
    .join("\n");
  await appendFile(logPath, lines + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Interno — replica slugify/buildSlug de index.ts para evitar import circular
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildSlugLocal(linha: LinhaInput): string {
  return slugify([linha.nome, linha.venue || linha.bairro].filter(Boolean).join(" "));
}
