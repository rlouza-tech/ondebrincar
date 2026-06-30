import { mockAtracoes } from "@/lib/mock-atracoes";
import { sanityClient, hasSanityConfig } from "@/lib/sanity/client";
import {
  atracaoBySlug,
  atracoesAtivas,
  atracoesPorBairro,
  slugsAtivos,
  todosSlugs,
} from "@/lib/sanity/queries";
import type { Atracao, IndoorOutdoor, PrecoTipo, SanityAtracaoDocument } from "@/lib/sanity/types";

export type { Atracao };

/** Normaliza categoria do catálogo (mock legível ou slug Sanity) para slug do schema. */
export function normalizeCategoriaSlug(categoria: string): string {
  const normalized = categoria.toLowerCase().trim();
  if (normalized === "teatro" || normalized.includes("teatro")) {
    return "teatro";
  }
  if (normalized === "parque" || normalized.includes("parque")) {
    return "parque";
  }
  if (normalized === "museu" || normalized.includes("museu")) {
    return "museu";
  }
  if (
    normalized === "atividade-extra" ||
    normalized.includes("atividade")
  ) {
    return "atividade-extra";
  }
  if (normalized === "evento" || normalized.includes("evento")) {
    return "evento";
  }
  return normalized;
}

function precoLabelFromCents(preco?: number | null): string | undefined {
  if (preco === undefined || preco === null || preco === 0) {
    return undefined;
  }

  return (preco / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function mapSanityAtracao(document: SanityAtracaoDocument): Atracao {
  const atracao: Atracao = {
    slug: document.slug.current,
    titulo: document.nome,
    categoria: document.categoria,
    idadeMin: document.idade_min,
    idadeMax: document.idade_max,
    bairro: document.bairro,
    endereco: document.endereco,
    precoTipo: document.preco === 0 ? "gratuito" : "pago",
    precoLabel: precoLabelFromCents(document.preco),
    precoAPartir: document.preco_a_partir ?? false,
    indoorOutdoor: document.indoor_outdoor,
    tipoProgramacao: document.tipo_programacao ?? "permanente",
    programacaoTexto:
      document.programacao_texto ?? "Consulte programação no link oficial",
    descricaoCurta: document.mini_review || document.descricao,
    imagemUrl: document.foto?.asset?.url || "/placeholder-atracao.svg",
    linkExterno: document.link_compra || "",
    partner: document.partner,
  };

  if (document.proxima_data) {
    atracao.proximaData = document.proxima_data;
  }

  return atracao;
}

export { mapSanityAtracao };

async function fetchSanityAtracoes(): Promise<Atracao[]> {
  if (!hasSanityConfig()) {
    return [];
  }

  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const documents = await sanityClient.fetch<SanityAtracaoDocument[]>(
      atracoesAtivas,
      { hoje },
      { cache: "no-store" },
    );
    return documents.map(mapSanityAtracao);
  } catch {
    return [];
  }
}

export async function getAllAtracoes(): Promise<Atracao[]> {
  const sanityAtracoes = await fetchSanityAtracoes();
  return sanityAtracoes.length > 0 ? sanityAtracoes : mockAtracoes;
}

export async function getAtracaoBySlug(slug: string): Promise<Atracao | undefined> {
  if (hasSanityConfig()) {
    try {
      const document = await sanityClient.fetch<SanityAtracaoDocument | null>(
        atracaoBySlug,
        { slug },
        { next: { revalidate: 60 } },
      );

      if (document) {
        return mapSanityAtracao(document);
      }
    } catch {
      // Fallback abaixo mantém a navegação funcionando sem Sanity configurado.
    }
  }

  return mockAtracoes.find((atracao) => atracao.slug === slug);
}

export async function getAtracaoSlugs(): Promise<string[]> {
  if (hasSanityConfig()) {
    try {
      const slugs = await sanityClient.fetch<{ slug: string }[]>(
        todosSlugs,
        {},
        { next: { revalidate: 60 } },
      );

      if (slugs.length > 0) {
        return slugs.map((item) => item.slug);
      }
    } catch {
      // Fallback abaixo.
    }
  }

  return mockAtracoes.map((atracao) => atracao.slug);
}

/** Slugs apenas das atrações publicadas e com status=operando — usado pelo sitemap.xml */
export async function getAtracaoSlugsAtivos(): Promise<string[]> {
  if (hasSanityConfig()) {
    try {
      const slugs = await sanityClient.fetch<{ slug: string }[]>(
        slugsAtivos,
        {},
        { next: { revalidate: 3600 } },
      );

      if (slugs.length > 0) {
        return slugs.map((item) => item.slug);
      }
    } catch {
      // Fallback abaixo.
    }
  }

  return mockAtracoes.map((atracao) => atracao.slug);
}

export async function getAtracoesPorBairro(bairro: string): Promise<Atracao[]> {
  if (hasSanityConfig()) {
    try {
      const documents = await sanityClient.fetch<SanityAtracaoDocument[]>(
        atracoesPorBairro,
        { bairro },
        { next: { revalidate: 60 } },
      );

      if (documents.length > 0) {
        return documents.map(mapSanityAtracao);
      }
    } catch {
      // Fallback abaixo.
    }
  }

  return filtrarAtracoes(mockAtracoes, { bairros: [bairro] });
}

export function formatFaixaEtaria(idadeMin: number, idadeMax: number): string {
  if (idadeMin === 0) {
    return `Até ${idadeMax} anos`;
  }
  if (idadeMin === idadeMax) {
    return `${idadeMin} anos`;
  }
  return `${idadeMin}–${idadeMax} anos`;
}

export function formatPreco(atracao: Atracao): string {
  if (atracao.precoTipo === "gratuito") {
    return "Gratuito";
  }
  if (!atracao.precoLabel) {
    return "Pago";
  }
  return atracao.precoAPartir ? `A partir de ${atracao.precoLabel}` : atracao.precoLabel;
}

export interface FiltroBusca {
  bairros?: string[];
  idade?: number;
  categoria?: string;
  preco?: PrecoTipo;
  indoorOutdoor?: IndoorOutdoor;
  data?: string;
}

export function getProximoFimDeSemana(offset = 0): { inicio: Date; fim: Date } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diaSemana = hoje.getDay(); // 0=dom, 6=sáb
  const diasAteSabado = (6 - diaSemana + 7) % 7 || 7;
  const sabado = new Date(hoje);
  sabado.setDate(hoje.getDate() + diasAteSabado + offset * 7);
  const domingo = new Date(sabado);
  domingo.setDate(sabado.getDate() + 1);
  domingo.setHours(23, 59, 59, 999);
  return { inicio: sabado, fim: domingo };
}

