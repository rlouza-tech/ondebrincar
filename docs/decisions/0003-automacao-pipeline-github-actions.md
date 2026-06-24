# ADR 0003 — Automação do pipeline editorial via GitHub Actions Scheduled Workflow

**Data:** 2026-06-09  
**Status:** Aceita  
**Decisores:** Rafael Louzada

---

## Contexto

O pipeline editorial (scrape → check-novidades → pipeline-ia → import-sanity → mark-expired) é executado manualmente. A meta é automatizar as rodadas de segunda e quinta-feira, sinalizando o que precisa de intervenção humana e o que pode acontecer sem supervisão.

Três opções foram avaliadas: GitHub Actions Scheduled Workflow, Vercel Cron Functions, e serviço externo (cron-job.org / EasyCron).

---

## Decisão

Usar **GitHub Actions Scheduled Workflow** como executor do pipeline automatizado.

---

## Justificativa

- Os scripts já rodam como processos Node com `pnpm`. GitHub Actions executa exatamente o mesmo ambiente sem refactor.
- CI já está configurado no repo com secrets de Sanity e Gemini — reutilização direta.
- Logs de cada rodada ficam visíveis na aba Actions do repo, sem infra adicional.
- Sem custo extra relevante: o pipeline roda em ~5 minutos, bem abaixo dos limites do plano atual.
- Drift de timing (~15 min em horários de pico) é irrelevante para uma cadência de segunda/quinta.

**Vercel Cron Functions** foi descartado: timeout de 60s no plano Hobby inviabiliza um pipeline que leva minutos, e exigiria converter scripts CLI em routes HTTP.

**Serviço externo** foi descartado: adiciona dependência externa e exige exposição de endpoint autenticado no app sem benefício claro.

---

## Consequências

- Um arquivo `.github/workflows/pipeline-automatico.yml` será criado com `schedule` configurado para segunda e quinta às 07h00 BRT.
- Secrets necessárias (`SANITY_TOKEN`, `GEMINI_API_KEY`, etc.) já existem no repositório — verificar escopo (Actions vs. Dependabot) antes de implementar.
- US-O7 (check-novidades) já está concluída — sem bloqueio para a automação.
- O scraper usa **Playwright** (headless browser). O workflow precisa do passo `npx playwright install chromium --with-deps` antes de rodar os scrapers. Não é bloqueio — é uma linha extra no YAML.
- O workflow depende de US-S3 (logs estruturados) para alimentar US-S5 (status page no Studio) e US-S4 (dashboard).
- Falhas silenciosas são risco real: o workflow deve notificar por e-mail em caso de erro (GitHub Actions já suporta notificação nativa por falha de workflow).

---

## Divisão de responsabilidades

| Etapa | Responsável | Motivo |
|---|---|---|
| check-novidades | Automático (cron) | Apenas leitura, sem custo |
| mark-expired | Automático (cron) | Operacional, reversível |
| pipeline-ia | Rafael (manual) | Gasta créditos Gemini; Rafael aprova antes de rodar |
| import-sanity | Rafael (manual) | Consequência direta do pipeline-ia |
| Publicação das fichas | Rafael (manual) | Decisão editorial — permanece humana indefinidamente |

**Evolução prevista:** quando Rafael se sentir confortável com a qualidade das fichas geradas, o pipeline-ia pode ser incorporado ao cron em uma revisão futura desta ADR.

---

## Decisões em aberto

- Horário exato das rodadas (definido: segunda e quinta 07h00 BRT).
- Formato e destinatário do e-mail de resumo (depende de US-S5).
