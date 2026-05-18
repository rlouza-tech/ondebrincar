import { defineField, defineType } from "sanity";

const categoriaOptions = [
  { title: "Teatro infantil", value: "teatro" },
  { title: "Parque", value: "parque" },
  { title: "Museu", value: "museu" },
  { title: "Atividade extra", value: "atividade-extra" },
  { title: "Evento", value: "evento" },
];

const bairroExamples = "Ex.: Tijuca, Leblon, Centro, São Cristóvão";

export const atracao = defineType({
  name: "atracao",
  title: "Atração",
  type: "document",
  description:
    "Atração infantil editorial gerenciada no Sanity. Espelha o núcleo de 15 campos do data-model para o MVP.",
  fields: [
    defineField({
      name: "nome",
      title: "Nome",
      type: "string",
      description: "Título visível da atração. Ex.: Chapeuzinho Vermelho — Versão Musical.",
      validation: (Rule) => Rule.required().min(3).max(120),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description:
        "Identificador URL-friendly, único e estável. Ex.: chapeuzinho-vermelho-leblon.",
      options: { source: "nome", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "categoria",
      title: "Categoria",
      type: "string",
      description:
        "Categoria editorial da atração. Futuramente pode virar referência para o schema Categoria.",
      options: { list: categoriaOptions, layout: "radio" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "idade_min",
      title: "Idade mínima",
      type: "number",
      description: "Idade mínima recomendada, em anos. Ex.: 3.",
      validation: (Rule) => Rule.required().integer().min(0).max(18),
    }),
    defineField({
      name: "idade_max",
      title: "Idade máxima",
      type: "number",
      description: "Idade máxima recomendada, em anos. Ex.: 8.",
      validation: (Rule) =>
        Rule.required()
          .integer()
          .min(0)
          .max(18)
          .custom((idadeMax, context) => {
            const parent = context.parent as { idade_min?: number } | undefined;
            if (typeof idadeMax !== "number" || typeof parent?.idade_min !== "number") {
              return true;
            }
            return idadeMax >= parent.idade_min
              ? true
              : "Idade máxima deve ser maior ou igual à idade mínima.";
          }),
    }),
    defineField({
      name: "duracao_min",
      title: "Duração (min)",
      type: "number",
      description: "Duração aproximada em minutos. Ex.: 60.",
      validation: (Rule) => Rule.integer().min(0).max(600),
    }),
    defineField({
      name: "preco",
      title: "Preço (centavos)",
      type: "number",
      description:
        "Preço em centavos para evitar float. R$ 40,00 = 4000; 0 = gratuito; vazio = não informado.",
      validation: (Rule) => Rule.integer().min(0),
    }),
    defineField({
      name: "link_compra",
      title: "Link de compra",
      type: "url",
      description: "URL externa para ingresso ou página oficial. Obrigatório se status = operando.",
      validation: (Rule) =>
        Rule.uri({ scheme: ["http", "https"] }).custom((link, context) => {
          const parent = context.parent as { status?: string } | undefined;
          if (parent?.status === "operando" && !link) {
            return "Link de compra é obrigatório quando a atração está operando.";
          }
          return true;
        }),
    }),
    defineField({
      name: "partner",
      title: "Partner",
      type: "string",
      description: "Parceiro do link de compra. Ex.: sympla, eventim ou outro.",
      options: {
        list: [
          { title: "Sympla", value: "sympla" },
          { title: "Eventim", value: "eventim" },
          { title: "Outro", value: "outro" },
        ],
        layout: "radio",
      },
      validation: (Rule) =>
        Rule.custom((partner, context) => {
          const parent = context.parent as { status?: string; link_compra?: string } | undefined;
          if (parent?.status === "operando" && parent.link_compra && !partner) {
            return "Partner é recomendado quando há link de compra.";
          }
          return true;
        }),
    }),
    defineField({
      name: "bairro",
      title: "Bairro",
      type: "string",
      description: `Bairro da atração. ${bairroExamples}. Futuramente pode virar referência para o schema Bairro.`,
      validation: (Rule) => Rule.required().min(2).max(80),
    }),
    defineField({
      name: "indoor_outdoor",
      title: "Indoor / outdoor",
      type: "string",
      description: "Ambiente principal da atração.",
      options: {
        list: [
          { title: "Indoor", value: "indoor" },
          { title: "Outdoor", value: "outdoor" },
          { title: "Ambos", value: "ambos" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      description: "Estado editorial/publicável da atração.",
      options: {
        list: [
          { title: "Operando", value: "operando" },
          { title: "Encerrada", value: "encerrada" },
          { title: "Em obras", value: "em_obras" },
          { title: "Esgotada", value: "esgotada" },
        ],
        layout: "radio",
      },
      initialValue: "operando",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "descricao",
      title: "Descrição",
      type: "text",
      description: "Descrição objetiva, vinda do produtor/scraping. Até cerca de 1000 caracteres.",
      rows: 5,
      validation: (Rule) => Rule.required().min(20).max(1000),
    }),
    defineField({
      name: "mini_review",
      title: "Mini review",
      type: "text",
      description:
        "Comentário autoral curto do Onde Brincar, com ressalvas francas. Até cerca de 500 caracteres.",
      rows: 4,
      validation: (Rule) => Rule.max(500),
    }),
    defineField({
      name: "foto",
      title: "Foto",
      type: "image",
      description: "Imagem principal da atração via Sanity Asset Pipeline, com hotspot.",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Texto alternativo",
          type: "string",
          description: "Descrição objetiva da imagem para acessibilidade.",
          validation: (Rule) => Rule.required().min(5).max(160),
        }),
      ],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "nome",
      subtitle: "bairro",
      media: "foto",
    },
  },
});
