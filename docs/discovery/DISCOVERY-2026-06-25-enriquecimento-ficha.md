# DISCOVERY — Enriquecimento da Ficha de Atração

**Data:** 2026-06-25
**Modalidade:** Discovery
**Participantes:** Rafa (produto), Claude (facilitador)
**Área investigada:** Informação geográfica nas fichas e cards de atração

---

## 1. Contexto

A sessão partiu de uma percepção do produto: o site atual entrega curadoria de conteúdo, mas deixa Daniel (persona âncora) sem informação suficiente para planejar a logística do programa. Saber "o que fazer" não basta — Daniel precisa saber "onde fica" e "vale o deslocamento?" antes de clicar para fora.

Duas lacunas distintas foram identificadas:

- **Home (cards):** o card exibe nome, faixa etária, preço e data — mas não o bairro. Ao escanear a lista, Daniel não consegue filtrar mentalmente por proximidade sem abrir cada ficha.
- **Ficha (detalhe):** o bairro já aparece, mas apenas como metadado. Não há endereço completo, o que obriga Daniel a sair do site para procurar no Google antes de planejar o deslocamento.

Sinal de origem: **percepção do founder** (uso próprio do produto). Sem dado de usuário ou métrica confirmando. Hipóteses plausíveis, não evidência forte — o discovery trata como hipótese a validar.

---

## 2. Método

Inspeção direta do código:

- `components/AtracaoCard.tsx` — interface de props do card
- `components/AtracaoCardLink.tsx` — wrapper que instancia o card
- `app/atracao/[slug]/page.tsx` — página de detalhe (ficha)
- `sanity/schemas/atracao.ts` — schema de dados
- `lib/sanity/types.ts` — tipos TypeScript do Sanity
- `lib/sanity/queries.ts` — queries GROQ

Nenhuma métrica de comportamento de usuário foi consultada. Nenhuma entrevista realizada.

---

## 3. Diagnóstico

### Gap A — Bairro ausente nos cards da home

**Descrição:** O campo `bairro` existe no schema (obrigatório, string), aparece na ficha, é usado no filtro multi-bairro (US-I19) e no title tag de SEO. Mas o `AtracaoCard` não tem a prop `bairro` — o dado simplesmente não é passado nem exibido no card.

**Causa raiz:** Omissão de frontend. O dado existe, a prop não foi adicionada ao componente.

**Impacto:** Alto — sem bairro no card, Daniel precisa abrir cada ficha para saber se a atração está numa zona acessível para ele.

**Esforço:** Baixo — adicionar prop ao `AtracaoCard`, passar o valor em `AtracaoCardLink`, exibir no template do card.

**Prioridade recomendada:** P1

---

### Gap B — Endereço ausente na ficha

**Descrição:** A ficha exibe bairro, mas não tem endereço completo. O campo `endereco` não existe no schema. O campo `link_maps` também não existe. Daniel é obrigado a sair do site para pesquisar o endereço antes de planejar o deslocamento.

**Causa raiz:** Campo nunca foi modelado no schema. Fontes de scraping existentes (Clubinho, Sympla) provavelmente contêm o endereço, mas o pipeline não captura.

**Decisões tomadas nesta sessão:**
- Formato: texto livre (ex: "Rua General Glicério, 74 — Laranjeiras") + campo `link_maps` URL opcional
- Fonte: scraper captura quando disponível; Gemini extrai como fallback
- Itinerantes (eventos sem sede fixa): campo `endereco` fica em branco por ora
- `link_maps` é opcional — não bloqueia exibição do endereço

**Impacto:** Alto — elimina uma etapa de saída do site no fluxo de planejamento do Daniel.

**Esforço:** Médio — schema (2 campos novos) + atualização do scraper + prompt Gemini + frontend na ficha.

**Prioridade recomendada:** P2

---

### Gap C — Ausência de link de navegação ("Como chegar")

**Descrição:** Não há nenhum CTA de navegação na ficha. Daniel não consegue abrir o Maps diretamente a partir da ficha.

**Decisão desta sessão:** É uma história separada do endereço. Pode usar `link_maps` (se preenchido) ou gerar busca pelo nome da atração como fallback. Não entra no escopo desta sessão.

**Impacto:** Médio

**Esforço:** Baixo a médio (depende da abordagem: link externo vs. embed)

**Prioridade recomendada:** a definir no próximo Kickoff

---

## 4. Histórias criadas

> ⚠️ IDs marcados como `??` — verificar último ID usado no épico I no board do Notion antes de criar.

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I?? | Exibir bairro no card da home | I — Interface | 1 | (1) `AtracaoCard` recebe prop `bairro`; (2) bairro aparece visualmente no card em todas as resoluções; (3) layout do card não quebra com bairros longos; (4) query GROQ já retorna `bairro` — confirmar que está no select | a definir |
| US-I?? | Exibir endereço na ficha | I — Interface | 3 | (1) campo `endereco` (texto livre, opcional) adicionado ao schema Sanity; (2) campo `link_maps` (URL, opcional) adicionado ao schema Sanity; (3) scraper captura endereço quando disponível na fonte; (4) Gemini extrai endereço como fallback quando scraper não captura; (5) frontend exibe endereço na dl de metadados da ficha quando campo preenchido; (6) se `link_maps` preenchido, exibe link "Ver no mapa"; (7) fichas itinerantes: campo em branco não quebra layout; (8) DoD limitado a fichas novas — fichas existentes sem endereço é escopo do retroativo | a definir |
| US-O?? | Retroativo de endereços para fichas existentes | O — Operações | a definir | (1) script varre fichas publicadas sem `endereco`; (2) tenta preencher via venue-map de endereços conhecidos primeiro; (3) fallback: Gemini extrai do texto da ficha; (4) gera tabela (evento, link da ficha, endereço capturado) para revisão do Rafa; (5) só aplica após aprovação manual — nunca escreve direto no Sanity sem dry-run | a definir |

