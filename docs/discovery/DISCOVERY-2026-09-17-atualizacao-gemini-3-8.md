# Discovery — Atualização Gemini 3.8 (Google, set/2026)

**Data:** 17/09/2026
**Origem:** Card do Rafa no Discovery Board sobre lançamento do Gemini 3.8 pelo Google + 2 links de referência (docs oficiais Gemini API + notícia sobre Gemini 3.8 Live)

⚠️ **Nota sobre o handoff usado como contexto:** o HANDOFF geral mais recente encontrado em `Handoffs/` é o `HANDOFF_v9_Onde_Brincar.md` (17/jul/2026, Sprint 13). O Sprint Board no Notion já está em Sprint 19/20 — ou seja, o handoff geral está **6 sprints desatualizado**. Não bloqueou esta sessão (o sinal de mercado independe disso), mas vale gerar um handoff novo em algum Sprint Close próximo.

---

## O que o Google anunciou

| Modelo | Lançamento | Sucede | O que muda |
|---|---|---|---|
| **Gemini 3.8 Flash** | 02/09/2026 | `gemini-2.5-flash` (usado hoje em `pipeline-ia`) | Sem recurso novo — melhoria de qualidade em 14/14 benchmarks testados vs. 3.7. Nível de "thinking" `minimal` foi removido; só `low`/`medium`(padrão)/`high` |
| **Nano Banana 2** (`gemini-3.1-flash-image`) | set/2026 | `gemini-2.5-flash-image` (escolhido na ADR S4.8a, **nunca implementado**) | Geração de imagem de 2ª geração |
| Gemini 3.8 Live / Live Extended Thinking | 15/09/2026 | — | Voz em tempo real. Sem hipótese de produto pro Onde Brincar hoje (produto não tem componente de voz) — só registrado, não vira parking lot |

---

## Diagnóstico

### 1. Pipeline de texto (`pipeline-ia`) preso em `gemini-2.5-flash`

- **Causa raiz:** ADR `2026-05-15-s4-1b-pipeline-ia.md` fixou o modelo e calibrou rate limit (15 RPM) pro free tier dele. Nunca revisada.
- **Impacto:** Médio-Alto — qualidade de extração/enriquecimento, e exposição a depreciação futura do 2.5
- **Esforço:** Médio — trocar a string é trivial; validar quality gate e custo real (thinking tokens) é o trabalho de verdade
- **Evidência:** forte — 6 arquivos com `gemini-2.5-flash` hardcoded no repo (`pipeline-ia/index.ts`, `raindrop-process`, `retroativo-enderecos`, etc.)
- **Prioridade recomendada:** P1

### 2. Geração de imagem ainda não implementada, mas ADR já aponta pro modelo antigo

- **Causa raiz:** ADR `2026-05-26-s4-8a-image-gen.md` escolheu `gemini-2.5-flash-image`, mas o card "Direção de Arte & Imagem IA — Nano Banana" (Discovery Board, **Ready for sprint**) confirma que a implementação real ainda não existe (achado de 27/08: `diretor-arte.ts` só gera os prompts, ninguém chama o modelo de imagem)
- **Impacto:** Alto — evita nascer a implementação já usando modelo que vai ficar defasado no dia em que for codada
- **Esforço:** Baixo — é decisão de qual endpoint usar, não é o código em si
- **Evidência:** forte
- **Prioridade recomendada:** P0 (mais barato resolver agora, antes do card sair do Discovery/Refinamento, do que depois de implementado)

### 3. Correção de premissa: o "deadline de outubro"

Você mencionou um deadline em outubro forçando a troca. Confirmei — **existe**, mas é de outro produto: Google está aposentando Gemini 2.5 (Pro/Flash/Flash Lite) só no **Agent Platform** (ex-Vertex AI), não antes de 16/out/2026 (data ainda não é final — Google fixa a definitiva quando o Gemini 3 atingir disponibilidade geral, com 6 meses de aviso). O pipeline do Onde Brincar usa a **API padrão do Gemini** (Google AI Studio, `GEMINI_API_KEY`, SDK `@google/genai`) — **não é o Agent Platform**. A fonte que cobre isso é explícita: "usuários do AI Studio ou da API Gemini padrão não são afetados por este aviso específico, embora datas de aposentadoria separadas se apliquem". Não achei, no changelog oficial da Gemini API (atualizado até 15/09), nenhuma depreciação anunciada pro `gemini-2.5-flash` puro (só pro `-lite-preview` e pro `2.5-pro-preview`, que são modelos diferentes).

