import { defineField, defineType } from "sanity";

/**
 * Resumo de uma rodada do pipeline de Agentes (US-S5).
 *
 * Gravado pelo repo Agentes ao fim de cada rodada (`src/pipeline/rodada-sanity.ts`), com `_id`
 * determinístico derivado do arquivo da rodada. Só leitura no Studio: nenhum campo de texto-fonte
 * nem decisão do Curador entra aqui. O acesso às fichas continua pela entrada
 * "Precisa revisão humana" — esta lista traz só os slugs.
 */
export const STATUS_RODADA = [
  { title: "OK", value: "ok" },
  { title: "Intervenção necessária", value: "intervencao_necessaria" },
  { title: "Com erros", value: "com_erros" },
  { title: "Com erro", value: "com_erro" },
] as const;

export const rodadaPipeline = defineType({
  name: "rodadaPipeline",
  title: "Rodada do pipeline",
  type: "document",
  readOnly: true,
  description: "Resumo de uma rodada dos Agentes, gravado automaticamente ao fim da rodada (US-S5).",
  fields: [
    defineField({ name: "fonte", title: "Fonte", type: "string" }),
    defineField({ name: "modo", title: "Modo", type: "string" }),
    defineField({ name: "inicio", title: "Início", type: "datetime" }),
    defineField({ name: "fim", title: "Fim", type: "datetime" }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: [...STATUS_RODADA] },
    }),
    defineField({
      name: "totais",
      title: "Totais",
      type: "object",
      fields: [
        defineField({ name: "recebido", title: "Cards recebidos da fonte", type: "number" }),
        defineField({ name: "aprovados", title: "Aprovados na triagem", type: "number" }),
        defineField({ name: "processadosComSucesso", title: "Processados com sucesso", type: "number" }),
        defineField({ name: "errosProcessamento", title: "Erros de processamento", type: "number" }),
      ],
    }),
    defineField({ name: "needsHuman", title: "Fichas em needs_human", type: "number" }),
    defineField({
      name: "slugsParaRevisar",
      title: "Slugs para revisar",
      type: "array",
      of: [{ type: "string" }],
      description: "Abra as fichas pela entrada 'Precisa revisão humana'.",
    }),
  ],
  preview: {
    select: { fonte: "fonte", status: "status", inicio: "inicio", needsHuman: "needsHuman" },
    prepare({ fonte, status, inicio, needsHuman }) {
      const rotulo = STATUS_RODADA.find((s) => s.value === status)?.title ?? status ?? "—";
      const data = inicio ? new Date(inicio).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "sem data";
      return {
        title: `${fonte ?? "?"} · ${rotulo}`,
        subtitle: `${data} · ${needsHuman ?? 0} para revisar`,
      };
    },
  },
});