import { FILTER_PARAM_KEYS } from "@/lib/filter-options";

function parseIdadeFromParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePrecoFromParam(value: string | null): PrecoTipo | undefined {
  if (value === "gratuito" || value === "pago") {
    return value;
  }
  return undefined;
}

function parseAmbienteFromParam(value: string | null): IndoorOutdoor | undefined {
  if (value === "indoor" || value === "outdoor" || value === "ambos") {
    return value;
  }
  return undefined;
}

export function filtrosFromSearchParams(params: URLSearchParams): FiltroBusca {
  return {
    bairros: params.getAll("bairro").filter(Boolean),
    idade: parseIdadeFromParam(params.get("idade")),
    categoria: params.get("categoria") ?? undefined,
    preco: parsePrecoFromParam(params.get("preco")),
    indoorOutdoor: parseAmbienteFromParam(params.get("ambiente")),
    data: params.get("data") ?? undefined,
  };
}

export function countActiveFilters(params: URLSearchParams): number {
  return FILTER_PARAM_KEYS.filter((key) => params.get(key)).length;
}

export function filtrarAtracoes(
  atracoes: Atracao[],
  filtros: FiltroBusca,
): Atracao[] {
  return atracoes.filter((atracao) => {
    if (filtros.bairros && filtros.bairros.length > 0) {
      const bairroNorm = atracao.bairro.toLowerCase();
      const match = filtros.bairros.some(
        (b) => b.trim().toLowerCase() === bairroNorm,
      );
      if (!match) {
        return false;
      }
    }

    if (filtros.idade !== undefined && !Number.isNaN(filtros.idade)) {
      if (filtros.idade < atracao.idadeMin || atracao.idadeMax < filtros.idade) {
        return false;
      }
    }

    if (filtros.categoria) {
      const filtroSlug = normalizeCategoriaSlug(filtros.categoria);
      if (normalizeCategoriaSlug(atracao.categoria) !== filtroSlug) {
        return false;
      }
    }

    if (filtros.preco && atracao.precoTipo !== filtros.preco) {
      return false;
    }

    if (filtros.indoorOutdoor && atracao.indoorOutdoor !== filtros.indoorOutdoor) {
      return false;
    }

    if (filtros.data) {
      const offset = filtros.data === "proximo-fim-de-semana" ? 1 : 0;
      const { inicio, fim } = getProximoFimDeSemana(offset);
      if (atracao.proximaData) {
        const dataAtracao = new Date(`${atracao.proximaData}T12:00:00`);
        if (dataAtracao < inicio || dataAtracao > fim) {
          return false;
        }
      }
      // sem proximaData → permanente, sempre inclui
    }

    return true;
  });
}
