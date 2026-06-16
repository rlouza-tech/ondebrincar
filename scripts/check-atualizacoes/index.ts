#!/usr/bin/env tsx
/**
 * check-atualizacoes — detecção de fichas desatualizadas na fonte
 *
 * Compara campos de fichas já publicadas no Sanity com os dados mais recentes
 * da fonte (CSV/JSON). Read-only — nunca escreve no Sanity.
 *
 * Campos comparados:
 *   preco        → preco_inteira_centavos (fonte) vs preco (Sanity, em centavos)
 *   proxima_data → data extraída de dias_apresentacao (fonte) vs proxima_data (Sanity)
 *   descricao    → sinopse_oficial (fonte) vs descricao (Sanity)
 *                  ⚠️ descricao no Sanity é AI-enriched; divergências são esperadas.
 *                  Útil apenas para detectar mudanças estruturais na sinopse.
 *
 * Uso:
 *   pnpm check-atualizacoes --source clubinho
 *   pnpm check-atualizacoes --source sympla
 *   pnpm check-atualizacoes --source manual
 */

import { fileURLToPath } from "node:url";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { buildSlugFromParts } from "@/scripts/lib/slug";
import {
  normalizeClubinho,
  DEFAULT_INPUT_PATH as CLUBINHO_PATH,
} from "@/scripts/normalizer/clubinho";
import {
  normalizeSympla,
  DEFAULT_INPUT_PATH as SYMPLA_PATH,
} from "@/scripts/normalizer/sympla";
import {
  normalizeManual,
  DEFAULT_INPUT_PATH as MANUAL_PATH,
} from "@/scripts/normalizer/manual";
import type { PipelineInput } from "@/lib/pipeline/types";

type Source = "clubinho" | "sympla" | "manual";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SanityFicha {
  slug: string;
  preco?: number | null;
  proxima_data?: string | null;
  descricao?: string | null;
}

interface Divergencia {
  slug: string;
  campo: string;
  valor_fonte: string;
  valor_sanity: string;
}

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
          `  Exemplo: pnpm check-atualizacoes --source clubinho`,
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
      "  Uso: pnpm check-atualizacoes --source clubinho|sympla|manual",
    );
  }

  return { source };
}

// ---------------------------------------------------------------------------
// Extração de data do campo texto da fonte
// ---------------------------------------------------------------------------

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

/**
 * Extrai a primeira data encontrada em texto livre (ex.: "Dias 04/06", "Dia 15 de julho").
 * Retorna string ISO (YYYY-MM-DD) ou null se não encontrar data válida.
 */
