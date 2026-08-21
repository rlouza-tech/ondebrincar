# DISCOVERY — Navegação mobile: Destaques da semana, Carrossel por região e Ficha com abas

**Data:** 2026-08-19
**Área investigada:** Pares mobile de 3 conceitos já fechados no desktop (US-I43/I47/I45) — layout, cap de itens por carrossel e comportamento de scroll no viewport estreito
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** `docs/discovery/DISCOVERY-2026-08-19-navegacao-desktop.md` (mesma sessão de origem, gerou US-I49/US-I50/US-I52 sem protótipo), `docs/discovery/DISCOVERY-2026-08-18-navegacao-mobile-app-like.md` (padrão mobile já validado no produto — menu inferior, US-I42)

---

## 1. Contexto

A sessão de navegação desktop de 19/08 fechou desenho e protótipo pra 3 conceitos (Destaques da semana, Carrossel dinâmico por região, Ficha com Right Rail) mas foi desenhada como sessão desktop — os pares mobile (US-I49, US-I50, US-I52) saíram sem protótipo, com AC explícito de "agendar spike de protótipo mobile" antes de qualquer Refinamento. Esta sessão fecha esse spike: mesmo sinal de origem da sessão de 19/08 (nenhum sinal bruto novo foi trazido), aplicado ao layout mobile.

Escopo desta sessão, definido pelo Rafa: reaproveitar todas as decisões já fechadas no desktop sem reabri-las (5 zonas e dicionário bairro→zona, formato empilhado, curadoria manual via Studio, mesma lógica de recomendação do anel) e validar só o que muda por causa do viewport estreito — layout de card, cap de itens por carrossel, se ainda precisa de setinhas de rolagem, e o layout de abas da ficha.

## 2. Método

- Releitura dos 2 discoveries de referência (desktop 19/08, mobile app-like 18/08) — não foi preciso reler o handoff geral (`HANDOFF_v9_Onde_Brincar.md`), que trata de um estado de sprint bem anterior (17/07) e não tem informação relevante pro escopo desta sessão, restrito a UI/protótipo.
- Checagem de ADRs em `docs/decisions/`: nenhuma nova desde a sessão de 19/08 — mesma conclusão continua valendo (`2026-05-21-i4-1-filtros-home.md` é complementar, não bloqueia).
- Coleta de dados reais direto do site em produção (`ondebrincar.com.br`, 121 atrações publicadas), via navegador: extração de título, bairro e foto de cada card já renderizado na home, sem precisar abrir o filtro por bairro individualmente. Bucket por zona usando o mesmo dicionário bairro→zona fechado na sessão de 19/08 — conferido batendo exatamente com os totais documentados (Sul 45, Sudoeste 42, Norte 17, Central 12, Oeste 5, 121 no total), sem precisar reabrir a decisão do mapeamento.
- Protótipo HTML construído nesta sessão com fotos reais (capturadas ao vivo do CDN do Sanity, embutidas como `data:` URI — mesmo cuidado já registrado como lição na sessão de 19/08, evita o problema de imagem não carregar por hotlink externo) e os tokens reais de `tailwind.config.ts` (tangerina `#F97316`, azul piscina `#0EA5E9`, verde parque `#84CC16`, Fraunces + Nunito).
- Reaproveitado como referência estrutural o protótipo mobile de 18/08 (`prototipo-navegacao-mobile.html`, achado no Downloads do Rafa) — confirma o padrão de phone-frame, bottom nav com os mesmos 4 itens (Início, Categorias, Esse fim de semana, Grátis) e nomenclatura de tokens já em uso; este protótipo novo segue o mesmo padrão visual.
- Não foi preciso nova consulta ao Sprint Board pra Story ID — as 3 histórias desta sessão (US-I49, US-I50, US-I52) já existem, criadas na sessão de 19/08 (Status "A refinar"); esta sessão só adiciona o protótipo que faltava, não cria histórias novas.

---

## 3. Diagnóstico

