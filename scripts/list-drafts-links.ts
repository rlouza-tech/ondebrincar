#!/usr/bin/env tsx
/**
 * list-drafts-links.ts
 * Lista todos os drafts do Sanity com nome e url_ingresso.
 * Uso: pnpm tsx scripts/list-drafts-links.ts
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Carrega .env.local manualmente antes de qualquer coisa
const envPath = resolve(process.cwd(), ".env.local");
const envVars = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=").map((p) => p.trim()) as [string, string])
);

const client = createClient({
  projectId: envVars["NEXT_PUBLIC_SANITY_PROJECT_ID"],
  dataset: envVars["NEXT_PUBLIC_SANITY_DATASET"] ?? "production",
  apiVersion: "2024-05-15",
  useCdn: false,
  token: envVars["SANITY_API_TOKEN"],
});

async function main() {
  const drafts = await client.fetch<
    { _id: string; nome: string; url_ingresso?: string; link_compra?: string }[]
  >(
    `*[_id in path("drafts.**") && _type == "atracao"] | order(nome asc) {
      _id,
      nome,
      url_ingresso,
      link_compra
    }`
  );

  if (drafts.length === 0) {
    console.log("Nenhum draft encontrado.");
    return;
  }

  console.log(`Total de drafts: ${drafts.length}\n`);

  for (const d of drafts) {
    const url = d.url_ingresso ?? d.link_compra ?? "(sem link)";
    console.log(`${d.nome}\t${url}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