function extrairDataDaFonte(texto: string): string | null {
  if (!texto) return null;

  const ano = new Date().getFullYear();

  // Padrão DD/MM ou DD/MM/YYYY
  const matchDiaMes = texto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1], 10);
    const mes = parseInt(matchDiaMes[2], 10);
    const anoExtraido = matchDiaMes[3] ? parseInt(matchDiaMes[3], 10) : ano;
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      return `${anoExtraido}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
  }

  // Padrão "15 de julho" ou "15 julho"
  const matchDiaNome = texto.match(/\b(\d{1,2})\s+(?:de\s+)?([a-záéíóúâêîôûãõç]+)/i);
  if (matchDiaNome) {
    const dia = parseInt(matchDiaNome[1], 10);
    const nomeMes = matchDiaNome[2].toLowerCase().slice(0, 3);
    const mes = MESES[nomeMes] ?? MESES[matchDiaNome[2].toLowerCase()];
    if (dia >= 1 && dia <= 31 && mes) {
      return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Normalizar representação de preço
// ---------------------------------------------------------------------------

function precoFonteEmCentavos(input: PipelineInput): number | null {
  // Usa preco_bruto — é o preço exibido ao usuário (com desconto quando houver).
  // preco_inteira_centavos é o preço cheio (sem desconto) e NÃO é o que o pipeline
  // grava no Sanity, portanto não serve para comparação.
  if (input.preco_bruto) {
    const limpo = input.preco_bruto.replace(/[^\d,]/g, "").replace(",", ".");
    const v = parseFloat(limpo);
    if (!isNaN(v)) return Math.round(v * 100);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Buscar fichas publicadas no Sanity (apenas documentos publicados, sem drafts)
// ---------------------------------------------------------------------------

async function fetchFichasSanity(slugs: string[]): Promise<Map<string, SanityFicha>> {
  if (slugs.length === 0) return new Map();

  const docs = await sanityWriteClient.fetch<SanityFicha[]>(
    `*[_type == "atracao" && !(_id in path("drafts.**")) && slug.current in $slugs]{
      "slug": slug.current,
      preco,
      proxima_data,
      descricao
    }`,
    { slugs },
  );

  const mapa = new Map<string, SanityFicha>();
  for (const doc of docs) {
    mapa.set(doc.slug, doc);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// Comparar campos
// ---------------------------------------------------------------------------

function compararFicha(
  slug: string,
  input: PipelineInput,
  sanity: SanityFicha,
): Divergencia[] {
  const divergencias: Divergencia[] = [];

  // --- preco ---
  const precoFonte = precoFonteEmCentavos(input);
  if (precoFonte !== null && sanity.preco != null) {
    if (precoFonte !== sanity.preco) {
      divergencias.push({
        slug,
        campo: "preco",
        valor_fonte: `${precoFonte} centavos (R$${(precoFonte / 100).toFixed(2)})`,
        valor_sanity: `${sanity.preco} centavos (R$${(sanity.preco / 100).toFixed(2)})`,
      });
    }
  }

  // --- proxima_data ---
  // ⚠️ Comparação aproximada: a fonte tem texto livre; a data no Sanity é AI-derivada.
  const dataFonte = extrairDataDaFonte(input.dias_apresentacao ?? "");
  if (dataFonte && sanity.proxima_data) {
    const dataSanity = sanity.proxima_data.slice(0, 10); // normaliza para YYYY-MM-DD
    if (dataFonte !== dataSanity) {
      divergencias.push({
        slug,
        campo: "proxima_data [aproximado]",
        valor_fonte: `${dataFonte} (extraído de: "${input.dias_apresentacao}")`,
        valor_sanity: dataSanity,
      });
    }
  }

  // --- descricao ---
  // ⚠️ Sanity armazena descricao AI-enriched; sinopse_oficial é texto bruto da fonte.
  // Divergência aqui indica mudança de sinopse na fonte — pode exigir re-enriquecimento.
  const sinopse = (input.sinopse_oficial ?? "").trim();
  const descSanity = (sanity.descricao ?? "").trim();
  if (sinopse && descSanity) {
    // Heurística: extrai primeiras 100 chars normalizadas para comparação grosseira
    const normalizar = (s: string) =>
      s.toLowerCase().replace(/\s+/g, " ").slice(0, 100);
    if (normalizar(sinopse) !== normalizar(descSanity)) {
      divergencias.push({
        slug,
        campo: "descricao [sinopse vs AI-enriched]",
        valor_fonte: sinopse.slice(0, 120) + (sinopse.length > 120 ? "…" : ""),
        valor_sanity: descSanity.slice(0, 120) + (descSanity.length > 120 ? "…" : ""),
      });
    }
  }

  return divergencias;
}

// ---------------------------------------------------------------------------
// Carregar candidatos
// ---------------------------------------------------------------------------

async function loadCandidates(source: Source): Promise<{ rows: PipelineInput[]; inputPath: string }> {
  switch (source) {
    case "clubinho": {
      const rows = await normalizeClubinho();
      return { rows, inputPath: CLUBINHO_PATH };
    }
    case "sympla": {
      const rows = await normalizeSympla();
      return { rows, inputPath: SYMPLA_PATH };
    }
    case "manual": {
      const rows = await normalizeManual();
      return { rows, inputPath: MANUAL_PATH };
    }
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const { source } = parseArgs(process.argv);

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const { rows, inputPath } = await loadCandidates(source);
  console.log(`\nFonte: ${source} (${inputPath})`);
  console.log(`Fichas na fonte: ${rows.length}`);

  // Gerar slugs para todas as fichas da fonte
  const fichasComSlug = rows.map((r) => ({
    input: r,
    slug: buildSlugFromParts(r.nome, r.venue, r.bairro),
  }));

  const slugs = fichasComSlug.map((f) => f.slug);

  console.log("Buscando fichas publicadas no Sanity...");
  const fichasSanity = await fetchFichasSanity(slugs);
  console.log(`Fichas encontradas no Sanity (publicadas): ${fichasSanity.size}`);

  const emComum = fichasComSlug.filter((f) => fichasSanity.has(f.slug));
  console.log(`Fichas em comum (fonte ∩ Sanity): ${emComum.length}`);

  if (emComum.length === 0) {
    console.log("\nNenhuma ficha da fonte encontrada no Sanity para comparar.");
    process.exit(0);
  }

  // Comparar
  const todasDivergencias: Divergencia[] = [];
  for (const { input, slug } of emComum) {
    const sanity = fichasSanity.get(slug)!;
    const divs = compararFicha(slug, input, sanity);
    todasDivergencias.push(...divs);
  }

  // Output
  console.log("\n" + "─".repeat(80));

  if (todasDivergencias.length === 0) {
    console.log("✅ Nenhuma divergência encontrada — fichas sincronizadas.");
    process.exit(0);
  }

  console.log(`⚠️  ${todasDivergencias.length} divergência(s) encontrada(s):\n`);
  console.log(
    padRight("slug", 45) +
    padRight("campo", 35) +
    padRight("valor_fonte", 45) +
    "valor_sanity",
  );
  console.log("─".repeat(160));

  for (const d of todasDivergencias) {
    console.log(
      padRight(d.slug, 45) +
      padRight(d.campo, 35) +
      padRight(d.valor_fonte, 45) +
      d.valor_sanity,
    );
  }

  console.log("\n" + "─".repeat(80));
  console.log(
    "⚠️  Nota: campos marcados [aproximado] ou [sinopse vs AI-enriched] requerem",
  );
  console.log(
    "   revisão manual — a comparação é heurística, não exata.",
  );
  console.log(`\nTotal: ${todasDivergencias.length} divergência(s) em ${new Set(todasDivergencias.map((d) => d.slug)).size} ficha(s).`);

  process.exit(0);
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len - 1) + " " : str + " ".repeat(len - str.length);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
