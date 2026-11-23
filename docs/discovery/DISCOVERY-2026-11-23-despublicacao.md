# Discovery — Tratamento de fichas despublicadas na página de detalhe (US-O25)

**Data:** 23/11/2026 · **Sprint:** 24 · **Story:** US-O25 (spike, 2 SP) · **Origem:** achado da US-O24 (31/07) + hipótese do Rafa (19/11)
**Base de código:** `origin/main` do Cursor em 23/11 (`1d0e7cb`). **Sanity:** leitura em 23/11 (726 fichas publicadas, sem drafts). **GA4:** propriedade "Onde Brincar - Producao", relatório Páginas e telas, últimos 60 dias (24/09 a 22/11), consultado no Chrome com autorização do Rafa, só leitura.
Sem código de produção e sem gravação no Sanity.

---

## TL;DR

1. **O problema é real, não teórico.** 580 das 726 fichas (80%) não estão `operando`. Todas têm página viva (200, sem noindex) e **todas estão no sitemap**.
2. **O achado de 31/07 estava incompleto: o sitemap NÃO filtra por status.** `app/sitemap.ts` chama `getAtracaoSlugs()` (query `todosSlugs`, sem filtro), não `getAtracaoSlugsAtivos()`. A troca veio no commit `8d49bd4` (09/06, "badge de categoria", US-I5), sem relação com o assunto. Hoje o sitemap público lista 726 fichas, incluindo 65 rejeitadas e 64 duplicadas.
3. **A página encerrada recebe tráfego.** No GA4 (60 dias), 124 páginas de fichas `encerrada` somam **1.291 visualizações (56% das 2.303 em páginas de ficha com 3+ views)**; as `operando` somam 981. Ressalva: parte dessas visualizações aconteceu quando a ficha ainda estava operando; o GA4 por página não separa isso.
4. **Recomendação:** combinação por status (tabela abaixo). Para `encerrada`, **a hipótese do Rafa vale**: manter a página no ar com aviso "Evento encerrado" e recomendações de alternativas. Rejeitada vira 404 real. Duplicada redireciona para a canônica quando existe, senão 404. O sitemap volta a listar só `operando`.
5. **Derivada para a Sprint 30:** 2 stories, **5 SP** (US-O37 com 3 SP e US-O38 com 2 SP, IDs provisórios, ver §7).

---

## 1. Como cada status se comporta hoje (AC1)

Código atual (todos os status seguem o mesmo caminho):

| Peça | Arquivo | Comportamento |
|---|---|---|
| Página `/atracao/[slug]` | `app/atracao/[slug]/page.tsx:158-161` | `notFound()` só se o slug não existe. Não lê status |
| Query da ficha | `lib/sanity/queries.ts` `atracaoBySlug` | Filtra só drafts. A projeção inclui `status`, mas o mapper (`lib/atracoes.ts`) **não leva `status` para o objeto `Atracao`**, então a página nem tem o dado |
| Páginas estáticas | `generateStaticParams` → `todosSlugs` | Todas as 726 |
| Sitemap | `app/sitemap.ts` → `getAtracaoSlugs()` | **Todas as 726** (ver TL;DR 2). `slugsAtivos` existe, está testada, e não é usada por ninguém |
| `robots` | `app/robots.ts` | `allow: /` para tudo; sem noindex em lugar nenhum |
| Metadata e JSON-LD | `generateMetadata`, `buildJsonLd` | Ficha com `proxima_data` sempre sai como `Event` com `eventStatus: EventScheduled`, mesmo vencido, rejeitado ou cancelado |
| Tracker GA4 | `AttractionDetailTracker` → `attraction_view` | Dispara em qualquer ficha, sem checar status, e o evento não leva o status |
| Listagem/home/bairro | `atracoesAtivas`, `atracoesPorBairro` | Só `operando` (e `atracoesAtivas` também exige data futura) |
| Recomendações ("Continue o programa") | `recomendacoes*` | Candidatas só `operando`. **Mas** a ficha de origem `encerrada` usa a própria data (passada) como referência do fim de semana, então o eixo bairro tende a vir vazio |

