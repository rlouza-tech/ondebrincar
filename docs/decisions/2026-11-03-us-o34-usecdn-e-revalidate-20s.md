# ADR — Leituras públicas pela CDN do Sanity e revalidate de 20 s (US-O34)

**Data:** 03/11/2026 · **Decisão:** Rafa (desenho "a": sem webhook e sem variável secreta)

## Contexto

O site consumia ~210 mil das 250 mil requisições/mês de API da Sanity (84%), quase todas das leituras públicas da home e da ficha (US-O33, Agentes `docs/113`). A CDN da Sanity tem cota própria de 1.000.000 e estava com 0 uso. O spike US-O35 (`docs/117`) mediu: ficha nova visível em 0,7 a 2,1 s; a CDN entrega o dado novo em ~1,3 s; edição de ficha já visitada levou ~51,6 s por causa do `revalidate: 60` da US-O31 (cache do Next, não da CDN); rascunho não vaza.

## Decisão

1. `sanityClient` (`lib/sanity/client.ts`) passa a `useCdn: true`. Só lê documentos publicados.
2. `sanityPreviewClient` novo: sem CDN, com token, perspectiva `previewDrafts`. Nenhuma rota pública o usa hoje.
3. `revalidate: 20` na home (`atracoes`, `config-home`, `destaques`) e na ficha (`getAtracaoBySlug` e as 4 consultas de recomendações). Slugs do sitemap (3600) e a lista de slugs (60) ficam como estavam.
4. Sem webhook. Webhook só vira story depois de 7 dias de medição, se o consumo continuar alto.

## Se algo falhar

- Dado velho demais ou ficha nova não aparece: voltar `useCdn: false` em `sanityClient` (uma linha) e/ou subir o `revalidate`.
- Cota da CDN alta (estimativa: ~21% do mês, até ~42% em mês de pico): subir o `revalidate` (60 s volta ao estado da O31) antes de pensar em webhook.
- Ficha nova que recebe visita antes de a CDN atualizar (< ~1,5 s após publicar) pode guardar um 404 por até 20 s: risco aceito.
- Se o consumo de API não cair em 7 dias: abrir story de webhook (`revalidateTag`/`revalidatePath`, com secret na Vercel, 🔴 do Rafa).

## Consequências

- O editor vê edição no site em ~20 s + tempo da regeração (stale-while-revalidate: a visita que vence o cache recebe a versão antiga e dispara a regeração).
- A redução de cota só se mede em produção (AC7: gráfico diário da Sanity API vs CDN, a partir de 09/11, junto da AC5 da US-O31).
