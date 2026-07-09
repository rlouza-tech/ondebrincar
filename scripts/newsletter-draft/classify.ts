/**
 * Classificação das atrações em seções da newsletter — US-N2
 *
 * 3 seções, nessa ordem de prioridade (usada só pra desempate quando uma
 * atração é elegível pra mais de uma seção ao mesmo tempo — não pra corte,
 * ver abaixo):
 *   1. Novidades      — criadas no Sanity (_createdAt) desde o último draft
 *   2. Fim de semana   — proxima_data cai na janela quinta-domingo mais próxima.
 *      Nome revisado com o Rafa em 08/07/2026: era "Só esse fim de semana",
 *      mas esse nome dava a entender que só entram atrações que SÓ acontecem
 *      esse fim de semana (exclusivo). Não é isso — o critério é só a data
 *      (proxima_data cai na janela), não importa se a atração também
 *      acontece em outras datas/recorrências. Renomeado pra "Fim de semana".
 *   3. Permanentes     — status == "operando" e sem proxima_data
 *
 * Decisões tomadas na sessão de execução (DoR resolvida com o Rafa, 08/07/2026):
 *   - "Criada" = _createdAt do documento no Sanity (não existe campo publishedAt
 *     no schema hoje; risco aceito de fichas que passam dias em revisão humana
 *     antes de publicar não aparecerem como novidade quando saem do ar).
 *   - Uma atração só aparece em UMA seção — se elegível para novidade E fim
 *     de semana ao mesmo tempo, fica em novidade (mesma ordem de prioridade).
 *
 * Regra de corte por seção (revisada com o Rafa em 08/07/2026, substitui a
 * versão anterior de "limite de 10 total com corte por prioridade" — aquela
 * regra deixava Fim de semana e Permanentes vazios sempre que Novidades
 * sozinha passava de 10, o que aconteceu na primeira execução real):
 *   - Cada seção mira 4 itens.
 *   - Se tiver menos de 4 disponíveis, mostra só 2 (mesmo que existam 3 —
 *     evita sobrar 1 card sozinho numa grade de 2 colunas).
 *   - Se só tiver 1 disponível, mostra 1 (melhor que omitir a seção à toa).
 *   - Seção com 0 continua omitida do output (AC6, inalterado).
 *   - As 3 seções são independentes — não existe mais orçamento total
 *     compartilhado. Numa semana cheia, a newsletter pode ter até 12 itens
 *     (4+4+4) em vez do teto de 10 anterior.
 */

import type { AtracaoNewsletter, ClassificacaoResultado } from "./types";

/** Meta de itens por seção quando há disponibilidade suficiente. */
export const META_POR_SECAO = 4;

/** Fallback de itens por seção quando não dá pra atingir a meta —
 * evita deixar exatamente 1 card sobrando sozinho numa grade de 2 colunas. */
export const FALLBACK_POR_SECAO = 2;

/** Fallback quando não há data/newsletter-state.json (primeira execução):
 * considera "novidade" tudo criado nos últimos N dias, pra não estrear
 * a newsletter com a seção Novidades vazia nem com o catálogo inteiro. */
export const BOOTSTRAP_NOVIDADES_DIAS = 7;

/**
 * Calcula a janela [quinta, domingo] mais próxima a partir de `now`.
 * Se hoje já for quinta, sexta, sábado ou domingo dentro da janela atual,
 * usa a janela corrente (não pula pra semana seguinte).
 */
export function getJanelaFimDeSemana(now: Date): { inicio: Date; fim: Date } {
  const diaSemana = now.getDay(); // 0=dom .. 4=qui .. 6=sáb

  // Distância (em dias) até a quinta que abre a janela corrente:
  // - qui/sex/sáb (4,5,6): quinta foi há diaSemana-4 dias (0,1,2)
  // - seg/ter/qua (1,2,3): quinta ainda vai chegar, diaSemana-4 é negativo
  //   (-3,-2,-1) e o subtract abaixo empurra `inicio` pra frente
  // - dom (0): caso especial — quinta foi há 3 dias (fecha a janela corrente
  //   em vez de pular pra próxima semana, que é o que diaSemana-4=-4 daria)
  const diasDesdeQuinta = diaSemana === 0 ? 3 : diaSemana - 4;

  const inicio = new Date(now);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - diasDesdeQuinta);

  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 3);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim };
}

