import {
  mockAtracoes,
  type MockAtracao,
} from "@/lib/mock-atracoes";

export function getAllAtracoes(): MockAtracao[] {
  return mockAtracoes;
}

export function getAtracaoBySlug(slug: string): MockAtracao | undefined {
  return mockAtracoes.find((atracao) => atracao.slug === slug);
}

export function getAtracaoSlugs(): string[] {
  return mockAtracoes.map((atracao) => atracao.slug);
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

export function formatPreco(atracao: MockAtracao): string {
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
  atracoes: MockAtracao[],
  filtros: FiltroBusca,
): MockAtracao[] {
  return atracoes.filter((atracao) => {
    if (filtros.bairro) {
      const bairroFiltro = filtros.bairro.trim().toLowerCase();
      if (atracao.bairro.toLowerCase() !== bairroFiltro) {
        return false;
      }
    }

    if (filtros.idade !== undefined && !Number.isNaN(filtros.idade)) {
      if (filtros.idade < atracao.idadeMin || filtros.idade > atracao.idadeMax) {
        return false;
      }
    }

    return true;
  });
}
