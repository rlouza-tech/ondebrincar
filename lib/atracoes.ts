import { mockAtracoes } from "@/lib/mock-atracoes";
import { sanityClient, hasSanityConfig } from "@/lib/sanity/client";
import {
  atracaoBySlug,
  atracoesAtivas,
  atracoesPorBairro,
  todosSlugs,
} from "@/lib/sanity/queries";
import type { Atracao, SanityAtracaoDocument } from "@/lib/sanity/types";

export type { Atracao };

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
  return {
    slug: document.slug.current,
    titulo: document.nome,
    categoria: document.categoria,
    idadeMin: document.idade_min,
    idadeMax: document.idade_max,
    bairro: document.bairro,
    precoTipo: document.preco === 0 ? "gratuito" : "pago",
    precoLabel: precoLabelFromCents(document.preco),
    indoorOutdoor: document.indoor_outdoor,
    descricaoCurta: document.mini_review || document.descricao,
    imagemUrl: document.foto?.asset?.url || "/placeholder-atracao.svg",
    linkExterno: document.link_compra || "#",
  };
}

async function fetchSanityAtracoes(): Promise<Atracao[]> {
  if (!hasSanityConfig()) {
    return [];
  }

  try {
    const documents = await sanityClient.fetch<SanityAtracaoDocument[]>(
      atracoesAtivas,
      {},
      { next: { revalidate: 60 } },
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

  return filtrarAtracoes(mockAtracoes, { bairro });
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
  return atracao.precoLabel ?? "Pago";
}

export interface FiltroBusca {
  bairro?: string;
  idade?: number;
}

export function filtrarAtracoes(
  atracoes: Atracao[],
  filtros: FiltroBusca,
): Atracao[] {
  return atracoes.filter((atracao) => {
    if (filtros.bairro) {
      const bairroFiltro = filtros.bairro.trim().toLowerCase();
      if (atracao.bairro.toLowerCase() !== bairroFiltro) {
        return false;
      }
    }

    if (filtros.idade !== undefined && !Number.isNaN(filtros.idade)) {
      if (filtros.idade < atracao.idadeMin || atracao.idadeMax < filtros.idade) {
        return false;
      }
    }

    return true;
  });
}
