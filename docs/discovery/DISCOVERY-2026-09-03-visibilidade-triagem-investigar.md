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

Sinal adicional trazido pelo Rafa: as execuções reais das 5 fontes que estavam rodando no momento da sessão original (citadas na Pergunta em aberto #2) terminaram. Verificação feita direto nos arquivos gerados em `output/` do repo `agentes-onde-brincar`:

- **`itens-processados.json` e `relatorio.html` (rodada de hoje):** contêm só itens `APROVADO` — nenhum rastro de item `INVESTIGAR`, reconfirmando o achado original. **Não deu pra saber quantos cards caíram em `INVESTIGAR` nessa rodada real** — o Rafa não acompanhou o console ao vivo e o console não é persistido em lugar nenhum (o próprio sintoma do problema tornou impossível medir sua própria frequência). A Pergunta em aberto #2 continua sem resposta.
- **Achado incidental, verificado e descartado como o mesmo bug:** os relatórios `publicar-sanity-report-*.json` da mesma rodada mostram `"review_status_ignored": 1`. Investigado em `src/pipeline/publicar-sanity.ts` (linhas ~91-101): é comportamento **intencional** da US-A4 (26/08/2026) — itens com `review_status` fora de `auto_ok`/`human_approved` (ex: `needs_human`) são propositalmente excluídos da publicação, mas continuam existindo como draft no Sanity, visíveis e recuperáveis no Studio. Superficialmente parecido (contagem agregada, sem detalhe de qual item) mas raiz e severidade diferentes do bug do Curador — aqui o item não se perde, só não é publicado. Registrado aqui só para descartar explicitamente a hipótese de ser o mesmo problema; não abre story nova.

**Efeito líquido desta atualização:** nenhuma mudança no diagnóstico, na história rascunhada ou na prioridade abaixo — a evidência de causa raiz já era 100% (leitura de código), e o que faltava (frequência real) continua faltando.

---

## Diagnóstico

### Problema único — Cards com status `INVESTIGAR` ficam invisíveis depois que a execução termina

**Causa raiz (confirmada por código, `orquestrador.ts`):** o Curador de Vitrines tem 3 status possíveis (`APROVADO`/`DESCARTADO`/`INVESTIGAR`, `curador.schema.ts`), mas só 2 deles deixam rastro:

- `DESCARTADO` é logado individualmente no console com título + motivo (linhas ~105-108).
- `APROVADO` vira ficha completa em `itens-processados.json` + `relatorio.html`.
- `INVESTIGAR` só entra numa contagem agregada (`investigar.length`) — nunca é logado individualmente, nunca salvo em arquivo, nunca escreve no Sanity. O card e o motivo do Curador (por que o texto era dúbio, o local incerto, a data ambígua) se perdem no momento em que a execução termina.

**Impacto:** Médio. `INVESTIGAR` existe justamente para os casos que merecem uma decisão humana (não são claramente aprováveis nem claramente descartáveis) — sem visibilidade nenhuma, esses casos somem silenciosamente, e possíveis novidades reais (que só precisavam de alguém decidir) nunca chegam a lugar nenhum. Ainda não se sabe a frequência real do problema — só 1 ocorrência observada até agora —, mas o status foi desenhado pelo próprio Curador para ser usado sempre que houver dúvida, então não é um caso de borda raro por construção.

**Esforço:** Baixo. O mesmo padrão que já existe para `DESCARTADO` (log individual com título + motivo, já implementado e testado) pode ser replicado quase diretamente para `INVESTIGAR` — não precisa de escrita no Sanity nem de infraestrutura nova.

**Prioridade recomendada:** P2 — não bloqueia nada crítico hoje, mas reduz o valor prático da própria funcionalidade de triagem incerta enquanto não resolvido (o status existe, mas ninguém consegue agir sobre ele).

---

## Checagem de contradição com ADRs existentes

Nenhuma ADR em `docs/decisions/` trata de triagem, status do Curador ou visibilidade de resultados intermediários do pipeline de Agentes. Sem contradição a apontar.

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
