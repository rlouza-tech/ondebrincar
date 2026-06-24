# DISCOVERY — Novas Fontes de Conteúdo
**Data:** 2026-06-11  
**Tema:** Diversificação das fontes de ingestão do pipeline editorial  
**Facilitador:** Sessão de Discovery com Rafa  
**Status:** Fechado

---

## 1. Contexto

O pipeline editorial do Onde Brincar opera hoje com duas fontes ativas: **Clubinho de Ofertas** (fonte principal, `pnpm scrape`) e **Sympla** (`pnpm sympla-scrape`). Ambas foram integradas nos primeiros sprints como prova de conceito do fluxo scraper → Gemini → Sanity.

O problema: concentrar 100% das atrações em duas fontes cria risco de cobertura e risco operacional. Eventos de grande destaque no Rio — como musicais nos grandes teatros ou exposições imersivas licenciadas — passam ao largo do pipeline porque estão em outras plataformas. Do ponto de vista do Daniel Mendes (persona âncora), isso significa que o Onde Brincar pode não aparecer quando ele busca o evento mais relevante do fim de semana.

A sessão teve como objetivo mapear quais plataformas operam no mercado carioca de entretenimento infantil/familiar e avaliar o que faz sentido incluir como nova fonte.

---

## 2. Método

Três frentes combinadas:

- **Pesquisa de mercado** (web search + pesquisa paralela do Rafa): levantamento das plataformas de venda de ingressos com atuação no Rio de Janeiro para público infantil e familiar.
- **Análise de email** (Gmail do Rafa): busca por confirmações de compra de ingressos nos últimos 3 anos para identificar plataformas já usadas na prática.
- **Inspeção do codebase** (`scripts/scraper/`, `scripts/normalizer/`, `scripts/check-novidades/`): mapeamento do que já está implementado, do formato canônico (`LinhaEnriquecida`, 15 campos) e dos pontos de extensão do pipeline.

Plataformas investigadas: 5 (ver diagnóstico).  
Arquivos do codebase inspecionados: `scraper/index.ts`, `scraper/clubinho-api.ts`, `scraper/types.ts`, `normalizer/sympla.ts`, `normalizer/clubinho.ts`, `check-novidades/index.ts`.

---

## 3. Diagnóstico

### D4 — EcoVilla Ri Happy: fonte de alto valor com site próprio scrapeável
**Descrição:** A EcoVilla Ri Happy (Jardim Botânico) tem site WordPress próprio (`ecovillarihappy.com.br/programacao/`) com programação estruturada, descrições ricas, datas, classificação etária e links de ingresso (Ingresso.com). Atualizado com frequência semanal/quinzenal, 10–15 eventos por vez. Perfil editorial alinhado com o Onde Brincar: teatro, circo, oficinas, natureza. HTML scrapeável sem anti-scraping detectado.  
**Causa raiz:** Fonte não mapeada na pesquisa inicial — identificada apenas ao aprofundar a investigação.  
**Impacto:** Alto — venue curado, eventos de alta qualidade editorial, frequência regular.  
**Esforço:** Baixo — WordPress estático, estrutura previsível, conteúdo rico já disponível no HTML.  
**Prioridade recomendada:** P1 — mais simples e de maior retorno imediato que Uhuu ou Eventim.

---

### D1 — Uhuu: fonte de alto valor não capturada
**Descrição:** A Uhuu gerencia a bilheteria dos principais grandes teatros infantis do Rio (Teatro Riachuelo Rio, Teatro Multiplan). É onde ficam os grandes musicais infantis de temporada e shows de massa. Esse tipo de evento — de destaque, com assentos marcados e mapas interativos — não aparece no Clubinho nem no Sympla, que tendem a operar no segmento pequeno e médio porte.  
**Causa raiz:** O pipeline foi construído de baixo para cima, priorizando fontes com acesso técnico mais simples (Clubinho tem API interna, Sympla tem listagem HTML estruturada). Nenhum mapeamento formal de cobertura foi feito antes.  
**Impacto:** Alto — eventos de destaque da cidade ficam invisíveis no Onde Brincar.  
**Esforço:** Médio — requer investigação técnica do site (estrutura HTML ou API interna), mas o padrão de implementação já está estabelecido.  
**Prioridade recomendada:** P1

---

