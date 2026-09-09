import { defineField, defineType } from "sanity";

/**
 * Documento único (singleton) — não há criação de novos documentos deste tipo,
 * só o painel de curadoria acessado via Structure (US-I51). Mockup navegável
 * aprovado pelo Rafa ao vivo em 09/09/2026 (sessão de Discovery/prototipação).
 */
export const destaquesSemana = defineType({
  name: "destaquesSemana",
  title: "Destaques da semana",
  type: "document",
  description:
    "Curadoria manual da trilha 'Destaques da semana' na home (US-I43/US-I49). Documento único.",
  fields: [
    defineField({
      name: "atracoes",
      title: "Atrações em destaque",
      type: "array",
      description:
        "3 a 4 atrações, na ordem em que aparecem na trilha. Arraste para reordenar.",
      of: [{ type: "reference", to: [{ type: "atracao" }] }],
      validation: (Rule) => Rule.required().min(3).max(4).unique(),
    }),
    defineField({
      name: "ultimaCuradoria",
      title: "Última curadoria manual",
      type: "datetime",
      description:
        "Atualize esta data (botão 'Agora' no seletor) sempre que editar a curadoria manualmente. " +
        "Se passarem 7+ dias sem atualização, o cron de rotação automática sorteia novas atrações " +
        "ativas sem esconder a seção nem travar a home (decisão de Refinamento, 04/09/2026).",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { atracoes: "atracoes", ultimaCuradoria: "ultimaCuradoria" },
    prepare({ atracoes, ultimaCuradoria }) {
      const total = Array.isArray(atracoes) ? atracoes.length : 0;
      return {
        title: "Destaques da semana",
        subtitle: ultimaCuradoria
          ? `${total} atrações · curadoria em ${new Date(ultimaCuradoria).toLocaleDateString("pt-BR")}`
          : `${total} atrações`,
      };
    },
  },
});
