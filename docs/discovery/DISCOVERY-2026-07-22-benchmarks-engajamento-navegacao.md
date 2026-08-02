# Discovery — US-I32: Benchmarks e possibilidades de engajamento (navegação/recomendação)

**Data:** 22/jul/2026
**Story:** US-I32 (spike, 3 SP, Sprint 14)
**Tipo de sessão:** Execução — spike, sem implementação (por escopo)
**Consolida:** Discovery "Melhorias de usabilidade by Benchmarking" (jun/2026) + Discovery "Melhorar a navegação do site" (18/06/26) + ideias novas (anel de recomendação, breadcrumb, temas na home)

---

## TL;DR

**A ficha de atração é ao mesmo tempo a porta de entrada e o beco sem saída do site.** Nos últimos 30 dias (Clarity): 68% das sessões entram direto por uma ficha (190/281) e 68% terminam numa ficha (192/281). Quem entra pela ficha faz só **1,35 páginas por sessão** com **82% de profundidade de rolagem** — lê a ficha até o fim e não tem pra onde ir, porque o fim da ficha não oferece nada. É a confirmação quantitativa exata do cenário do Daniel Mendes: decide sobre 1 atração e fecha a aba.

Das 3 ideias novas, o **anel de recomendação no fim da ficha é a aposta P1**: ataca o maior segmento (68% do tráfego) no ponto de maior atenção (fim do scroll) e mira diretamente a NSM ("sessões com 2+ fichas/semana"). Breadcrumb, ao contrário da intuição, é P3: só ~16 sessões/mês chegam à ficha vindas de dentro do site — o problema que ele resolve quase não existe no volume atual.