**Conclusão:** a migração continua fazendo sentido (qualidade melhor, e o 2.5 vai sair de linha em algum momento), mas **não é uma corrida de 4 semanas**. Não decidi isso sozinho — sinalizando pra você validar antes de tratar como urgente.

---

## Comparação de custo (dado real, não estimativa no vácuo)

Rodei os 1.127 registros reais de `data/output/pipeline-cost-log.jsonl` (24/mai a 08/set/2026, ~3,5 meses, 974 chamadas bem-sucedidas, só texto — não inclui imagem):

| Cenário | Preço (in/out por 1M tokens) | Custo do período (~3,5 meses) | Por mês |
|---|---|---|---|
| **Hoje, preço hardcoded no `cost-log.ts`** (desatualizado, maio/2026) | $0,075 / $0,30 | R$ 2,85 | R$ 0,82 |
| **Hoje, preço oficial real do 2.5 Flash** | $0,30 / $2,40 | R$ 13,57 | R$ 3,90 |
| **3.8 Flash, preço introdutório (até 31/dez/2026)** | $0,75 / $3,75 | R$ 29,84 | R$ 8,57 |
| **3.8 Flash, a partir de 1/jan/2027** | $1,50 / $7,50 | R$ 59,67 | R$ 17,14 |

**Achado paralelo que apareceu no meio da conta:** o `cost-log.ts` está com preço desatualizado desde maio — o que aparece nos seus relatórios (R$0,82/mês) já está subestimado em ~4,75x frente ao preço real que você paga hoje pelo 2.5 Flash (R$3,90/mês). Isso é bug de tracking, independente da migração — vale um AC nela pra corrigir a constante junto.

**Leitura:** em termos absolutos, estamos falando de trocar ~R$4/mês por ~R$9-17/mês — valor desprezível no orçamento, então não é isso que deveria travar a decisão. O que importa mais:
- Esses números **não incluem "thinking tokens"**. O 3.8 Flash roda por padrão em nível `medium` de raciocínio, que sozinho pode ~5x o volume de tokens de saída (e o `high`, ~10x) — se a migração não configurar `low` (ou desativar) explicitamente, o custo real pode ficar bem acima dessas projeções. Isso vira AC obrigatório na story.
- Geração de imagem (Nano Banana) é orçamento separado, não entra nessa conta (~US$0,04-0,05/imagem na ADR antiga, ainda nem implementado).

---

## Histórias rascunhadas

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-S88 | Migrar pipeline-ia de `gemini-2.5-flash` pra `gemini-3.8-flash` | S — Scraper | a definir | 1) Trocar model string nos pontos hardcoded (`pipeline-ia/index.ts`, `raindrop-process`, `retroativo-enderecos`, etc.) — 2) Configurar `thinkingConfig` explicitamente (nível `low` ou desativado) e medir impacto real de custo antes de rodar em produção — 3) Rodar quality gate (`confidence >= 4`) num lote de amostra e comparar taxa de `needs_human` vs. 2.5 — 4) Corrigir constantes `INPUT_USD_PER_TOKEN`/`OUTPUT_USD_PER_TOKEN` em `cost-log.ts` pro preço real do modelo novo — 5) Revisar/substituir ADR `2026-05-15-s4-1b-pipeline-ia.md` documentando a troca | a definir |

**Hipótese:** migrar pro 3.8 Flash melhora a qualidade de enriquecimento (menos fichas caindo em `needs_human`) por um custo mensal ainda desprezível (~R$9-17 vs. ~R$4 hoje), desde que o nível de thinking seja controlado explicitamente.

O card "Direção de Arte & Imagem IA — Nano Banana" (já existente no Discovery Board, Ready for sprint) **não precisa de Story ID novo** — mas o Contexto dele referencia `gemini-2.5-flash-image` e precisa ser atualizado pra considerar Nano Banana 2 (`gemini-3.1-flash-image`, confirmar nome exato do endpoint na doc oficial no momento da implementação) antes de entrar em sprint.

---

## Parking lot

*(vazio nesta sessão — Gemini 3.8 Live não teve hipótese de produto levantada, ficou só registrado no diagnóstico acima, item 3 da tabela de anúncios)*

---

## Decisões tomadas

1. **Migrar de `gemini-2.5-flash`/`gemini-2.5-flash-image` pra `gemini-3.8-flash`/Nano Banana 2** — decisão do Rafa nesta sessão. Isso exige **revisar/substituir 2 ADRs**: `2026-05-15-s4-1b-pipeline-ia.md` e `2026-05-26-s4-8a-image-gen.md`. Sinalizando pra virar ADR — **não escrevi a ADR nesta sessão** (Discovery não é a cerimônia certa pra isso, conforme o próprio protocolo da skill). Recomendo fazer isso na sessão de Refinamento ou Execução da US-S88, quando o Rafa (ou eu, com aval explícito) redige a ADR nova junto com o código.
2. **Urgência revista:** a migração deixa de ser "prazo de outubro" (isso era sobre outro produto, o Agent Platform) e passa a ser prioridade normal de backlog — value call pro próximo Kickoff, não bombeiro.

