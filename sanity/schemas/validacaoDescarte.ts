/**
 * Validação de campos de conteúdo que só são obrigatórios enquanto a ficha
 * pode ir ao ar (US-S72). Ficha em descarte (encerrada, rejeitada, duplicada)
 * pode ser salva sem eles. Extraído do schema para ser testável sem subir o Studio.
 */

export const STATUS_DESCARTE: readonly string[] = ["encerrada", "rejeitado", "duplicada"];

export function ehStatusDescarte(status: unknown): boolean {
  return typeof status === "string" && STATUS_DESCARTE.includes(status);
}

/** Mensagem padrão do `Rule.required()` do Sanity, mantida igual à de antes. */
export const MENSAGEM_OBRIGATORIO = "Required";

/**
 * Substitui `Rule.required()`: exige valor, exceto quando o status é de descarte.
 * Limites de tamanho continuam nos `.min()/.max()` do campo e valem sempre que
 * há valor, em qualquer status.
 */
export function validarObrigatorioSalvoDescarte(
  value: unknown,
  status: unknown,
): true | string {
  if (ehStatusDescarte(status)) return true;
  if (value === undefined || value === null || value === "") return MENSAGEM_OBRIGATORIO;
  return true;
}

/** Contexto mínimo que o `Rule.custom` do Sanity entrega (só o que usamos). */
interface ContextoValidacao {
  document?: object;
}

export function obrigatorioSalvoDescarte(value: unknown, context: ContextoValidacao): true | string {
  const status = (context.document as { status?: unknown } | undefined)?.status;
  return validarObrigatorioSalvoDescarte(value, status);
}
