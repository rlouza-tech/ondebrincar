# ADR — Rename do parâmetro de evento GA4 `source` → `view_source`

**Data:** 2026-06-25
**Status:** Aceito
**Story relacionada:** US-V2 (Sprint 11). Desbloqueia US-I17 (validar `attraction_view` no NSM) e US-I16 (Dashboard WAU Planejadores).

---

## Contexto

Quatro eventos GA4 custom (`attraction_view`, `save_click`, `share_click`, `outbound_click`) enviam um parâmetro `source` com valores como `listing_card` / `detail_page` / `listing`, indicando de onde na UI o evento foi disparado.

`source` também é o nome de uma **dimensão built-in de sessão** do GA4 — captura `utm_source` / dados de referral da sessão do usuário. Quando um evento customizado usa `source` como nome de parâmetro, o GA4 prioriza a dimensão de sessão embutida e ignora (ou mistura com) o valor do parâmetro de evento. Resultado prático: os relatórios mostram a origem da sessão (ex: `google`, `(direct)`), não a origem do clique dentro do produto (`listing_card` vs `detail_page`) — que é o dado que o produto realmente precisa para o NSM (WAU Planejadores).

## Decisão

Renomear o parâmetro `source` → `view_source` em todos os pontos do código que disparam os 4 eventos acima.

## Alternativas descartadas

| Opção | Por que foi descartada |
|---|---|
| Manter `source` e aceitar o dado incorreto | Inviabiliza o NSM — a métrica de WAU Planejadores depende de saber de onde a intenção veio |
| Prefixar todos os parâmetros customizados (`ob_source`, `ob_category`, etc.) | Escopo maior que o necessário; só `source` colide com dimensão built-in do GA4 hoje |
| `view_source` | **Aceito** — nome descritivo, sem colisão com dimensões built-in do GA4, mantém o padrão `{contexto}_{atributo}` |

## Consequências

- **Descontinuidade histórica.** Eventos disparados antes do deploy desta mudança continuam com o parâmetro antigo `source` (que nunca foi lido corretamente). Após o deploy, novos eventos chegam com `view_source` preenchido corretamente; não há como retroagir o histórico.
- **Dimensão personalizada do GA4 precisa ser recriada** (ação manual, fora do código) apontando para o novo parâmetro `view_source`.
- **Exploration de US-V3 AC1** (GA4 Explorations, criada no Sprint 10) referencia a dimensão antiga — precisa ser atualizada para usar `view_source` após o deploy.
- **GTM:** se houver tag/variável no container GTM mapeando explicitamente a chave `source` do dataLayer para o parâmetro de evento GA4, essa configuração vive fora do repositório e não segue o rename automaticamente — precisa de verificação manual no painel do GTM.
- **Lição para o futuro:** antes de nomear qualquer parâmetro de evento GA4, checar contra a lista de dimensões built-in do GA4 (session-level: `source`, `medium`, `campaign`, etc.).

## Escopo (arquivos alterados)

- `lib/analytics.ts` — 4 interfaces de tipo + `buildAttractionViewParams` + `trackShareClick`
- `hooks/useAttractionView.ts` — tipo do parâmetro
- `components/AtracaoCardLink.tsx`
- `components/AtracaoDetailActions.tsx`
- `components/OutboundLink.tsx`
- `components/ShareSearchButton.tsx`
- `components/OutboundLink.test.tsx`
- `components/AtracaoDetailActions.test.tsx`

## Pendências manuais (Rafa)

1. Recriar dimensão personalizada `view_source` no GA4 após o deploy
2. Verificar/atualizar variável no GTM, se existir mapeamento explícito de `source`
3. Atualizar exploration de US-V3 AC1 para usar `view_source`
