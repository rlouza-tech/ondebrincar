# DISCOVERY — Navegação mobile "app-like": menu inferior, categorias e grid de 2 colunas

**Data:** 2026-08-18
**Área investigada:** Navegação estrutural no mobile (64% da audiência) — hoje o único jeito de navegar é clicar numa ficha ou usar o filtro
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** `docs/discovery/DISCOVERY-2026-07-22-benchmarks-engajamento-navegacao.md` (spike US-I32), `docs/discovery/DISCOVERY-2026-08-14-navegacao-recomendacao.md`, card "Fichas raramente levam de volta pra home" (Discovery Board, achado de 18/08)

---

## 1. Contexto

A dor trazida pelo Rafa: baixa profundidade de navegação no site, com 64% da audiência em mobile (achado de hoje, GA4 "Categoria de dispositivo"), e hoje o mobile só oferece dois jeitos de navegar — clicar numa ficha ou usar o filtro. Três ideias foram trazidas pra discussão: menu inferior com categorias (padrão de app), menu hambúrguer mostrando todas as categorias, e grid de 2 fichas por linha na listagem. Escopo explicitamente restrito pelo Rafa a ideias **exclusivas de mobile** — "temas na home" (ideia cross-device já avaliada como P2 no US-I32) fica de fora desta sessão.

## 2. Método

- Nenhum dado novo foi extraído ao vivo nesta sessão — o Rafa confirmou que a baixa profundidade e o "64% mobile" batem com achados já documentados no projeto, usados aqui como baseline.
- Leitura de discoveries anteriores: US-I32 (spike de 22/07, Clarity) e DISCOVERY-2026-08-14 (GA4, CTR do anel).
- Consulta ao Discovery Board (Notion) — achei um card criado hoje mesmo (18/08) com achado de GA4 relacionado, ainda não deste discovery.
- Leitura de código no repo (`Cursor/`) pra checar o que já existe: `components/SiteHeader.tsx`, `components/AtracaoCard.tsx`, `components/FiltersBottomSheet.tsx`, `app/home-content.tsx`, `lib/filter-options.ts`, `docs/design-tokens.md`.
- Checagem de ADRs em `docs/decisions/`: `2026-05-21-i4-1-filtros-home.md` é a mais relevante (filtros na Home, mobile-first).
- Consulta ao vivo ao Sprint Board (Notion) para achar o maior Story ID do Épico I e checar se alguma das 3 ideias já existe como story.

---

## 3. Diagnóstico

### Grupo 1 — O mobile não tem nenhuma camada de navegação estrutural além do clique na ficha e do filtro

**Descrição:** Três sinais convergem. (a) US-I32 (Clarity, 30 dias, 22/06–22/07): quem entra direto por uma ficha (68% do tráfego) faz só 1,35 páginas/sessão com 82% de rolagem — lê até o fim e não tem pra onde ir. (b) Achado de hoje no Discovery Board (GA4, 21/jul–17/ago): quem já chega numa ficha ganha só +0,27 ficha/usuário depois disso, contra +1,34 de quem entra pela home — reforça que a ficha realmente é um beco sem saída, não só na entrada. (c) Leitura de código confirma a causa estrutural: `SiteHeader.tsx` só tem logo + botão de busca, nenhum menu ou navegação persistente. O único mecanismo de "explorar o catálogo" é o filtro, acessado via `FiltersBottomSheet.tsx` — só aparece se o usuário já souber que deve tocar em "Filtros".

**Causa raiz:** Ausência de affordance de navegação persistente no mobile — a única forma de "ver que existe mais catálogo" é já saber procurar por filtro.

**Impacto:** Alto — mesmo eixo já priorizado no board ("Melhorar a navegação do site", Priorizado, Épico I).

**Esforço:** Médio — depende da solução (ver Grupo 4).

**Prioridade recomendada:** P1.

---

### Grupo 2 — O filtro, hoje o único mecanismo de navegação por intenção, já é sabidamente pouco usado

**Descrição:** Card já existente no Discovery Board ("Investigar visibilidade do filtro"): GA4 mostrava, em jun/2026, menos de 2% dos usuários usando o filtro de categoria (7 de 409). Isso confirma, com dado já coletado, a queixa operacional do Rafa de que "só dá pra navegar clicando na ficha ou usando o filtro" — e mostra que a segunda opção quase não é usada na prática.

