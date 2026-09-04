# Discovery — Cards em INVESTIGAR desaparecem sem rastro após a triagem

**Data:** 2026-09-03
**Sessão:** Claude Code, disparada por achado técnico durante execução da US-A18 (smoke test do pipeline real, Sprint 17)
**Base:** código real do repo `agentes-onde-brincar` (`src/pipeline/orquestrador.ts`, `src/schemas/curador.schema.ts`), `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-A18.md`

---

## Origem desta sessão

Rodando `pnpm rodar-pipeline -- --fonte=clubinho --limite=1` de verdade contra o site vivo (primeira execução real dessa fonte, hoje), o único card triado pelo Curador de Vitrines caiu em status `INVESTIGAR`. Ao tentar descobrir qual card foi esse e por quê, não havia como saber — nenhum log, nenhum arquivo, nenhum rastro. O Rafa pediu para abrir isso como Discovery.

## Fontes de sinal trazidas nesta sessão

- **Achado técnico direto em código**, confirmado por leitura de fonte (não é relato de terceiro nem suposição): `src/pipeline/orquestrador.ts`.
- **1 ocorrência real observada** na execução ao vivo de hoje (Clubinho, 03/09/2026) — amostra pequena, mas suficiente pra expor o comportamento.

**Força da evidência:** baixa em volume (1 ocorrência observada até agora), mas a causa raiz é 100% confirmada por leitura direta do código — não é especulação sobre um caso raro, é uma lacuna estrutural que existe toda vez que o Curador usa esse status, por design.

---

## Atualização — mesmo dia, sessão Cowork (03/09/2026)

Sinal adicional trazido pelo Rafa: a 5ª e última fonte, **Raindrop**, rodou de verdade hoje contra a API real do Raindrop: **9 cards reais, 4 aprovados, 1 descartado (fora do RJ), 4 caíram em `INVESTIGAR`**.

Ao investigar se as outras 4 fontes (que já tinham rodado na sessão original) geraram algum número, achei que o card do Discovery Board no Notion (`Cards em INVESTIGAR desaparecem sem rastro após a triagem`, Épico A) já tinha sido atualizado — fora desta sessão Cowork — com números reais de duas delas: **23 de 150 cards do Sympla e 5 de 74 do Clubinho caíram em `INVESTIGAR`**, na mesma sessão original (03/09/2026). Não achei esse número nos arquivos locais de `output/` (que só guardam `APROVADO` e são sobrescritos/fundidos por slug a cada rodada, ver `acumularItensProcessados`) — só existia registrado no Notion.

**Consolidado das 3 fontes com número real disponível (03/09/2026):**

| Fonte | Cards | Aprovados | Descartados | Investigar | % Investigar |
|---|---|---|---|---|---|
| Sympla | 150 | — | — | 23 | ~15% |
| Clubinho | 74 | — | — | 5 | ~7% |
| Raindrop | 9 | 4 | 1 | 4 | ~44% |

**Isso responde a Pergunta em aberto #2 original: `INVESTIGAR` não é caso raro — é volume real, todo dia, em pelo menos 3 das 5 fontes, variando de ~7% a ~44% dos cards triados.** Ainda não se sabe Ecovilla/Uhuu (as outras 2 fontes), mas a amostra já é grande o suficiente (233 cards, 3 fontes distintas) pra tratar isso como padrão estrutural, não anomalia. Isso muda a avaliação de Impacto e Prioridade no Diagnóstico abaixo.

**Achado incidental, verificado e descartado como o mesmo bug:** os relatórios `publicar-sanity-report-*.json` de uma rodada de hoje mostram `"review_status_ignored": 1`. Investigado em `src/pipeline/publicar-sanity.ts` (linhas ~91-101): é comportamento **intencional** da US-A4 (26/08/2026) — itens com `review_status` fora de `auto_ok`/`human_approved` (ex: `needs_human`) são propositalmente excluídos da publicação, mas continuam existindo como draft no Sanity, visíveis e recuperáveis no Studio. Diferente do bug do Curador — aqui o item não se perde, só não é publicado sozinho. Não abre story nova sobre isso especificamente (mas ver Mapeamento abaixo — o mesmo padrão "só contagem, sem lista" se repete em vários lugares do pipeline).

---

## Diagnóstico

### Problema único — Cards com status `INVESTIGAR` ficam invisíveis depois que a execução termina

