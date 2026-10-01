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

## GTM e GA4 (corrigido em 01/10/2026)

> **Correção:** a versão original deste handoff dizia que `card_click` "já é encaminhado" e que o GTM não
> precisava de ajuste. Estava errado, afirmado sem checar o container. O `gtm.js` publicado (versão 5) mostrou:
> a regex do "Trigger - 5 Eventos NSM" não tinha `card_click`, e a tag "GA4 - Eventos NSM" enviava só
> `view_source`. **Nenhum clique em card da Home chegou ao GA4 desde a US-V11.**

Feito pelo Rafa no GTM (contêiner `GTM-TN6KCV25`), publicado como **versão 6 — "US-I54: card_click + position"**
(01/10/2026, 9:57):
- Regex do "Trigger - 5 Eventos NSM" ganhou `|card_click`.
- 5 variáveis de camada de dados novas: `DLV - position`, `DLV - source_section`, `DLV - attraction_id`,
  `DLV - attraction_name`, `DLV - category` (nome da camada de dados = parâmetro, sem prefixo).
- Tag "GA4 - Eventos NSM": 5 parâmetros novos, além do `view_source`.
- Validado no Preview (tag disparada, 5 parâmetros preenchidos, `position` tipo number) e conferido no
  `gtm.js` ao vivo (versão 6, regex e parâmetros corretos). Reverter: republicar a v5 em Versões.

Pendente (Rafa):
- Validar no Chrome real (fora do Tag Assistant): Network → `g/collect` com `en=card_click` e `ep.position`, 204.
- Registrar `position` e `source_section` como **dimensões customizadas** no GA4 (escopo evento). Sem isso os
  parâmetros chegam, mas não aparecem em relatórios. `attraction_id`/`attraction_name`/`category`: conferir se já
  estão registrados.
- Não há dado histórico: o `card_click` só passa a existir no GA4 a partir de 01/10/2026.

## Sprint 20

Total acumulado: 43 + 1 = **44 de 61 SP**.

## Fora de escopo / sem commit

- `docs/discovery/DISCOVERY-2026-09-17-atualizacao-gemini-3-8.md` segue untracked e fora do commit.

## Retro

**O que foi bom**
- A checagem de sobreposição antes de codar evitou um evento duplicado: `home_card_click` dobraria cada clique no
  GA4.
- Ler o `gtm.js` publicado (curl) achou o gap do `card_click` desde a V11, que o código e os testes não mostravam.
- Tornar `position` obrigatória deixou o `tsc` apontar todos os callers, sem depender de grep.
- A verificação no browser em dois viewports confirmou os valores reais no `dataLayer`, além dos mocks.

**O que pode melhorar**
- Atualizei os testes por regex assumindo `position: 0` em todos; um teste (`DestaquesTrilhaMobile`) clicava no 2º
  card e falhou. Assumi sem ler cada teste — custou duas rodadas de suíte.
- O AC da story foi escrito (no refinamento) sem checar o que a V11 já enviava; a story ficou "A refinar" por
  3 sprints e chegou com AC desatualizado.
- Afirmei que `card_click` já chegava ao GA4 sem checar o GTM; o erro só apareceu quando o Rafa abriu o contêiner.
- A listagem "ver todas" ficou sem verificação no browser (exigiria abrir o teaser com filtros).

**Plano de ação**
- Claude: ao editar asserts em lote, ler cada caso antes de aplicar valor padrão — próximas sessões de testes.
- Rafa: ao refinar stories de tracking, checar eventos existentes em `lib/analytics.ts` antes de fechar ACs —
  próximo Refinamento.
- Claude: em story de tracking, checar o `gtm.js` publicado (regex e parâmetros da tag) antes de afirmar que um evento chega ao GA4 — próximas sessões.
- Claude: incluir todas as superfícies (inclusive a listagem expandida) no checklist de verificação de tracking.