**Causa raiz:** Não é desta sessão — já registrada como pergunta em aberto no card original (visibilidade da UI vs. desalinhamento de vocabulário vs. baixa intenção).

**Impacto:** Médio-Alto — contexto de apoio pro Grupo 1, não é pauta nova.

**Esforço:** N/A.

**Prioridade recomendada:** Já Priorizado (dentro do card mestre "Melhorar a navegação do site").

---

### Grupo 3 — "2 fichas por linha no mobile" já é story existente no Sprint Board — não é achado novo

**Descrição:** Ao consultar o Sprint Board antes de rascunhar qualquer story, encontrei **US-I28 — "Layout 2 colunas no mobile na home"**, Status **Ready**, 1 SP, alocada pra **Sprint 18**, criada em 24/06/2026 — antes até do spike US-I32. A ideia do Rafa não é nova, já está no board. Porém o campo "Resumo" da story está vazio no Notion — não há AC de teste/validação documentado, mesmo com a própria preocupação do Rafa ("menos espaço pra informação, precisaria testar") sendo exatamente o tipo de critério que falta.

**Causa raiz:** N/A — reconciliação administrativa, não diagnóstico.

**Impacto:** N/A.

**Esforço:** N/A.

**Prioridade recomendada:** Não vira story nova nesta sessão (ver seção 5 — nota sobre Story ID). Recomendação: no Refinamento que preparar a Sprint 18, anexar critério de teste/validação ao AC de US-I28 antes dela entrar em execução. Um critério já saiu desta sessão, ao testar o protótipo: título do card em 2 colunas **não deve truncar com reticências** — deve quebrar em até 2 linhas (`line-clamp: 2`), senão o nome da atração fica ilegível. Ver protótipo atualizado.

---

### Grupo 4 — Menu inferior e menu hambúrguer não são bem 2 soluções concorrentes — são 2 níveis de uma mesma IA, e um teste evita comprometer esforço nos dois sem validar

**Descrição:** O catálogo tem **11 categorias** hoje (`CATEGORIA_OPTIONS` em `lib/filter-options.ts`: Atividade extra, Colônia de Férias, Evento, Festa Junina, Futebol, Museu, Parque, Pracinha, Praia, Restaurante, Teatro) — grande demais pra caber num menu inferior de app (padrão de mercado é 3–5 destinos fixos, tipo iFood ou o próprio Sympla). Isso sugere que as duas ideias do Rafa não competem entre si: o **menu inferior** carrega poucos atalhos primários (ex: Início, Categorias, Esse fim de semana, Perto de mim), e o **hambúrguer/grid de categorias** é o que abre a lista completa das 11 — podendo inclusive ser a mesma tela aberta a partir do próprio item "Categorias" do menu inferior, em vez de 2 padrões redundantes.

Achado técnico que reduz o esforço: os 4 destinos candidatos ao menu inferior (Início, Categorias, Esse fim de semana, Grátis) **reaproveitam filtros que já existem** (`categoria`, `data=fim-de-semana`, `preco=gratuito` na URL) — não é lógica nova, é navegação por atalho pra estado de filtro já implementado (ADR I4.1). Dois candidatos ficaram de fora conscientemente: "Perto de mim" exige geolocalização do aparelho — feature nova, não atalho pra filtro existente, esforço maior que os outros 4 e fica pra depois; "Favoritos" hoje é só um toast "em breve" (registrado no HANDOFF v12) — também fica de fora da primeira versão.

**Correção de framing (feedback do Rafa nesta sessão):** menu inferior e hambúrguer não competem no *conteúdo* — a grade de categorias é uma coisa só, construída uma vez. O que compete é o *gatilho*: barra fixa sempre visível vs. ícone discreto no topo. Isso é uma escolha de ou/ou (não faz sentido os dois apontando pra mesma coisa ao mesmo tempo) — e pesa a favor do menu inferior como gatilho principal um argumento que só ficou claro cruzando com o Grupo 2: um hambúrguer tem o mesmo risco estrutural do filtro atual (afordance escondida, <2% de uso) — só aparece se alguém já souber procurar. O menu inferior, por ser sempre visível, não carrega esse risco. Não é decisão fechada, mas é motivo concreto pra inclinar a escolha.

**Causa raiz:** N/A — é decisão de arquitetura de informação, não achado de dado.

**Impacto:** Alto — é a pauta central desta sessão, mesmo eixo do Grupo 1.

