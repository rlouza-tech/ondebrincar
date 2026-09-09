import { defineField, defineType } from "sanity";

/**
 * Pool de carrosséis candidatos — 5 zonas (US-I47/US-I50) + categoria como
 * opção alternativa (US-I46, Discovery 19/08, Grupo 2.1/2.2). "Destaques" não
 * entra aqui: é fixo, sempre primeiro, curado separadamente (US-I51).
 */
const CARROSSEL_OPTIONS = [
  { title: "Zona Sul", value: "zona-sul" },
  { title: "Zona Sudoeste", value: "zona-sudoeste" },
  { title: "Zona Norte", value: "zona-norte" },
  { title: "Zona Central", value: "zona-central" },
  { title: "Zona Oeste", value: "zona-oeste" },
  { title: "Categoria", value: "categoria" },
];

/**
 * Documento único (singleton) — não há criação de novos documentos deste tipo,
 * só o painel de curadoria acessado via Structure (US-I46). Mockup navegável
 * aprovado pelo Rafa ao vivo em 09/09/2026 (sessão de Discovery/prototipação),
 * combinado com o painel da US-I51 (mesma área do Studio).
 */
export const configHome = defineType({
  name: "configHome",
  title: "Configuração da Home",
  type: "document",
  description:
    "Escolha e ordem dos carrosséis de zona/categoria exibidos na home, abaixo de Destaques " +
    "(US-I46). Documento único.",
  fields: [
    defineField({
      name: "carrosseisAtivos",
      title: "Carrosséis ativos",
      type: "array",
      description:
        "3 a 5 carrosséis, além de Destaques (que é sempre fixo e não entra nesta lista). " +
        "Arraste para reordenar — a ordem da lista define a ordem de exibição na home.",
      of: [{ type: "string", options: { list: CARROSSEL_OPTIONS } }],
      validation: (Rule) => Rule.required().min(3).max(5).unique(),
    }),
  ],
  preview: {
    select: { carrosseisAtivos: "carrosseisAtivos" },
    prepare({ carrosseisAtivos }) {
      const total = Array.isArray(carrosseisAtivos) ? carrosseisAtivos.length : 0;
      return {
        title: "Configuração da Home",
        subtitle: `${total} carrosséis ativos (além de Destaques)`,
      };
    },
  },
});
