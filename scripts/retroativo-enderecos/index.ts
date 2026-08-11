#!/usr/bin/env tsx
/**
 * retroativo-enderecos — US-O16
 *
 * Varre fichas publicadas sem `endereco` e tenta preencher via:
 *   1. venue-map — busca o campo `nome` + `slug` da ficha contra mapa estático
 *      de endereços conhecidos. O slug codifica o venue quando o nome não o menciona
 *      (ex: slug "a-bela-e-a-fera-norte-shopping" → match em "norte shopping" → endereço).
 *   2. Clubinho — visita a página do produto via Playwright headed e chama a API
 *      interna do Clubinho (/api/rio-de-janeiro/<slug>) para extrair venues[0].address.
 *      Roda para todas as fichas (Clubinho não tem origem=clubinho consistente).
 *   3. Sympla   — se url_origem for do Sympla, abre a página via Playwright headed
 *      e extrai o endereço do __NEXT_DATA__ (fonte autoritativa — antes do Gemini).
 *   4. Gemini   — fallback: consulta direcionada por nome + bairro
 *      ("qual é o endereço de [nome] em [bairro], Rio de Janeiro?")
 *
 * Dry-run por padrão: imprime tabela e salva JSON. Nunca escreve no Sanity
 * sem a flag --execute — e mesmo assim só após revisão manual do Rafa.
 *
 * Pré-mortem: se >20% das fichas processadas resultarem em sem_match,
 * o script para e entrega o parcial. O restante vira US-O17 no Sprint 12.
 *
 * Uso:
 *   pnpm retroativo-enderecos                            # dry-run, processa tudo
 *   pnpm retroativo-enderecos --limit 10               # dry-run, 10 fichas
 *   pnpm retroativo-enderecos --skip-premortem         # processa todas sem parar cedo
 *   pnpm retroativo-enderecos --execute                # aplica patches (só após revisão!)
 *   pnpm retroativo-enderecos --skip-premortem --execute
 *
 * Protocolo:
 *   1. Rodar sem --execute (dry-run)
 *   2. Revisar data/output/retroativo-enderecos-TIMESTAMP.json com o Rafa
 *   3. Só então rodar com --execute
 */

import { fileURLToPath } from "node:url";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { createBrowserSession, fetchProductApi, gotoWithRetry } from "@/scripts/scraper/browser";
import { extrairEndereco } from "@/scripts/scraper/sympla-enrich";
import type { BrowserSession } from "@/scripts/scraper/browser";
import type { ClubinhoProductApi } from "@/scripts/scraper/clubinho-api";

// ---------------------------------------------------------------------------
// VENUE_ENDERECO_MAP
// Mapa estático: substring do nome da ficha (normalizado) → endereço completo.
// Prioridade: entradas mais longas são testadas primeiro (mais específico).
// ---------------------------------------------------------------------------

