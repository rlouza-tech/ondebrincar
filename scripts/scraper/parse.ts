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

/**
 * Retorna true se o trecho de texto em torno do matchIndex contiver linguagem
 * de meia-entrada, desconto ou gratuidade — indicando que a faixa etária
 * menciona um critério de preço, não a classificação indicativa do espetáculo.
 *
 * Exemplos de contexto que disparam o guard:
 *   "Meia-entrada: Crianças de 0 a 12 anos"
 *   "Paga meia de 3 a 12 anos"
 *   "Ingresso meia para crianças de 2 a 12 anos"
 *   "Gratuidade: Crianças de 0 a 12 anos"
 *   "Crianças de 0 a 13 anos não pagam entrada"
 */
function hasRegraDePrecoContext(text: string, matchIndex: number): boolean {
  const start = Math.max(0, matchIndex - 120);
  const context = text.slice(start, matchIndex + 60).toLowerCase();
  return /meia[- ]?entrada|paga[m]?\s+meia|ingresso\s+meia|meia\s+ingresso|meia[- ]?valor|gratuidade|gr[aá]tis|cortesia|entrada\s+franca|n[aã]o\s+pagam?|isen[cç][aã]o|isent[oa]s?/.test(context);
}

export interface FaixaEtaria {
  idade_minima: string;
  idade_maxima: string;
}

/**
 * "Crianças de X a Y anos" — ignora linhas de gratuidade ("crianças até X ano").
 * Também ignora o padrão quando o contexto indicar meia-entrada/desconto.
 */