---

## Perguntas em aberto

- Qual é, de fato, a data de depreciação do `gemini-2.5-flash` na API padrão (não Agent Platform)? Não achei confirmada — vale checar a página oficial de deprecations da Gemini API antes do Kickoff que priorizar isso, pra não migrar sem necessidade nem deixar de migrar quando precisar.
- Nome exato do endpoint do Nano Banana 2 (`gemini-3.1-flash-image` foi o que a doc trouxe, mas numeração de imagem diferente da numeração de texto é estranho o suficiente pra merecer confirmação direta na doc oficial antes de codar).
- `thinkingConfig` explícito muda o formato de resposta ou só o custo? Precisa de teste real antes de estimar SP da US-S88 no Refinamento.
- HANDOFF geral desatualizado (v9, Sprint 13, enquanto o board já está em Sprint 19/20) — não é sobre Gemini, mas apareceu nesta sessão e vale ação num próximo Sprint Close.

---

## Recomendações pro próximo Kickoff

- US-S88 pode entrar no próximo Refinamento pra fechar DoR (persona/cenário, AC final, SP) — a hipótese e o AC rascunho já estão prontos aqui.
- Atualizar o Contexto do card "Direção de Arte & Imagem IA — Nano Banana" no Discovery Board antes dele ser puxado pro Kickoff, já que a premissa dele (`gemini-2.5-flash-image`) mudou.
- As 2 ADRs (S4.1b e S4.8a) precisam ser reescritas junto com a execução dessas stories, não antes — evita documentar decisão que ainda pode mudar durante a implementação (ex: se o thinking token bagunçar o custo, a decisão pode voltar atrás).

---

## Adendo (mesma sessão) — o fluxo de Agentes está mais exposto que o pipeline-ia, não menos

Pergunta do Rafa: isso afeta o fluxo de Agentes? Sim — e a exposição lá é **maior**, não menor, que a do `pipeline-ia` analisado acima. Achados no repo `Agentes do Onde Brincar`:

- **4 agentes** hardcodam `gemini-2.5-flash` no texto: `curador.ts`, `extrator.ts`, `auditor-qa.ts`, `diretor-arte.ts` (parte de prompt)
- `diretor-arte.ts` também trava `gemini-2.5-flash-image` (`MODELO_IMAGEM`) — decisão deliberada de 27/08, comentário no código explica por quê (ver abaixo)
- **O wrapper de fallback em `src/lib/gemini.ts` já chama `gemini-3.6-flash` hoje**, silenciosamente, sempre que o modelo primário dá 503/429/"alta demanda" — ou seja, o fluxo de Agentes **já não está 100% isolado da geração 3.x**, só que sem ninguém rastrear quando isso acontece nem quanto custa
- Esse mesmo wrapper foi propositalmente **não aplicado** à geração de imagem (`generateImageContent` usa `originalGenerateContent` direto, sem fallback) — porque trocar silenciosamente pra um modelo de texto no meio de uma chamada de imagem geraria resposta sem imagem, não um retry de verdade. Ou seja: o "trava no modelo antigo" da imagem já é uma decisão consciente registrada em comentário, não descuido.
- **Não existe `cost-log.ts` equivalente no repo Agentes.** O `pipeline-ia` (Cursor) rastreia custo por chamada; o Agentes, não. Isso significa que a comparação de custo real que fiz pro `pipeline-ia` **não dá pra replicar aqui com dado real** — eu não tenho o volume/custo de chamadas do Agentes hoje.

**Por que o Rafa está certo em desconfiar de "exponencial":** o Curador roda em **todo candidato triado**, não só nas fichas publicadas — o achado da sessão de 03/09 (já registrado no Discovery Board) mostrou 150 candidatos do Sympla + 74 do Clubinho + 9 do Raindrop **num único lote**. Isso é só o Curador. Os que passam ainda rodam Extrator + Auditor QA + Diretor Arte (texto + imagem) em cima. Comparado ao `pipeline-ia`, que faz 1 chamada por ficha já curada manualmente (974 chamadas em 3,5 meses), o Agentes multiplica chamadas por um volume de triagem bem maior — a preocupação é estruturalmente válida, mas eu não tenho o número real pra quantificar "quanto".