export const VENUE_ENDERECO_MAP: Record<string, string> = {
  // Teatro — venues específicos conhecidos (slug pode codificar o venue)
  "teatro miguel falabella": "Av. Dom Hélder Câmara, 5474 — Cachambi",
  "teatro brigitte blair": "Rua Décio Vilares, 31 — Copacabana",
  "teatro henriqueta brieba": "Rua Conde de Bonfim, 451 — Tijuca",
  "tijuca tenis club": "Rua Conde de Bonfim, 451 — Tijuca",
  "teatro oi futuro": "Rua Dois de Dezembro, 63 — Flamengo",
  "teatro oi casa grande": "Rua Álvaro Chaves, 41 — Leblon",
  "teatro laura alvim": "Av. Vieira Souto, 176 — Ipanema",
  "teatro net rio": "Rua Siqueira Campos, 143 — Copacabana",
  "teatro riachuelo": "Rua do Passeio, 38 — Centro",
  "teatro municipal do rio": "Praça Floriano, s/n — Centro",
  "teatro municipal": "Praça Floriano, s/n — Centro",
  "teatro carlos gomes": "Rua Pedro I, 22 — Centro",
  "teatro margarida schivazappa": "Rua Joaquim Murtinho, 179 — Santa Teresa",
  "teatro villa-lobos": "Av. Princesa Isabel, 440 — Copacabana",
  "teatro adolpho bloch": "Rua do Russel, 804 — Glória",
  "teatro claro rio": "Rua Voluntários da Pátria, 35 — Botafogo",
  "teatro claro": "Rua Voluntários da Pátria, 35 — Botafogo",
  "teatro fashion mall": "Estrada da Gávea, 899 — São Conrado",
  "teatro vivo rio": "Av. Nossa Senhora de Copacabana, 540 — Copacabana",
  "teatro vivo": "Av. Nossa Senhora de Copacabana, 540 — Copacabana",
  "teatro multiplan": "Av. das Américas, 4666 — Barra da Tijuca",
  "teatro bangu shopping": "Rua Fonseca, 240 — Bangu",
  "teatro shopping tijuca": "Av. Maracanã, 987 — Tijuca",
  "teatro shopping rio sul": "Rua Lauro Müller, 116 — Botafogo",
  "teatro rio sul": "Rua Lauro Müller, 116 — Botafogo",
  "teatro clara nunes": "R. Marquês de São Vicente, 52 — Gávea",    // Shopping da Gávea (corrigido: era Praça da Apoteose — errado)
  "teatro vannucci": "R. Marquês de São Vicente, 52 — Gávea",       // Shopping da Gávea
  "shopping da gavea": "R. Marquês de São Vicente, 52 — Gávea",     // Shopping da Gávea
  "teatro rival": "Rua Álvaro Alvim, 33 — Centro",
  "teatro leblon": "Av. Afrânio de Melo Franco, 290 — Leblon",
  "teatro maison de france": "Av. Presidente Antônio Carlos, 58 — Centro",
  "teatro nelson rodrigues": "Av. Chile, 230 — Centro",
  "teatro da caixa": "Praça da República, 45 — Centro",
  "teatro jovem": "Rua das Laranjeiras, 205 — Laranjeiras",

  // Cultura / museus
  "centro cultural banco do brasil": "Rua Primeiro de Março, 66 — Centro",
  "ccbb rio": "Rua Primeiro de Março, 66 — Centro",
  "museu do amanhã": "Praça Mauá, 1 — Centro",
  "museu de arte do rio": "Praça Mauá, 5 — Centro",
  "mar rio": "Praça Mauá, 5 — Centro",
  "museu nacional": "Quinta da Boa Vista, s/n — São Cristóvão",
  "museu da república": "Rua do Catete, 153 — Catete",
  "museu de arte moderna": "Av. Infante Dom Henrique, 85 — Centro",
  "mam rio": "Av. Infante Dom Henrique, 85 — Centro",
  "parque lage": "Rua Jardim Botânico, 414 — Jardim Botânico",
  "jardim botânico do rio": "Rua Jardim Botânico, 1008 — Jardim Botânico",
  "jardim botanico": "Rua Jardim Botânico, 1008 — Jardim Botânico",
  "instituto moreira salles": "Estrada da Gávea, 850 — Gávea",
  "ims rio": "Estrada da Gávea, 850 — Gávea",
  "espaço cria": "Rua Almirante Alexandrino, 1030 — Santa Teresa",
  "espaço kapim": "Rua Almirante Alexandrino, 660 — Santa Teresa",
  "casa daros": "Rua General Severiano, 159 — Botafogo",
  "eleva botafogo": "Rua General Severiano, 159 — Botafogo",        // ex-Casa Daros, hoje Escola Eleva

  // Shoppings (venue frequente)
  "barra shopping": "Av. das Américas, 4666 — Barra da Tijuca",
  "shopping tijuca": "Av. Maracanã, 987 — Tijuca",
  "tijuca mall": "Av. Maracanã, 987 — Tijuca",
  "norte shopping": "Av. Dom Hélder Câmara, 5474 — Cachambi",
  "botafogo praia shopping": "Praia de Botafogo, 400 — Botafogo",
  "shopping via parque": "Av. Ayrton Senna, 3000 — Barra da Tijuca",
  "shopping américas": "Av. das Américas, 15500 — Recreio dos Bandeirantes",
  "shopping leblon": "Av. Afrânio de Melo Franco, 290 — Leblon",
  "village mall": "Av. das Américas, 3900 — Barra da Tijuca",
  "rio design barra": "Av. das Américas, 7777 — Barra da Tijuca",
  "fashion mall": "Estrada da Gávea, 899 — São Conrado",
  "bangu shopping": "Rua Fonseca, 240 — Bangu",
  "carioca shopping": "Av. Vicente de Carvalho, 706 — Del Castilho",
  "san shopping": "Av. Guignard, 1 — Recreio dos Bandeirantes",
  "shopping rio sul": "Rua Lauro Müller, 116 — Botafogo",
  "rio sul": "Rua Lauro Müller, 116 — Botafogo",
  "downtown barra": "Av. das Américas, 500 — Barra da Tijuca",

  // Parques temáticos / atrações permanentes
  "parque rita lee": "Av. Embaixador Abelardo Bueno, 3401 — Barra da Tijuca",  // ex-Parque Olímpico
  "aquario": "Praça Muhammad Ali, Via Binário do Porto, s/n — Porto Maravilha",

  // Parques e espaços outdoor
  "parque da cidade": "Estrada de Santa Marinha, 1 — Gávea",
  "parque nacional da tijuca": "Estrada da Cascatinha, 850 — Tijuca",
  "lagoa rodrigo de freitas": "Av. Borges de Medeiros, s/n — Lagoa",
  "parque dos patins": "Av. Borges de Medeiros, s/n — Lagoa",
  "parque madureira": "Rua Carolina Machado, s/n — Madureira",
};

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type MetodoEndereco = "venue_map" | "clubinho" | "gemini" | "sympla" | "sem_match";

