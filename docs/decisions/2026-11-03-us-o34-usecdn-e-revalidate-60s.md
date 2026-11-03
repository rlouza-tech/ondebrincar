# ADR — Leituras públicas pela CDN do Sanity, com revalidate de 60 s (US-O34)

**Data:** 03/11/2026 · **Decisão:** Rafa — "o foco é a cota cair; pode deixar o cache de 60 s". Sem webhook e sem variável secreta.

## Contexto

O site consumia ~210 mil das 250 mil requisições/mês de API da Sanity (84%), quase todas das leituras públicas da home e da ficha (US-O33, Agentes `docs/113`). A CDN da Sanity tem cota própria de 1.000.000 e estava com 0 uso.

O card pedia `useCdn: true` com `revalidate: 20` e edição visível em até 30 s. A medição em preview (Agentes `docs/121`) mostrou que **isso não é possível**:

| Teste | Resultado |
|---|---|
| CDN + `revalidate: 20`, edição de ficha já visitada | ~93,7 s |
| Sem CDN + `revalidate: 20` (2 rodadas) | 13,2 s e 12,1 s |
| CDN direta, consulta já guardada antes da edição | 50,3 s |
| CDN direta, consulta nova | 1,2 a 1,7 s |

Causa: a `apicdn` responde com `s-maxage=60, stale-while-revalidate=15`. Uma consulta já guardada **não é invalidada ao publicar**; fica velha até o `s-maxage` vencer. O "~1,3 s" da US-O35 vale só para ficha nova.

## Decisão

1. `sanityClient` com `useCdn: true` (só documentos publicados). Objetivo: tirar as leituras do site da cota de API.
2. `sanityPreviewClient` novo: sem CDN, com token, perspectiva `previewDrafts`. Nenhuma rota pública o usa hoje.
3. **`revalidate` continua em 60 s** (home e ficha, como na US-O31). Recomendações da ficha passam a declarar os mesmos 60 s explicitamente.
4. Sem webhook. Webhook só vira story se o consumo continuar alto depois de 7 dias de medição, e só funciona com leitura **sem** CDN (a CDN devolveria a resposta velha à regeração).

## Consequências

- **Aceito pelo Rafa:** edição de ficha já visitada pode levar mais de 1 minuto para aparecer (cache de 60 s do Next somado ao `s-maxage` de 60 s da CDN; ordem de 1 a 2,5 min, **não medido** com 60 s). Ficha nova não é afetada.
- O requisito de "30 s" do card **não é cumprido** neste desenho. Para cumpri-lo é preciso ler sem CDN (13 s medidos), o que não reduz a cota, ou sem CDN com cache longo e webhook (🔴 secret).
- A redução de cota é **esperada, não medida**: só se mede em produção (AC7: gráfico diário da Sanity, API vs CDN, 7 dias a partir do merge, junto da AC5 da US-O31).

## Se algo falhar

- Cota da CDN alta (estimativa ~21% do mês, ~42% em mês de pico): subir o `revalidate`.
- Edição demora demais para o editor: voltar `useCdn: false` em `sanityClient` (uma linha) aceita a cota como está, ou abrir story de webhook.
- Rascunho aparecendo no site: não deve ocorrer (consultas excluem `drafts.**` e a CDN só serve o publicado); se ocorrer, reverter.