### D2 — Eventim: exposições imersivas e megaproduções não capturadas
**Descrição:** A Eventim opera no segmento premium do mercado: megaproduções internacionais (Cirque du Soleil) e exposições imersivas licenciadas. O email do Rafa confirma uso da plataforma (compra de ingresso em jul/2025).  
**Correção pós-sessão:** A EcoVilla Ri Happy foi atribuída à Eventim na pesquisa inicial — isso estava errado. A EcoVilla usa Ingresso.com como ticketing e tem site próprio (ver D4). A justificativa da US-S3 foi atualizada em consequência.  
**Causa raiz:** Idem D1 — nenhum mapeamento formal de cobertura.  
**Impacto:** Médio — eventos pontuais mas de alto impacto editorial.  
**Esforço:** Médio-alto — empresa internacional com infraestrutura robusta; possível anti-scraping mais agressivo que o Clubinho.  
**Prioridade recomendada:** P2

---

### D3 — Pipeline sem interface gráfica: gargalo para escalar fontes
**Descrição:** Todo o pipeline atual roda via CLI (`pnpm scrape`, `pnpm sympla-scrape`, `pnpm pipeline-ia`, etc.). Adicionar novas fontes sem uma interface de operação torna o fluxo frágil: quem roda precisa conhecer os comandos, interpretar os outputs e tomar decisões de aprovação no terminal. Com 3+ fontes rodando em paralelo, isso vira dívida operacional rápido.  
**Causa raiz:** MVP focou em velocidade de entrega. CLI foi a escolha certa no início.  
**Impacto:** Alto — limita quem pode operar o pipeline e o volume sustentável de fontes.  
**Esforço:** Alto — requer decisão de escopo (Studio plugin vs admin page Next.js) antes de estimar.  
**Prioridade recomendada:** P1 — pré-requisito para tornar as stories de novas fontes sustentáveis no longo prazo.

**Observação:** A intenção de construir uma interface de operação já está sinalizada no codebase. `scripts/normalizer/whatsapp.ts` implementa uma rota de entrada manual via `whatsapp-triagem.csv` (6 campos simplificados vs 15 do scraper) — é uma rota pensada para operar sem CLI, onde alguém encaminha informações de eventos pelo WhatsApp e elas entram no pipeline. Esse normalizer é o embrião do fluxo com interface. As stories de novas fontes (US-S2, US-S3) foram deliberadamente sequenciadas *após* essa interface existir.

---

## 4. Histórias criadas

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-S2 | Investigação técnica e scraper Uhuu | S — Scraper | 5 | Ver abaixo | Sprint 10 |
| US-S3 | Investigação técnica e scraper Eventim (RJ, sem EcoVilla) | S — Scraper | 5 | Ver abaixo | Sprint 10 |
| US-S4 | Scraper EcoVilla Ri Happy | S — Scraper | 3 | Ver abaixo | Sprint 10 |
| US-O8 | Interface de gerenciamento do pipeline | O — Operações | a definir | Ver abaixo | a definir |

---

### US-S2 — Investigação técnica e scraper Uhuu

**Persona + cenário:** Rafael (operador do pipeline) quer capturar eventos dos grandes teatros infantis do Rio que só vendem pelo Uhuu. Hoje esses eventos ficam de fora do Onde Brincar.

**Hipótese:** O site da Uhuu tem estrutura HTML ou API interna suficiente para extrair os campos do `LinhaEnriquecida` para eventos em cartaz no RJ, seguindo o mesmo padrão do scraper do Clubinho.

**Assumptions explícitas:**
- A investigação técnica é parte do escopo da story (não é pré-requisito separado).
- O output deve ser um CSV no formato `LinhaEnriquecida` (15 colunas), compatível com o `pipeline-ia` existente.
- SP = 5 assume que o Uhuu não tem proteções anti-scraping significativas. Se descoberto o contrário, a story é re-estimada.
- Implementação completa (integração no workflow recorrente) aguarda US-O8.