**Causa raiz (confirmada por código, `orquestrador.ts`):** o Curador de Vitrines tem 3 status possíveis (`APROVADO`/`DESCARTADO`/`INVESTIGAR`, `curador.schema.ts`), mas só 2 deles deixam rastro:

- `DESCARTADO` é logado individualmente no console com título + motivo (linhas ~105-108).
- `APROVADO` vira ficha completa em `itens-processados.json` + `relatorio.html`.
- `INVESTIGAR` só entra numa contagem agregada (`investigar.length`) — nunca é logado individualmente, nunca salvo em arquivo, nunca escreve no Sanity. O card e o motivo do Curador (por que o texto era dúbio, o local incerto, a data ambígua) se perdem no momento em que a execução termina.

**Impacto:** Alto (revisado — ver Atualização acima). `INVESTIGAR` existe justamente para os casos que merecem uma decisão humana (não são claramente aprováveis nem claramente descartáveis) — sem visibilidade nenhuma, esses casos somem silenciosamente, e possíveis novidades reais (que só precisavam de alguém decidir) nunca chegam a lugar nenhum. Com dado real de 3 fontes (233 cards, 03/09/2026), a frequência varia de ~7% a ~44% dos cards triados — não é caso raro, é volume estrutural, todo dia, em toda fonte que já rodou de verdade.

**Esforço:** Baixo. O mesmo padrão que já existe para `DESCARTADO` (log individual com título + motivo, já implementado e testado) pode ser replicado quase diretamente para `INVESTIGAR` — não precisa de escrita no Sanity nem de infraestrutura nova.

**Prioridade recomendada:** P1 (revisado de P2 — ver Atualização acima). Continua não bloqueando nada em produção, mas com ~10-20 cards/dia batendo nesse buraco em pelo menos 3 fontes, o custo de não resolver acumula rápido — cada card perdido é uma atração real (ou um falso positivo real) que ninguém nunca vai ver.

---

## Checagem de contradição com ADRs existentes

Nenhuma ADR em `docs/decisions/` (repo `Cursor/`) trata de triagem, status do Curador ou visibilidade de resultados intermediários do pipeline de Agentes. Checado também nas decisões registradas dentro do próprio repo `agentes-onde-brincar` (`docs/13-decisao-unificacao-raw-card.md`, `docs/30-decisao-fluxo-pr.md`, `docs/33-adr-guardiao-so-rascunho.md`) — nenhuma trata do assunto deste Discovery. Sem contradição a apontar.

---

## Mapeamento — todo estado em que uma ficha pode parar fora do Sanity (pedido do Rafa, sessão Cowork 03/09/2026)

Pedido do Rafa: mapear no código, de ponta a ponta, todo lugar onde uma ficha pode "parar" sem virar draft/publicado no Sanity — pra decidir com uma visão completa (não caso a caso) o que vale construir. Feito lendo todo o pipeline (`src/pipeline/*.ts`) e os schemas (`src/schemas/*.ts`) do repo `agentes-onde-brincar`. Nenhum destes itens além do já diagnosticado acima virou story sozinho sem hipótese própria — ver notas de cada linha.