export interface ResultadoEndereco {
  slug: string;
  _id: string;
  nome: string;
  bairro: string;
  endereco_sugerido: string | null;
  metodo: MetodoEndereco;
}

interface SanityFichaSemEndereco {
  _id: string;
  slug: string;
  nome: string;
  bairro: string;
  url_origem?: string;
  origem?: string;
}

interface GeminiAddressResponse {
  endereco: string | null;
}

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Estratégia 1: venue-map
// Busca em `nome` + `slug` da ficha (slug codifica o venue quando o nome não o faz).
// Ex: nome="A Bela e a Fera", slug="a-bela-e-a-fera-norte-shopping"
//   → searchText contém "norte shopping" → match.
// Testa as entradas mais longas primeiro (mais específico).
// ---------------------------------------------------------------------------

export function tryVenueEndereco(nome: string, slug: string): string | null {
  // Normaliza slug substituindo hifens por espaços para revelar venue no nome
  const slugAsWords = slug.replace(/-/g, " ");
  const searchText = normalize(nome + " " + slugAsWords);

  const entries = Object.entries(VENUE_ENDERECO_MAP).sort(
    ([a], [b]) => normalize(b).length - normalize(a).length,
  );

  for (const [key, endereco] of entries) {
    if (searchText.includes(normalize(key))) {
      return endereco;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Estratégia 2: Clubinho via plain fetch + LD+JSON
//
// O Clubinho usa Inertia.js e renderiza o LD+JSON server-side — plain fetch funciona.
// O bloco `@type: "Event"` contém `location.address.streetAddress` com rua + bairro.
//
// Se já tivermos a URL (via link_compra), usamos direto.
// Se não (fichas antigas com link_compra null), tentamos localizar via Algolia:
//   - O Clubinho expõe publicamente seus credentials Algolia no HTML da página
//   - Buscamos por nome e derivamos a URL do hit
//
// Ativação: url_origem contém "clubinhodeofertas.com.br"
//   OU origem é "clubinho" | "outro" (proxy temporário até migração no Studio)
// ---------------------------------------------------------------------------

const CLUBINHO_ALGOLIA_APP_ID = "CUM4V9330E";
const CLUBINHO_ALGOLIA_KEY = "e44ddfef706279649b24a5051fccfc56";
const CLUBINHO_ALGOLIA_INDEX = "search_products_index";

interface AlgoliaHit {
  objectID?: string;
  slug?: string;
  url?: string;
  permalink?: string;
  name?: string;
  title?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

async function searchClubinhoUrl(nome: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://${CLUBINHO_ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/${CLUBINHO_ALGOLIA_INDEX}/query`,
      {
        method: "POST",
        headers: {
          "X-Algolia-Application-Id": CLUBINHO_ALGOLIA_APP_ID,
          "X-Algolia-API-Key": CLUBINHO_ALGOLIA_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: nome, hitsPerPage: 1 }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    console.log(`    [algolia] status: ${res.status}`);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.log(`    [algolia] erro: ${body.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as AlgoliaResponse;
    const hit = data.hits?.[0];
    console.log(`    [algolia] hits: ${data.hits?.length ?? 0} | hit[0]: ${JSON.stringify(hit ?? null).slice(0, 200)}`);
    if (!hit) return null;

    // Tenta extrair URL do hit (ordem de preferência)
    if (hit.url) return hit.url;
    if (hit.permalink) return hit.permalink;
    if (hit.slug) return `https://clubinhodeofertas.com.br/rio-de-janeiro/${hit.slug}`;

    return null;
  } catch (err) {
    console.log(`    [algolia] exception: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function tryClubinhoEndereco(
  session: BrowserSession,
  nome: string,
  url?: string,
): Promise<string | null> {
  // Obtém a URL do Clubinho: direto via link_compra ou buscando no Algolia pelo nome.
  const clubinhoUrl = url || (await searchClubinhoUrl(nome));
  console.log(`    [clubinho] url: ${clubinhoUrl ?? "null"}`);
  if (!clubinhoUrl) return null;

  // Clubinho bloqueia plain fetch via Cloudflare (403). Usa Playwright headed
  // com a mesma sessão já aberta para o Sympla. Navega até a página do produto
  // para estabelecer cookies/sessão, depois chama a API interna do Clubinho.
  const apiPath = `/api${new URL(clubinhoUrl).pathname}`;
  await gotoWithRetry(session.page, clubinhoUrl, 20_000);
  const { status, data } = await fetchProductApi<ClubinhoProductApi>(session.page, apiPath);
  console.log(`    [clubinho-api] status: ${status}`);
  if (status !== 200 || !data) return null;

  const venueAddress = data.venues?.[0]?.address;
  if (!venueAddress?.street && !venueAddress?.number) return null;

  // Mesma lógica de composição de endereço do scrape-atracao.ts
  const rua = [venueAddress.street?.trim(), venueAddress.number]
    .filter(Boolean)
    .join(", ");
  const localizacao = [venueAddress.complement, venueAddress.neighborhood]
    .filter(Boolean)
    .join(" — ");
  return [rua, localizacao].filter(Boolean).join(" — ") || null;
}

// ---------------------------------------------------------------------------
// Estratégia 3: Gemini
// Fallback: consulta direcionada por nome + bairro → endereço completo.
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_TIMEOUT_MS = 20_000;
const GEMINI_RATE_LIMIT_DELAY_MS = 2_000;

const addressResponseSchema = {
  type: "object",
  properties: {
    endereco: {
      type: "string",
      nullable: true,
      description: "Endereço completo ou null se incerto",
    },
  },
  required: ["endereco"],
} as const;

function buildAddressPrompt(nome: string, bairro: string): string {
  return (
    `Você é um assistente especializado em endereços no Rio de Janeiro.\n\n` +
    `Qual é o endereço completo de "${nome}" no bairro ${bairro}, Rio de Janeiro?\n\n` +
    `Regras:\n` +
    `- Responda com o endereço completo incluindo o bairro (ex: "Av. Vieira Souto, 176 — Ipanema")\n` +
    `- O endereço deve estar em UMA ÚNICA LINHA, sem quebras de linha\n` +
    `- Se não souber com certeza, retorne null — nunca invente endereços\n` +
    `- Inclua logradouro, número e bairro separados por " — "\n` +
    `- Não adicione CEP nem complemento desnecessário`
  );
}

async function tryGeminiEndereco(
  nome: string,
  bairro: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY ausente no ambiente");
  }

  const ai = new GoogleGenAI({ apiKey });
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: buildAddressPrompt(nome, bairro),
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: addressResponseSchema,
        abortSignal: abortController.signal,
      },
    });

    const rawText = response.text;
    if (!rawText) return null;

    const parsed = JSON.parse(rawText) as GeminiAddressResponse;
    // Sanitiza quebras de linha e espaços extras — o Gemini às vezes retorna
    // endereços multi-linha mesmo com a instrução de linha única no prompt.
    const raw = parsed.endereco ?? null;
    return raw ? raw.replace(/\s*\n\s*/g, " — ").replace(/\s{2,}/g, " ").trim() : null;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Estratégia 4: Sympla via Playwright
// Visita a página do evento no Sympla e extrai o endereço do __NEXT_DATA__.
// Só chamada quando url_origem contém "sympla.com.br".
// Requer browser headed (Sympla bloqueia headless via Cloudflare).
// ---------------------------------------------------------------------------

async function trySymplaEndereco(
  session: BrowserSession,
  url: string,
): Promise<string | null> {
  await gotoWithRetry(session.page, url, 25_000);
  const { endereco } = await extrairEndereco(session.page);
  return endereco;
}

// ---------------------------------------------------------------------------
// Busca fichas publicadas sem `endereco` no Sanity
// ---------------------------------------------------------------------------

async function fetchFichasSemEndereco(
  limit?: number,
): Promise<SanityFichaSemEndereco[]> {
  const groqQuery = `*[_type == "atracao"
    && !(_id in path("drafts.**"))
    && status == "operando"
    && !defined(endereco)
  ]{
    _id,
    "slug": slug.current,
    nome,
    bairro,
    "url_origem": link_compra,
    origem
  }${limit !== undefined ? `[0...${limit}]` : ""}`;

  return sanityWriteClient.fetch<SanityFichaSemEndereco[]>(groqQuery);
}

// ---------------------------------------------------------------------------
// Patch no Sanity (publicado + draft se existir)
// Segue o padrão de mark-expired.ts: itera prefixes ['', 'drafts.']
// ---------------------------------------------------------------------------

async function patchEndereco(
  baseId: string,
  endereco: string,
  dryRun: boolean,
): Promise<{ patched: number; skipped: number }> {
  // Tenta patchar publicado + draft (se existir).
  // Não usa getDocument() antes do patch — o Sanity client com token de escrita
  // nem sempre tem permissão de leitura individual via getDocument, mas consegue
  // patch direto. Documento inexistente lança erro → skipped.
  const prefixes = ["", "drafts."];
  let patched = 0;
  let skipped = 0;

  for (const prefix of prefixes) {
    const id = `${prefix}${baseId}`;
    try {
      if (!dryRun) {
        await sanityWriteClient.patch(id).set({ endereco }).commit();
      }
      patched++;
    } catch {
      // Documento não existe com esse prefixo — normal para drafts.
      skipped++;
    }
  }

  return { patched, skipped };
}

// ---------------------------------------------------------------------------
// Tabela de saída
// ---------------------------------------------------------------------------

function padRight(str: string, len: number): string {
  const s = String(str ?? "");
  return s.length >= len ? s.slice(0, len - 1) + " " : s + " ".repeat(len - s.length);
}

function printTable(resultados: ResultadoEndereco[]): void {
  const SEP = "─".repeat(160);
  const HEADER = "═".repeat(160);

  console.log("\n" + HEADER);
  console.log(
    padRight("slug", 40) +
    padRight("nome", 50) +
    padRight("bairro", 20) +
    padRight("metodo", 12) +
    "endereco_sugerido",
  );
  console.log(SEP);

  for (const r of resultados) {
    console.log(
      padRight(r.slug, 40) +
      padRight(r.nome.slice(0, 48), 50) +
      padRight(r.bairro, 20) +
      padRight(r.metodo, 12) +
      (r.endereco_sugerido ?? "(sem match)"),
    );
  }

  console.log(HEADER);
}

// ---------------------------------------------------------------------------
// Salva JSON de saída
// ---------------------------------------------------------------------------

async function saveJson(
  resultados: ResultadoEndereco[],
  stats: { total: number; venue_map: number; clubinho: number; gemini: number; sympla: number; sem_match: number; stopped_early: boolean },
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = join(process.cwd(), "data", "output");
  await mkdir(outputDir, { recursive: true });

  const filename = `retroativo-enderecos-${timestamp}.json`;
  const filepath = join(outputDir, filename);

  const output = {
    gerado_em: new Date().toISOString(),
    stats,
    resultados,
  };

  await writeFile(filepath, JSON.stringify(output, null, 2), "utf-8");
  return filepath;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { execute: boolean; limit?: number; skipPremortem: boolean } {
  const args = argv.slice(2);
  let execute = false;
  let limit: number | undefined;
  let skipPremortem = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === "--execute") {
      execute = true;
    } else if (arg === "--skip-premortem") {
      skipPremortem = true;
    } else if (arg === "--limit") {
      const n = parseInt(next ?? "", 10);
      if (isNaN(n) || n <= 0) {
        throw new Error(`--limit requer um número inteiro positivo — recebido: "${next ?? ""}"`);
      }
      limit = n;
      i++;
    } else if (arg.startsWith("-")) {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return { execute, limit, skipPremortem };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { execute, limit, skipPremortem } = parseArgs(process.argv);
  const dryRun = !execute;

  if (!hasSanityConfig()) {
    throw new Error(
      "Variáveis Sanity ausentes. Configure NEXT_PUBLIC_SANITY_PROJECT_ID e NEXT_PUBLIC_SANITY_DATASET.",
    );
  }

  const modoLabel = dryRun ? "DRY-RUN" : "EXECUTE ⚠️";
  console.log(`\n[retroativo-enderecos] Modo: ${modoLabel}`);
  if (limit !== undefined) console.log(`[retroativo-enderecos] Limit: ${limit} fichas`);
  if (skipPremortem) console.log(`[retroativo-enderecos] Pré-mortem: desativado (--skip-premortem)`);

  console.log("\nBuscando fichas publicadas sem endereço no Sanity...");
  const fichas = await fetchFichasSemEndereco(limit);
  console.log(`Fichas encontradas: ${fichas.length}`);

  if (fichas.length === 0) {
    console.log("\n✅ Nenhuma ficha sem endereço encontrada. Nada a fazer.");
    return;
  }

  const resultados: ResultadoEndereco[] = [];
  let semMatchCount = 0;
  let stoppedEarly = false;

  const PRE_MORTEM_THRESHOLD = 0.20;
  const MIN_FICHAS_PARA_PREMORTEM = 5; // só ativa o gate após 5 fichas processadas

  // Browser lazy: só abre se houver fichas Sympla que passarem por Strategy 3.
  // Sempre headed — Sympla bloqueia headless via Cloudflare.
  let browserSession: BrowserSession | null = null;

  try {
    for (let i = 0; i < fichas.length; i++) {
      const ficha = fichas[i];
      console.log(`\n[${i + 1}/${fichas.length}] ${ficha.slug}`);

      // Estratégia 1: venue-map (busca em nome + slug)
      const venueEndereco = tryVenueEndereco(ficha.nome, ficha.slug);
      if (venueEndereco) {
        console.log(`  ✅ venue_map → "${venueEndereco}"`);
        resultados.push({
          slug: ficha.slug,
          _id: ficha._id,
          nome: ficha.nome,
          bairro: ficha.bairro,
          endereco_sugerido: venueEndereco,
          metodo: "venue_map",
        });
        continue;
      }

      // Estratégia 2: Clubinho via LD+JSON
      // Tenta para todas as fichas: se url_origem já for do Clubinho, usa direto.
      // Caso contrário, busca via Algolia pelo nome (API pública do Clubinho).
      // Se a ficha não estiver no catálogo do Clubinho, Algolia retorna vazio → segue adiante.
      console.log(`  → venue_map sem match, tentando Clubinho (API via Playwright)...`);
      try {
        if (!browserSession) {
          console.log(`  → Abrindo browser headed para Clubinho...`);
          browserSession = await createBrowserSession(true);
        }
        const clubinhoEndereco = await tryClubinhoEndereco(browserSession, ficha.nome, ficha.url_origem);
        if (clubinhoEndereco) {
          console.log(`  ✅ clubinho → "${clubinhoEndereco}"`);
          resultados.push({
            slug: ficha.slug,
            _id: ficha._id,
            nome: ficha.nome,
            bairro: ficha.bairro,
            endereco_sugerido: clubinhoEndereco,
            metodo: "clubinho",
          });
          continue;
        }
      } catch (err) {
        console.log(`  ⚠️  Clubinho erro: ${err instanceof Error ? err.message : String(err)}`);
      }

      // Estratégia 3: Sympla via Playwright (antes do Gemini — fonte autoritativa)
      // Sympla tem o endereço exato; Gemini pode alucinar número de rua.
      const isSympla = ficha.url_origem?.includes("sympla.com.br");
      if (isSympla && ficha.url_origem) {
        console.log(`  → tentando Sympla (__NEXT_DATA__)...`);
        try {
          if (!browserSession) {
            console.log(`  → Abrindo browser headed para Sympla...`);
            browserSession = await createBrowserSession(true);
          }
          const symplaEndereco = await trySymplaEndereco(browserSession, ficha.url_origem);
          if (symplaEndereco) {
            console.log(`  ✅ sympla → "${symplaEndereco}"`);
            resultados.push({
              slug: ficha.slug,
              _id: ficha._id,
              nome: ficha.nome,
              bairro: ficha.bairro,
              endereco_sugerido: symplaEndereco,
              metodo: "sympla",
            });
            continue;
          }
        } catch (err) {
          console.log(`  ⚠️  Sympla erro: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Estratégia 4: Gemini — fallback quando nenhuma fonte autoritativa funcionou
      console.log(`  → sem match via fonte, consultando Gemini...`);
      await sleep(GEMINI_RATE_LIMIT_DELAY_MS);

      let geminiEndereco: string | null = null;
      try {
        geminiEndereco = await tryGeminiEndereco(ficha.nome, ficha.bairro);
      } catch (err) {
        console.log(`  ⚠️  Gemini erro: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (geminiEndereco) {
        console.log(`  ✅ gemini → "${geminiEndereco}"`);
        resultados.push({
          slug: ficha.slug,
          _id: ficha._id,
          nome: ficha.nome,
          bairro: ficha.bairro,
          endereco_sugerido: geminiEndereco,
          metodo: "gemini",
        });
        continue;
      }

      console.log(`  ❌ sem_match`);
      semMatchCount++;
      resultados.push({
        slug: ficha.slug,
        _id: ficha._id,
        nome: ficha.nome,
        bairro: ficha.bairro,
        endereco_sugerido: null,
        metodo: "sem_match",
      });

      // Pré-mortem: verificar taxa de sem_match após mínimo de fichas processadas.
      // Pode ser desativado com --skip-premortem para processar todas as fichas
      // e ter visibilidade completa do resultado antes de decidir o que fazer.
      if (!skipPremortem) {
        const processadas = i + 1;
        if (processadas >= MIN_FICHAS_PARA_PREMORTEM) {
          const taxaSemMatch = semMatchCount / processadas;
          if (taxaSemMatch > PRE_MORTEM_THRESHOLD) {
            console.log(
              `\n⛔ PRÉ-MORTEM: ${semMatchCount}/${processadas} fichas sem match ` +
              `(${(taxaSemMatch * 100).toFixed(0)}% > 20%). ` +
              `Parando execução e entregando resultado parcial.`,
            );
            console.log(
              `   As ${fichas.length - processadas} fichas restantes não foram processadas.`,
            );
            console.log(
              `   Para processar todas e ter visibilidade completa: use --skip-premortem`,
            );
            stoppedEarly = true;
            break;
          }
        }
      }
    }
  } finally {
    if (browserSession) {
      await browserSession.browser.close();
    }
  }

  // Stats finais
  const stats = {
    total: fichas.length,
    processadas: resultados.length,
    venue_map: resultados.filter((r) => r.metodo === "venue_map").length,
    clubinho: resultados.filter((r) => r.metodo === "clubinho").length,
    gemini: resultados.filter((r) => r.metodo === "gemini").length,
    sympla: resultados.filter((r) => r.metodo === "sympla").length,
    sem_match: resultados.filter((r) => r.metodo === "sem_match").length,
    stopped_early: stoppedEarly,
  };

  // Tabela
  printTable(resultados);

  // Resumo
  console.log(`\nResumo:`);
  console.log(`  Total buscadas:    ${stats.total}`);
  console.log(`  Processadas:       ${stats.processadas}`);
  console.log(`  venue_map:         ${stats.venue_map}`);
  console.log(`  clubinho:          ${stats.clubinho}`);
  console.log(`  gemini:            ${stats.gemini}`);
  console.log(`  sympla:            ${stats.sympla}`);
  console.log(`  sem_match:         ${stats.sem_match}`);
  if (stoppedEarly) {
    console.log(`  ⚠️  Parado cedo — ${fichas.length - resultados.length} fichas não processadas → US-O17`);
  }

  // Salvar JSON
  const jsonPath = await saveJson(resultados, stats);
  console.log(`\nJSON salvo em: ${jsonPath}`);

  // --execute: aplicar patches
  if (!dryRun) {
    const comEndereco = resultados.filter((r) => r.endereco_sugerido !== null);
    console.log(`\n🔧 --execute: aplicando ${comEndereco.length} patch(es) no Sanity...\n`);

    let patchCount = 0;
    let skipCount = 0;

    for (const r of comEndereco) {
      const { patched, skipped } = await patchEndereco(r._id, r.endereco_sugerido!, dryRun);
      console.log(
        `  ${patched > 0 ? "✅" : "⚠️ "} ${r.slug} — ${patched} doc(s) atualizado(s), ${skipped} ignorado(s)`,
      );
      patchCount += patched;
      skipCount += skipped;
    }

    console.log(`\nPatch completo: ${patchCount} documento(s) atualizado(s), ${skipCount} ignorado(s).`);
  } else {
    const comEndereco = resultados.filter((r) => r.endereco_sugerido !== null);
    console.log(
      `\n[DRY-RUN] Para aplicar ${comEndereco.length} endereço(s), revise o JSON acima e rode com --execute.`,
    );
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
