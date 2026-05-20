export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSlugFromParts(nome: string, venue: string, bairro: string): string {
  return slugify([nome, venue || bairro].filter(Boolean).join(" "));
}
