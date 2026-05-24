import {
  inputListaDiasSemHorario,
  isProximaDataNoPassado,
  programacaoSinalizaLacunaHorario,
} from "./programacao-helpers";
import { getReferenceDateIso } from "./reference-date";
import {
  CATEGORIAS_VALIDAS,
  INDOOR_OUTDOOR_VALIDOS,
  TIPOS_PROGRAMACAO_VALIDOS,
  type LinhaInput,
  type QualityGateResult,
  type RespostaGemini,
} from "./types";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

const LOW_CONFIDENCE_SUBSTRINGS = [
  "não tenho informação",
  "[informação ausente]",
  "não sei",
  "talvez",
  "provavelmente",
];

const CRITICAL_ABSTAIN_FIELDS = ["categoria", "bairro", "idade_min", "idade_max"];

function hasLowConfidenceText(value: string): boolean {
  const normalized = value.toLowerCase();
  return LOW_CONFIDENCE_SUBSTRINGS.some((substring) =>
    normalized.includes(substring),
  );
}

export function evaluate(
  linhaInput: LinhaInput,
  resposta: RespostaGemini,
  options?: { referenceDate?: Date },
): QualityGateResult {
  const reasons: string[] = [];
  const referenceDateIso = getReferenceDateIso(options?.referenceDate ?? new Date());

  if (resposta.error) {
    reasons.push(`gemini_error:${resposta.error}`);
  }

  if (
    resposta.descricao.includes("[INCERTO]") ||
    resposta.mini_review.includes("[INCERTO]")
  ) {
    reasons.push("marcador_incerto");
  }

  if (resposta.descricao.length < 50 || resposta.descricao.length > 600) {
    reasons.push("descricao_tamanho_invalido");
  }

  if (
    resposta.mini_review &&
    (resposta.mini_review.length < 50 || resposta.mini_review.length > 400)
  ) {
    reasons.push("mini_review_tamanho_invalido");
  }

  if (resposta.idade_min > resposta.idade_max) {
    reasons.push("idade_min_maior_que_idade_max");
  }

  if (resposta.idade_min < 0 || resposta.idade_max > 18) {
    reasons.push("idade_fora_do_intervalo_0_18");
  }

  if (!linhaInput.bairro.trim()) {
    reasons.push("bairro_vazio");
  }

  if (!CATEGORIAS_VALIDAS.includes(resposta.categoria)) {
    reasons.push("categoria_invalida");
  }

  if (!INDOOR_OUTDOOR_VALIDOS.includes(resposta.indoor_outdoor)) {
    reasons.push("indoor_outdoor_invalido");
  }

  if (!TIPOS_PROGRAMACAO_VALIDOS.includes(resposta.tipo_programacao)) {
    reasons.push("tipo_programacao_invalido");
  }

  if (
    resposta.programacao_texto.length < 5 ||
    resposta.programacao_texto.length > 200
  ) {
    reasons.push("programacao_texto_tamanho_invalido");
  }

  if (resposta.proxima_data !== null && !isValidIsoDate(resposta.proxima_data)) {
    reasons.push("proxima_data_formato_invalido");
  }

  if (
    resposta.proxima_data !== null &&
    isValidIsoDate(resposta.proxima_data) &&
    isProximaDataNoPassado(resposta.proxima_data, referenceDateIso)
  ) {
    reasons.push("proxima_data_no_passado");
  }

  if (
    inputListaDiasSemHorario(linhaInput.dias_apresentacao) &&
    !programacaoSinalizaLacunaHorario(resposta.programacao_texto)
  ) {
    reasons.push("programacao_lacuna_horario_nao_sinalizada");
  }

  if (resposta.confidence < 4) {
    reasons.push("confidence_menor_que_4");
  }

  if (
    hasLowConfidenceText(resposta.descricao) ||
    hasLowConfidenceText(resposta.mini_review)
  ) {
    reasons.push("texto_com_baixa_confianca");
  }

  const abstainCritical = resposta.abstain_fields.filter((field) =>
    CRITICAL_ABSTAIN_FIELDS.includes(field),
  );
  if (abstainCritical.length > 0) {
    reasons.push(`abstencao_campo_critico:${abstainCritical.join("|")}`);
  }

  return {
    status: reasons.length === 0 ? "auto_ok" : "needs_human",
    reasons,
  };
}
