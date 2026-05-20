const HORARIO_PATTERN =
  /\d{1,2}\s*h\b|\d{1,2}:\d{2}|\bhor[aá]rio\b|\bmanh[aã]\b|\btarde\b|\bnoite\b|\babert[oa]\s+(das|de)/i;

const DIAS_PONTUAIS_PATTERN =
  /\bdias?\s+\d+|\bsomente\s+dia\b|\bapenas\s+(no\s+)?dia\b|\bdia\s+\d+/i;

const TRANSPARENCIA_HORARIO_PATTERN =
  /consulte\s+hor[aá]rio|ver\s+ingresso|hor[aá]rio\s+no\s+link|link\s+oficial|clique\s+em\s+['"]?ver\s+ingresso/i;

/** Input do scraper v1 costuma trazer só dias, sem horário. */
export function inputListaDiasSemHorario(diasApresentacao: string): boolean {
  const trimmed = diasApresentacao.trim();
  if (!trimmed) {
    return false;
  }
  return DIAS_PONTUAIS_PATTERN.test(trimmed) && !HORARIO_PATTERN.test(trimmed);
}

export function programacaoSinalizaLacunaHorario(programacaoTexto: string): boolean {
  return TRANSPARENCIA_HORARIO_PATTERN.test(programacaoTexto);
}

export function isProximaDataNoPassado(
  proximaData: string,
  referenceDateIso: string,
): boolean {
  return proximaData < referenceDateIso;
}
