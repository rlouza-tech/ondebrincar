# ADR — Decomposição da skill única `pipeline-editorial` em skills especializadas

**Data:** 2026-07-15 (registrada retroativamente em 2026-07-17, Sprint Close 13, a pedido do Rafa)
**Status:** Aceita
**Story:** US-E4 (Sprint 13)
**Constrói sobre:** `docs/decisions/2026-07-08-us-e0-orquestracao-agentes-editoriais.md` (US-E0), `docs/discovery/DISCOVERY-2026-07-13-multiagentes-jornada-publicacao.md`, `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-E4.md`

---

## Contexto

A skill única `pipeline-editorial` (criada em US-O22, Sprint 12) cobria só o fluxo determinístico de ingestão (Clubinho/Sympla/datas). O discovery de 13/07 levantou a pergunta: vale decompor essa skill em várias, uma por fluxo, para reduzir a carga cognitiva do Rafa e isolar falhas por fonte?

## Decisão

**Decompor em skills especializadas por fluxo**, não manter uma skill "guarda-chuva" com seções internas.

Fase 1 (agora, Sprint 14) — 5 skills:

| Story | Skill | O que extrai |
|---|---|---|
| US-E5 | Orquestradora | Dispatcher — roda o pacote completo (Clubinho → Sympla → Raindrop → Avançar-datas) sem perguntar o que rodar, para nos checkpoints 🔴 |
| US-E6 | Sympla | Fluxo 2 do `pipeline-editorial` atual, sem mudança de comportamento |
| US-E7 | Clubinho | Fluxo 1 do `pipeline-editorial` atual, sem mudança de comportamento |
| US-E8 | Raindrop | Conteúdo novo, a partir do handoff de fechamento da US-S19 (decisão de extração por domínio, dedup in-batch, julgamento humano não automatizável) |
| US-E9 | Avançar-datas | Fluxo 3 do `pipeline-editorial` atual, **sem** o passo `check-atualizacoes` (reservado pra Fase 2) |

Fases seguintes, bloqueadas por pré-requisito explícito, sem story ainda:

- **Fase 2 — Vigilância de Conteúdo:** junta curadoria pré-import (US-O20) com releitura de conteúdo publicado (`check-atualizacoes`). Bloqueada até US-O20 fechar.
- **Fase 3 — Fontes diversas + graduação:** skill que processa URL avulsa sem scraper dedicado. Nasce junto com US-S55 (Sprint 16). Critério de graduação: uma fonte vira skill própria quando ganha scraper dedicado.
- **Fase 4 — Agendamento (opcional):** gatilho por horário. Bloqueador real não resolvido: a skill só funciona no terminal local do Rafa (Claude Code); o agendamento nativo do Cowork roda num sandbox sem `pnpm`/`git` do repo real.
- **Fase 5 — Autonomia calibrada (opcional):** promoção seletiva de checkpoints 🔴→🟢 por confiança (critério QAAI, discovery 09/06), sempre decisão do Rafa.

## Mecanismo de coordenação

Skills **não se chamam entre si** — não têm agência própria. Quem tem agência é o Claude, numa sessão com o Rafa (ou, no Cenário 1/Fase 4, numa sessão disparada sozinha). A Orquestradora é o roteiro que define a ordem; a execução é sequencial, dentro de uma única sessão contínua.

**Limite aceito:** a memória de "o que já rodou e o que falta" só existe dentro da conversa — não é persistida em arquivo (diferente do checkpoint `data/.pipeline-state.json` da US-O8). Se a sessão for interrompida no meio, não há retomada automática. Aceito como não-problema por ora: a tendência é sempre rodar o pacote completo numa sessão só, sem pausas longas.

## Alternativas consideradas

**Skill única com seções internas** (manter `pipeline-editorial` como está, só reorganizando por seção). Descartada: ganha legibilidade, mas não isola falha por fonte (um erro no meio da skill ainda exige reler o output inteiro pra saber o que quebrou) — o problema real que motivou a decomposição.

## Consequências

- 5 novas stories (US-E5 a US-E9), 7 SP no total (estimativa inicial, a confirmar no Kickoff 14).
- `pipeline-editorial` (US-O22) é descontinuada como skill operacional ativa assim que as 5 novas forem escritas — as instruções migram, não coexistem duas fontes de verdade.
- Fase 2 cria uma dependência explícita entre a futura Vigilância de Conteúdo e a US-E9 (Avançar-datas): quando `check-atualizacoes` sair do fluxo de datas, o passo de revisão manual da US-E9 passa a depender do que a Vigilância encontrar. As duas skills vão precisar se falar — a decidir quando a Vigilância for desenhada.
- Raindrop (US-E8) confirma, com evidência do handoff da US-S19, que uma fonte só merece skill própria quando o fluxo de extração diverge o suficiente do padrão scrape→CSV→pipeline-ia — não é "mais uma fonte", é um padrão de trabalho diferente (API/WebFetch/Chrome por domínio, montagem manual de lote).

## Nota de processo

Esta decisão foi tomada em sessão de execução em 2026-07-15 (`Handoff-Sessao-US-E4.md`), mas só formalizada como ADR no Sprint Close da Sprint 13 (2026-07-17), a pedido explícito do Rafa. As mudanças de ID de sprints anteriores (US-A2→US-E3, US-A3→US-M8, US-E1 duplicado→US-E2) continuam **não** sendo ADR — são hygiene de dado, não decisão arquitetural.