| # | Estado | Onde no código | Persistência hoje | Recuperável sem abrir arquivo na mão? | Nota |
|---|---|---|---|---|---|
| 1 | `INVESTIGAR` (Curador) | `orquestrador.ts` (`resultadoTriagem`) | Nenhuma — nem console individual, só contagem agregada | Não | Já diagnosticado acima (US-A19) |
| 2 | **Erro de processamento** (Extrator/QA/Direção de Arte/Imagem lança exceção) | `orquestrador.ts`, `catch` dentro do loop de `cardsParaProcessar` | Só `console.error` — **nem entra na contagem do `ResumoPipeline`** (não existe campo pra isso) | Não, e nem dá pra saber que aconteceu sem estar olhando o terminal no momento exato | **Achado novo, mais grave que o `INVESTIGAR`**: aqui não sobra nem uma contagem agregada — o card desaparece do resumo final inteiro |
| 3 | `DESCARTADO` (Curador) | `orquestrador.ts` | Console individual (título + motivo), efêmero | Não (só se alguém estava acompanhando o console) | Descarte é decisão legítima do Curador, não "pendência" — baixo risco, mas também sem histórico |
| 4 | Pulado por novidade/dedup (US-A1) | `orquestrador.ts` → `checarNovidade` | Console individual, efêmero | Não | Baixo risco — o item já existe no Sanity, não há perda de conteúdo real |
| 5 | Pulado por `--limite` (US-A18) | `orquestrador.ts` | Console individual, efêmero | Não | Baixo risco — deveria ser re-triado na próxima rodada, mas nada garante isso nem torna visível que ficou pendente |
| 6 | Alerta de campos em branco (scraper com seletor quebrado) | `campos-em-branco.ts` | Console apenas (até 3 exemplos por campo) — zero contagem no `ResumoPipeline` | Não | Sinal de saúde do scraper, não status de ficha — categoria diferente do resto desta tabela |
| 7 | `needs_human` (fusão Extrator+QA) | `orquestrador.ts` (`aplicarDecisaoQA`) | **Persistido com detalhe completo** em `itens-processados.json` + `relatorio.html` | Sim, mas exige abrir o JSON/HTML e filtrar manualmente por `review_status` | O único caso "bem instrumentado" hoje — mas exige exatamente o trabalho manual que o Rafa quer eliminar |
| 8 | `review_status_ignored` / `rejected_ignored` / `dedup_ignored` no publish | `publicar-sanity.ts` (linhas ~91-101) | Contagem agregada no report + console — **sem lista de slugs** (diferente de `created`/`updated`/`skipped`/`error`, que listam slug) | Parcial — dá pra cruzar com `itens-processados.json`, mas não é direto | Mesmo padrão "só número, sem detalhe" da tabela toda |
| 9 | Guardião do Catálogo — reativadas/avançadas/encerradas | `guardiao-catalogo.ts` / `orquestrador.ts` | Muda o Sanity de verdade (draft, US-A15) — recuperável no Studio — mas o resumo da rodada só tem contagem agregada, nenhuma lista de quais atrações mudaram | Parcial (via Studio, não via log da rodada) | Tecnicamente **dentro** do Sanity, não fora — fora do escopo literal do pedido, registrado por completude |
| 10 | Raindrop: item aprovado+publicado nunca é movido da coleção "Onde Brincar" pra "Processados" | `raindrop.ts` (`moveToCollection` existe mas não é chamado por `ingestRaindrop`) | Decisão deliberada (`docs/03`) — manual, não é bug | Sim, mas manual | Nota operacional, não é falha de visibilidade do pipeline |

**Como ler esta tabela:** as linhas 1, 2 e 8 são as únicas com zero-a-parcial recuperação E risco real de perda de conteúdo — são as candidatas de verdade a virar story de instrumentação. As linhas 4, 5, 9 e 10 têm baixo risco por desenho (dedup, limite, já dentro do Sanity, ou decisão manual deliberada) — documentadas aqui pra completude do mapa, não como pendência a resolver.

---

## Histórias rascunhadas

Último Story ID usado no épico A — Agentes (checado via Sprint Board no Notion): **US-A18** / **US-A18b** (ambas Concluída, Sprint 17). Próximos disponíveis: **US-A19**, **US-A20**, **US-A21**.

| Story ID | Título | Épico | SP estimado (chute) | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-A19 | Dar visibilidade a cards que caem em INVESTIGAR na triagem | A — Agentes | 1 (chute) | 1) Cards com status `INVESTIGAR` são logados individualmente no console em `orquestrador.ts`, no mesmo padrão já usado para `DESCARTADO` (título do card + motivo do Curador). 2) Teste cobrindo o novo log (mesmo padrão dos testes existentes de `DESCARTADO`). 3) `tsc`/lint limpos, testes verdes. **Em aberto, não travar o rascunho nisso:** se além do log no console vale também persistir em arquivo (já que o console se perde quando a sessão termina) — ver Pergunta em aberto #1 (a favor: volume real de ~7-44% justifica não depender só de console). | a definir |
| US-A20 | Contar e logar erros de processamento individualmente (Extrator/QA/Arte/Imagem) | A — Agentes | 1 (chute) | 1) `ResumoPipeline` ganha um campo de contagem de erros de processamento (hoje não existe nenhum). 2) Cada erro é logado individualmente no console no mesmo padrão de `DESCARTADO`/`INVESTIGAR` (título do card + origem + mensagem do erro). 3) Teste cobrindo o novo contador/log. 4) `tsc`/lint limpos, testes verdes. | a definir |
| US-A21 | Painel/relatório único de pendências fora do Sanity, por rodada | A — Agentes | 3 (chute, incerto) | 1) Depois de uma rodada (`rodar-pipeline` + `publicar-sanity`), existe um único artefato consolidado listando todo item que não chegou a `created`/`updated` no Sanity nessa execução — origem, título, etapa onde parou, motivo. 2) Cobre no mínimo: `INVESTIGAR`, `DESCARTADO`, erro de processamento, `needs_human` ignorado no publish, dedup/rejeitado ignorado no publish (linhas 1, 2, 3, 7, 8 do Mapeamento acima). 3) Teste cobrindo a consolidação. **Depende de US-A19 e US-A20 existirem primeiro** — sem o log/contagem individual dessas duas, não há dado pra consolidar sobre `INVESTIGAR` e erro de processamento. **Esforço real incerto** — precisa unir dados de `rodar-pipeline` e `publicar-sanity`, que hoje rodam em momentos separados (decisão consciente de manter publish manual, ver `rodar-pipeline.ts`) — avaliar no Refinamento se isso muda. | a definir |

