# S4.5 — Voice adapter (Gemini + voz editorial)

**Data:** 2026-05-19  
**Story:** US-S4.5

## Decisão

Evoluir o pipeline existente (`scripts/pipeline-ia/`) em vez de criar CLI separado. A voz editorial vive em `lib/prompts/voice-adapter.ts` (3 exemplos canônicos + política `[INCERTO]`); `scripts/pipeline-ia/prompt.ts` compõe voz + regras de extração (S4.1b/S4.7).

SDK: manter **`@google/genai`** (modelo API `gemini-2.5-flash`; label Sanity `gemini-flash-2.5`).

## Campos Sanity

| Campo | Sucesso IA | Falha API |
|-------|------------|-----------|
| `ai_generated` | `true` | `false` |
| `ai_model` | `gemini-flash-2.5` | omitido |
| `pipeline_failed` | `false` | `true` |

Falha graceful: placeholder editorial existente + `pipeline_failed=true` (AC7 opção B).

## Custo (AC6)

Estimativa por chamada (não é billing real):

- Input: USD 0,075 / 1M tokens  
- Output: USD 0,30 / 1M tokens  
- Conversão: **USD 1 = R$ 5,50** (fixo no ADR)

Com ~8k input + ~1,5k output tokens/ficha → **~R$ 0,01/ficha** → **60 fichas/mês ≈ R$ 0,60** (bem abaixo de R$ 10).

Logs: stdout JSON por chamada + append `data/output/pipeline-cost-log.jsonl` + `cost_summary` no `pipeline-report-*.json`.

Free tier Google AI Studio cobre o volume Q1 (60 fichas/mês).

## Env

`GEMINI_API_KEY` em `.env.local` (nunca no client).

## Como rodar

```bash
pnpm pipeline-ia data/input/planilha-origem.csv --limit 5
pnpm import-sanity --latest
```
