/**
 * US-I51 — regras da trilha "Destaques da semana": quantos itens (Refinamento, 04/09/2026)
 * e depois de quantos dias sem curadoria manual o cron sorteia novos destaques.
 */
export const ROTATION_STALE_DAYS = 7;
export const MIN_DESTAQUES = 3;
export const MAX_DESTAQUES = 4;

const UM_DIA_MS = 1000 * 60 * 60 * 24;

/**
 * true quando a curadoria manual está desatualizada (ou nunca aconteceu) e o cron deve
 * sortear novos destaques. Nunca esconde a seção nem trava a home — só decide se troca.
 */
export function precisaRotacionar(
  ultimaCuradoria: string | null | undefined,
  agora: Date = new Date(),
): boolean {
  if (!ultimaCuradoria) return true;
  const diffDias = (agora.getTime() - new Date(ultimaCuradoria).getTime()) / UM_DIA_MS;
  return diffDias >= ROTATION_STALE_DAYS;
}

/**
 * Sorteia `quantidade` ids distintos do pool de atrações ativas elegíveis, sem repetição.
 * `rand` é injetável para tornar o sorteio determinístico em teste (padrão `Math.random`).
 */
export function sortearNovaCuradoria(
  idsElegiveis: string[],
  quantidade: number = MIN_DESTAQUES,
  rand: () => number = Math.random,
): string[] {
  const pool = [...idsElegiveis];
  const escolhidos: string[] = [];
  const total = Math.min(quantidade, pool.length);
  for (let i = 0; i < total; i++) {
    const indice = Math.floor(rand() * pool.length);
    escolhidos.push(pool[indice]);
    pool.splice(indice, 1);
  }
  return escolhidos;
}