### Grupo 1 — Cap de itens por carrossel de zona: 8 (desktop) provavelmente é alto demais pro viewport mobile

**Descrição:** No desktop, o cap de 8 cards por zona foi calibrado pra evitar carrossel gigante num viewport largo, onde vários cards já aparecem lado a lado antes de precisar rolar. No mobile (viewport ~390px), cada card de zona ocupa ~42% da largura útil — só ~2,2 cards cabem por tela. Um cap de 8 exigiria ~3 telas inteiras de swipe horizontal só pra chegar no card "Ver todas" de uma única zona, ×5 zonas empilhadas — esforço de rolagem bem maior que a versão desktop pro mesmo conteúdo.

**Causa raiz:** N/A — é proporção de viewport, não achado de comportamento de usuário (nenhum dado novo de uso foi coletado nesta sessão).

**Impacto:** Médio — não é um problema já medido (não há sessão de usabilidade mobile específica pra este componente, que ainda não existe em produção), é uma inferência de proporção de tela.

**Esforço:** Baixo — é só o valor de uma constante (`CAP`), não muda lógica.

**Prioridade recomendada:** ~~Resolver via teste do protótipo com o Rafa, não como decisão fechada.~~ **Resolvido — cap fechado em 4, não 6.** Proposta inicial desta sessão era 6 (contra 8 no desktop); depois de testar o protótipo v1, o Rafa preferiu encurtar ainda mais a rolagem. Protótipo v2 já reflete o cap de 4 em todas as 5 zonas (Zona Oeste, com só 5 no total, mostra 4 + "Ver todas" levando à 5ª) — ver seção 8, pergunta 1.

---

### Grupo 2 — Setinhas de rolagem do desktop (v8) não são necessárias no mobile — confirma a hipótese do próprio Rafa

**Descrição:** No desktop, as setinhas prev/next foram adicionadas na 7ª rodada da sessão de 19/08 porque scroll horizontal com mouse tem affordance ruim (só o scrollbar fino nativo, fácil de não perceber que dá pra rolar). Touch não tem essa limitação: o gesto de arrastar horizontalmente é o padrão nativo de qualquer app mobile, sem precisar de affordance adicional — e o próprio protótipo já usa "peek" (o próximo card aparece parcialmente cortado na borda da tela) como sinal visual de que há mais conteúdo, tanto na trilha de Destaques (72% de largura por card, ~26% do próximo card visível) quanto nos carrosséis de zona (42% por card, sempre um terceiro card parcialmente visível).

**Causa raiz:** N/A — é diferença de affordance entre input de mouse e touch, já apontada como hipótese pelo próprio Rafa no pedido desta sessão ("touch não tem esse problema, mas vale confirmar").

**Impacto:** Baixo — decisão de UI, não acrescenta problema novo.

**Esforço:** N/A — é a ausência de um componente (não construir as setinhas no mobile), não esforço adicional.

**Prioridade recomendada:** **Aplicado no protótipo: sem setinhas de rolagem no mobile**, confiando em swipe nativo + peek de borda. ~~Recomendação: validar com o Rafa testando o protótipo no celular de verdade~~ **Resolvido — testado em dispositivo real, funcionou.** Decisão fechada: não replicar as setinhas do desktop (v8) no mobile.

---

### Grupo 3 — Ficha com abas: "Detalhes" como aba padrão, e "Sugestões" em lista vertical (não grid) por causa da largura estreita