**Quantas fichas por status (Sanity, 23/11):**

| Status | Fichas | Páginas com 3+ views no GA4 (60d) | Views (60d) |
|---|---|---|---|
| operando | 146 | 88 | 981 |
| **encerrada** | **445** | **124** | **1.291** |
| duplicada | 64 | 6 | 31 |
| rejeitado | 65 | 0 | 0 |
| esgotada | 5 | 0 | 0 |
| em_obras | 1 | 0 | 0 |
| cancelada | 0 | n/a | n/a |

(As 84 páginas com 2 views ou menos ficaram fora do cruzamento; não mudam a conclusão. Todos os 219 slugs de ficha do GA4 existem no Sanity.)

**O que "encerrada" significa na prática** (resposta do Rafa: preenchido à mão e pelo Guardião): nos dados, 438 das 445 têm data vencida, 7 não têm data (permanentes que fecharam, ou fichas editadas à mão) e 1 tem data futura (30/11, provável encerramento antecipado). Ou seja, **encerrada ≈ "evento que já aconteceu"**, o que sustenta o aviso "Evento encerrado" como texto padrão. Para os 7 sem data o texto precisa ser mais neutro ("Esta atração não está mais em operação"). Há também 1 ficha `operando` com data vencida (fora da listagem, página viva): é lacuna do Guardião, não desta decisão.

**Comportamento proposto por status:**

| Status | Pode voltar? | Comportamento na `/atracao/[slug]` | Sitemap | Indexação |
|---|---|---|---|---|
| operando | n/a | Como hoje | Sim | Sim |
| **encerrada** | Eventos recorrentes (ex.: Natal Congelante) podem voltar com data nova, via Guardião/ficha | **200 + aviso "Evento encerrado"** (texto neutro se não há data) + recomendações de alternativas | Não | **Indexável** na 1ª versão (ver §3 e "Decisão em aberto") |
| esgotada | Sim | 200 + aviso "Ingressos esgotados" | Não | Indexável |
| em_obras | Sim | 200 + aviso "Temporariamente fechada" | Não | Indexável |
| cancelada (existe no schema, 0 fichas) | Não | 200 + aviso "Cancelado" + `eventStatus: EventCancelled` | Não | noindex |
| **duplicada** | Não | **308 para a canônica** (`canonical_id`) quando existir; senão 404 | Não | n/a |
| **rejeitado** | Não | **404 real** (`notFound()`) | Não | n/a |

Observação: `cancelada` não estava na lista de status do card (que listava só 5 + duplicada), mas existe no schema e no Studio. Entra no mapeamento.

---

## 2. Abordagens avaliadas (AC2 e AC3)

| # | Abordagem | SEO (histórico indexado) | GA4 | UX de quem chega por link antigo | Recomendações | Esforço |
|---|---|---|---|---|---|---|
| A | **404 real** | Google desindexa em dias/semanas; o tráfego residual é perdido. É o certo para o que nunca deve aparecer | `attraction_view` deixa de disparar (a página 404 não tem tracker), o que limpa a métrica | Vê "não encontrada", sem saída útil | Sem efeito | Muito baixo (1 checagem na página) |
| B | **noindex (meta robots)** | Sai do índice mais devagar; a página segue acessível e consome SSR/imagem se alguém abrir. Não recupera o tráfego, só para de indexar | Continua disparando; infla `attraction_view` de ficha morta | Vê a ficha como se estivesse ativa, sem saber que acabou (**pior UX**) | Sem efeito | Baixo |
| C | **Redirect 308** para listagem/bairro/canônica | Passa sinal para o destino; bom para duplicada. Para encerrada gera "soft 404" se o destino não for equivalente | Visita vira `/` ou listagem; contagem de ficha cai | Surpresa: caiu em outra página sem explicação | Sem efeito | Médio (precisa decidir o destino; só duplicada tem destino natural, e só 1 de 64 tem `canonical_id`) |
| D | **Aviso "evento encerrado" na ficha** (hipótese do Rafa) | Página continua indexável e com conteúdo; evento recorrente que volta reaproveita a URL e o histórico. Risco: acúmulo de páginas de evento vencido no índice (rastreio e "thin content" se virar a maioria) | Continua disparando, **mas** sem parâmetro de status vira ruído; resolve com `ficha_status` no evento | **Melhor UX**: entende por que não dá para ir e vê alternativas | **Precisa de ajuste**: ficha encerrada deve recomendar a partir de "hoje", não da data vencida | Médio (mapper + banner + ajustes de metadata/JSON-LD + recomendações) |
| E | **Combinação por status** (tabela do §1) | Cada status recebe o tratamento certo: 404 para o que não volta e não tem valor; aviso para o que tem tráfego e pode voltar | `ficha_status` no `attraction_view` + 404 sem evento | Específico por caso | Ajuste só na encerrada | Médio (soma de A + C pontual + D) |

