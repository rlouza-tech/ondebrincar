/**
 * Cliente da API do Raindrop — US-S19
 *
 * Cobre só as duas operações que o fluxo precisa: listar itens da coleção
 * "Onde Brincar" (inbox de links avulsos) e mover um item processado para a
 * subcoleção "Processados". Ambas rodam via chamada HTTP direta (fetch) —
 * sem SDK, a API é pequena o bastante para não justificar a dependência.
 */

const RAINDROP_API_BASE = "https://api.raindrop.io/rest/v1";

/** Coleção "Onde Brincar" — inbox de links avulsos (Discovery 2026-06-11). */
export const ONDE_BRINCAR_COLLECTION_ID = 71841386;
/** Subcoleção "Processados", dentro de "Onde Brincar". */
export const PROCESSADOS_COLLECTION_ID = 71889997;

export interface RaindropItem {
  _id: number;
  title: string;
  excerpt: string;
  note: string;
  link: string;
  domain: string;
  cover: string;
  created: string;
}

function getToken(): string {
  const token = process.env.RAINDROP_API_TOKEN;
  if (!token) {
    throw new Error("RAINDROP_API_TOKEN ausente — configure em .env.local");
  }
  return token;
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}` };
}

/**
 * Lista todos os itens de uma coleção (paginado — perpage máximo da API é 50).
 */
export async function listCollectionItems(
  collectionId: number = ONDE_BRINCAR_COLLECTION_ID,
): Promise<RaindropItem[]> {
  const items: RaindropItem[] = [];
  const perpage = 50;
  let page = 0;

  for (;;) {
    const url = `${RAINDROP_API_BASE}/raindrops/${collectionId}?perpage=${perpage}&page=${page}`;
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) {
      throw new Error(`Raindrop API ${response.status} ao listar coleção ${collectionId}: ${await response.text()}`);
    }
    const data = (await response.json()) as { items: RaindropItem[]; count: number };
    items.push(...data.items);
    if (data.items.length === 0 || items.length >= data.count) break;
    page += 1;
  }

  return items;
}

/**
 * Move um raindrop (link) para outra coleção — usado para tirar o item da
 * fila "Onde Brincar" e colocá-lo em "Processados" (AC5).
 */
export async function moveToCollection(
  raindropId: number,
  targetCollectionId: number = PROCESSADOS_COLLECTION_ID,
): Promise<void> {
  const response = await fetch(`${RAINDROP_API_BASE}/raindrop/${raindropId}`, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ collection: { $id: targetCollectionId } }),
  });
  if (!response.ok) {
    throw new Error(`Raindrop API ${response.status} ao mover item ${raindropId}: ${await response.text()}`);
  }
}