**Descrição:** Duas decisões de layout que a pergunta em aberto original (seção "O que abrir nesta sessão" do pedido do Rafa) deixava por validar:
1. **Qual aba abre por padrão:** o protótipo abre em "Detalhes" — é a continuação direta do que o usuário acabou de ver (a imagem principal + o essencial da ficha), no mesmo padrão de Netflix/Prime, onde a aba de informações vem antes da aba de recomendações. "Sugestões" exige uma ação deliberada (tocar na aba) pra aparecer, análogo ao Right Rail do desktop, que fica sempre visível mas não é o que ocupa o centro da atenção primeiro.
2. **O que entra em cada aba:** "Detalhes" replica a mesma densidade de campos que a ficha real tem hoje (idade, bairro, endereço, local, preço, ambiente, quando ir, sinopse) — mesma ressalva já registrada na sessão de 19/08 pro Right Rail desktop (protótipo v1 tinha simplificado por engano, corrigido na v2). "Sugestões" usa a mesma lógica de recomendação do anel/Right Rail (US-I33/US-I45), mas em **lista vertical de linha inteira** (imagem pequena + título + bairro), não em grid ou coluna lateral — decisão de layout pra aproveitar a largura estreita do mobile sem espremer o card.

**Causa raiz:** N/A — decisão de layout, não achado de dado.

**Impacto:** Médio — sem essa decisão, US-I52 ficaria sem desenho fechado pro Refinamento.

**Esforço:** Baixo — reaproveita a mesma lógica de dados do Right Rail (US-I45)/anel (US-I33), só muda apresentação.

**Prioridade recomendada:** Levar ao Refinamento junto com US-I52 assim que o Rafa validar o protótipo.

---

### Grupo 4 — "Ver todas — Zona X" não precisa de filtro novo: o filtro de bairro já é multi-select

**Descrição:** Depois de ver o protótipo, o Rafa perguntou diretamente se dava pra mostrar tudo filtrado pela zona ao clicar em "Ver todas". Em vez de assumir, checei o código do filtro (`components/HomeFilters.tsx`, `lib/atracoes.ts`, `lib/filter-options.ts`): o parâmetro `bairro` na URL já aceita múltiplos valores — `toggleBairro` (linha 70-93 de `HomeFilters.tsx`) acumula com `params.append("bairro", b)`, `filtrosFromSearchParams` lê tudo com `params.getAll("bairro")`, e `filtrarAtracoes` casa por OR (`filtros.bairros.some(b => b === atracao.bairro)`). Esse mecanismo já existe em produção — não foi construído pra isso, mas serve exatamente pra isso.

**Causa raiz:** N/A — é uma capacidade já existente no código, descoberta nesta sessão, não um problema.

**Impacto:** Alto pra estimativa de US-I47/US-I50: "Ver todas — Zona X" deixa de ser uma feature nova de filtro e vira só um link construído no front (`/?bairro=Botafogo&bairro=Catete&...`, todos os bairros da zona, a partir do dicionário bairro→zona já fechado em 19/08) — sem parâmetro `zona` novo, sem mudança de schema, sem lógica de filtro nova.

**Esforço:** Baixo — reaproveita 100% do mecanismo de filtro existente (mesma ADR `2026-05-21-i4-1-filtros-home.md`, filtros via querystring). O único trabalho é montar a lista de bairros por zona no momento de gerar o link.

**Prioridade recomendada:** Aplicar essa abordagem em vez de criar um parâmetro `zona`. Levar ao Refinamento de US-I47 (desktop) e US-I50 (mobile) como nota técnica — o AC de "Ver todas" nas duas histórias deve especificar o link com múltiplos `bairro`, não uma nova dimensão de filtro.

---

## 4. Verificação — contradição com ADR existente

Nenhuma ADR em `docs/decisions/` bloqueia as decisões desta sessão — mesma checagem e mesma conclusão da sessão de 19/08 (nenhuma ADR nova desde então). `2026-05-21-i4-1-filtros-home.md` segue complementar, não contraditória.

---

## 5. Histórias — protótipo entregue, ACs atualizados

Nenhuma história nova nesta sessão — US-I49, US-I50 e US-I52 já existiam (criadas na sessão de 19/08, Status "A refinar" no Sprint Board). Esta sessão entrega o protótipo que faltava e fecha parte dos ACs rascunho de cada uma.