**Avaliação.** B isolada é a pior (mantém a ficha "viva" sem avisar). A isolada joga fora 56% do tráfego de ficha que hoje cai em páginas encerradas. C isolada não tem destino para a maioria. D isolada trata igual o que não deveria aparecer (rejeitada, duplicada). **E é a que usa cada saída onde ela é forte.**

### Impacto do tráfego (AC4: teórico ou real?)

**Real.** Maiores páginas não operando no GA4 (60d): bluey-ao-vivo (54), sai-da-tela-micaela (35), patrulhinha-de-natal (30), cafe-da-manha-dos-herois (29), toy-story-o-show (26), o-natal-magico-do-mickey (25)… todas `encerrada`. Muitas encerraram **na semana passada** (ex.: Bluey em 20/11, Patrulhinha em 22/11), então boa parte dessas views é de quando ainda estavam no ar. O dado não prova tráfego pós-encerramento. **O que prova é o inverso do que se supunha: o volume de visitas cai sobre fichas que vão virar encerradas poucos dias depois**, ou seja, o usuário que vai chegar por link guardado (WhatsApp, Instagram, busca) depois do evento vai existir, e hoje vê a ficha sem aviso, com "Quando ir" mostrando data passada.
**Limite:** não foi segmentado por origem (orgânico × direto × social) nem por data. A US-O37 tem como AC1 medir isso por 7 dias depois do deploy do aviso.

---

## 3. Recomendação

**Abordagem E (combinação por status)**, com a hipótese do Rafa como tratamento de `encerrada`/`esgotada`/`em_obras`.

1. **rejeitado → 404 real.** Nunca deveria ser público; 0 views confirmam que não há custo.
2. **duplicada → 308 para a canônica** quando `canonical_id` existe; **404 caso contrário** (63 de 64 não têm `canonical_id` hoje). Só 6 duplicadas têm tráfego (31 views em 60d): na Sprint 30, listar essas 6 para o Rafa preencher a canônica (ação de 5 min), em vez de backfill automático.
3. **encerrada / esgotada / em_obras → 200 com aviso** no topo da ficha, `Atenção` visual, botão de compra/ingresso escondido ou desabilitado quando encerrada, bloco "O que fazer agora" (recomendações a partir de hoje) e JSON-LD coerente (`EventCancelled`/removido, nunca `EventScheduled` vencido).
4. **cancelada → 200 com aviso + noindex** (hoje sem fichas; deixa o tratamento pronto).
5. **Sitemap:** voltar a usar `slugsAtivos` (só `operando`). É a correção mais barata e de maior efeito imediato; reverte a regressão de 09/06.
6. **GA4:** `attraction_view` passa a levar `ficha_status` (ex.: `operando`, `encerrada`), para separar a métrica "fichas vistas" de visualizações de ficha morta. Sem isso, o relatório principal e o Top 5 de atrações misturam as duas.

### Decisão do Rafa (23/11): encerradas ficam visíveis para o Google, avaliamos depois

