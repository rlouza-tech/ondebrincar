#!/usr/bin/env tsx
/**
 * check-encerradas.ts
 * Busca todos os drafts do Sanity, acessa cada URL e verifica
 * se a página contém a frase de evento encerrado.
 * Uso: pnpm tsx scripts/check-encerradas.ts
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FRASE = "Esta oferta não tem eventos ativos no momento";
const CONCURRENCY = 5; // requisições simultâneas
const TIMEOUT_MS = 10_000;

// Carrega .env.local manualmente
const envPath = resolve(process.cwd(), ".env.local");
const envVars = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()] as [string, string];
    })
);

const client = createClient({
  projectId: envVars["NEXT_PUBLIC_SANITY_PROJECT_ID"],
  dataset: envVars["NEXT_PUBLIC_SANITY_DATASET"] ?? "production",
  apiVersion: "2024-05-15",
  useCdn: false,
  token: envVars["SANITY_API_TOKEN"],
});

async function checkUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OndeBrincar/1.0)" },
    });
    clearTimeout(timer);
    const html = await res.text();
    return html.includes(FRASE);
  } catch {
    return false;
  }
}

async function runBatch<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log("Buscando drafts no Sanity...");
  const drafts = await client.fetch<
    { _id: string; nome: string; url_ingresso?: string; link_compra?: string }[]
  >(
    `*[_id in path("drafts.**") && _type == "atracao"] | order(nome asc) {
      _id, nome, url_ingresso, link_compra
    }`
  );

  console.log(`${drafts.length} drafts encontrados. Verificando URLs...\n`);

  // Filtra apenas Clubinho (outros sites não têm a frase padrão)
  const comLink = drafts.filter((d) => {
    const url = d.url_ingresso ?? d.link_compra ?? "";
    return url.includes("clubinhodeofertas.com.br");
  });
  const semLink = drafts.filter((d) => {
    const url = d.url_ingresso ?? d.link_compra ?? "";
    return !url.includes("clubinhodeofertas.com.br");
  });

  console.log(`Verificando ${comLink.length} fichas do Clubinho...`);
  console.log(`Pulando ${semLink.length} fichas com outras fontes (Sympla, etc.)\n`);

  let checked = 0;
  const encerradas: string[] = [];
  const ativas: string[] = [];

  await runBatch(comLink, CONCURRENCY, async (d) => {
    const url = d.url_ingresso ?? d.link_compra ?? "";
    const encerrada = await checkUrl(url);
    checked++;
    process.stdout.write(`\r[${checked}/${comLink.length}] verificando...`);
    if (encerrada) {
      encerradas.push(d.nome);
    } else {
      ativas.push(d.nome);
    }
  });

  console.log("\n");
  console.log("=".repeat(50));
  console.log(`ENCERRADAS (${encerradas.length}):`);
  for (const nome of encerradas.sort()) {
    console.log(`  - ${nome}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`ATIVAS (${ativas.length}):`);
  for (const nome of ativas.sort()) {
    console.log(`  + ${nome}`);
  }

  if (semLink.length > 0) {
    console.log("\n" + "=".repeat(50));
    console.log(`NÃO VERIFICADAS — outras fontes (${semLink.length}):`);
    for (const d of semLink) {
      const url = d.url_ingresso ?? d.link_compra ?? "(sem link)";
      console.log(`  ? ${d.nome}  →  ${url}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
