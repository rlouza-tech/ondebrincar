const ALT_MAX_LENGTH = 160;

export function buildFotoAlt(nome: string, venue: string, bairro: string): string {
  const location = venue.trim() || bairro.trim();
  const base = location ? `Foto: ${nome} em ${location}` : `Foto: ${nome}`;
  if (base.length <= ALT_MAX_LENGTH) {
    return base;
  }
  return `${base.slice(0, ALT_MAX_LENGTH - 1)}…`;
}
