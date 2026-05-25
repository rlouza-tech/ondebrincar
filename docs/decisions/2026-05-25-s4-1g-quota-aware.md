# ADR S4.1g — Pipeline cota-aware (retry + graceful stop)

**Data:** 2026-05-25  
**Status:** Aceito  
**Story:** US-S4.1g  
**Arquivos afetados:**
- `scripts/pipeline-ia/gemini.ts`
- `scripts/pipeline-ia/index.ts`
- `scripts/pipeline-ia/types.ts`
- `scripts/pipeline-ia/cost-log.ts`

---

## Contexto

A pipeline `pnpm pipeline-ia` chama o Gemini Flash 2.5 uma vez por ficha, com delay
fixo de 4,1s entre chamadas (ADR S4.1b, ~15 RPM free tier). Sem proteção reativa:
qualquer 429 ou 503 resultava em `pipeline_failed: true` para aquela ficha e a
pipeline continuava. A cota diária esgotada produzia o mesmo comportamento, desperdiçando
chamadas e perdendo fichas já processadas se o crash ocorresse no meio do lote.

---

## Decisão

### 1. Classificação de erros (`classifyGeminiError`)

Três categorias exclusivas, verificadas em ordem:

| Categoria | Condição | Ação |
|-----------|----------|------|
| `quota_exhausted` | Mensagem contém `resource_exhausted` ou `quota` + (exceeded / exhausted / limit) | Para pipeline |
| `retryable` | HTTP 429 sem indicador de quota, ou HTTP 503 | Retry com backoff |
| `non_retryable` | Qualquer outro erro | Falha a ficha, continua pipeline |

A distinção entre rate-limit (429 transitório) e quota diária (429 permanente) é feita
pelo conteúdo da mensagem de erro do SDK `@google/genai`, pois ambos chegam como 429.
A heurística cobre os padrões documentados pela Google AI Platform — deve ser revisada
se novos formatos de erro aparecerem em produção.

### 2. Retry com backoff exponencial (`generateWithRetry`)

- `MAX_ATTEMPTS = 4` → 1 tentativa original + 3 retries (cumpre DoD "mín. 3 tentativas")
- Delays: 2s → 4s → 8s (base 2s, multiplicador 2)
- Timeout de 30s por tentativa mantido (abort controller independente de retry)
- Cada retry loga um evento `{ event: "retry", attempt, delay_ms, ... }` no stdout

O delay fixo preventivo de 4,1s entre fichas (`waitForRateLimit`) é mantido — ele
reduz a probabilidade de atingir o rate-limit; o retry cobre os picos que escapam.

### 3. Propagação de `QuotaExhaustedError`

`enrichLinha` re-lança `QuotaExhaustedError` em vez de swallow. O chamador (`index.ts`)
captura esse erro específico no loop, executa flush parcial e encerra com exit 0.

### 4. Flush parcial ao atingir quota

Ao receber `QuotaExhaustedError`, `index.ts`:
1. Registra `stopped_reason` no report (`quota_exhausted: <mensagem>`)
2. Salva CSV e report com as fichas já processadas
3. Imprime aviso no stdout com contagem de fichas salvas
4. Sai normalmente (sem `process.exit(1)`)

Fichas não processadas ficam no CSV de entrada original — re-processar com `--limit`
ajustado é o caminho de retomada.

---

## Alternativas consideradas

**Não trocar o SDK** (`@google/generative-ai` ↔ `@google/genai`): mantivemos `@google/genai ^2.3.0`
em uso desde S4.1b. Trocar seria 🟡 extra sem benefício funcional para esta story.

**Retry infinito até sucesso:** rejeitado — se a quota diária esgotou, retries vão consumir
backoff sem resultado. A parada graceful é mais previsível.

**Salvar checkpoint por ficha:** considerado, descartado pelo overhead de I/O. O flush ao
final (com saída antecipada na quota) é suficiente para o volume atual (~20-60 fichas/run).

---

## Consequências

- Zero regressão no caminho feliz: `enrichLinha` continua retornando `EnrichResult` em
  caso de erro não-retentável (`pipeline_failed: true`).
- `CostLogEntry` ganhou campo opcional `attempt` — compatível com JSONL existente.
- `PipelineReport` ganhou campo opcional `stopped_reason` — compatível com consumers existentes.
- Tempo máximo por ficha em caso de 3 retries: 30s (timeout) × 4 + 2s + 4s + 8s = ~134s.
  Em lotes de 20 fichas com poucas falhas, impacto prático é baixo.