O site de benchmark do PM3 foi **resolvido: é o GoodUI.org** (Bônus 1.4 do curso Product Growth, 25/06/26). Bônus: os patterns públicos dele validam nossas hipóteses com A/B tests de terceiros — Sticky CTA (#41) com 3 testes vencedores recentes, Recently Viewed (#26) e Already Viewed Label (#92) como parentes diretos do anel de recomendação.

---

## AC3 — Clarity: navegação pós-decisão (30 dias, 22/06–22/07)

Análise por segmentos de URL (filtros aplicados ao vivo no painel; complementa — não repete — a análise de dead clicks da US-V7, que mediu 10,91% em cima dos elementos de filtro):

| Corte | Sessões | % do total | Pág/sessão | Rolagem | Tempo ativo |
|---|---|---|---|---|---|
| Todas as sessões | 281 | 100% | 1,60 | 65,8% | 28s |
| Visitou alguma ficha (`/atracao/`) | 206 | 73% | 1,71 | 77,4% | 30s |
| **Entrou** por uma ficha | 190 | 68% | **1,35** | **82,1%** | 22s |
| **Saiu** por uma ficha | 192 | 68% | 1,39 | 80,6% | 25s |

### Leituras

1. **Entrada direta na ficha domina o tráfego.** 190 de 206 sessões que veem ficha aterrissaram nela (Google é o maior referenciador: 106 sessões). Só ~16 sessões/mês chegam à ficha navegando de dentro do site (home/listagem → ficha).
2. **Quem aterrissa na ficha não explora.** 1,35 pág/sessão ≈ a grande maioria dessas sessões é de página única. O usuário resolve a decisão imediata e sai — não conhece a listagem, os filtros, nem outras atrações.
3. **A ficha é lida até o fim.** 82% de rolagem no segmento de entrada — o maior de todos os cortes. O fim da ficha é o ponto de maior atenção do site e hoje termina em nada. É o melhor lugar pra oferecer o próximo passo.
4. **Dead clicks no segmento de ficha: 6–8%** (vs. 10,91% geral na US-V7) — o problema da ficha não é clique frustrado, é ausência de destino.
5. **Retornos rápidos: 9,22%** no segmento "visitou ficha" — indício pequeno de ping-pong ficha↔listagem; não é o padrão dominante.

### Resposta à pergunta da story ("sai direto ou volta pra listagem?")

**Sai direto.** A sessão típica com ficha não passa pela listagem em nenhum momento — nem antes, nem depois. A pergunta relevante pro Sprint 15 não é "como facilitar a volta pra listagem" (breadcrumb) e sim "o que oferecer no fim da ficha pra gerar a 2ª ficha" (anel).

---

## AC2 — Benchmark de jun/2026 relido com lente de navegação/recomendação

Documento-fonte: `Onde Brincar/Produto/Benchmarks/benchmark_onde_brincar.docx` (14 produtos, 7 BR + 7 internacionais).

### O que os 14 produtos fazem de navegação/recomendação entre atrações

| Padrão | Quem faz | Relevância pro anel/temas |
|---|---|---|
| "Mais eventos do organizador" na página do evento | Sympla | É exatamente o eixo "mesma companhia" do anel. Único caso de recomendação intra-página no benchmark inteiro. |
| Grade visual de categorias no topo da home | Hoop, Sympla, Eventim | Base do conceito "temas na home" — navegar por toque antes de filtrar, especialmente mobile. |
| Editorial hero + feed curado ("destaque da semana") | Mommy Poppins, Time Out Kids | Âncora editorial na home; versão OB = tema curado com voz autoral. |
| Hierarquia de IA: categoria de vida → subcategoria → filtro | Time Out Kids | Gramática mais madura do gênero; breadcrumb só faz sentido quando essa hierarquia existir. |
| Personalização por idade reorganiza tudo | Kidadl | Reforça faixa etária (gap #1) como eixo de recomendação futuro do anel ("mesma faixa etária"). |

### Achado estrutural

**Os 7 gaps de jun/2026 quase não cobrem recomendação/navegação entre atrações.** Dos 7 (faixa etária, filtro gratuito, badge urgência, CTA sticky, reviews, evergreen, newsletter), nenhum é anel de recomendação, "veja também" ou breadcrumb — só o "Mais eventos do organizador" da Sympla tangencia o tema, como inspiração avulsa. Ou seja: **as ideias novas do Rafa complementam o benchmark, não duplicam.** Sobreposições reais mapeadas:

| Ideia nova | Sobreposição com gap de jun/2026 | Status do gap |
|---|---|---|
| Anel de recomendação | Nenhuma direta (parente: "Mais eventos do organizador") | — |
| Breadcrumb | Nenhuma | — |
| Temas na home | Gap #3 (badge urgência — "Grátis **esse fim de semana**" embute urgência) + tendência "categorias visuais na home" + gap #2 (filtro gratuito, como tema em vez de toggle) | Nenhum dos dois endereçado ainda |
| — | Gap #4 (CTA sticky na ficha) | Não endereçado; ganhou evidência externa nova (GoodUI #41) |

Gaps #1 (faixa etária), #5 (reviews), #6 (evergreen) e #7 (newsletter — em andamento via US-N5/N6) seguem válidos mas fora da lente de navegação deste spike.

### Site de benchmark do PM3 — resolvido: GoodUI.org

Localizado no handoff v6 do curso Product Growth (Bônus 1.4 — Ferramentas, 25/06/26): *"GoodUI.org: testes A/B mastigados. Ver antes de qualquer experimento de UI"*, classificado como "✅ USAR AGORA" no Guia de Ferramentas do Notion. Referência que o AC pedia pra resolver ou descartar — **resolvida**.

Consulta feita em 22/07 (área pública; detalhes de teste são pagos — não assinar por ora):

- **Pattern #41 — Sticky Call To Action:** 3 testes recentes registrados (mai–jun/2026), padrão com histórico de vitórias. Valida o gap #4 do benchmark com evidência experimental de terceiros.
- **Pattern #26 — Cart Reminder And Recently Viewed** e **#92 — Already Viewed Label:** parentes diretos do anel de recomendação — "continuar de onde parou" como padrão vencedor recorrente em listagens/produto.
- Categoria de patterns por métrica inclui **Engagement** — consultar antes de desenhar o protótipo do anel (formato, posição, quantidade de itens).

---

## AC4 — Possibilidades avaliadas

Formato: cada possibilidade com formato proposto, esforço estimado e hipótese de impacto. Esforços em SP na régua atual do board (1 SP ≈ story mecânica pequena; 2-3 SP ≈ story com lógica nova).

### 1. Anel de recomendação no fim da ficha — P1

- **Formato proposto:** seção "Continue o programa" no fim da ficha (posição validada pelos 82% de scroll), com 3–4 cards em 2 eixos fixos e determinísticos: (a) mesmo tema/categoria com data futura, (b) mesmo bairro/zona no mesmo fim de semana. Eixo "mesma companhia" (padrão Sympla) quando o dado existir. Sem ML, sem personalização — query Sanity simples por metadados que as fichas já têm.
- **Esforço estimado:** 2–3 SP (1 componente + 1 query GROQ + evento GA4 `recommendation_click`). Sem mudança de schema.
- **Hipótese de impacto:** é a alavanca mais direta da NSM ("sessões com 2+ fichas/semana", base ~43/semana). Se o anel converter 10% das ~190 entradas-ficha/mês em uma 2ª ficha, a NSM sobe ~4–5 sessões/semana (~+10%). Métrica de guarda: taxa de clique no anel; contramétrica: CTR do CTA "ver ingressos" (o anel não pode canibalizar a conversão principal).

### 2. Temas na home ("Grátis esse fim de semana", "Teatro pra criança pequena") — P2

- **Formato proposto:** 2–3 trilhas horizontais curadas acima/entre a listagem, cada uma = listagem pré-filtrada com título editorial com voz. Combina 3 tendências do benchmark (categorias visuais, editorial hero, badge de urgência) num formato só. Primeira dupla candidata: "Grátis esse fim de semana" (dados de preço + data já existem) e 1 tema editorial sazonal.
- **Esforço estimado:** 2–3 SP para trilha dinâmica por query; +1 SP se tiver curadoria manual via Sanity (campo "tema em destaque").
- **Hipótese de impacto:** atalho de navegação por intenção pros ~32% que entram pela home; reduz dependência do filtro (que <2% usam — GA4 jun/2026). Mede-se por cliques na trilha vs. cliques na listagem padrão.

### 3. CTA sticky na ficha (gap #4, promovido pela evidência nova) — P2-carona

- **Formato proposto:** botão "Ver ingressos"/"Visitar site" fixo no rodapé mobile ao rolar. Já era gap do benchmark; GoodUI #41 adiciona evidência experimental recente.
- **Esforço estimado:** 1 SP (CSS/estado, sem backend — avaliação do próprio benchmark).
- **Hipótese de impacto:** conversão de clique externo (`buy_ticket_click`), não NSM. Convive com o anel: sticky serve a decisão tomada, anel serve a exploração. Entra como carona de implementação se o Sprint 15 tocar na ficha pro anel.

### 4. Breadcrumb — P3 (adiar com critério de reativação)

- **Formato proposto (se/quando ativar):** trilha "Home → [Categoria] → Ficha" preservando querystring do filtro (a US-I18 já preserva estado de filtro).
- **Esforço estimado:** 1 SP.
- **Hipótese de impacto:** **fraca no volume atual.** O fluxo listagem→ficha→voltar existe em ~16 sessões/mês; o botão "voltar" do browser já cumpre o papel (filtros preservados pela US-I18). Breadcrumb ganha valor quando (a) a navegação interna crescer (efeito esperado do próprio anel + temas) ou (b) a hierarquia de IA ganhar nível de categoria real (padrão Time Out). **Critério de reativação:** revisitar quando entradas via home/listagem passarem de ~35% das sessões com ficha, ou junto com a story de faixa etária.
- Benefício secundário não medido neste spike: breadcrumb gera dado estruturado (BreadcrumbList) pra SEO — se virar argumento decisivo, tratar como story de SEO, não de navegação.

### Fora da lente deste spike (registrados, sem avaliação)

Reviews/curadoria com nota (gap #5), conteúdo evergreen (gap #6), faixa etária como filtro (gap #1 — candidata natural a 3º eixo do anel no futuro), filtro gratuito como toggle (gap #2 — parcialmente coberto pelo tema "Grátis esse fim de semana", que serve de teste barato da demanda antes de mexer no filtro).

---

## AC5 — Plano de prototipação → testes (Sprint 15)

Ordem de execução proposta, com método de validação por item:

| # | O quê | Story sugerida | SP est. | Validação | Critério de sucesso (4 semanas pós-deploy) |
|---|---|---|---|---|---|
| 1 | Anel de recomendação no fim da ficha (2 eixos: tema + bairro/fim de semana) | Nova US-I (Épico I — verificar último ID no Notion antes de criar) | 2–3 | Evento GA4 `recommendation_click` + segmento Clarity "entrou pela ficha" (pág/sessão >1,35) + NSM semanal | CTR do anel ≥5% das visualizações de ficha; NSM +10%; `buy_ticket_click` estável |
| 2 | Tema na home #1: "Grátis esse fim de semana" | Nova US-I | 2–3 | Clique na trilha (evento próprio) vs. cliques na listagem; Clarity heatmap da home | Trilha entre as 3 áreas mais clicadas da home |
| 3 | CTA sticky na ficha (carona do item 1) | Nova US-I (ou AC do item 1) | 1 | `buy_ticket_click` antes/depois | CTR de saída ≥ atual (não regressão) + ganho |
| 4 | Breadcrumb | **Não criar story** — fica no Discovery Board com critério de reativação documentado acima | — | — | — |

Notas de sequenciamento:

- Item 1 antes do item 2: mesmo segmento do problema central (68% entrada-ficha) e mede a NSM diretamente. Se só couber uma story no Sprint 15, é essa.
- **Pré-requisito de medição:** confirmar que o evento `attraction_depth_2` (story do Sprint 11) está ativo no GA4 antes do deploy do anel — é ele que torna a NSM comparável antes/depois.
- Cruzar com US-I31 no Kickoff 15: se as sessões de usabilidade mostrarem que o usuário procura navegação em outro ponto da ficha (topo? mapa?), ajustar posição do anel antes de prototipar. Consolidação dos dois discoveries prevista no Kickoff 15 (já anotado na story).
- Teste A/B formal segue inviável (~1,2k sessões/mês vs. mínimo ~2k/mês anotado no curso PM3) — validação é antes/depois com janela de 4 semanas, comparando o mesmo segmento Clarity.

---

## Assumptions e limitações

- Amostra Clarity: 281 sessões/30 dias — sinal direcional, não estatístico. Coerente com o padrão aceito na US-I31.
- "Páginas por sessão 1,35" é média do Clarity; a distribuição exata (quantas sessões são estritamente single-page) não é exposta pelo painel. A leitura "maioria single-page" é inferência da média + tempo ativo de 22s.
- Julho é férias escolares — tráfego e comportamento podem estar atípicos (GTM de férias ativo). Repetir os 4 cortes do Clarity em agosto antes de bater o martelo em metas numéricas.
- GoodUI.org: detalhes dos testes são pagos; usamos os patterns públicos como direção, não como prova. Não assinar por ora.
- Nenhuma implementação feita neste spike — entrega é este documento + plano acima.

## Sobreposição com US-I31 (em paralelo)

O atrito "Encontrar" da US-I31 (busca/filtros/vocabulário) e o "temas na home" deste spike atacam o mesmo problema por ângulos diferentes (quali vs. benchmark+quanti). Consolidar no Kickoff 15 antes de criar as stories, como previsto em ambas.

## Referências

- Clarity, projeto Onde Brincar — cortes por URL feitos ao vivo em 22/07/2026 (Últimos 30 dias)
- `Onde Brincar/Produto/Benchmarks/benchmark_onde_brincar.docx` (jun/2026)
- Discovery Board: "Melhorias de usabilidade by Benchmarking" (jun/2026) e "Melhorar a navegação do site" (18/06/26)
- HANDOFF — Curso Product Growth (PM3) v6 (25/06/26), Bônus 1.4 — origem da referência GoodUI.org
- GoodUI.org — patterns #41, #26, #92 (consulta 22/07/2026)
- US-V7 (dead clicks 10,91%), US-I18 (estado de filtro preservado), US-I20/I21 (badge de data, ordenação)
