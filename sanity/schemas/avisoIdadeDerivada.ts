/**
 * Aviso (não bloqueante) quando a idade recomendada é 0–18 derivado de "Livre"
 * e ainda não foi conferida (US-A127). Extraído do schema para ser testável sem
 * subir o Studio. Depende dos campos gravados pela US-A126.
 */

export const MENSAGEM_IDADE_DERIVADA_LIVRE =
  "0–18 veio de Livre; confira se a faixa serve ou estreite antes de aprovar.";

interface DocIdade {
  idade_origem?: unknown;
  idade_recomendada_min?: unknown;
  idade_recomendada_max?: unknown;
  idade_valor_extrator_min?: unknown;
  idade_valor_extrator_max?: unknown;
  review_status?: unknown;
}

/**
 * Dispara quando a origem é derivado_livre, a idade atual ainda é a que o Extrator
 * gravou (min e max) e a ficha não está human_approved. Fichas antigas (sem
 * idade_origem) e idades editadas não disparam.
 */
export function deveAvisarIdadeDerivadaLivre(doc: DocIdade | undefined): boolean {
  if (!doc) return false;
  if (doc.idade_origem !== "derivado_livre") return false;
  if (doc.review_status === "human_approved") return false;
  const { idade_recomendada_min: min, idade_recomendada_max: max } = doc;
  if (typeof min !== "number" || typeof max !== "number") return false;
  return min === doc.idade_valor_extrator_min && max === doc.idade_valor_extrator_max;
}

/** Contexto mínimo que o `Rule.custom` do Sanity entrega (só o que usamos). */
interface ContextoValidacao {
  document?: object;
}

/** Para usar em `Rule.custom(...).warning()`: devolve `true` ou a mensagem do aviso. */
export function avisoIdadeDerivadaLivre(
  _value: unknown,
  context: ContextoValidacao,
): true | string {
  return deveAvisarIdadeDerivadaLivre(context.document as DocIdade | undefined)
    ? MENSAGEM_IDADE_DERIVADA_LIVRE
    : true;
}
