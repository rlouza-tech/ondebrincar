/** Remove tags HTML e normaliza espaços. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractIdadeMinima(text: string): string {
  const normalized = text.toLowerCase();
  const aPartir = normalized.match(
    /(?:a partir de|indicad[oa]s? a partir de|para crian[cç]as a partir de)\s*(\d{1,2})\s*anos?/,
  );
  if (aPartir) {
    return aPartir[1];
  }
  if (/classifica[cç][aã]o:\s*livre/.test(normalized)) {
    return "0";
  }
  const entre = normalized.match(/(\d{1,2})\s*a\s*(\d{1,2})\s*anos/);
  if (entre) {
    return entre[1];
  }
  return "";
}

export function extractIdadeMaxima(text: string): string {
  const normalized = text.toLowerCase();
  const ate = normalized.match(/(?:at[eé]|para)\s*(\d{1,2})\s*anos/);
  if (ate) {
    return ate[1];
  }
  const entre = normalized.match(/(\d{1,2})\s*a\s*(\d{1,2})\s*anos/);
  if (entre) {
    return entre[2];
  }
  if (/classifica[cç][aã]o:\s*livre/.test(normalized)) {
    return "";
  }
  return "";
}

export function extractDuracaoMinutos(text: string, metaDuration: string): string {
  const fromMeta = metaDuration.trim();
  if (/^\d+$/.test(fromMeta)) {
    return fromMeta;
  }
  const normalized = text.toLowerCase();
  const match = normalized.match(/(\d{1,3})\s*minutos?/);
  return match ? match[1] : "";
}

export function extractHorariosSessao(text: string): string {
  const plain = stripHtml(text);
  const horariosBlock = plain.match(/hor[aá]rios?:?\s*([\s\S]{0,200})/i);
  if (horariosBlock) {
    const chunk = horariosBlock[1]
      .split(/classifica[cç][aã]o/i)[0]
      .replace(/\s+/g, " ")
      .trim();
    if (chunk.length > 5) {
      return chunk.slice(0, 200);
    }
  }
  const emojiDays = plain.match(/📆[^.]{0,120}/);
  if (emojiDays) {
    return emojiDays[0].replace(/\s+/g, " ").trim();
  }
  const sessoes = plain.match(
    /(?:apresenta[cç][oõ]es|sess[oõ]es)[^.]*(?:\d{1,2}h(?:\s*e\s*\d{1,2}h)?|s[aá]bados?|domingos?)[^.]*/i,
  );
  if (sessoes) {
    return sessoes[0].trim();
  }
  const horas = plain.match(/(?:s[aá]bados?|domingos?|segunda|ter[cç]a|quarta|quinta|sexta)[^.]*\d{1,2}h[^.]*/gi);
  if (horas && horas.length > 0) {
    return horas.join(" | ").slice(0, 200);
  }
  return "";
}

export function formatPrecoBruto(fullCentavos: number | null, saleCentavos: number | null): string {
  if (fullCentavos !== null && fullCentavos > 0) {
    const reais = (fullCentavos / 100).toFixed(2).replace(".", ",");
    return `de R$${reais}`;
  }
  if (saleCentavos !== null && saleCentavos > 0) {
    const reais = (saleCentavos / 100).toFixed(2).replace(".", ",");
    return `a partir de R$${reais}`;
  }
  return "";
}

export function extractBairroFromVenue(venue: string): string {
  const parts = venue.split(" - ").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return parts[parts.length - 1];
}
