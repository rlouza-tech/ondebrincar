import { getProximoFimDeSemana } from "@/lib/atracoes";
import { mockAtracoes } from "@/lib/mock-atracoes";
import { hasSanityConfig, sanityClient } from "@/lib/sanity/client";
import {
  recomendacoesPermanentesPorBairro,
  recomendacoesPermanentesPorTema,
  recomendacoesPorBairro,
  recomendacoesPorTema,
} from "@/lib/sanity/queries";
import type { Atracao, SanityRecomendacaoDocument, TipoProgramacao } from "@/lib/sanity/types";

export type EixoRecomendacao = "tema" | "bairro";

export interface Recomendacao {
  slug: string;
  titulo: string;
  categoria: string;
  bairro: string;
  proximaData?: string;
  imagemUrl: string;
  eixo: EixoRecomendacao;
}

interface RecomendacaoCandidata {
  slug: string;
  titulo: string;
  categoria: string;
  bairro: string;
  proximaData?: string;
  imagemUrl: string;
}

const MAX_RECOMENDACOES = 4;

function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Fim de semana (sáb-dom) usado como referência pro eixo "mesmo bairro": o que contém
 * `proximaData`, ou o próximo a partir de hoje quando a atração é permanente (sem data).
 */
export function getFimDeSemanaReferencia(proximaData?: string): { inicio: string; fim: string } {
  if (!proximaData) {
    const { inicio, fim } = getProximoFimDeSemana(0);
    return { inicio: toISODateLocal(inicio), fim: toISODateLocal(fim) };
  }

  const data = new Date(`${proximaData}T12:00:00`);
  const diaSemana = data.getDay(); // 0=dom .. 6=sáb
  const sabado = new Date(data);
  if (diaSemana === 0) {
    sabado.setDate(data.getDate() - 1);
  } else if (diaSemana !== 6) {
    sabado.setDate(data.getDate() + (6 - diaSemana));
  }
  const domingo = new Date(sabado);
  domingo.setDate(sabado.getDate() + 1);

  return { inicio: toISODateLocal(sabado), fim: toISODateLocal(domingo) };
}

/**
 * Intercala candidatos dos dois eixos (tema, bairro), removendo duplicatas por slug,
 * até no máximo `max` cards. Eixo "mesma companhia" fica de fora — o schema do Sanity
 * ainda não tem esse campo (assumption aceita na story).
 */
export function mesclarRecomendacoes(
  porTema: RecomendacaoCandidata[],
  porBairro: RecomendacaoCandidata[],
  max = MAX_RECOMENDACOES,
): Recomendacao[] {
  const vistos = new Set<string>();
  const resultado: Recomendacao[] = [];
  let i = 0;
  let j = 0;

  while (resultado.length < max && (i < porTema.length || j < porBairro.length)) {
    if (i < porTema.length) {
      const candidata = porTema[i++];
      if (!vistos.has(candidata.slug)) {
        vistos.add(candidata.slug);
        resultado.push({ ...candidata, eixo: "tema" });
      }
    }
    if (resultado.length >= max) break;
    if (j < porBairro.length) {
      const candidata = porBairro[j++];
      if (!vistos.has(candidata.slug)) {
        vistos.add(candidata.slug);
        resultado.push({ ...candidata, eixo: "bairro" });
      }
    }
  }

  return resultado;
}

/**
 * US-I35 — anexa candidatos permanentes sem data (`fallback`) depois dos candidatos com
 * data (`datados`), sem reordenar estes últimos. Datados sempre têm prioridade; fallback só
 * completa slots vagos. Fallback é ordenado alfabeticamente por título e nunca duplica um
 * slug já presente em `datados`.
 */
function combinarComFallbackPermanente(
  datados: RecomendacaoCandidata[],
  fallback: RecomendacaoCandidata[],
): RecomendacaoCandidata[] {
  const slugsDatados = new Set(datados.map((c) => c.slug));
  const fallbackOrdenado = fallback
    .filter((c) => !slugsDatados.has(c.slug))
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));

  return [...datados, ...fallbackOrdenado];
}

/**
 * US-I35 — regra de fallback pra atrações permanentes (sem `proximaData`): quando a origem é
 * `tipo_programacao == "permanente"`, o eixo bairro passa a aceitar outros permanentes sem
 * data do mesmo bairro (além dos matches com data, que continuam prioritários). Se, mesmo
 * assim, o eixo bairro não achar nenhum candidato, o eixo tema também aceita permanentes sem
 * data da mesma categoria. Origens não-permanentes (evento_pontual, evento_recorrente) não
 * são afetadas — comportamento idêntico ao anterior (US-I33).
 */
export function montarCandidatosComFallback(params: {
  tipoProgramacaoOrigem: TipoProgramacao;
  porTemaDatado: RecomendacaoCandidata[];
  porBairroDatado: RecomendacaoCandidata[];
  porTemaPermanenteSemData: RecomendacaoCandidata[];
  porBairroPermanenteSemData: RecomendacaoCandidata[];
}): { porTema: RecomendacaoCandidata[]; porBairro: RecomendacaoCandidata[] } {
  const {
    tipoProgramacaoOrigem,
    porTemaDatado,
    porBairroDatado,
    porTemaPermanenteSemData,
    porBairroPermanenteSemData,
  } = params;

  if (tipoProgramacaoOrigem !== "permanente") {
    return { porTema: porTemaDatado, porBairro: porBairroDatado };
  }

  const porBairro = combinarComFallbackPermanente(porBairroDatado, porBairroPermanenteSemData);
  const porTema =
    porBairro.length === 0
      ? combinarComFallbackPermanente(porTemaDatado, porTemaPermanenteSemData)
      : porTemaDatado;

  return { porTema, porBairro };
}

