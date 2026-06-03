# ADR: US-S4.1d — Few-shot calibration no prompt da pipeline IA

**Data:** 2026-06-03
**Status:** Experimento em andamento (aguarda run pós-implementação)
**Story:** US-S4.1d | Sprint 7 | 2 SP

---

## Contexto

A pipeline IA (Gemini Flash 2.5) processa eventos infantis de múltiplas fontes e classifica cada saída como `auto_ok` ou `needs_human`. O baseline medido em 2026-06-03 com 5 eventos Sympla resultou em **0% auto_ok**, com os seguintes motivos principais:

| Motivo | Ocorrências |
|--------|-------------|
| `confidence_menor_que_4` | 4/5 |
| `abstencao_campo_critico: idade_min\|idade_max` | 3/5 |
| `marcador_incerto` (`[INCERTO]` no texto gerado) | 3/5 |
| `bairro_vazio` | 2/5 |

A hipótese é que exemplos few-shot no prompt calibram confiança e reduzem abstenção desnecessária, aumentando a taxa de `auto_ok` em ≥20 pp.

---

## Decisão

Adicionados 3 exemplos few-shot ao `buildPrompt()` em `scripts/pipeline-ia/prompt.ts`, cobrindo:

1. **Caso fácil** (Clubinho, campos V2 ricos): `confidence=5`, sem abstain, demonstra que `Classificação: Livre` na sinopse sobrepõe `idade_minima` do scraper.
2. **Caso médio** (Sympla, texto livre): `confidence=4`, `preco_centavos=null` aceitável, duração inferida dos horários, sem uso de `[INCERTO]` — sinalização via `abstain_fields` e `notes_for_editor`.
3. **Caso borderline** (Sympla, falso positivo): `confidence=1`, recomendação explícita de exclusão no `notes_for_editor`. Ensina ao modelo que abstenção total é a resposta correta quando o conteúdo não é infantil.

---

## Resultado do experimento

*(a preencher após rodar `pnpm pipeline-ia --source sympla --limit 16`)*

| Métrica | Antes | Depois |
|---------|-------|--------|
| auto_ok total | 0% (0/5) | — |
| auto_ok excluindo bairro_vazio | 0% (0/3) | — |
| needs_human | 100% | — |

**Meta:** +20 pp na taxa de `auto_ok` nos eventos com bairro válido.

---

## Limitações identificadas (débitos a resolver)

### Débito 1 — Extração de bairro do Sympla

**Problema:** O normalizer Sympla (`scripts/normalizer/sympla.ts`) usa `extractBairro(venue)` que extrai bairro apenas do padrão `"Nome - Bairro, RJ"`. Endereços crus como `"R. Cosme Velho, 599 - Rio de Janeiro, RJ"` retornam bairro vazio. O quality gate rejeita qualquer evento com `bairro_vazio` — independente da qualidade do output IA.

**Impacto:** Eventos Sympla com endereço no formato rua/número nunca atingem `auto_ok` sem resolução manual.

**Opções de solução (para sprint futura):**
- Geocoding reverso via Google Maps API (mais preciso, tem custo)
- Tabela de mapeamento de logradouros conhecidos do Rio → bairro (zero custo, manutenção manual)
- Heurística de extração por bairros conhecidos no texto da sinopse (regex)
- Deixar o Gemini inferir o bairro a partir do venue/sinopse e remover a checagem `bairro_vazio` do quality gate para Sympla (aceitando bairro vazio como estado válido)

**Recomendação:** avaliar na Sprint 8 junto com o normalizer.

---

### Débito 2 — Preço ausente do Sympla

**Problema:** A Sympla não exibe o preço nos cards da listagem. O `preco_raw` chega vazio para todos os eventos, e o preço real só está na página de compra (não capturado pelo enricher atual). O modelo corretamente abstém em `preco_centavos`, mas isso piora a percepção de completude das fichas para o editor.

**Impacto:** Fichas Sympla publicadas sem preço, forçando verificação manual para todo evento.

**Opções de solução (para sprint futura):**
- Estender o `sympla-enrich.ts` para extrair o preço da página do evento (já usa Playwright; seletor a confirmar)
- Aceitar `preco_centavos=null` como válido para Sympla e adicionar nota padrão "Consulte preço no link" na ficha
- Remover `preco_centavos` de `abstain_fields` para Sympla (preço ausente é esperado, não incerteza)

**Recomendação:** Opção 1 é a mais completa; Opção 2 é o caminho rápido para MVP.

---

## Rollback

A versão anterior do prompt é preservada integralmente no git. Para reverter:

```bash
git diff HEAD scripts/pipeline-ia/prompt.ts   # visualizar o diff
git checkout HEAD scripts/pipeline-ia/prompt.ts  # reverter se necessário
```

---

## Próximos passos

1. Rodar `pnpm pipeline-ia --source sympla --limit 16` com o prompt atualizado
2. Comparar taxa de `auto_ok` antes/depois (excluindo `bairro_vazio`)
3. Preencher tabela de resultado acima
4. Se melhora < 20 pp nos eventos com bairro válido → avaliar descarte dos few-shots
5. Se melhora ≥ 20 pp → manter e abrir stories para os débitos 1 e 2
