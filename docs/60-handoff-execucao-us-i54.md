# Handoff de execução — US-I54 (Instrumentar clique nos cards da Home)

Sprint 20 · 1 SP · branch `feat/us-i54-home-card-click` (sem commit, sem PR — aguardando pedido do Rafa)

## Decisão de escopo (Rafa, na sessão)

O AC original pedia um evento novo `home_card_click` com `view_source: "listing_card"`. A investigação
mostrou que `card_click` (US-V11) já cobre o objetivo em todos os cards da Home (Destaques desktop/mobile,
carrosséis de zona desktop/mobile, listagem "ver todas"), com `attraction_id`, `attraction_name`, `category`
e `source_section` (que supera `view_source`, mais granular). Só faltava `position`.

**Opção escolhida pelo Rafa: estender `card_click` com `position` (0-based por seção).** Não foi criado
`home_card_click`; `view_source` não foi adicionado (redundante com `source_section`). Os ACs 1–4 foram
reinterpretados assim: o AC2 vale para `card_click` + `position`; AC1/AC3 já estavam atendidos pela V11.

## O que mudou

- `lib/analytics.ts`: `CardClickParams.position: number`; `buildCardClickParams(atracao, sourceSection, position)`.
- `position` é prop **obrigatória** em `AtracaoCardLink`, `DestaqueCard`, `DestaqueCardMobile`, `ZonaCardMobile`
  (para nenhum caller esquecer).
- Callers passam o índice do `.map`: `app/home-content.tsx`, `DestaquesTrilha(.Mobile)`, `ZonaCarrossel(.Mobile)`.
- Testes: asserts de `card_click` atualizados com `position`; novos casos com posição ≠ 0
  (`AtracaoCardLink` position=3, `DestaquesTrilha` 2º card = 1; `DestaquesTrilhaMobile` já clicava no 2º = 1).

## Verificação

- Baseline: tsc limpo, 950 testes / 89 arquivos, lint limpo.
- Final: tsc limpo, **952 testes / 89 arquivos verdes**, lint limpo.
- Dev server local (dataLayer, cliques com navegação bloqueada, sem escrita em nada):
  - Desktop (1024px): Destaques → posições 0, 1, 2; carrossel Zona Sul, 3º card → `position: 2`.
  - Mobile (375px): Destaques 2º card → `position: 1`; Zona Sul 2º card → `position: 1`.
  - Listagem "ver todas": coberta só por teste unitário (`home-content.test.tsx`, position 0); não exercitada no browser.

## Ação manual do Rafa (pendente)

- Registrar `position` como **dimensão customizada** no GA4 (escopo evento) para aparecer em relatórios — mesma
  natureza da US-I48. `card_click` já é encaminhado, então não precisa mexer no trigger do GTM.
- Alterar o handling de `position` no GTM só se a tag do GA4 usar lista fixa de parâmetros (conferir).

## Sprint 20

Total acumulado: 43 + 1 = **44 de 61 SP**.

## Fora de escopo / sem commit

- `docs/discovery/DISCOVERY-2026-09-17-atualizacao-gemini-3-8.md` segue untracked e fora do commit.

## Retro

**O que foi bom**
- A checagem de sobreposição antes de codar evitou um evento duplicado: `home_card_click` dobraria cada clique no
  GA4 e dependeria de ajuste manual no GTM.
- Tornar `position` obrigatória deixou o `tsc` apontar todos os callers, sem depender de grep.
- A verificação no browser em dois viewports confirmou os valores reais no `dataLayer`, além dos mocks.

**O que pode melhorar**
- Atualizei os testes por regex assumindo `position: 0` em todos; um teste (`DestaquesTrilhaMobile`) clicava no 2º
  card e falhou. Assumi sem ler cada teste — custou duas rodadas de suíte.
- O AC da story foi escrito (no refinamento) sem checar o que a V11 já enviava; a story ficou "A refinar" por
  3 sprints e chegou com AC desatualizado.
- A listagem "ver todas" ficou sem verificação no browser (exigiria abrir o teaser com filtros).

**Plano de ação**
- Claude: ao editar asserts em lote, ler cada caso antes de aplicar valor padrão — próximas sessões de testes.
- Rafa: ao refinar stories de tracking, checar eventos existentes em `lib/analytics.ts` antes de fechar ACs —
  próximo Refinamento.
- Claude: incluir todas as superfícies (inclusive a listagem expandida) no checklist de verificação de tracking.