| Story ID | Título | O que esta sessão resolveu |
|---|---|---|
| US-I49 | Destaques da semana (mobile) | Protótipo entregue e validado; layout de card fechado (72% da largura, imagem 170px, sem setinhas) |
| US-I50 | Carrossel por região (mobile) | Protótipo entregue e validado; layout de card fechado (42% da largura, imagem 110px); **cap fechado em 4** (era "a definir", desktop usa 8); "Ver todas" resolvido — reaproveita filtro de bairro multi-select já existente (Grupo 4), sem feature nova |
| US-I52 | Ficha com abas (mobile) | Protótipo entregue e validado; "Detalhes" como aba padrão; "Sugestões" em lista vertical (aprovada); densidade de campos igual à ficha real |

---

### US-I49 — Destaques da semana (mobile) — atualização de AC

**AC rascunho (revisão desta sessão):**
- [x] ~~Agendar spike de protótipo mobile~~ — feito nesta sessão.
- [x] Layout de card mobile definido: `.dcard`, 72% da largura da tela, imagem 170px de altura, título até 2 linhas (`line-clamp:2`).
- [x] Confirmado: mesmo conteúdo de US-I43 (curadoria manual via US-I51), só a apresentação muda — protótipo usa os mesmos 5 exemplos reais do catálogo.
- [x] Validado pelo Rafa em dispositivo real — proporção de 72% (peek de ~26% do próximo card) aprovada, sem ajuste pedido.
- [ ] Levar ao Refinamento: fechar DoR completa (persona/cenário já herdados de US-I43, falta só formalizar estimativa SP).

---

### US-I50 — Carrossel por região (mobile) — atualização de AC

**AC rascunho (revisão desta sessão):**
- [x] ~~Agendar spike de protótipo mobile~~ — feito nesta sessão.
- [x] Layout de carrossel mobile por zona definido: empilhado vertical (uma seção por zona, mesma ordem do desktop — Sul, Sudoeste, Norte, Central, Oeste), cards a 42% da largura, imagem 110px de altura.
- [x] Setinhas de rolagem do desktop (v8) **não replicadas no mobile** — validado em dispositivo real pelo Rafa, swipe nativo + peek de borda bastam (ver Grupo 2).
- [x] **Cap de itens fechado em 4 por zona** (era "a definir"; desktop usa 8) — validado pelo Rafa no protótipo v2 (ver Grupo 1). Zona Oeste (5 no total) mostra 4 + "Ver todas" pra completar.
- [x] **"Ver todas — Zona X": resolvido sem feature nova de filtro** — reaproveita o filtro de bairro multi-select já existente em produção (`bairro` aceita múltiplos valores via `params.append`/`getAll`, casamento por OR). Link é `/?bairro=<b1>&bairro=<b2>&...` com todos os bairros da zona, montado no front a partir do dicionário bairro→zona. Ver Grupo 4. **Mesma solução vale pro par desktop (US-I47), que tinha essa mesma pergunta em aberto desde a sessão de 19/08.**
- [ ] Reaproveita o mesmo dicionário bairro→zona e o mesmo AC técnico de fallback pra bairro não mapeado, já registrado em US-I47 (desktop) — não duplicar aqui, é a mesma regra de negócio.

---

### US-I52 — Ficha com abas (mobile) — atualização de AC

**AC rascunho (revisão desta sessão):**
- [x] ~~Agendar spike de protótipo mobile~~ — feito nesta sessão.
- [x] Layout de abas definido: "Detalhes" (campos hoje visíveis na ficha real — idade, bairro, endereço, local, preço, ambiente, quando ir, sinopse) vs. "Sugestões" (lista vertical, mesma lógica de recomendação do Right Rail/anel).
- [x] Confirmado: abre em "Detalhes" por padrão — ver Grupo 3.
- [x] **Layout de "Sugestões" em lista vertical validado pelo Rafa** — sem necessidade de testar alternativa em grid.
- [ ] Levar ao Refinamento: registrar decisão técnica de reaproveitar a mesma query/componente de recomendação da US-I45 (Right Rail) em vez de duplicar lógica.

---

## 6. Parking lot