**Esforço:** Médio, mas mais baixo do que pareceria à primeira vista — a maior parte do menu inferior é atalho pra filtro que já existe; o custo real está no componente de UI (bottom nav fixo + overlay de categorias), não em lógica nova de dados.

**Prioridade recomendada:** P1 — mas via protótipo/teste antes de virar story de implementação cheia (ver seção 5).

---

## 4. Verificação — contradição com ADR existente

Nenhuma ADR em `docs/decisions/` bloqueia as ideias desta sessão. A ADR `2026-05-21-i4-1-filtros-home.md` (filtros na Home, mobile-first, estado na URL) é diretamente complementar: o menu inferior proposto no Grupo 4 reaproveita exatamente esse mecanismo (filtros via query string) em vez de criar um sistema de navegação paralelo — reforça a decisão já tomada em vez de contradizê-la.

---

## 5. Histórias rascunhadas

**Nota sobre Story ID:** consultei o Sprint Board ao vivo — o maior ID hoje no Épico I é `US-I39`. O discovery de 08-14 (`DISCOVERY-2026-08-14-navegacao-recomendacao.md`) já reservou `US-I40` (ainda não promovida ao Notion) para outra pauta (baseline de métricas). Pra não colidir, esta sessão usa `US-I41`.

**Nota sobre US-I28:** a ideia de "2 fichas por linha" **não gera story nova** — já existe como `US-I28` (Ready, Sprint 18). Ver Grupo 3 e seção 9 (recomendação de anexar AC de teste no Refinamento).

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I41 | Spike: protótipo e validação de navegação estrutural mobile (menu inferior + grade de categorias) | I — Interface | 2 (chute inicial) | Ver abaixo | a definir |

---

### US-I41 — Spike: protótipo e validação de navegação estrutural mobile

**Persona + cenário:** Daniel Mendes abre o site pelo celular a partir de um link de ficha (68% dos casos, achado US-I32). Hoje, se ele quiser ver outra atração, só pode fechar a aba, apertar voltar no navegador, ou rolar até o fim da ficha — não existe nenhum sinal visual de "isso é um catálogo maior, dá pra explorar por categoria".

**Hipótese:** Um protótipo navegável comparando (a) menu inferior fixo com atalhos primários e (b) grade de categorias completa (acessível a partir do próprio menu inferior), testado antes de qualquer implementação real, permite decidir com mais segurança qual padrão — ou combinação — reduz a taxa de sessão single-page, sem comprometer SP de implementação em algo não validado.

**Assumptions explícitas:**
- 11 categorias hoje no schema são demais pra um menu inferior isolado — a lista completa fica na grade de categorias, não nos ícones fixos do menu inferior.
- Menu inferior proposto (Início, Categorias, Esse fim de semana, Grátis) reaproveita filtros que já existem — não é lógica nova de dados, só navegação por atalho.
- "Perto de mim" fica de fora da v1 conscientemente — exige geolocalização do aparelho (feature nova), não é atalho pra filtro existente como os outros 4. "Favoritos" também fica fora — a feature real ainda é só um toast "em breve".
- Menu inferior e hambúrguer não competem no conteúdo (grade de categorias é única) — competem no gatilho (barra fixa sempre visível vs. ícone escondido no topo). Argumento de afordance (paralelo com o <2% de uso do filtro, Grupo 2) inclina pro menu inferior, mas não fecha a decisão.
- "Temas na home" (P2 do US-I32) fica fora desta story — é ideia cross-device, fora do escopo mobile-only definido pelo Rafa nesta sessão.
- O protótipo visual desta sessão (entregue como artefato HTML) cobre a AC1 abaixo; as ACs seguintes dependem de revisão do Rafa depois de ver o protótipo.

**AC rascunho:**
- [x] Protótipo HTML navegável com as 2 camadas (menu inferior + grade de categorias) usando as categorias reais do catálogo — **entregue nesta sessão**, ver artefato anexado. Fichas de exemplo usam fotos reais (capturadas ao vivo do site em produção via CDN do Sanity), não placeholder.
- [x] Lista final de itens do menu inferior validada pelo Rafa: Início, Categorias, Esse fim de semana, Grátis (troca de "Perto de mim", adiado por exigir geolocalização)
- [ ] Rafa decide qual gatilho seguir depois de testar o protótipo: menu inferior (favorito nesta sessão pelo argumento de afordance), hambúrguer, ou nenhum — antes de virar story de implementação cheia no Refinamento
- [ ] Se aprovado, registrar decisão de IA (gatilho escolhido + grade de categorias compartilhada) como nota técnica pro Refinamento