---

## Parking lot

- **Alerta de campos em branco sem persistência** (`campos-em-branco.ts`, linha 6 do Mapeamento) — hipótese: se o scraper quebrar um seletor e ninguém estiver olhando o console naquele exato momento, o alerta se perde e a mudança de layout passa batido. Não entra como story agora porque é sinal de saúde do scraper (não status de ficha, escopo diferente do resto deste Discovery) e falta decidir o canal certo (log persistido? arquivo? notificação?) antes de ter um AC concreto.
- **Guardião do Catálogo sem lista de quais atrações mudaram por rodada** (linha 9 do Mapeamento) — hipótese: hoje só dá pra saber "3 encerradas" na rodada, não quais — mas fica fora do escopo literal deste Discovery porque a mudança já está dentro do Sanity (recuperável no Studio), não fora dele. Motivo de não virar story agora: esforço/prioridade ainda não avaliados, e é uma extensão natural de escopo, não o pedido original.

---

## Decisões tomadas nesta sessão

Nenhuma decisão de produto, arquitetura ou processo foi tomada — só diagnóstico e rascunho de story. Nenhum ADR a criar por enquanto.

---

## Perguntas em aberto

1. **Persistência além do console:** só logar (como `DESCARTADO` já faz) resolve o problema imediato, mas o console se perde quando a sessão termina — vale também salvar em arquivo (ex: uma seção "Investigar" no `relatorio.html`, ou uma lista separada em JSON) pra ficar recuperável depois? Com o volume real confirmado (~7% a ~44%), a resposta provável é sim — mas ainda cabe decidir formato no Refinamento.
2. ~~Frequência real ainda desconhecida~~ — **respondida** (ver Atualização acima): 23/150 (Sympla), 5/74 (Clubinho), 4/9 (Raindrop) cards caíram em `INVESTIGAR` na rodada real de 03/09/2026. Falta só Ecovilla/Uhuu, mas a amostra de 233 cards em 3 fontes já é suficiente pra tratar como padrão estrutural.
3. **Formato do painel único (US-A21):** nova seção do `relatorio.html`, um arquivo JSON novo (ex: `output/pendencias.json`), ou um comando CLI separado que lê `itens-processados.json` + o(s) `publicar-sanity-report-*.json` e imprime um resumo? Decidir no Refinamento da US-A21, depois que US-A19/US-A20 já estiverem gerando o dado que o painel vai consolidar.

---

## Recomendações pro próximo Kickoff/Refinamento

- US-A19 tem hipótese e AC mínimo, mas falta persona/cenário completo, SP calibrado e a Pergunta em aberto #1 resolvida — passar por Refinamento antes de qualquer Kickoff. Com o volume real confirmado, a recomendação é nascer já com persistência em arquivo, não só log console.
- **US-A20 e US-A21 são novas** (ver Mapeamento, pedido do Rafa nesta sessão Cowork) — US-A20 (contar/logar erros de processamento) é sequência natural de US-A19, mesmo padrão, mesmo esforço baixo. US-A21 (painel único) é o pedido de fundo do Rafa ("não quero abrir arquivo na mão") mas depende de US-A19+US-A20 existirem primeiro — não faz sentido no Kickoff antes delas.
- Sugestão de sequência pro Refinamento: **US-A19 → US-A20 → US-A21**, nessa ordem — as duas primeiras são baixo esforço e desbloqueiam a terceira.
- O card do Discovery Board no Notion já tem os números de Sympla/Clubinho — vale atualizar o campo Contexto dele com o número do Raindrop também, pra não ficar por fora do que está registrado aqui (Cowork não decide isso sozinho sem avisar — ver mensagem de resposta desta sessão).
