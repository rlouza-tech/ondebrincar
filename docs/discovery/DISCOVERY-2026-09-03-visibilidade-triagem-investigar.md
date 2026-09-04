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

**Correção em relação à primeira versão desta seção:** a primeira tentativa de atualizar este Discovery (mais cedo, mesma sessão Cowork) concluiu que a rodada real não tinha gerado dado de frequência — errado. O card do Discovery Board no Notion (`Cards em INVESTIGAR desaparecem sem rastro após a triagem`, Épico A) já tinha sido atualizado, fora desta sessão, com números reais de duas fontes que não foram checados antes de escrever a primeira versão desta atualização: **23 de 150 cards do Sympla e 5 de 74 do Clubinho caíram em `INVESTIGAR`** na mesma sessão original (03/09/2026). Registrando a correção em vez de simplesmente sobrescrever — subestimei a checagem, não foi "sem dado disponível".

Sinal adicional trazido pelo Rafa nesta sessão Cowork: a 5ª e última fonte, **Raindrop**, também rodou de verdade hoje contra o Raindrop real (a API do Rafa, não um site): **9 cards reais, 4 aprovados, 1 descartado (fora do RJ), 4 caíram em `INVESTIGAR`**.

**Consolidado das 3 fontes com número real disponível (03/09/2026):**

| Fonte | Cards | Aprovados | Descartados | Investigar | % Investigar |
|---|---|---|---|---|---|
| Sympla | 150 | — | — | 23 | ~15% |
| Clubinho | 74 | — | — | 5 | ~7% |
| Raindrop | 9 | 4 | 1 | 4 | ~44% |

**Isso responde a Pergunta em aberto #2 original: `INVESTIGAR` não é caso raro — é volume real, todo dia, em pelo menos 3 das 5 fontes, variando de ~7% a ~44% dos cards triados.** Continua sem se saber Ecovilla/Uhuu (as outras 2 fontes), mas a amostra já é grande o suficiente (233 cards, 3 fontes distintas) pra tratar isso como padrão estrutural, não anomalia — e não como "1 ocorrência" como a primeira versão deste doc registrava. Isso muda a avaliação de Impacto e Prioridade abaixo (ver Diagnóstico).

**Achado incidental, verificado e descartado como o mesmo bug:** os relatórios `publicar-sanity-report-*.json` de uma rodada de hoje mostram `"review_status_ignored": 1`. Investigado em `src/pipeline/publicar-sanity.ts` (linhas ~91-101): é comportamento **intencional** da US-A4 (26/08/2026) — itens com `review_status` fora de `auto_ok`/`human_approved` (ex: `needs_human`) são propositalmente excluídos da publicação, mas continuam existindo como draft no Sanity, visíveis e recuperáveis no Studio. Diferente do bug do Curador — aqui o item não se perde, só não é publicado sozinho. Não abre story nova sobre isso especificamente (mas ver Mapeamento abaixo — o mesmo padrão de "só contagem, sem lista" se repete em vários lugares do pipeline).

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

Último Story ID usado no épico A — Agentes (checado via Sprint Board no Notion): **US-A18** (Ready, Sprint 17). Próximo disponível: **US-A19**.

| Story ID | Título | Épico | SP estimado (chute) | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-A19 | Dar visibilidade a cards que caem em INVESTIGAR na triagem | A — Agentes | 1 (chute) | 1) Cards com status `INVESTIGAR` são logados individualmente no console em `orquestrador.ts`, no mesmo padrão já usado para `DESCARTADO` (título do card + motivo do Curador). 2) Teste cobrindo o novo log (mesmo padrão dos testes existentes de `DESCARTADO`). 3) `tsc`/lint limpos, testes verdes. **Em aberto, não travar o rascunho nisso:** se além do log no console vale também persistir em arquivo (já que o console se perde quando a sessão termina) — ver Pergunta em aberto #1. | a definir |

---

## Parking lot

Nenhum item além da story acima — o único sinal desta sessão já tem hipótese explícita e virou rascunho de story.

---

## Decisões tomadas nesta sessão

Nenhuma decisão de produto, arquitetura ou processo foi tomada — só diagnóstico e rascunho de story. Nenhum ADR a criar por enquanto.

---

## Perguntas em aberto

1. **Persistência além do console:** só logar (como `DESCARTADO` já faz) resolve o problema imediato, mas o console se perde quando a sessão termina — vale também salvar em arquivo (ex: uma seção "Investigar" no `relatorio.html`, ou uma lista separada em JSON) pra ficar recuperável depois? Ou o log já é suficiente porque, na prática, alguém está acompanhando o console em toda execução real?
2. **Frequência real ainda desconhecida — continua aberta após a rodada real de hoje.** As execuções das 5 fontes terminaram (mesma sessão original), mas não geraram dado novo: sem log persistido, não há como contar quantos itens caíram em `INVESTIGAR` nessa rodada. Isso reforça — não substitui — a Pergunta em aberto #2 original: só vamos ter esse número depois que a própria US-A19 (log individual) existir e rodar pelo menos uma vez.

---

## Recomendações pro próximo Kickoff/Refinamento

- US-A19 tem hipótese e AC mínimo, mas falta persona/cenário completo, SP calibrado e a Pergunta em aberto #1 resolvida — passar por Refinamento antes de qualquer Kickoff.
- A tentativa de responder a Pergunta em aberto #2 com a rodada real de hoje não funcionou (ver Atualização acima) — sem log, sem contagem. Recomendação revisada: **não vale mais esperar por esse dado antes do Refinamento** — ele só vai existir depois que a US-A19 (log) estiver no ar. Sugestão pro Refinamento: considerar nascer já com persistência em arquivo (não só log), já que "esperar mais sinal" se mostrou um beco sem saída — o log é o próprio instrumento de medição que falta.