Decidido: **começar indexável** (sem noindex) nas encerradas por 2 motivos: (i) a hipótese do Rafa é justamente aproveitar o tráfego residual; (ii) evento recorrente reaproveita a mesma URL. Risco a monitorar: 445 páginas vencidas no índice, crescendo ~100/mês, podem diluir o rastreio. **Gatilho para reavaliar:** se o Search Console (aba "Páginas") mostrar encerradas ocupando a maioria das páginas indexadas ou se a cobertura "Rastreada, mas não indexada" crescer, aplicar `robots: { index: false, follow: true }` nas encerradas com data vencida há mais de N dias (N a decidir; sugestão 30). Isso é uma linha em `generateMetadata`, então o custo de mudar de ideia é baixo.

---

## 4. Outras rotas (fora do escopo; registrado)

`atracoesPorBairro` e as queries de recomendação já filtram `status == "operando"`. Não foi auditada nenhuma rota de categoria/bairro por página própria. Sem achado novo.

## 5. Riscos e pontos de atenção

- **Mapper:** adicionar `status` ao tipo `Atracao` toca `lib/sanity/types.ts` e mocks/testes que montam `Atracao`.
- **ISR:** a ficha é `revalidate` 60 s; mudar o status no Studio propaga em ~1 a 2,5 min (ADR O34). O aviso aparece com esse atraso, aceitável.
- **Guardião:** a regra "encerrada" e a regra "ficha aparece com aviso" passam a ser acopladas. Qualquer story que mude o critério de encerramento (A83, A135) altera o que o usuário vê na página. A US-A135 avança `proxima_data` para temporada em curso: quando entrar, parte das encerradas sai desse estado sem passo manual.
- **Efeito sobre este spike:** pelo pedido do Rafa ("despublicar sem olhar cada ficha"), a ação de despublicar passa a ser segura: rejeitar vira 404 e encerrar vira aviso. Não há mais necessidade de checar a página antes.

---

## 6. Como medir o efeito (para a Sprint 30)

- **Sitemap:** `curl .../sitemap.xml | grep -c "<loc>"` deve ir de 727 para ~147 (operando + home). Conferir no Search Console em 7 dias.
- **404 e redirect:** nenhum slug rejeitado responde 200 (script de verificação lendo o Sanity); 6 duplicadas com views conferidas manualmente.
- **Aviso:** em 7 dias, `attraction_view` com `ficha_status = encerrada` como % do total, e **taxa de cliques em alternativas** a partir dessas páginas (evento já existente do anel de recomendação, `ref`). Se a taxa for ~0, o bloco de alternativas precisa de revisão.
- **SEO:** Search Console, páginas indexadas e "Rastreada, mas não indexada" antes/depois, em 14 e 30 dias.
- **needs_human:** não aplicável (não mexe em campo principal da ficha).

---

## 7. Stories derivadas (criadas na Sprint 30 em 23/11) — esboço

> IDs provisórios; numerar no refinamento. Sem assumption de arquitetura em aberto, exceto o "noindex nas encerradas" (decisão do Rafa no §3, com default definido).

### US-O37 — Ficha despublicada: 404 para rejeitado, redirect para duplicada, sitemap só operando (**2 SP**)
**Persona/cenário:** Daniel recebe no WhatsApp um link de uma ficha que o Rafa rejeitou ou duplicou; hoje cai numa ficha ativa e errada.
**ACs:**
1. Sitemap usa `getAtracaoSlugsAtivos()`; teste garante que `sitemap.ts` não importa `todosSlugs` (regressão de 09/06).
2. `atracaoBySlug` passa a expor `status` e `canonical_id`; mapper leva `status` para `Atracao`.
3. `rejeitado` → `notFound()` (página e metadata).
4. `duplicada` com `canonical_id` → redirect 308 para `/atracao/<canonical>`; sem `canonical_id` → `notFound()`.
5. `generateStaticParams` exclui `rejeitado` e `duplicada` (ou mantém e confia no `notFound`; decidir na execução).
6. Testes: um por status; `tsc`, `lint` e testes verdes.
7. Lista das duplicadas com views no GA4 e sem `canonical_id` (6) entregue ao Rafa no handoff (ação manual dele no Studio).
**Fora de escopo:** aviso de encerrada (O38); backfill de `canonical_id`.
**Como medir:** ver §6 (sitemap, 404, redirect).

