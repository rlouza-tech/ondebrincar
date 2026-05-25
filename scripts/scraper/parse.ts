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

export interface FaixaEtaria {
  idade_minima: string;
  idade_maxima: string;
}

/** "Crianças de X a Y anos" — ignora linhas de gratuidade ("crianças até X ano"). */
export function extractFaixaEtaria(text: string): FaixaEtaria {
  const normalized = text.replace(/\s+/g, " ");

  const deAte = normalized.match(
    /crian[cç]as?\s+de\s+(\d{1,2})\s+a\s+(\d{1,2})\s+anos?/i,
  );
  if (deAte) {
    return { idade_minima: deAte[1], idade_maxima: deAte[2] };
  }

  const indicado = normalized.match(
    /indicad[oa]s?\s+(?:para\s+)?crian[cç]as?\s+de\s+(\d{1,2})\s+a\s+(\d{1,2})\s+anos?/i,
  );
  if (indicado) {
    return { idade_minima: indicado[1], idade_maxima: indicado[2] };
  }

  return { idade_minima: "", idade_maxima: "" };
}

export function isGratuidadeCriancaAte(text: string): boolean {
  return /crian[cç]as?\s+at[eé]\s+\d{1,2}\s+anos?/i.test(text) &&
    /gratuidade|cortesia|n[aã]o\s+pagam|entrada\s+franca/i.test(text);
}

export function extractSinopseOficial(fullText: string, htmlFallback = ""): string {
  const sobre = fullText.match(
    /sobre o espet[aá]culo:?\s*([\s\S]{40,1200}?)(?=\n(?:regras|hor[aá]rios)|classifica[cç][aã]o|⏰|📆|$)/i,
  );
  if (sobre) {
    return sobre[1]
      .split(/classifica[cç][aã]o/i)[0]
      .replace(/\s+/g, " ")
      .trim();
  }

  if (htmlFallback) {
    const plain = stripHtml(htmlFallback);
    if (plain.length >= 80) {
      return plain.slice(0, 1200);
    }
  }

  const trimmed = fullText.replace(/\s+/g, " ").trim();
  if (trimmed.length >= 80) {
    return trimmed.slice(0, 1200);
  }

  return "";
}

export function extractIdadeMinima(text: string): string {
  const faixa = extractFaixaEtaria(text);
  if (faixa.idade_minima) {
    return faixa.idade_minima;
  }

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
  if (!isGratuidadeCriancaAte(text)) {
    const entre = normalized.match(/(\d{1,2})\s*a\s*(\d{1,2})\s*anos/);
    if (entre) {
      return entre[1];
    }
  }
  return "";
}

export function extractIdadeMaxima(text: string): string {
  const faixa = extractFaixaEtaria(text);
  if (faixa.idade_maxima) {
    return faixa.idade_maxima;
  }

  if (isGratuidadeCriancaAte(text)) {
    return "";
  }

  const normalized = text.toLowerCase();
  const ateIndicacao = normalized.match(
    /(?:indicad[oa]s?|recomendad[oa]s?)\s+(?:para\s+)?(?:at[eé]|a)\s*(\d{1,2})\s*anos/,
  );
  if (ateIndicacao) {
    return ateIndicacao[1];
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
  const emojiDays = plain.match(/📆[^.\n]{0,120}/);
  if (emojiDays) {
    return emojiDays[0].replace(/\s+/g, " ").trim();
  }
  const sessoes = plain.match(
    /(?:apresenta[cç][oõ]es|sess[oõ]es)[^.]*(?:\d{1,2}h(?:\s*e\s*\d{1,2}h)?|s[aá]bados?|domingos?)[^.]*/i,
  );
  if (sessoes) {
    return sessoes[0].trim();
  }
  const horas = plain.match(
    /(?:s[aá]bados?|domingos?|segunda|ter[cç]a|quarta|quinta|sexta)[^.]*\d{1,2}h[^.]*/gi,
  );
  if (horas && horas.length > 0) {
    return horas.join(" | ").slice(0, 200);
  }
  return "";
}

export interface LdJsonExtracted {
  horarios_sessao: string;
  offer_price_centavos: string;
  venue: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function collectLdNodes(blocks: unknown[]): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];

  for (const block of blocks) {
    if (!isRecord(block)) {
      continue;
    }
    if (Array.isArray(block["@graph"])) {
      for (const item of block["@graph"]) {
        if (isRecord(item)) {
          nodes.push(item);
        }
      }
    } else {
      nodes.push(block);
    }
  }

  return nodes;
}

function formatStartDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) {
    return iso;
  }
  const [, , month, day, hour, minute] = match;
  return `${day}/${month} às ${hour}:${minute}`;
}

function priceToCentavosString(price: unknown): string {
  if (typeof price === "number" && Number.isFinite(price)) {
    return String(Math.round(price * 100));
  }
  if (typeof price === "string") {
    const parsed = Number.parseFloat(price.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return String(Math.round(parsed * 100));
    }
  }
  return "";
}

export function extractFromLdJson(blocks: unknown[]): LdJsonExtracted {
  const nodes = collectLdNodes(blocks);
  const horarios: string[] = [];
  let offerPrice = "";
  let venue = "";

  for (const node of nodes) {
    const type = String(node["@type"] ?? "").toLowerCase();
    if (type.includes("event") || node.startDate) {
      const dates = node.startDate;
      const list = Array.isArray(dates) ? dates : dates ? [dates] : [];
      for (const iso of list) {
        if (typeof iso === "string") {
          horarios.push(formatStartDate(iso));
        }
      }
    }

    if (!offerPrice && node.offers) {
      const offers = node.offers;
      const offer = Array.isArray(offers) ? offers[0] : offers;
      if (isRecord(offer)) {
        offerPrice = priceToCentavosString(offer.price);
      }
    }

    if (!venue && node.location) {
      const location = node.location;
      const loc = Array.isArray(location) ? location[0] : location;
      if (isRecord(loc) && typeof loc.name === "string") {
        venue = loc.name;
      }
    }
  }

  return {
    horarios_sessao: horarios.join(" | ").slice(0, 200),
    offer_price_centavos: offerPrice,
    venue,
  };
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
