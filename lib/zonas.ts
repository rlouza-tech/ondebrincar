import type { Atracao } from "@/lib/sanity/types";

/** Mesmos ids usados em `CARROSSEL_POOL` (US-I46) e nas opções do schema `configHome`. */
export type ZonaId =
  | "zona-sul"
  | "zona-sudoeste"
  | "zona-norte"
  | "zona-central"
  | "zona-oeste";

interface ZonaDef {
  id: ZonaId;
  bairros: string[];
}

/**
 * US-I47 — dicionário bairro→zona: estático no código, sem schema novo no Sanity (decisão
 * do Discovery 2026-08-19, Grupo 2.1). Validado contra o catálogo real na sessão original
 * (121/121 atrações cobertas) — cobertura tende a crescer com o catálogo; ver
 * `avisarBairrosNaoMapeados` (AC4) para o alerta de manutenção.
 */
const ZONAS: ZonaDef[] = [
  {
    id: "zona-sul",
    bairros: [
      "Botafogo",
      "Catete",
      "Copacabana",
      "Cosme Velho",
      "Flamengo",
      "Gávea",
      "Glória",
      "Ipanema",
      "Jardim Botânico",
      "Lagoa",
      "Laranjeiras",
      "Leblon",
      "São Conrado",
      "Urca",
      "Parque do Flamengo",
    ],
  },
  {
    id: "zona-sudoeste",
    bairros: [
      "Barra da Tijuca",
      "Freguesia (Jacarepaguá)",
      "Gardênia Azul",
      "Jacarepaguá",
      "Recreio dos Bandeirantes",
      "Taquara",
      "Vila Valqueire",
    ],
  },
  {
    id: "zona-norte",
    bairros: [
      "Maracanã",
      "Tijuca",
      "Cachambi",
      "Piedade",
      "Madureira",
      "Manguinhos",
      "Vila da Penha",
      "Vista Alegre",
      "Penha",
    ],
  },
  {
    id: "zona-central",
    bairros: [
      "Centro",
      "Cidade Nova",
      "Gamboa",
      "Porto Maravilha",
      "Santa Teresa",
      "São Cristóvão",
      "Paquetá",
    ],
  },
  {
    id: "zona-oeste",
    bairros: ["Bangu", "Pedra de Guaratiba", "Realengo"],
  },
];

/** Ordem padrão de exibição (por volume de atrações, decrescente) quando não há `configHome`
 * salvo ainda no Studio (US-I46) — mesma ordem confirmada pelo Rafa no Discovery 2026-08-19. */
export const ZONA_ORDEM_PADRAO: ZonaId[] = [
  "zona-sul",
  "zona-sudoeste",
  "zona-norte",
  "zona-central",
  "zona-oeste",
];

export const CAP_CARROSSEL_ZONA = 8;

/**
 * US-I50 — cap do par mobile, menor que o desktop (Discovery 19/08, Grupo 1: viewport
 * estreito cabe ~2,2 cards por tela, cap de 8 exigiria ~3 telas de swipe por zona). Como
 * 4 < `CAP_CARROSSEL_ZONA`, o componente mobile faz `slice(0, CAP_CARROSSEL_ZONA_MOBILE)`
 * sobre os até 8 itens que `montarCarrosseisZona` já entrega — sem duplicar a query de
 * dados nem rodar `avisarBairrosNaoMapeados` duas vezes.
 */
export const CAP_CARROSSEL_ZONA_MOBILE = 4;

const BAIRRO_PARA_ZONA = new Map<string, ZonaId>();
for (const zona of ZONAS) {
  for (const bairro of zona.bairros) {
    BAIRRO_PARA_ZONA.set(bairro.trim().toLowerCase(), zona.id);
  }
}

/** undefined quando o bairro não está em nenhuma das 5 zonas mapeadas (AC3). */
export function zonaPorBairro(bairro: string): ZonaId | undefined {
  return BAIRRO_PARA_ZONA.get(bairro.trim().toLowerCase());
}

export function bairrosDaZona(zona: ZonaId): string[] {
  return ZONAS.find((z) => z.id === zona)?.bairros ?? [];
}

export interface CarrosselZona {
  id: ZonaId;
  atracoes: Atracao[];
  /** total real da zona, antes do cap de 8 — exibido no card "Ver todas". */
  total: number;
  bairros: string[];
}

/**
 * AC4 — alerta no build/log da Vercel quando uma atração ativa tem bairro fora do
 * dicionário: ela não aparece em nenhum carrossel de zona (segue visível na
 * listagem/filtro normal, AC3), e sem esse aviso a lacuna do dicionário passaria
 * despercebida conforme o catálogo cresce.
 */
function avisarBairrosNaoMapeados(atracoes: Atracao[]): void {
  const semZona = new Set(
    atracoes.filter((atracao) => !zonaPorBairro(atracao.bairro)).map((atracao) => atracao.bairro),
  );
  for (const bairro of Array.from(semZona)) {
    console.warn(
      `[US-I47] bairro fora do dicionário bairro→zona: "${bairro}" — atrações desse bairro não aparecem em nenhum carrossel de zona.`,
    );
  }
}

/**
 * Monta os carrosséis de zona a exibir na home: uma entrada por zona ativa (na ordem
 * recebida), cada uma com no máximo `CAP_CARROSSEL_ZONA` atrações (AC do cap de 8 do
 * Discovery) e o total real da zona. Zonas sem nenhuma atração não aparecem.
 */
export function montarCarrosseisZona(
  atracoes: Atracao[],
  zonasAtivas: ZonaId[],
): CarrosselZona[] {
  avisarBairrosNaoMapeados(atracoes);

  return zonasAtivas
    .map((id) => {
      const daZona = atracoes.filter((atracao) => zonaPorBairro(atracao.bairro) === id);
      return {
        id,
        atracoes: daZona.slice(0, CAP_CARROSSEL_ZONA),
        total: daZona.length,
        bairros: bairrosDaZona(id),
      };
    })
    .filter((carrossel) => carrossel.total > 0);
}

/**
 * AC5 — "Ver todas — Zona X" reaproveita o filtro de bairro multi-select já existente
 * (`?bairro=X&bairro=Y`, via `HomeFilters.tsx`/`filtrarAtracoes`), sem feature nova.
 */
export function zonaVerTodasHref(bairros: string[]): string {
  const params = new URLSearchParams();
  for (const bairro of bairros) {
    params.append("bairro", bairro);
  }
  return `/?${params.toString()}`;
}
