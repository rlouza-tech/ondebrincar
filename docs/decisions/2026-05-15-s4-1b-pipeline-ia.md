# S4.1b — Pipeline IA Gemini + quality gate

**Data:** 2026-05-15  
**Story:** US-S4.1b

## Decisão

CLI local `pnpm pipeline-ia` lê CSV cru do Clubinho (`data/input/planilha-origem.csv`), chama **Gemini Flash 2.5** por linha e gera CSV enriquecido + relatório JSON em `data/output/`. **Não importa para o Sanity** nesta story — isso fica para US-S4.1c.

## Fluxo

1. `readCSV` → `LinhaInput` (8 colunas cruas)
2. `enrichLinha` → Gemini com `responseMimeType: application/json` + `responseSchema`
3. `evaluate` → quality gate (estrutural + self-eval + heurísticas)
4. `writeCSV` + `pipeline-report-<timestamp>.json`

## Quality gate (`auto_ok` vs `needs_human`)

Todas as regras estruturais devem passar **e** `confidence >= 4`:

| Regra | Critério |
|-------|----------|
| Descrição | 50–600 caracteres |
| Mini review | 50–400 caracteres (se preenchida) |
| Idade | `idade_min <= idade_max`, intervalo 0–18 |
| Bairro | não vazio no input |
| Categoria | `teatro` \| `parque` \| `museu` \| `atividade-extra` \| `evento` |
| Ambiente | `indoor` \| `outdoor` \| `ambos` |
| Self-eval | `confidence >= 4` |
| Heurística | sem frases de baixa confiança em descricao/mini_review |
| Abstenção IA | `abstain_fields` não pode incluir `categoria`, `bairro`, `idade_min`, `idade_max` |

Qualquer falha → `needs_human` com `abstain_reasons` agregados.

## Rate limit e timeout

- **15 RPM** (free tier Gemini Flash) → `waitForRateLimit()` de ~4,1s entre chamadas
- **30s** por request (`AbortController`)

## Schema Sanity

Campo `review_status` adicionado em `sanity/schemas/atracao.ts` (`auto_ok` \| `needs_human` \| `human_approved`) para a story de importação futura.

## Env vars

- `GEMINI_API_KEY` — server-side / CLI apenas; nunca no client bundle

## Saídas versionadas

- `data/output/*` está no `.gitignore` (artefatos gerados localmente)
- `data/output/.gitkeep` mantém a pasta no repo

## Como rodar

```bash
cp .env.example .env.local   # preencher GEMINI_API_KEY
pnpm pipeline-ia data/input/planilha-origem.csv
pnpm pipeline-ia data/input/planilha-origem.csv --limit 5 --model gemini-2.5-flash
```