Nenhum item novo — esta sessão não trouxe sinal bruto adicional além do que já estava registrado na sessão de 19/08; o escopo foi inteiramente resolver o protótipo mobile que já estava pendente, sem abrir frente nova.

---

## 7. Decisões tomadas

**2ª rodada de feedback — Rafa testou o protótipo v1 e respondeu as 4 perguntas em aberto de uma vez:**

- **Cap de itens por zona: 4, não a proposta inicial de 6.** Protótipo atualizado pra v2 com 4 cards fixos em todas as 5 zonas.
- **Setinhas de rolagem confirmadas desnecessárias no mobile** — testado em dispositivo real, swipe nativo funcionou.
- **"Ver todas — Zona X" resolvido sem feature nova**: reaproveita o filtro de bairro multi-select já existente em produção (achado de código desta sessão, ver Grupo 4) — link com múltiplos `bairro` na querystring, não um parâmetro `zona` novo. Vale tanto pro par mobile (US-I50) quanto pro desktop (US-I47), que tinha a mesma pergunta em aberto desde 19/08.
- **Layout de "Sugestões" em lista vertical aprovado** como está, sem necessidade de alternativa em grid.

---

- **Nenhuma decisão desktop foi reaberta** — 5 zonas, dicionário bairro→zona, formato empilhado, ordem por volume decrescente, curadoria manual via Studio e reaproveitamento da lógica de recomendação do anel seguem exatamente como fechados na sessão de 19/08.
- **Sem setinhas de rolagem no mobile** — swipe nativo + peek de borda substituem o affordance que as setinhas resolviam no desktop (ver Grupo 2). Não fechado como decisão definitiva de produto — é a leitura do protótipo, a validar com teste real em dispositivo.
- **Cap de itens por carrossel de zona proposto em 6 pro mobile** (desktop usa 8) — aplicado no protótipo desta sessão como ponto de partida, não como decisão fechada (ver Perguntas em aberto).
- **"Detalhes" como aba padrão da Ficha** — decisão de UI aplicada no protótipo, mesma lógica do padrão Netflix/Prime que inspirou o pedido original do Rafa.
- **"Sugestões" em lista vertical, não grid** — decisão de layout pra largura estreita do mobile, aplicada no protótipo.
- Nenhuma ADR nova sinalizada como necessária — são decisões de UI/layout, não de arquitetura.

---

## 8. Perguntas em aberto

Todas as 4 perguntas desta sessão foram resolvidas pelo Rafa após testar o protótipo v1 (rodada de feedback única, registrada também na seção 7):

1. ~~Cap de itens por carrossel de zona no mobile: 6 é o número certo?~~ **Resolvido: 4, não 6.** O Rafa preferiu uma rolagem ainda mais curta que a proposta inicial desta sessão. Protótipo atualizado pra v2 com 4 cards fixos por zona (Zona Oeste, que tem só 5 no total, também mostra 4 + "Ver todas" com a 5ª) — ver Grupo 1 e US-I50 atualizada.
2. ~~Setinhas de rolagem: confirmar em dispositivo touch real.~~ **Resolvido: testado no celular, funcionou.** Confirma a hipótese do Grupo 2 — swipe nativo + peek de borda bastam, sem precisar do affordance de setinhas que o desktop (v8) usa.
3. ~~"Ver todas — Zona X" no mobile: mesmo destino do desktop?~~ **Resolvido — e a resposta técnica é melhor do que a sessão de 19/08 havia deixado em aberto.** O Rafa perguntou diretamente se dava pra mostrar tudo filtrado pela zona. Investiguei o código do filtro (`components/HomeFilters.tsx`, `lib/atracoes.ts`) pra responder com precisão, não só opinar: **o filtro de bairro já é multi-select** — `toggleBairro` acumula vários valores no mesmo param (`params.append("bairro", b)`), `filtrosFromSearchParams` lê todos com `getAll("bairro")`, e `filtrarAtracoes` casa por OR (`filtros.bairros.some(...)`). Ou seja, **"Ver todas — Zona Sul" pode linkar direto pra `/?bairro=Botafogo&bairro=Catete&bairro=Copacabana&...` (todos os 15 bairros da zona), sem precisar de um novo parâmetro `zona` nem mudança de schema/backend** — é só montar a query string no front a partir do mesmo dicionário bairro→zona já fechado na sessão de 19/08. Esforço bem menor do que eu havia estimado nesta seção antes da investigação (que cogitava precisar de um filtro novo).
4. ~~Layout de "Sugestões" (lista vertical) é o ideal, ou um grid de 2 colunas comprimido caberia melhor?~~ **Resolvido: gostou como está.** Lista vertical confirmada, sem necessidade de testar a alternativa em grid.