---

## 6. Parking lot

Nenhum item novo — as observações desta sessão ou já tinham hipótese suficiente pra virar story (US-I41) ou já eram diagnóstico existente reaproveitado (Grupos 1–3), sem sinal cru adicional que precisasse de mais tempo antes de virar hipótese testável.

---

## 7. Decisões tomadas

- **Escopo restrito a ideias exclusivas de mobile** nesta sessão — decisão do Rafa. "Temas na home" (cross-device, já P2 no US-I32) fica fora, candidata a sessão futura.
- **Protótipo construído nesta própria sessão** (HTML navegável), não via Claude Design — decisão registrada com a justificativa: o teste precisa de interação real (abrir/fechar grade, estado ativo do menu), que uma ferramenta de imagem estática não cobre; o protótipo aqui usa os tokens reais do produto (`docs/design-tokens.md`) para fidelidade visual maior que uma geração genérica.
- **Menu inferior e menu hambúrguer não competem no conteúdo, só no gatilho** — a grade de categorias é única (construída uma vez); o que se decide é qual elemento abre ela (barra fixa sempre visível vs. ícone escondido no topo). Argumento a favor do menu inferior: mesmo risco de baixa afordance que já derruba o uso do filtro hoje (Grupo 2, &lt;2%) se aplica a um hambúrguer escondido — decisão não fechada, mas o protótipo já reflete essa inclinação.
- **4º item do menu inferior trocado de "Perto de mim" para "Grátis"** — "Perto de mim" exige geolocalização (feature nova) e foi conscientemente adiado; "Grátis" reaproveita o filtro de preço que já existe (`preco=gratuito`), mantendo os 4 itens no mesmo padrão de esforço baixo dos outros 3.
- **Título do card em 2 colunas: até 2 linhas, sem truncar com reticências** — feedback direto do Rafa ao testar o protótipo; vira critério de teste pra US-I28 (ver Grupo 3).
- **Categorias na grade em ordem alfabética** — consistente com a US-I27 (Sprint 11), que já ordena o dropdown do filtro assim. Grade final com 9 categorias (Festa Junina e Colônia de Férias removidas do protótipo por serem sazonais — ver achado abaixo).
- **`docs/design-tokens.md` está desatualizado (achado corrigido nesta sessão):** o protótipo começou usando os tokens desse arquivo (paleta azul-marinho, fonte Inter) — ao construir o prompt de handoff pro Lovable, o Rafa perguntou se as cores realmente batiam com o site real, o que motivou checar `tailwind.config.ts` diretamente. O arquivo real usa uma paleta totalmente diferente, pós-rebrand: `primary #F97316` (tangerina), `secondary #0EA5E9` (azul piscina), `accent/success #84CC16` (verde parque), fontes Fraunces (display) + Nunito (corpo) — consistente com o HANDOFF v12 ("Identidade visual: Fraunces nos h1, Nunito no corpo"). O doc `docs/design-tokens.md` nunca foi atualizado desde o rebrand. Protótipo corrigido para usar os tokens reais.
- Nenhuma ADR nova sinalizada como necessária agora — se a direção for aprovada após o protótipo, a decisão de IA (grade acessível só pelo menu inferior, sem hambúrguer redundante) deve virar nota técnica no Refinamento, não ADR formal ainda (é decisão de UI, não arquitetural).

---

## 8. Perguntas em aberto

1. **Qual direção seguir depois do protótipo:** menu inferior + grade juntos (recomendado nesta sessão), só um dos dois, ou nenhum — decisão do Rafa após revisar o artefato.
2. **US-I28 precisa de AC de teste antes do Sprint 18?** A story já é Ready, mas sem critério de validação documentado — vale decidir no Refinamento que antecede o Kickoff 18.
3. **"Favoritos" no menu inferior:** só faz sentido quando a feature de fato existir (hoje é toast "em breve") — acompanhar se isso muda antes da Sprint em que US-I41 for implementada.
4. **`docs/design-tokens.md` desatualizado:** vale atualizar o arquivo pra refletir a paleta pós-rebrand (`tailwind.config.ts` é a fonte real), ou removê-lo se não fizer mais sentido mantê-lo — decisão do Rafa, fora do escopo desta sessão de navegação.