**AC rascunho:**
- [ ] Investigação técnica documentada: estrutura do site Uhuu (HTML scrapeável vs API interna), presença de anti-scraping, campos disponíveis vs campos do `LinhaEnriquecida`
- [ ] `pnpm scrape --source uhuu` produz `data/input/uhuu-raw.csv` no formato `LinhaEnriquecida` (15 colunas)
- [ ] Filtro por localização RJ aplicado (mesma lógica de `isLocalizacaoRioDeJaneiro`)
- [ ] `pnpm check-novidades --source uhuu` reconhece a fonte e compara slugs com Sanity
- [ ] Pelo menos 5 eventos reais capturados em execução manual de validação
- [ ] Normalizer `scripts/normalizer/uhuu.ts` documentado com mapeamento de campos (o que veio, o que ficou vazio, o que o Gemini vai preencher)

---

### US-S3 — Investigação técnica e scraper Eventim (infantil/familiar RJ)

**Persona + cenário:** Rafael quer capturar exposições imersivas e espaços infantis como EcoVilla Ri Happy que vendem pelo Eventim — eventos premium que dão diferencial editorial ao Onde Brincar.

**Hipótese:** O Eventim tem página de categoria infantil/familiar para RJ com estrutura scrapeável ou API interna que retorna os campos necessários, mesmo sendo uma plataforma internacional com proteções mais robustas.

**Assumptions explícitas:**
- Idem US-S2 para anti-scraping — re-estimar se encontrar bloqueios significativos.
- Foco: apenas eventos com perfil infantil/familiar em venues do RJ (não scraping geral da plataforma).
- Implementação completa aguarda US-O8.

**AC rascunho:**
- [ ] Investigação técnica documentada: estrutura do site Eventim (empresa alemã, infraestrutura enterprise), presença de anti-bot, campos disponíveis vs campos do `LinhaEnriquecida`. Se bloqueio for incontornável, story é cancelada e item vai para parking lot.
- [ ] `pnpm scrape --source eventim` produz `data/input/eventim-raw.csv` no formato `LinhaEnriquecida`
- [ ] Filtro por categoria infantil/familiar e localização RJ aplicado
- [ ] `pnpm check-novidades --source eventim` reconhece a fonte
- [ ] Pelo menos 3 eventos reais capturados em validação
- [ ] Normalizer `scripts/normalizer/eventim.ts` documentado com mapeamento de campos

---

### US-S4 — Scraper EcoVilla Ri Happy

**Persona + cenário:** Rafael quer capturar os espetáculos, oficinas e eventos do Teatro EcoVilla Ri Happy (Jardim Botânico) diretamente do site próprio da venue — conteúdo editorial de alta qualidade, atualizado semanalmente.

**Hipótese:** O site WordPress da EcoVilla (`ecovillarihappy.com.br/programacao/`) tem estrutura HTML estável o suficiente para extrair nome, descrição, datas, classificação etária e link de ingresso (Ingresso.com) sem autenticação nem anti-scraping.

**Assumptions explícitas:**
- SP = 3 porque o site é WordPress estático, sem API necessária e sem proteções detectadas.
- Alguns eventos são gratuitos/sem link de ingresso — normalizer trata `url_ingresso` como vazio nesses casos.
- Implementação completa aguarda US-O8.

**AC rascunho:**
- [ ] `pnpm scrape --source ecovilla` produz `data/input/ecovilla-raw.csv` no formato `LinhaEnriquecida` (15 colunas)
- [ ] Campos extraídos: nome, descrição, datas, classificação etária, link de ingresso (quando presente)
- [ ] `bairro` fixo como "Jardim Botânico" (venue única e conhecida)
- [ ] `pnpm check-novidades --source ecovilla` reconhece a fonte
- [ ] Pelo menos 5 eventos reais capturados em validação manual
- [ ] `scripts/normalizer/ecovilla.ts` documentado com mapeamento de campos

---

### US-O8 — Interface de gerenciamento do pipeline

**Persona + cenário:** Rafael quer rodar o pipeline de múltiplas fontes sem precisar de terminal — selecionar a fonte, ver candidatos, aprovar e disparar a importação.

**Hipótese:** Uma interface visual integrada ao fluxo de trabalho (Studio ou admin page) reduz o atrito operacional de escalar de 2 para 4+ fontes, tornando o pipeline sustentável sem conhecimento técnico de CLI.

**Assumptions explícitas:**
- O formato (Studio plugin vs admin page Next.js) é uma decisão de arquitetura — precisa de discussão antes de estimar SP.
- Esta story é pré-requisito para a integração recorrente de US-S2 e US-S3.

