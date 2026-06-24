import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
const envVars = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => { const idx = l.indexOf("="); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()] as [string, string]; })
);

const client = createClient({
  projectId: envVars["NEXT_PUBLIC_SANITY_PROJECT_ID"],
  dataset: envVars["NEXT_PUBLIC_SANITY_DATASET"] ?? "production",
  apiVersion: "2024-05-15",
  useCdn: false,
  token: envVars["SANITY_API_TOKEN"],
});

const slugs = [
  "familia-na-floresta-acampamento-vagalume",
  "mickey-donald-e-pateta-amigos-para-sempre-teatro-fashion-mall",
  "minecraft-a-busca-do-diamante-eterno-teatro-dos-grandes-atores-shopping-barra-square",
  "moana-e-o-segredo-da-concha-magica",
  "o-maior-quintal-do-mundo",
  "o-segredo-do-orfanato-raio-de-sol",
  "princesas-e-herois",
];

async function main() {
  const results = await client.fetch<{ nome: string; slug: { current: string }; descricao?: string; descricao_mini?: string }[]>(
    `*[_type == "atracao" && slug.current in $slugs] { nome, slug, descricao, descricao_mini }`,
    { slugs }
  );

  // também buscar nos drafts
  const drafts = await client.fetch<{ nome: string; slug: { current: string }; descricao?: string; descricao_mini?: string }[]>(
    `*[_id in path("drafts.**") && _type == "atracao" && slug.current in $slugs] { nome, slug, descricao, descricao_mini }`,
    { slugs }
  );

  const all = [...results, ...drafts];
  const seen = new Set<string>();
  for (const d of all) {
    if (seen.has(d.slug.current)) continue;
    seen.add(d.slug.current);
    console.log(`\n=== ${d.nome} ===`);
    console.log(`DESCRIÇÃO: ${d.descricao ?? "(vazia)"}`);
    console.log(`MINI: ${d.descricao_mini ?? "(vazia)"}`);
  }
}

main().catch(console.error);