function candidataFromSanity(doc: SanityRecomendacaoDocument): RecomendacaoCandidata {
  return {
    slug: doc.slug,
    titulo: doc.titulo,
    categoria: doc.categoria,
    bairro: doc.bairro,
    proximaData: doc.proximaData ?? undefined,
    imagemUrl: doc.imagemUrl || "/placeholder-atracao.svg",
  };
}

function candidataFromMock(atracao: Atracao): RecomendacaoCandidata {
  return {
    slug: atracao.slug,
    titulo: atracao.titulo,
    categoria: atracao.categoria,
    bairro: atracao.bairro,
    proximaData: atracao.proximaData,
    imagemUrl: atracao.imagemUrl,
  };
}

async function fetchCandidatas(atracao: Atracao): Promise<{
  porTema: RecomendacaoCandidata[];
  porBairro: RecomendacaoCandidata[];
}> {
  const hoje = toISODateLocal(new Date());
  const { inicio, fim } = getFimDeSemanaReferencia(atracao.proximaData);

  if (hasSanityConfig()) {
    try {
      const [temaDocs, bairroDocs] = await Promise.all([
        sanityClient.fetch<SanityRecomendacaoDocument[]>(recomendacoesPorTema, {
          categoria: atracao.categoria,
          slug: atracao.slug,
          hoje,
        }),
        sanityClient.fetch<SanityRecomendacaoDocument[]>(recomendacoesPorBairro, {
          bairro: atracao.bairro,
          slug: atracao.slug,
          inicio,
          fim,
        }),
      ]);

      // US-I35 — só busca fallback de permanentes quando a origem também é permanente.
      let temaPermanenteDocs: SanityRecomendacaoDocument[] = [];
      let bairroPermanenteDocs: SanityRecomendacaoDocument[] = [];
      if (atracao.tipoProgramacao === "permanente") {
        [temaPermanenteDocs, bairroPermanenteDocs] = await Promise.all([
          sanityClient.fetch<SanityRecomendacaoDocument[]>(recomendacoesPermanentesPorTema, {
            categoria: atracao.categoria,
            slug: atracao.slug,
          }),
          sanityClient.fetch<SanityRecomendacaoDocument[]>(recomendacoesPermanentesPorBairro, {
            bairro: atracao.bairro,
            slug: atracao.slug,
          }),
        ]);
      }

      return montarCandidatosComFallback({
        tipoProgramacaoOrigem: atracao.tipoProgramacao,
        porTemaDatado: temaDocs.map(candidataFromSanity),
        porBairroDatado: bairroDocs.map(candidataFromSanity),
        porTemaPermanenteSemData: temaPermanenteDocs.map(candidataFromSanity),
        porBairroPermanenteSemData: bairroPermanenteDocs.map(candidataFromSanity),
      });
    } catch {
      return { porTema: [], porBairro: [] };
    }
  }

  const porTemaDatado = mockAtracoes
    .filter(
      (a) =>
        a.slug !== atracao.slug &&
        a.categoria === atracao.categoria &&
        a.proximaData &&
        a.proximaData >= hoje,
    )
    .map(candidataFromMock);

  const porBairroDatado = mockAtracoes
    .filter(
      (a) =>
        a.slug !== atracao.slug &&
        a.bairro.toLowerCase() === atracao.bairro.toLowerCase() &&
        a.proximaData &&
        a.proximaData >= inicio &&
        a.proximaData <= fim,
    )
    .map(candidataFromMock);

  // US-I35 — fallback só é calculado quando a origem é permanente (mesma regra do path Sanity).
  const porTemaPermanenteSemData =
    atracao.tipoProgramacao === "permanente"
      ? mockAtracoes
          .filter(
            (a) =>
              a.slug !== atracao.slug &&
              a.categoria === atracao.categoria &&
              a.tipoProgramacao === "permanente" &&
              !a.proximaData,
          )
          .map(candidataFromMock)
      : [];

  const porBairroPermanenteSemData =
    atracao.tipoProgramacao === "permanente"
      ? mockAtracoes
          .filter(
            (a) =>
              a.slug !== atracao.slug &&
              a.bairro.toLowerCase() === atracao.bairro.toLowerCase() &&
              a.tipoProgramacao === "permanente" &&
              !a.proximaData,
          )
          .map(candidataFromMock)
      : [];

  return montarCandidatosComFallback({
    tipoProgramacaoOrigem: atracao.tipoProgramacao,
    porTemaDatado,
    porBairroDatado,
    porTemaPermanenteSemData,
    porBairroPermanenteSemData,
  });
}

/** US-I33 — recomendações pro anel "Continue o programa" no fim da ficha. */
export async function getRecomendacoes(atracao: Atracao): Promise<Recomendacao[]> {
  const { porTema, porBairro } = await fetchCandidatas(atracao);
  return mesclarRecomendacoes(porTema, porBairro);
}