**AC rascunho:** a definir após decisão de formato. Referência mínima:
- [ ] Seleção de fonte (Clubinho / Sympla / Uhuu / Eventim)
- [ ] Execução de `check-novidades` com output legível
- [ ] Visualização de candidatos novos antes de disparar `pipeline-ia`
- [ ] Disparo do `pipeline-ia` com confirmação

---

## 5. Parking lot

| Item | Hipótese | Motivo para não virar story |
|---|---|---|
| **Ingresso.com (teatro)** | O Ingresso.com tem conteúdo de teatro infantil que poderia complementar Uhuu e Eventim. | Decisão de produto: cinema está fora de escopo do Onde Brincar. Teatro do Ingresso.com é válido, mas o perfil de eventos é menos relevante que Uhuu e Eventim — volume menor e menor destaque editorial. Prioridade baixa; só entra após US-S2 e US-S3 consolidadas. |
| **Fever** | Experiências imersivas premium (ex: Mundo Pixar) poderiam ser capturadas automaticamente. | Volume muito baixo no Rio — eventos aparecem 1–2 vezes por ano. Custo de implementação não justifica a frequência. Monitorar manualmente por ora. |
| **Raindrop como fonte de links avulsos** | Salvar links avulsos (Fever, fontes de baixo volume, descobertas ad hoc) na coleção "Onde Brincar" do Raindrop e processá-los via pipeline. A API REST do Raindrop entrega título, URL, domínio, tags e nota sem etapa manual. Com o tempo, domínios recorrentes na coleção viram candidatos a scraper dedicado. | Evidência rasa — coleção não foi inspecionada nessa sessão. Raindrop não estava conectado. Abre discovery dedicado com a coleção visível antes de escrever qualquer AC. |

---

## 6. Decisões tomadas

**Sequenciamento das novas fontes:** US-S2 e US-S3 são pré-requisito hard de US-O8 (Orquestrador + Painel, já previstos no roadmap em Sprint 9 e 10). Alinhado com a intenção já expressa no codebase pelo `normalizer/whatsapp.ts` (ver D3).

**Ingresso.com — teatro sim, cinema não:** O Ingresso.com tem conteúdo de teatro infantil válido para o produto, mas de menor relevância editorial que Uhuu e Eventim — entra no parking lot e só é avaliado após US-S2 e US-S3 consolidadas. Cinema não entra no Onde Brincar — escopo encerrado, não reabrir.

---

## 7. Perguntas em aberto

1. ~~Formato da interface de pipeline~~ — **Resolvido.** Já está no roadmap: Sprint 9 (Orquestrador do pipeline de ingestão, 5 SP, épico Operações) + Sprint 10 (Painel de captação de scrapers, 5 SP, épico Interface).

2. ~~Cinema como vertical~~ — **Resolvido.** Cinema fora de escopo do Onde Brincar. Definitivo.

3. **Uhuu tem anti-scraping relevante?** Não investigado nessa sessão. Incluído como AC em US-S2 — a investigação técnica é parte do escopo da story.

4. **Eventim tem proteção anti-bot mais robusta?** Idem. Incluído como AC em US-S3.

5. ~~US-O8 é pré-requisito hard ou soft~~ — **Resolvido.** Pré-requisito hard. Sequenciamento já previsto no roadmap: Orquestrador (Sprint 9) + Painel (Sprint 10) antecedem as novas fontes.

---

## 8. Recomendações para o próximo Kickoff

- **Decisão obrigatória antes de estimar:** Formato de US-O8 (interface de pipeline). Sem isso, US-S2 e US-S3 ficam com dependência indefinida.
- **Investigação técnica rápida (fora de sprint):** Checar estrutura do site Uhuu e Eventim antes do kickoff — 1h cada, não precisa ser story formal.
- **Ordem sugerida de entrada no board:** US-O8 primeiro (ou em paralelo com investigação técnica das fontes), depois US-S2, depois US-S3.
- **Cinema (Ingresso.com):** Decidir em/antes do kickoff se entra como vertical — influencia o roadmap do 2º semestre.
- **Pré-requisito a verificar:** Confirmar que `pnpm scrape` (Clubinho) continua funcionando — a API do Clubinho pode mudar sem aviso. Última execução registrada não está datada no codebase.

---

*Fim do documento de discovery.*