### US-O38 — Ficha encerrada/esgotada/em_obras/cancelada: aviso na ficha + recomendações a partir de hoje + `ficha_status` no GA4 (**3 SP**)
**Persona/cenário:** Daniel abre o link guardado de um evento que já passou; vê "Evento encerrado" e o que fazer no fim de semana.
**ACs:**
1. Componente de aviso por status (textos do §1; neutro quando não há data), acima do título; ingresso/compra escondido quando `encerrada`/`cancelada`.
2. "Quando ir" não mostra data passada como se fosse futura.
3. JSON-LD: `EventCancelled` para cancelada; `Event` vencido sem `EventScheduled`; sem Offer em encerrada.
4. Recomendações para ficha não operando usam "hoje" como referência (`getFimDeSemanaReferencia(undefined)`), não a data vencida.
5. `attraction_view` recebe `ficha_status`; atualizar `docs`/tracking plan se existir.
6. `cancelada`: `robots: { index: false }`. Encerrada: indexável (default), com o gatilho de reavaliação registrado no ADR.
7. Testes de componente e de metadata; `tsc`, `lint`, verdes. Validação visual de 1 ficha por status no preview (🔴 merge do Rafa).
**Fora de escopo:** noindex em encerradas (só se o gatilho disparar); mudar status de fichas.
**Como medir:** ver §6.

**Soma:** 5 SP, contra ~2,4 SP esperados pela razão histórica de ~1,2 SP derivado por SP de spike (S19 a S23). Está acima, mas O37 é pequena e de alto valor imediato (sitemap). Se a S25 apertar, O38 pode seguir depois.

---

## 8. Retro da sessão

**O que foi bom**
- Conferir o código atual antes de aceitar o achado de 4 meses mostrou que o sitemap **também** não filtra, o que muda a prioridade: é a correção mais barata e está há 5 meses errada por causa de um commit que nada tinha a ver.
- Cruzar GA4 com o Sanity por slug (219 de 219 batendo) deu números verificáveis: o problema não é teórico, 56% das views de ficha caem em encerradas.
- Perguntar o que significa "encerrada" antes de definir o aviso deu o texto certo: quase tudo é "evento que já aconteceu", com 7 exceções sem data.

**O que pode melhorar**
- O GA4 por página não separa quando a view aconteceu; concluí "real" a partir de 60 dias agregados sem ver data nem origem. Causa: só olhei o relatório de páginas, sem segmentar por origem/data; ficou como AC1 da O38.
- Só cruzei as 250 linhas com mais views; as 84 restantes (≤2 views) ficaram fora. Impacto pequeno, mas é corte que deveria estar no relatório desde o início.
- Os 5 "como medir" estão descritos, não rodados; o baseline de `<loc>` do sitemap (727) foi medido hoje e deve ser reaproveitado.

**Plano de ação**
| Ponto | Ação | Dono | Quando |
|---|---|---|---|
| GA4 agregado sem data/origem | Exportar views por página × data de encerramento × origem antes da O38 | Claude | 1ª sessão da O38 |
| Corte de 84 linhas | Em spikes com GA4, paginar até o fim e salvar CSV em `Medições/` | Claude | Próximos spikes |
| Baseline do sitemap | Registrar 727 `<loc>` (23/11) no card da O37 | Claude | Ao refinar a O37 |
| Decisão de noindex em encerradas | Rafa decide default (indexável) e o gatilho (§3) | Rafa | Refinamento da O38 |
| 6 duplicadas sem `canonical_id` e com tráfego | Preencher `canonical_id` no Studio | Rafa | Antes do merge da O37 |