### Decisão revisada

**Migração do fluxo de Agentes para Gemini 3.8 Flash / Nano Banana 2 fica fora de escopo agora** — aval do Rafa. Antes de decidir isso, falta o básico: instrumentar custo real (equivalente ao `cost-log.ts` do `pipeline-ia`) no repo Agentes. Sem isso, qualquer projeção seria chute, não dado.

**O que segue de pé:** só a migração do `pipeline-ia` (Cursor, US-S88 acima) — repo separado, volume pequeno e já medido, ADR própria (S4.1b). A ADR do Agentes (S4.8a, geração de imagem) **não deve ser tocada agora** — trava em `gemini-2.5-flash-image` continua sendo a decisão vigente até o fluxo de Agentes ter dado de custo pra sustentar uma revisão de verdade.

O card "Direção de Arte & Imagem IA — Nano Banana" no Discovery Board também fica em espera por esse motivo — **não** é só trocar o nome do modelo no Contexto como eu tinha sinalizado antes; é decisão que depende do baseline de custo do Agentes que ainda não existe.

### Novo item de parking lot

**Instrumentar cost-log no fluxo de Agentes** (equivalente ao `pipeline-ia/cost-log.ts`, cobrindo Curador/Extrator/Auditor QA/Diretor Arte) — motivo de não virar história agora: falta ainda decidir o formato (por agente? por ficha end-to-end?) e isso merece sessão própria de Refinamento, não decisão no meio de um Discovery sobre outro assunto.

---

## Adendo 2 (mesma sessão) — história de instrumentação de custo no Agentes

Confirmei último ID usado no Épico A — Agentes no Sprint Board: **US-A44**. Story nova:

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-A45 | Instrumentar cost-log no fluxo de Agentes (Curador/Extrator/Auditor QA/Diretor Arte) | A — Agentes | a definir | 1) Registrar, por chamada, `input_tokens`/`output_tokens`/modelo/agente de origem/sucesso-ou-erro — mesmo shape do `cost-log.ts` do `pipeline-ia`, adaptado pra identificar qual dos 4 agentes gerou a chamada — 2) Capturar também quando o wrapper de fallback (`src/lib/gemini.ts`) trocou de modelo (hoje isso é silencioso — vira `console.log`, não fica registrado) — 3) Rodar 1 lote real e gerar um resumo (`CostSummary`) por agente, pra ter baseline de custo/volume antes de qualquer decisão de migração de modelo — 4) Preço usado na estimativa tem que ser o oficial atualizado (não repetir o bug do `pipeline-ia`, que estava com preço de maio hardcoded) | a definir |

**Hipótese:** sem visibilidade de custo por agente, qualquer decisão de trocar modelo no fluxo de Agentes é no escuro — dado o volume de triagem (Curador roda em todo candidato, não só ficha publicada), o risco de estourar orçamento sem perceber é maior aqui do que no `pipeline-ia`. Essa story não migra nada — só mede, pra a migração (se/quando acontecer) ser decisão com dado, não chute.

---

## Adendo 3 — confirmação direta: impacto e prazo

Perguntado de novo pelo Rafa se o fluxo de Agentes é impactado pela atualização do Google e até quando há prazo pra resolver. Resposta direta, sem meio-termo:

- **Impacto: sim.** O fluxo de Agentes depende de `gemini-2.5-flash`/`gemini-2.5-flash-image` do mesmo jeito que o `pipeline-ia` — é a mesma geração de modelo do Google sendo substituída em ambos os lugares.
- **Prazo: nenhum confirmado.** O único deadline real que existe (16/out/2026) é do Agent Platform (Vertex AI), que não é o que o projeto usa em nenhum dos dois fluxos — ambos usam a API padrão via `GEMINI_API_KEY`. Não há data de desligamento anunciada oficialmente pro `gemini-2.5-flash` na API padrão até o momento desta sessão (17/09/2026).
- **Conclusão prática:** não tem prazo travando a decisão hoje. Isso é o que permite adiar o Agentes com segurança (adendo anterior) — não é "não precisa nunca", é "não precisa correr agora".

---

## Adendo 4 — US-A45 promovida pro Sprint Board

A pedido explícito do Rafa (exceção ao escopo padrão de Discovery, que deixa Sprint sempre "a definir"): US-A45 foi criada como linha real no Sprint Board do Notion, não só rascunhada aqui.

- **Sprint:** Sprint 20
- **Status:** A refinar
- **Link:** https://app.notion.com/p/3dee97b095aa81ae95d9d43b553ac216

Segue sem SP e sem persona/cenário fechados — isso é trabalho do Refinamento, não desta sessão.