function parseDataLocal(iso: string): Date {
  // proxima_data vem como "YYYY-MM-DD" (Sanity `date`) — parse sem timezone
  // pra não perder um dia por causa de UTC.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function estaNaJanela(proximaData: string, inicio: Date, fim: Date): boolean {
  const data = parseDataLocal(proximaData);
  return data >= inicio && data <= fim;
}

function ordenarPorProximaDataENome(atracoes: AtracaoNewsletter[]): AtracaoNewsletter[] {
  return [...atracoes].sort((a, b) => {
    const aTemData = Boolean(a.proxima_data);
    const bTemData = Boolean(b.proxima_data);
    if (aTemData && bTemData) {
      const cmp = a.proxima_data!.localeCompare(b.proxima_data!);
      if (cmp !== 0) return cmp;
    } else if (aTemData !== bTemData) {
      return aTemData ? -1 : 1;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

export interface ClassificarOpts {
  now?: Date;
  lastDraftDate?: Date | null;
}

export function classificarAtracoes(
  atracoesEntrada: AtracaoNewsletter[],
  opts: ClassificarOpts = {},
): ClassificacaoResultado {
  const now = opts.now ?? new Date();

  const lastDraftDate =
    opts.lastDraftDate === undefined
      ? null
      : opts.lastDraftDate;

  const corteNovidades =
    lastDraftDate ??
    new Date(now.getTime() - BOOTSTRAP_NOVIDADES_DIAS * 24 * 60 * 60 * 1000);

  const { inicio, fim } = getJanelaFimDeSemana(now);

  // Só atrações publicáveis entram em qualquer seção.
  const operando = atracoesEntrada.filter((a) => a.status === "operando");

  const usados = new Set<string>();

  // 1. Novidades — prioridade máxima
  const novidades = ordenarPorProximaDataENome(
    operando.filter((a) => {
      if (usados.has(a._id)) return false;
      const criadaEm = new Date(a._createdAt);
      const eh = criadaEm > corteNovidades;
      return eh;
    }),
  );
  novidades.forEach((a) => usados.add(a._id));

  // 2. Fim de semana
  const fimDeSemana = ordenarPorProximaDataENome(
    operando.filter((a) => {
      if (usados.has(a._id)) return false;
      if (!a.proxima_data) return false;
      return estaNaJanela(a.proxima_data, inicio, fim);
    }),
  );
  fimDeSemana.forEach((a) => usados.add(a._id));

  // 3. Permanentes — status operando e sem proxima_data
  const permanentes = ordenarPorProximaDataENome(
    operando.filter((a) => {
      if (usados.has(a._id)) return false;
      return !a.proxima_data;
    }),
  );
  permanentes.forEach((a) => usados.add(a._id));

  return aplicarLimitePorSecao({ novidades, fimDeSemana, permanentes });
}

/**
 * Quantos itens mostrar dado quanto tem disponível:
 *   >= META_POR_SECAO (4)     → mostra a meta (4)
 *   1..FALLBACK_POR_SECAO (2) → mostra o que tiver (1 ou 2)
 *   >= FALLBACK_POR_SECAO e < META_POR_SECAO (3) → mostra só o fallback (2)
 *   0                          → mostra 0 (seção some do output)
 */
export function quantidadeParaSecao(disponivel: number): number {
  if (disponivel >= META_POR_SECAO) return META_POR_SECAO;
  return Math.min(disponivel, FALLBACK_POR_SECAO);
}

/**
 * Aplica o corte por seção — cada seção é independente, sem orçamento
 * compartilhado entre elas (ver regra revisada no cabeçalho do arquivo).
 */
export function aplicarLimitePorSecao(
  resultado: ClassificacaoResultado,
): ClassificacaoResultado {
  return {
    novidades: resultado.novidades.slice(0, quantidadeParaSecao(resultado.novidades.length)),
    fimDeSemana: resultado.fimDeSemana.slice(0, quantidadeParaSecao(resultado.fimDeSemana.length)),
    permanentes: resultado.permanentes.slice(0, quantidadeParaSecao(resultado.permanentes.length)),
  };
}
