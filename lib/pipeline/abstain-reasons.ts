/**
 * Classificação de motivos do quality-gate (US-S75).
 *
 * Fonte de verdade compartilhada entre pipeline-ia, import-sanity e Studio:
 * cada reason tem categoria própria — não é só uma string solta na mesma lista.
 * Motivos de conteúdo sensível precisam de destaque visual no Studio; motivos
 * de qualidade geral não. O relatório da pipeline continua listando strings
 * (decisão de Refinamento 07/08: destaque só no Studio).
 */

export type AbstainReasonCategory = "conteudo_sensivel" | "qualidade_geral";

export interface CategorizedAbstainReason {
  code: string;
  category: AbstainReasonCategory;
}

/** Codes cuja presença é conteúdo sensível — hoje só o vazamento de persona (US-S71). */
export const CONTEUDO_SENSIVEL_REASON_CODES: ReadonlySet<string> = new Set([
  "mencao_persona_interna",
]);

export function categorizeAbstainReason(reason: string): AbstainReasonCategory {
  const code = reason.split(":")[0] ?? reason;
  if (
    CONTEUDO_SENSIVEL_REASON_CODES.has(reason) ||
    CONTEUDO_SENSIVEL_REASON_CODES.has(code)
  ) {
    return "conteudo_sensivel";
  }
  return "qualidade_geral";
}

export function categorizeAbstainReasons(
  reasons: string[],
): CategorizedAbstainReason[] {
  return reasons.map((code) => ({
    code,
    category: categorizeAbstainReason(code),
  }));
}

export function hasConteudoSensivel(reasons: string[]): boolean {
  return reasons.some(
    (reason) => categorizeAbstainReason(reason) === "conteudo_sensivel",
  );
}

export function groupAbstainReasons(reasons: string[]): {
  sensitive: string[];
  general: string[];
} {
  const sensitive: string[] = [];
  const general: string[] = [];
  for (const reason of reasons) {
    if (categorizeAbstainReason(reason) === "conteudo_sensivel") {
      sensitive.push(reason);
    } else {
      general.push(reason);
    }
  }
  return { sensitive, general };
}

export interface SanityAbstainReason {
  _key: string;
  code: string;
  category: AbstainReasonCategory;
}

export function toSanityAbstainReasons(
  reasons: string[],
): SanityAbstainReason[] {
  return categorizeAbstainReasons(reasons).map((item, index) => ({
    _key: sanityReasonKey(item.code, index),
    code: item.code,
    category: item.category,
  }));
}

function sanityReasonKey(code: string, index: number): string {
  const slug = code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "reason"}-${index}`;
}