---

## 9b. Fechamento da direção (mesma sessão, pós-protótipo)

O Rafa testou o protótipo e decidiu: **menu inferior sem hambúrguer** na v1. "Categorias" no próprio menu inferior já cobre a descoberta da grade — não faz sentido manter os dois gatilhos pro mesmo destino. Critério de reativação explícito do hambúrguer: se sinal de usabilidade (ex: sessões tipo US-I31) mostrar que a galera não encontra "Categorias" no menu inferior, reavaliar. US-I41 (spike) está **resolvido nesta própria sessão** — protótipo construído e validado, não precisa virar tarefa de sprint separada só pra "rodar o spike".

O que isso deixa em aberto, e que ainda **não tem story**: a implementação real do menu inferior. Rascunhando aqui pra não perder:

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I42 (provisório — Notion com limite de consulta no momento, confirmar ID antes de criar) | Implementar menu inferior mobile (Início, Categorias, Esse fim de semana, Grátis) | I — Interface | 3–5 (chute, maior que o spike por ser componente novo + wiring) | Ver abaixo | a definir |

**US-I42 — Implementar menu inferior mobile**

- Hipótese: menu inferior persistente com 4 atalhos (Início, Categorias, Esse fim de semana, Grátis) — os 3 últimos reaproveitando filtros que já existem — aumenta profundidade de navegação sem hambúrguer redundante.
- Assumptions: direção já validada nesta sessão (não precisa de novo spike); hambúrguer fica fora da v1 com critério de reativação registrado acima; grade de categorias usa as categorias reais em ordem alfabética (consistente com US-I27).
- AC rascunho: (1) menu inferior fixo com os 4 itens; (2) "Categorias" abre grade com categorias reais, ordem alfabética; (3) Início/Esse fim de semana/Grátis navegam via query params já existentes, sem lógica nova; (4) sem hambúrguer nesta v1; (5) evento de analytics no toque de cada item (paralelo ao `recommendation_click` da US-I33).
- Antes de criar de fato no Notion: confirmar o maior ID vivo do Épico I (consulta bloqueada por limite de uso no momento desta sessão).

**Lembrete do próprio Rafa, no meio da sessão:** não esquecer a US-I28 (2 fichas por linha) na rodada de "o que falta" — ela segue Ready/Sprint 18, existente, só falta o AC de teste (título até 2 linhas) que já está registrado na seção 3 (Grupo 3) e na seção 7.

## 9. Recomendações para o próximo Kickoff

- Priorizar **US-I41** (spike de baixo esforço, protótipo já entregue nesta sessão) para a próxima sprint disponível — o trabalho pesado de visualização já foi feito aqui; o que resta é a decisão do Rafa e o registro da nota técnica.
- Levar ao Refinamento que antecede o **Kickoff 18**: anexar critério de teste/validação à **US-I28** ("2 colunas no mobile"), hoje Ready sem AC de teste documentado, antes dela entrar em execução.
- Se o Rafa aprovar a direção do protótipo, a implementação real (menu inferior + grade de categorias) deve ser refinada como story própria separada de US-I41 — o spike só valida a direção, não implementa em produção.

**Nota de escopo:** por definição desta cerimônia, `US-I41` sai com `Sprint: a definir` na tabela da seção 5, mesmo com a recomendação de prioridade acima. Atribuir sprint de fato é decisão do Kickoff.

---

## Referências

- `docs/discovery/DISCOVERY-2026-07-22-benchmarks-engajamento-navegacao.md` (spike US-I32)
- `docs/discovery/DISCOVERY-2026-08-14-navegacao-recomendacao.md`
- Discovery Board (Notion): card "Fichas raramente levam de volta pra home pra ver mais atrações" (achado de 18/08, GA4 21/jul–17/ago)
- Discovery Board (Notion): card "Investigar visibilidade do filtro" (GA4 jun/2026, &lt;2% uso de filtro categoria)
- `docs/decisions/2026-05-21-i4-1-filtros-home.md`
- Sprint Board (Notion): `US-I28` — Layout 2 colunas no mobile na home (Ready, Sprint 18)
- Código: `components/SiteHeader.tsx`, `components/AtracaoCard.tsx`, `components/FiltersBottomSheet.tsx`, `app/home-content.tsx`, `lib/filter-options.ts`, `docs/design-tokens.md`

---

*Fim do documento de discovery.*
