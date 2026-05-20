# S4.1e + S4.1f — Data atual no prompt e transparência sobre lacunas

**Data:** 2026-05-20  
**Stories:** US-S4.1e, US-S4.1f

## Problema

1. **S4.1e:** Gemini inferia `proxima_data` no passado (ex.: `2023-10-23`) porque o prompt não informava a data de referência.
2. **S4.1f:** Scraper v1 traz `dias_apresentacao` só com dias (`"Dias 23, 30, 31"`), sem horário. A IA gerava `programacao_texto` incompleto sem orientar o pai a consultar o ingresso.

## Decisão

### Prompt (`buildPrompt`)

- Injeta `dataAtual` (ISO) em seção **CONTEXTO TEMPORAL**: nunca `proxima_data` no passado; mês corrente/próximo para dias sem mês/ano.
- Seção **TRANSPARÊNCIA SOBRE LACUNAS**: quando faltar horário, preço ou duração, sinalizar no texto ou `abstain_fields` — não inventar.
- Exemplos de `programacao_texto` atualizados com sufixo `"Consulte horário ao clicar em 'Ver ingresso'."` quando o input só lista dias.

### Quality gate (regressão)

| Regra | Motivo |
|-------|--------|
| `proxima_data` &lt; data de referência | `proxima_data_no_passado` |
| Input com dias sem horário e `programacao_texto` sem ressalva | `programacao_lacuna_horario_nao_sinalizada` |

Helpers em `programacao-helpers.ts`; data de referência compartilhada via `reference-date.ts`.

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| Heurística regex no gate | Detecta regressão sem nova chamada à IA | Pode false-positive se redação variar |
| `referenceDate` opcional em `evaluate()` | Testes determinísticos | Produção usa `new Date()` |

## Fora de escopo

- Re-rodar migração dos 3 drafts (operacional, pós-merge)
- `--force` no `update-drafts-programacao`
