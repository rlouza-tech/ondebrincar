# S2.2 / I2.1 — Setup Sanity v3 + integração Next.js

**Data:** 2026-05-15  
**Story:** US-I2.1

## Decisão

Usar **Sanity v3 packages** como CMS headless, com Studio embarcada no próprio Next.js em `/studio`.

Esta é uma divergência mínima da ADR 0002, que apontava Sanity v3 como CMS mas ainda deixava o hosting do Studio em aberto. A Studio embarcada reduz superfície operacional no MVP: mesmo domínio, mesmo deploy Vercel e menos uma URL para configurar. Se a operação editorial crescer, podemos separar em `*.sanity.studio` sem mudar o schema nem as queries.

## Estrutura

| Caminho | Responsabilidade |
|---------|------------------|
| `sanity.config.ts` | Configuração do Studio embarcado |
| `sanity/schemas/` | Schemas editoriais do CMS |
| `sanity/schemas/atracao.ts` | Schema Atração do MVP |
| `app/studio/[[...index]]/page.tsx` | Rota Next.js da Studio em `/studio` |
| `lib/sanity/client.ts` | Clientes Sanity público e com token |
| `lib/sanity/queries.ts` | Queries GROQ reutilizáveis |
| `lib/sanity/types.ts` | Tipos TS da integração |

## Schema Atração

O schema `atracao` implementa o núcleo de 15 campos necessário para a fase A/B do MVP, alinhado ao `docs/data-model.md`:

- `nome`, `slug`, `categoria`, `idade_min`, `idade_max`
- `duracao_min`, `preco`, `link_compra`, `partner`, `bairro`
- `indoor_outdoor`, `status`, `descricao`, `mini_review`, `foto`

`categoria` e `bairro` começam como strings validadas/descritas. O data model prevê referências para schemas próprios de Categoria e Bairro; esses schemas entram em story futura para evitar aumentar o escopo desta entrega.

## Dois clientes

- `sanityClient`: cliente público, sem token, `useCdn: true` em produção. Usado para leitura de conteúdo publicado.
- `sanityWriteClient`: cliente server-side com `SANITY_API_TOKEN`, `useCdn: false`. Reservado para futuras escritas/imports e leitura de drafts.

O token **nunca** deve ser importado em Client Components.

## Fallback para mocks

`lib/atracoes.ts` tenta buscar no Sanity. Se não houver env vars, se a query falhar ou se o dataset estiver vazio, retorna `lib/mock-atracoes.ts`. Isso mantém Home, ficha e busca funcionando antes da carga editorial real.

## Env vars

Dev local:

```bash
cp .env.example .env.local
# preencher NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET e SANITY_API_TOKEN
pnpm dev
```

Vercel:

- `NEXT_PUBLIC_SANITY_PROJECT_ID`: Project ID público do Sanity
- `NEXT_PUBLIC_SANITY_DATASET`: `production`
- `SANITY_API_TOKEN`: token secreto, apenas server-side

Nunca commitar `.env.local`.

## Como adicionar campos novos

1. Atualizar `docs/data-model.md` com tipo, obrigatoriedade e motivo.
2. Adicionar campo em `sanity/schemas/atracao.ts` com `description` e `validation`.
3. Atualizar `lib/sanity/types.ts` e a projeção GROQ em `lib/sanity/queries.ts`.
4. Adaptar `mapSanityAtracao` em `lib/atracoes.ts` se o campo for usado no frontend.
5. Criar/atualizar teste cobrindo o novo shape.