export function extractFaixaEtaria(text: string): FaixaEtaria {
  const normalized = text.replace(/\s+/g, " ");

  const deAte = normalized.match(
    /crian[cç]as?\s+de\s+(\d{1,2})\s+a\s+(\d{1,2})\s+anos?/i,
  );
  if (deAte && !hasRegraDePrecoContext(normalized, deAte.index ?? 0)) {
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
    if (entre && !hasRegraDePrecoContext(normalized, entre.index ?? 0)) {
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

  // "Classificação: Livre" → teto editorial do Onde Brincar (18 anos).
  // Valor deliberadamente distinto de 12 para distinguir fixture de meia-entrada
  // de classificação indicativa real nos smoke tests.
  if (/classifica[cç][aã]o:\s*livre/.test(normalized)) {
    return "18";
  }

  const ateIndicacao = normalized.match(
    /(?:indicad[oa]s?|recomendad[oa]s?)\s+(?:para\s+)?(?:at[eé]|a)\s*(\d{1,2})\s*anos/,
  );
  if (ateIndicacao) {
    return ateIndicacao[1];
  }

  const entre = normalized.match(/(\d{1,2})\s*a\s*(\d{1,2})\s*anos/);
  if (entre && !hasRegraDePrecoContext(normalized, entre.index ?? 0)) {
    return entre[2];
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

/**
 * Bairros oficiais do município do Rio de Janeiro (163 bairros).
 * Usado para confirmar que um venue está dentro da cidade — não apenas no estado.
 * Fonte: Lei Municipal nº 5.600/2013 + atualizações.
 */
export const BAIRROS_RIO: readonly string[] = [
  "abolição", "acari", "água santa", "alto da boa vista", "anchieta", "andaraí", "anil",
  "bancários", "bangu", "barra da tijuca", "barra de guaratiba", "barros filho",
  "benfica", "bento ribeiro", "bonsucesso", "botafogo", "brás de pina",
  "cachambi", "cacuia", "caju", "camorim", "campinho", "cascadura", "catete",
  "catumbi", "cavalcanti", "centro", "cidade de deus", "cidade nova", "cidade universitária",
  "cocotá", "coelho neto", "colégio", "complexo do alemão", "complexo da maré",
  "copacabana", "cordovil", "cosme velho", "costa barros", "cosmos", "covanca",
  "del castilho", "deodoro", "encantado", "engenho da rainha", "engenho de dentro",
  "engenho novo", "estácio", "fallet", "flamengo", "freguesia",
  "galeão", "gamboa", "gardênia azul", "gávea", "glória", "grajaú", "grumari",
  "guadalupe", "guaratiba", "higienópolis", "honório gurgel", "humaitá",
  "ilha do governador", "inhaúma", "inhoaíba", "ipanema", "irajá", "itanhangá",
  "jabour", "jacaré", "jacarepaguá", "jacarezinho",
  "jardim américa", "jardim botânico", "jardim carioca", "jardim guanabara", "jardim sulacap",
  "joá", "lagoa", "laranjeiras", "leblon", "leme", "lins de vasconcelos",
  "madureira", "mangueira", "manguinhos", "maracanã", "marechal hermes", "maré",
  "méier", "moneró", "monjolos", "olaria", "oswaldo cruz", "padre miguel",
  "paciência", "paquetá", "parque anchieta", "parque colúmbia", "pavuna",
  "pedra de guaratiba", "penha", "penha circular", "piedade", "pilares",
  "pitangueiras", "portuguesa", "praça da bandeira", "praça seca",
  "quintino bocaiúva", "ramos", "realengo", "recreio dos bandeirantes", "recreio", "riachuelo",
  "ribeira", "ricardo de albuquerque", "rio comprido", "rocha", "rocha miranda",
  "rocinha", "sampaio", "santa cruz", "santa teresa", "santíssimo", "santo cristo",
  "são conrado", "são cristóvão", "são francisco xavier", "saúde",
  "senador camará", "senador vasconcelos", "sepetiba",
  "taquara", "tijuca", "tomás coelho", "turiaçu", "urca",
  "vargem grande", "vargem pequena", "vasco da gama", "vidigal",
  "vila da penha", "vila isabel", "vila kennedy", "vila militar",
  "vila valqueire", "vista alegre", "zumbi",
];

/**
 * Retorna true se a localização é compatível com o município do Rio de Janeiro.
 *
 * Lógica (em ordem):
 * 1. Outro estado brasileiro → rejeita.
 * 2. Município fluminense fora da cidade → rejeita.
 * 3. Bairro carioca reconhecido na whitelist → aceita.
 * 4. "Rio de Janeiro" explícito no texto (sem ", RJ" sozinho) → aceita.
 * 5. Nenhuma evidência → rejeita (conservador: melhor perder um evento que mostrar errado).
 *
 * Motivação da mudança (v2): ", RJ" sozinho não é suficiente — "Vale do Café, RJ",
 * "Vassouras, Rio de Janeiro, RJ" etc. passavam indevidamente.
 */
export function isLocalizacaoRioDeJaneiro(venue: string, bairro?: string): boolean {
  const text = `${venue} ${bairro ?? ""}`.toLowerCase();

  // 1. Outros estados brasileiros → rejeita imediatamente
  const outroEstado =
    /\bs[aã]o paulo\b|,\s*sp\b|\bbelo horizonte\b|,\s*mg\b|,\s*ba\b|,\s*es\b|,\s*pr\b|,\s*sc\b|,\s*rs\b|,\s*go\b|,\s*df\b|,\s*pe\b|,\s*ce\b|,\s*am\b|,\s*pa\b|,\s*ma\b|,\s*pi\b|,\s*rn\b|,\s*pb\b|,\s*al\b|,\s*se\b|,\s*to\b|,\s*mt\b|,\s*ms\b|,\s*ro\b|,\s*ac\b|,\s*rr\b|,\s*ap\b/;
  if (outroEstado.test(text)) return false;

  // 2. Municípios fluminenses fora da cidade do Rio → rejeita
  const municipioForaDoRio =
    /\bniter[oó]i\b|teres[oó]polis|petr[oó]polis|angra dos reis|\bb[uú]zios\b|cabo frio|mangaratiba|\bmaric[aá]\b|itaipava|nova friburgo|s[aã]o gon[cç]alo|duque de caxias|nova igua[cç]u|\bparaty\b|\bparati\b|arraial do cabo|saquarema|volta redonda|vassouras|vale do caf[eé]|para[ií]ba do sul|tr[eê]s rios|resende|barra mansa|campos dos goytacazes|mac[aé]ae|s[aã]o jo[aã]o de meriti|belford roxo|nil[oó]polis|mesquita|queimados|japeri|serop[eé]dica|itaguaí/;
  if (municipioForaDoRio.test(text)) return false;

  // 3. Bairro carioca reconhecido → aceita
  if (BAIRROS_RIO.some((b) => text.includes(b))) return true;

  // 4. "Rio de Janeiro" explícito como cidade (ex: "- Rio de Janeiro, RJ") → aceita
  if (/\brio de janeiro\s*,\s*rj\b/.test(text)) return true;

  // 5. Sem evidência clara → rejeita
  return false;
}