---

## 9. Recomendações para o próximo Kickoff

- **US-I49, US-I50 e US-I52 têm protótipo, desenho e as 4 perguntas em aberto desta sessão já resolvidas** — prontas pro Refinamento fechar DoR completa (persona/cenário/AC/SP), sem bloqueio pendente.
- **Levar também ao Refinamento de US-I47 (desktop)** o achado do Grupo 4 (filtro de bairro multi-select já resolve "Ver todas — Zona X") — não é exclusivo do par mobile, muda a estimativa de esforço dos dois.
- **Pares desktop e mobile continuam com o mesmo conteúdo/fonte de dados, layout e estimativa próprios** — não juntar de volta numa história só (mesmo racional já registrado no Grupo 2.2 da sessão de 19/08).
- Nenhuma mudança de Sprint recomendada — US-I49/I50 seguem Sprint 17 e US-I52 Sprint 18, como o Rafa já havia atribuído na sessão de 19/08 (esta sessão não reabre essa decisão).
- **Sprint Board (Notion) ainda não foi atualizado com essas decisões** — US-I49/I50/I52 seguem com o texto de AC da sessão de 19/08 até o Rafa confirmar se quer sincronizar agora ou deixar pro próprio Refinamento.

**Nota de escopo:** por definição desta cerimônia, sessões de discovery não atribuem Sprint. Como todas as 3 histórias já tinham Sprint atribuído explicitamente pelo Rafa na sessão de 19/08, esta sessão não altera esse campo.

---

## Referências

- `docs/discovery/DISCOVERY-2026-08-19-navegacao-desktop.md` (sessão de origem — desenho e protótipo desktop, decisões de zona/formato/ordem)
- `docs/discovery/DISCOVERY-2026-08-18-navegacao-mobile-app-like.md` (padrão mobile de referência — menu inferior, US-I42)
- `docs/decisions/2026-05-21-i4-1-filtros-home.md`
- Site em produção (`ondebrincar.com.br`): 121 atrações, usado pra extrair fotos reais e conferir o mapeamento bairro→zona contra o catálogo atual — totais batem exatamente com a sessão de 19/08 (Sul 45, Sudoeste 42, Norte 17, Central 12, Oeste 5)
- Protótipo mobile de 18/08 (`prototipo-navegacao-mobile.html`, pasta Downloads do Rafa) — referência de padrão visual (phone-frame, bottom nav, tokens)
- Protótipo HTML entregue nesta sessão: `prototipo-mobile-destaques-regiao-ficha-v1.html` (versão inicial, cap de 6/zona, perguntas em aberto) → **`prototipo-mobile-destaques-regiao-ficha-v2.html`** (versão validada pelo Rafa — cap de 4/zona, demais decisões fechadas)
- Código verificado pra responder a pergunta 3 (Grupo 4): `components/HomeFilters.tsx` (`toggleBairro`, multi-select via `params.append`), `lib/atracoes.ts` (`filtrosFromSearchParams`, `filtrarAtracoes`), `lib/filter-options.ts`
- Sprint Board (Notion): US-I49, US-I50, US-I52 (Status "A refinar", criadas na sessão de 19/08) — **ainda não modificadas**, aguardando confirmação do Rafa se quer sincronizar os ACs agora ou deixar pro Refinamento (ver seção 9)

---

*Fim do documento de discovery.*
