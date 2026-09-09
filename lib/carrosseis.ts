/**
 * US-I46 — pool de carrosséis candidatos (5 zonas + categoria), mesma lista fechada em
 * Refinamento (04/09/2026) e usada como `options.list` no schema `configHome`. "Destaques"
 * não entra aqui: é fixo, sempre primeiro, curado separadamente (US-I51).
 */
export interface CarrosselInfo {
  id: string;
  nome: string;
}

export const CARROSSEL_POOL: CarrosselInfo[] = [
  { id: "zona-sul", nome: "Zona Sul" },
  { id: "zona-sudoeste", nome: "Zona Sudoeste" },
  { id: "zona-norte", nome: "Zona Norte" },
  { id: "zona-central", nome: "Zona Central" },
  { id: "zona-oeste", nome: "Zona Oeste" },
  { id: "categoria", nome: "Categoria" },
];

/**
 * Resolve os ids ativos de `configHome.carrosseisAtivos` para nome + ordem de exibição.
 * Um carrossel desligado (fora do array) não aparece; um id desconhecido é ignorado.
 */
export function carrosseisAtivosOrdenados(
  carrosseisAtivos: string[] | null | undefined,
): CarrosselInfo[] {
  if (!Array.isArray(carrosseisAtivos)) return [];
  return carrosseisAtivos
    .map((id) => CARROSSEL_POOL.find((c) => c.id === id))
    .filter((c): c is CarrosselInfo => Boolean(c));
}
