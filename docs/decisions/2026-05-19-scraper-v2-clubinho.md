# Scraper v2 — Clubinho de Ofertas (Playwright)

**Data:** 2026-05-19

## Decisão

CLI `pnpm scrape` substitui a extensão Chrome manual. Usa **Playwright** para carregar listagem e páginas de produto; dados estruturados vêm da API interna `GET /api/rio-de-janeiro/{slug}` via `fetch` no contexto do browser.

## Anti-bot

Cloudflare bloqueia `curl` e a API em **headless** (403). O scraper tenta headless primeiro e, se a API falhar, reabre o browser em modo visível automaticamente. Use `--headed` para forçar browser visível desde o início.

## Saída

CSV 15 colunas em `data/input/planilha-origem.csv` — 8 legadas + 7 enriquecidas. A pipeline (`pnpm pipeline-ia`) lê colunas opcionais quando presentes.

## Como rodar

```bash
pnpm scrape
pnpm scrape --limit 3
pnpm scrape --headed
```
