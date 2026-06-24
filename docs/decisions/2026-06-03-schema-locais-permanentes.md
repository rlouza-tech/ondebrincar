# ADR 0003 — Schema: link_compra opcional + categoria praia + normalizer manual

**Data:** 2026-06-03
**Status:** Aceito
**Contexto:** Discovery de importação de locais permanentes gratuitos via curadoria manual

---

## Contexto

O pipeline editorial foi construído originalmente para eventos com ingressos (Sympla, Eventim). O schema `atracao.ts` assumia que toda atração com `status=operando` teria `link_compra` obrigatório.

Com a inclusão de locais permanentes (parques, museus, praças, praias) oriundos de curadoria manual humana — sem plataforma de ingresso — três ajustes se tornaram necessários.

---

## Decisões

### 1. `link_compra` vira campo opcional

**Antes:** validação exigia `link_compra` quando `status=operando`.
**Depois:** campo opcional para todas as atrações. Serve tanto como link de ingresso (eventos pagos) quanto como site oficial ou página da Prefeitura (locais gratuitos). Quando não existir nenhum dos dois, fica vazio.

**Descrição atualizada do campo:**
> "Link de ingresso ou site oficial do local. Ex.: sympla.com/evento ou rio.rj.gov.br/parque. Deixar vazio se não houver."

**Alternativa descartada:** criar campo separado `site_oficial`. Rejeitado por adicionar complexidade sem ganho real — o propósito é o mesmo (URL de referência externa).

### 2. Nova categoria `praia`

Adicionado `{ title: "Praia", value: "praia" }` ao array `categoriaOptions` em `atracao.ts`.

Motivação: praias como Posto 12 (Recreio) e Copacabana Forte não se encaixavam em parque, museu ou atividade-extra.

### 3. Novo normalizer `scripts/normalizer/manual.ts`

Nova fonte de dados: curadoria manual humana (indicações de amigos, pesquisas, relatórios). A fonte é agnóstica a preço — por acaso os primeiros 21 locais são gratuitos, mas o normalizer aceita qualquer tipo de atração.

Segue o mesmo padrão dos normalizadores existentes:
- `normalizer/clubinho.ts` — lê CSV canônico
- `normalizer/sympla.ts` — lê JSON do scraper
- `normalizer/whatsapp.ts` — lê formato WhatsApp
- `normalizer/manual.ts` — lê CSV preparado manualmente ← novo

O pipeline IA (Gemini → import-sanity) é reutilizado sem modificação.

---

## Impacto em código existente

| Arquivo | Mudança |
|---|---|
| `sanity/schemas/atracao.ts` | Remove validação required de `link_compra`; atualiza description; adiciona `praia` a `categoriaOptions` |
| `scripts/normalizer/manual.ts` | Arquivo novo |
| `data/input/manual-raw.csv` | CSV de input com os 21 locais — gerado manualmente a partir dos relatórios |

Atrações existentes no Sanity não são afetadas: todas já têm `link_compra` preenchido.

---

## Display: preco=0 → "Gratuito"

Complementar a este ADR: quando `preco === 0`, o frontend renderiza a string "Gratuito" em vez de "R$ 0,00". Implementado no componente de formatação de preço (escopo da mesma story).
