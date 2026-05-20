/** Data de referência ISO (YYYY-MM-DD) para prompt e quality gate. */
export function getReferenceDateIso(reference = new Date()): string {
  return reference.toISOString().split("T")[0];
}