**Hipóteses explícitas:**

- **US-I?? (bairro no card):** exibir o bairro no card reduz o tempo de triagem de Daniel ao escanear a lista, sem que ele precise abrir cada ficha.
- **US-I?? (endereço na ficha):** ter o endereço na ficha elimina a etapa de "sair do site para pesquisar" no fluxo de planejamento de Daniel.

---

## 5. Parking lot

| Item | Hipótese | Motivo de não virar story agora |
|---|---|---|
| Mapa / "Como chegar" na ficha | Link direto para Maps reduz fricção de navegação para Daniel | História separada; requer decisão sobre abordagem (link externo vs. embed) e definição de fallback quando `link_maps` não estiver preenchido. Endereço não é pré-requisito, mas complementa. |
| Zona da cidade nos cards (Norte / Sul / Centro / Oeste) | Daniel conhece "Tijuca" mas pode não saber onde fica "Madureira" — agrupar por zona ajudaria quem não conhece a cidade | Não foi discutido com profundidade suficiente; exige decisão sobre como mapear bairros para zonas (campo novo no schema? lookup hardcoded?) |
| Endereço no card | Complementaria o bairro com precisão de rua | Descartado — sem espaço no card |

---

## 6. Decisões tomadas

| Decisão | Detalhes |
|---|---|
| Bairro no card, endereço na ficha | São features distintas. Não há obrigatoriedade de ter endereço para ter bairro no card, nem mapa para ter endereço. |
| Endereço: formato texto livre + link_maps opcional | Opção B: dois campos no schema — `endereco` (texto legível) e `link_maps` (URL). Desacopla o endereço exibido da precisão de navegação. |
| Fonte do endereço: scraper primeiro, Gemini como fallback | Quando o scraper captura o endereço da fonte, usa direto. Gemini extrai do texto quando o scraper não captura. |
| Venue-map de endereços conhecidos | Quando um local já tem endereço validado (ex: Planetário da Gávea), o pipeline usa o endereço do lookup em vez de chamar o Gemini. O projeto já tem o padrão implementado para imagens (`scripts/associate-imagens/venue-map.ts`) — o mesmo padrão se aplica aqui. |
| Itinerantes: campo em branco por ora | Eventos sem sede fixa não recebem endereço. Campo `endereco` é opcional no schema. |
| Campo `endereco` visível no Studio para todos os status | Incluindo drafts e fichas rejeitadas. |
| Validação do endereço: manual pelo Rafa para começar | Rafa revisa a ficha completa antes de publicar. Sem flag automático de "verificado". |
| Retroativo: gerar tabela para revisão | Quando for feito o backfill das fichas existentes, Claude gera tabela com: evento, link da ficha e endereço capturado, para Rafa validar antes de aplicar. Não entra no escopo da story atual. |
| Mapa é história separada | Endereço e mapa são stories independentes. O campo `link_maps` criado na story de endereço estará disponível para a story de mapa, mas não é bloqueador. |

Nenhuma decisão desta sessão requer ADR (nenhuma é arquitetural irreversível).

---

## 7. Perguntas em aberto

Todas as perguntas desta sessão foram respondidas. Registradas como decisões na seção 6.

~~1. Backfill de endereços para fichas existentes~~
→ Retroativo sim, mas não como parte da story atual. Quando for feito, Claude gera tabela (evento + link + endereço capturado) para Rafa validar antes de aplicar.

~~2. Scraper captura endereço hoje?~~
→ Verificação viável — endrar na execução da story de endereço como primeira etapa.

~~3. Campo `endereco` visível no Studio para todos os status?~~
→ Sim, para todos.

~~4. Validação do endereço gerado pelo Gemini~~
→ Validação manual pelo Rafa. Sem flag automático. Para o retroativo, tabela para facilitar a revisão em lote. Para fichas novas, revisão da ficha completa antes de publicar.

---

## 8. Recomendações para o próximo Kickoff

**Entrar no board (após verificar IDs):**
- US-I?? — Bairro no card: pronta para execução. Zero bloqueios, 1 SP. Candidata a P1 no próximo sprint.
- US-I?? — Endereço na ficha: entrar no board como Ready **após** responder as perguntas 1 e 2 acima.

**Discutir antes de estimar:**
- Estratégia de backfill para fichas existentes sem endereço.
- Verificar no scraper atual se endereço já é capturado (inspeção de 15 min em `scripts/scraper/`).

**Pré-requisitos a verificar:**
- Nenhuma ADR existente conflita com as decisões desta sessão.
- US-I19 (filtro multi-bairro) foi entregue e está em produção — as duas stories desta sessão não conflitam com ela.
