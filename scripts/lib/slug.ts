import { createHash } from "node:crypto";

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// US-S26: limite de _id do Sanity \u00e9 128 chars. O prefixo "drafts.atracao-" (15
// chars) consome parte disso, ent\u00e3o o slug em si precisa caber em 113 chars
// \u00fateis. Sem truncamento, nome+venue longos (ex: Gracie Kore, 128 chars de
// slug) derrubavam a ficha silenciosamente na escrita do Sanity.
//
// AC2 (board Notion): truncar por palavra inteira sozinho pode colidir \u2014
// dois eventos com nome+venue id\u00eanticos nos primeiros ~106 chars (ex: mesma
// col\u00f4nia de f\u00e9rias, "Turma A" vs "Turma B" cortado fora) gerariam o mesmo
// slug. Por isso, quando trunca, anexa um hash curto e determin\u00edstico (6
// hex chars derivados do slug completo) pra garantir unicidade.
const SLUG_MAX_LENGTH = 113;
const HASH_LENGTH = 6;

function truncateSlug(slug: string): string {
  if (slug.length <= SLUG_MAX_LENGTH) return slug;
  const hash = createHash("sha1").update(slug).digest("hex").slice(0, HASH_LENGTH);
  const suffix = `-${hash}`;
  const targetLength = SLUG_MAX_LENGTH - suffix.length;
  const cut = slug.slice(0, targetLength);
  const lastDash = cut.lastIndexOf("-");
  // Corta na \u00faltima palavra inteira em vez de partir uma palavra ao meio.
  const trimmed = lastDash > 0 ? cut.slice(0, lastDash) : cut;
  return `${trimmed}${suffix}`;
}

export function buildSlugFromParts(nome: string, venue: string, bairro: string): string {
  return truncateSlug(slugify([nome, venue || bairro].filter(Boolean).join(" ")));
}
