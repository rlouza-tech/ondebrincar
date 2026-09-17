# US-S75 — Destaque de reasons de conteúdo sensível no quality-gate

**Data:** 2026-09-17
**Story:** US-S75
**Status:** Aceita
**Constrói sobre:** ADR `2026-05-15-s4-1b-pipeline-ia.md`, discovery `DISCOVERY-2026-08-07-praticas-anti-alucinacao-pipeline-ia.md`, incidente US-S71 (4/11 fichas com vazamento de persona aprovadas por revisão humana)

## Contexto

O quality-gate já rejeita (`needs_human`) quando detecta conteúdo sensível (hoje: `mencao_persona_interna`). Na revisão humana, esse motivo aparecia misturado com avisos de qualidade geral (`bairro_vazio`, `categoria_invalida`, etc.) — string solta na mesma lista. O incidente da US-S71 mostrou que isso não é suficiente: 4 das 11 fichas com vazamento de persona foram aprovadas mesmo assim.

Refinamento (07/08): o destaque aparece **só no Sanity Studio**, não no relatório da pipeline.

Até esta story, `abstain_reasons` nem era persistido no documento Sanity — o mapper descartava o campo. Sem o dado no Studio, o curador não tinha como ver o motivo crítico no lugar onde revisa a ficha.

## Decisão

1. **Categoria própria por reason**, não inferência ad hoc na UI. Fonte de verdade: `lib/pipeline/abstain-reasons.ts`, compartilhada entre quality-gate, import e Studio. Cada code é `conteudo_sensivel` ou `qualidade_geral`. Set inicial: só `mencao_persona_interna`. Reasons prefixadas (`gemini_error:…`, `abstencao_campo_critico:…`) usam o trecho antes de `:` e caem em qualidade geral.

2. **Quality-gate** continua expondo `reasons: string[]` para o CSV e o relatório JSON (sem mudança de formato — decisão de escopo). Acrescenta `categorized_reasons` e `has_conteudo_sensivel` no resultado interno.

3. **Sanity** persiste:
   - `abstain_reasons`: array de objetos `{ code, category }` — a categoria viaja com o motivo, não é string solta.
   - `has_conteudo_sensivel`: boolean denormalizado para preview, badge no header e filtro GROQ da lista "🚨 Conteúdo sensível".

4. **Studio** (único lugar do destaque):
   - Lista: subtítulo `⚠ Conteúdo sensível` vs. só o bairro.
   - Documento: badge `danger` "Conteúdo sensível".
   - Campo: banner e lista separados (vermelho vs. âmbar).
   - Desk: item "🚨 Conteúdo sensível" ao lado de "🔍 Precisa revisão humana".

5. **Relatório da pipeline** (`items_with_issues`, `motivos_top`) permanece lista de strings. CSV ganha a coluna `has_conteudo_sensivel` como transporte até o import; CSVs antigos sem a coluna recategorizam pelos codes.

## Alternativas consideradas

| Opção | Por que não |
|---|---|
| Prefixo na string (`SENSIVEL:mencao_persona_interna`) | Continua sendo string solta; quebra consumidores que comparam o code exato |
| Só boolean, sem category no objeto Sanity | O flag resolve preview/lista, mas o campo da ficha voltaria a misturar motivos na mesma lista — exatamente o bug da US-S71 |
| Destacar também no relatório JSON | Reaberto e descartado no Refinamento: o curador revisa no Studio, não no JSON |
| Segunda passada de IA / bloquear publicação automática | Fora do escopo; o human-in-the-loop se mantém, só fica impossível ignorar o motivo crítico |

## Consequências

- Novos codes de conteúdo sensível entram em `CONTEUDO_SENSIVEL_REASON_CODES` — um lugar só.
- Documentos antigos sem os campos novos são tratados como não-sensíveis (`undefined` ≠ `true`). Não há backfill: o vazamento da US-S71 já foi corrigido nas fichas publicadas.
- Queries públicas do site não selecionam esses campos; nada muda no frontend.
