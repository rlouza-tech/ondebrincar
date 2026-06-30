#!/usr/bin/env tsx
/**
 * list-sem-bairro.ts
 * Lista atrações publicadas sem bairro preenchido.
 * Uso: dotenv -e .env.local -- tsx scripts/list-sem-bairro.ts
 */

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  const atracoesPublicadas = await client.fetch<
    { _id: string; nome: string; bairro?: string; slug: { current: string } }[]
  >(
    `*[_type == "atracao" && !(_id in path("drafts.**")) && status == "operando"]
    | order(nome asc) {
      _id,
      nome,
      bairro,
      slug
    }`
  );

  const semBairro = atracoesPublicadas.filter((a) => !a.bairro);

  if (semBairro.length === 0) {
    console.log(`✅ Todas as ${atracoesPublicadas.length} atrações publicadas têm bairro preenchido.`);
    return;
  }

  console.log(`⚠️  ${semBairro.length} de ${atracoesPublicadas.length} atrações publicadas sem bairro:\n`);
  for (const a of semBairro) {
    console.log(`  - ${a.nome}  →  /atracao/${a.slug.current}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
