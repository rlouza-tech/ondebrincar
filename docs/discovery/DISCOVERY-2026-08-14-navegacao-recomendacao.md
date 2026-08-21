# DISCOVERY — Navegação e Recomendação: por que "fichas por usuário" estagnou

**Data:** 2026-08-14
**Área investigada:** Engajamento com navegação (anel de recomendação, US-I33) e a métrica fichas abertas por usuário
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-I33.md` (mesma sessão que lançou o anel), `Handoffs/Handoffs de Sprint/Handoff-Sprint-17.md` (Sprint 16 fechada em 13/08, Sprint 17 aguardando Kickoff)

---

## 1. Contexto

A dor trazida pelo Rafa: o objetivo principal hoje é aumentar fichas abertas por usuário. O anel de recomendação ("Continue o programa", US-I33) foi lançado com essa meta em mente, mas ainda não tinha resultado visivelmente bom. Duas dúvidas concretas abriram a sessão: (1) o evento de clique no anel (`recommendation_click`) estava mesmo chegando no GA4 — o Rafa suspeitava que não; (2) se não tiver esse dado, olhar padrão de uso pelo crédito/conversão como proxy.

## 2. Método

- Fonte de sinal: Métricas (GA4), confirmado pelo Rafa como prioridade, com pedido explícito de puxar dado ao vivo em vez de confiar em relatório desatualizado.
- Extração ao vivo na Exploração do GA4 (propriedade "Onde Brincar - Producao"), incluindo criação de uma aba de Formato Livre nova pra consultas ad-hoc desta sessão.
- Investigação da cadeia GTM → GA4 pra checar por que `recommendation_click` não aparecia: achado de que o trigger único que controla quais eventos do `dataLayer` chegam ao GA4 (`Trigger - 5 Eventos NSM`, regex fixa) não incluía os nomes dos eventos novos do anel — corrigido pelo próprio Rafa em 07/08/2026 (GTM-TN6KCV25 v5), antes desta sessão.
- Leitura de `lib/analytics.ts` e `components/RecommendationRing.tsx` no Cursor, confirmando que o evento é disparado corretamente no código (`trackEvent("recommendation_click", {...})`) — o gap era só de configuração no GTM, não de instrumentação.
- Consulta ao artefato "Relatório Principal" (dado de até 1 dia atrás) como contexto de fundo, sem re-executar nesta sessão.
- Cálculo manual, a pedido do Rafa, de fichas/usuário excluindo tráfego de teste identificado (ver Grupo 3), usando a tabela bruta Mês × Origem já extraída.
- Checagem de ADRs em `docs/decisions/`: nenhuma contradiz as hipóteses abaixo. A ADR de 25/06 (`ga4-view-source-param`) é relevante como contexto técnico — documenta que parte da configuração de analytics (dimensões customizadas, mapeamentos GTM) vive fora do repositório e não se atualiza sozinha, o que ajuda a explicar por que o gap do Grupo 1 passou despercebido por um tempo.

---

## 3. Diagnóstico

### Grupo 1 — CTR do anel de recomendação pós-correção: sinal real, mas raso demais pra julgar

**Descrição:** Depois da correção do trigger no GTM (07/08), o anel está de fato registrando cliques: 6 `recommendation_click` em 1.052 `attraction_view` ao longo de 7 dias válidos de dados ≈ 0,57% de CTR. A contramétrica (`buy_ticket_click`) está saudável — 20 eventos, nenhum dia zerado — o que descarta a hipótese de que o pipeline de tracking está quebrado em outro ponto.

**Causa raiz:** Não é falta de instrumentação (resolvida) nem pipeline quebrado (contramétrica saudável). Se o CTR baixo é desinteresse real do usuário pela recomendação ou só efeito de amostra pequena — não dá pra saber ainda.

**Impacto:** Indeterminado — a evidência é rasa (8 dias corridos desde a correção, volume de sessão do site é baixo). Tratar 0,57% como "o anel não funciona" agora seria convicção forte demais em cima de sinal fraco.

**Esforço:** N/A (não é decisão de esforço, é decisão de tempo de espera).

**Prioridade recomendada:** Aguardar — já decidido nesta sessão (ver seção 7).

---

### Grupo 2 — A queda de fichas/usuário é anterior ao lançamento do anel

**Descrição:** A baseline original do Handoff US-I33 (segmento Planejadores) mostra: Junho ≈9,6 → Julho ≈5,8 → Agosto-parcial (6 dias) ≈4,9 fichas/usuário. O anel foi ao ar em 06/08 — a queda de junho pra julho já estava em curso um mês inteiro antes de existir. O anel não pode ser responsabilizado pela queda; ele é, na melhor das hipóteses, uma tentativa de reverter uma tendência que já vinha de antes.

**Causa raiz:** Não identificada ainda. Testamos a hipótese de diluição por canal (mix de origem de tráfego mudando mês a mês) e ficou inconclusiva (ver seção 8).

**Impacto:** Alto — é a métrica que o Rafa definiu como dor principal da sessão.

**Esforço:** N/A (diagnóstico, não story ainda — falta causa raiz confirmada pra virar hipótese testável).

**Prioridade recomendada:** P1 — mas ainda não tem hipótese testável o suficiente pra virar story hoje (ver parking lot).

---

### Grupo 3 — Contaminação de dados por tráfego de teste/debug infla os números usados em dois lugares

**Descrição:** Ao investigar a queda, apareceu tráfego de origem `tagassistant.google.com` (ferramenta de debug do próprio GTM), `vercel.com` e `github.com` misturado nos dados de evento — por exemplo, 404 eventos / 1 usuário em agosto e 48/1 em julho vindos só do `tagassistant.google.com`. Esse tráfego não é usuário real navegando o site: é debug/preview inflando contagens.

**Causa raiz:** Nenhum filtro de tráfego interno/teste configurado na propriedade GA4 (ou no GTM) pra excluir essas origens.

**Impacto:** Médio-Alto — infla tanto o Relatório Principal quanto a baseline da US-I33, o que significa que decisões já tomadas em cima desses números (inclusive a leitura de "queda" do Grupo 2) podem estar levemente distorcidas.

**Esforço:** Baixo — é configuração (filtro de tráfego interno no GA4, ou trigger de exclusão no GTM), não mudança de código de produto.

**Prioridade recomendada:** P1 — baixo esforço, destrava leitura confiável de todas as métricas futuras.

---

### Grupo 4 — Janela de retenção do GA4 (free tier) quebra comparações "antes/depois"

**Descrição:** A data mínima disponível nas Explorações do GA4 avança sozinha com o tempo (limite do plano gratuito). Isso já está anotado no rodapé do artefato Relatório Principal como problema recorrente. Na prática, isso significa que a extração de hoje não necessariamente cobre a mesma janela de datas que a baseline original da US-I33 — o que complica qualquer "antes vs. depois" feito em sessões diferentes.

**Causa raiz:** Limitação de plano (GA4 free tier), não um bug do produto.

**Impacto:** Médio — não é um problema de produto, é um problema de processo de medição que já causou pelo menos uma comparação não estritamente equivalente nesta própria sessão (ver Grupo 5).

**Esforço:** Baixo — mitigável com uma tabela de baseline mensal congelada fora do GA4 vivo, não dentro dele.

**Prioridade recomendada:** P1 — mesmo raciocínio do Grupo 3, baixo esforço.

---

### Grupo 5 — Recalculando fichas/usuário sem tráfego de teste: direção parece mais estável do que a baseline suja sugeria

**Descrição:** A pedido do Rafa, recalculei fichas/usuário excluindo `tagassistant.google.com`, `vercel.com` e `github.com` da tabela bruta Mês × Origem já extraída nesta sessão:

| Período | Fichas/usuário (excl. tráfego de teste) |
|---|---|
| Junho (parcial, 14–30/06) | ≈ 8,93 |
| Julho (mês completo) | ≈ 5,46 |
| Agosto (parcial, 01–13/08) | ≈ 5,88 |

A leitura Jul→Ago fica **estável/levemente em alta** (5,46 → 5,88), não em queda como a impressão inicial (baseline suja mostrava 5,8 → 4,9). **Isso não é uma comparação limpa com a baseline original do Handoff US-I33**, por duas razões que precisam ficar explícitas: (a) segmento diferente — a baseline original usa o segmento "Planejadores" (≥1 evento de intenção), este recálculo usa todos os usuários, sem segmentar; (b) janela diferente — o dado de junho aqui é truncado (só 14–30/06, por causa da janela de retenção do Grupo 4), enquanto a baseline original tinha o mês inteiro.

**Causa raiz:** N/A — é recálculo, não diagnóstico de causa.

**Impacto:** Não sabemos ainda se a direção real é queda ou estabilidade — o dado limpo aponta pra uma leitura mais otimista que a suja, mas não é apples-to-apples o suficiente pra substituir a baseline oficial.

**Esforço:** N/A.

**Prioridade recomendada:** P1 — refazer essa comparação de forma limpa (mesmo segmento, mesma janela) é pré-requisito antes de tirar qualquer conclusão definitiva sobre a direção da métrica.

---

## 4. Verificação — contradição com ADR existente

Nenhuma ADR em `docs/decisions/` bloqueia ou contradiz as hipóteses acima. A ADR `2026-06-25-ga4-view-source-param.md` é relevante como pano de fundo técnico (parte da configuração de analytics vive fora do repo, no painel do GA4/GTM, e não se atualiza sozinha) — reforça por que filtros de tráfego interno (Grupo 3) também vão precisar de ação manual no painel, não só código.

---

## 5. Histórias rascunhadas

**Nota sobre Story ID:** o Sprint Board do Notion confirma `US-I36` como o maior ID do Épico I hoje (consultado ao vivo nesta sessão). Porém identifiquei que uma outra sessão de Discovery rodada **hoje mesmo** (`DISCOVERY-2026-08-14-fotos-reais-fontes-alternativas.md`) já rascunhou `US-I37` e `US-I38` pra duas stories de um tema totalmente diferente (fotos reais). Como nenhuma das duas sessões promoveu essas IDs pro Notion ainda, checar só o Sprint Board não pega essa colisão — é exatamente o risco de "sessões paralelas sem visão compartilhada" que o próprio Handoff-Sprint-17 registrou como risco pré-mortem da Sprint 16. Pra não colidir, pulei pra `US-I39` e `US-I40` aqui. Isso precisa ser reconfirmado no Refinamento de qualquer uma das duas sessões, o que rodar primeiro.

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I39 | Excluir tráfego de teste/debug (tagassistant, vercel, github) das métricas GA4 | I — Interface | a definir | Ver abaixo | a definir |
| US-I40 | Congelar tabela de baseline mensal fixa fora da janela viva do GA4 | I — Interface | a definir | Ver abaixo | a definir |

---

### US-I39 — Excluir tráfego de teste/debug das métricas GA4

**Persona + cenário:** Rafael, ao investigar qualquer métrica de engajamento (fichas/usuário, CTR do anel, etc.), precisa confiar que os números refletem usuário real — hoje uma fatia mensurável dos eventos vem de ferramentas de debug (`tagassistant.google.com`) e de ambientes de deploy/código (`vercel.com`, `github.com`), não de visitantes reais.

**Hipótese:** Configurar um filtro de tráfego interno na propriedade GA4 (ou um trigger de exclusão no GTM) removendo essas origens elimina a distorção sem exigir mudança de código de produto.

**Assumptions explícitas:**
- Não confirmado ainda se a via certa é filtro de "tráfego interno" nativo do GA4 (por hostname/referrer) ou exclusão via GTM — precisa de spike curto de configuração.
- Não retroage dado histórico já coletado — só limpa daqui pra frente; comparações "antes/depois" que cruzam a data da mudança precisam considerar isso.
- Não resolve a comparabilidade de segmento (Planejadores vs. todos os usuários) nem a janela de retenção (Grupo 4) — é complementar ao US-I40, não substituto.

**AC rascunho:**
- [ ] Filtro de tráfego interno configurado excluindo `tagassistant.google.com`, `vercel.com`, `github.com` (e outras origens de debug identificadas na configuração)
- [ ] Validação visual: nova extração da Exploração confirma zero eventos dessas origens após a data de corte
- [ ] Documentar a data de corte no próprio ADR ou no Relatório Principal, pra qualquer comparação futura saber que dado anterior a essa data ainda está contaminado

---

### US-I40 — Congelar tabela de baseline mensal fixa fora da janela viva do GA4

**Persona + cenário:** Rafael precisa comparar métricas "antes vs. depois" de uma mudança de produto (ex: lançamento do anel de recomendação) em sessões separadas no tempo — mas a janela de datas disponível nas Explorações do GA4 free tier avança sozinha, então a mesma consulta feita em momentos diferentes pode não cobrir o mesmo período histórico.

**Hipótese:** Manter uma tabela de baseline mensal (fichas/usuário e outras métricas-chave do NSM) congelada fora do GA4 — atualizada manualmente ou por script uma vez por mês — evita que comparações históricas fiquem reféns da janela de retenção do plano gratuito.

**Assumptions explícitas:**
- Não decide se a tabela vive no Relatório Principal (artefato já existente) ou em arquivo separado — a decidir no Refinamento.
- Não resolve, sozinha, a contaminação de tráfego de teste (Grupo 3/US-I39) — os dois juntos são o que torna a baseline confiável.
- Frequência mensal é um chute inicial baseado no padrão já usado no Handoff US-I33; pode mudar no Refinamento.

**AC rascunho:**
- [ ] Definir onde a tabela de baseline mensal vive (Relatório Principal existente vs. arquivo novo)
- [ ] Primeira versão populada com os meses já coletados nesta sessão (Jun/Jul/Ago-parcial), com nota explícita de que Junho está truncado
- [ ] Processo definido pra atualização mensal (manual com checklist, ou automatizado)
- [ ] Métricas cobertas: no mínimo fichas/usuário; considerar CTR do anel e `buy_ticket_click` como contramétrica

---

## 6. Parking lot

| Item | Hipótese | Motivo para não virar story agora |
|---|---|---|
| CTR do anel de recomendação (0,57%, 8 dias) | Talvez o anel realmente não engaje, ou é só amostra pequena — não dá pra saber ainda | Decisão já tomada nesta sessão: registrar como sinal fraco e reabrir em 03/09 (4+ semanas desde a correção do tracking), conforme o próprio Handoff US-I33 já recomendava |
| Diluição por canal (mix de origem de tráfego mudando mês a mês, incluindo um outlier grande de "(direct)" em junho) | Se o mix de canal mudou, isso poderia explicar parte da queda de fichas/usuário sem precisar de causa de produto | Investigação ficou inconclusiva nesta sessão — bloqueada por (a) janelas de data não comparáveis entre a baseline original e a extração de hoje (Grupo 4), e (b) legitimidade incerta do outlier "(direct)" de junho (1.835 eventos/104 usuários) não verificada |
| Causa raiz real da queda de fichas/usuário pré-anel (jun→jul, antes de qualquer contaminação de teste) | Ainda não temos hipótese testável — só sabemos que não é o anel e que a leitura muda dependendo de quão limpo o dado está | Falta sinal mais forte antes de virar hipótese testável; é o item mais importante pra investigar na próxima sessão de discovery ou métricas |

---

## 7. Decisões tomadas

- **Aguardar até 03/09/2026** (4+ semanas desde a correção do tracking em 07/08) antes de reavaliar o CTR do anel de recomendação — decisão do Rafa nesta sessão, via as perguntas de esclarecimento.
- **Investigar diluição por canal ao vivo nesta sessão** — feito, mas resultado ficou inconclusivo (parking lot).
- Nenhuma decisão de arquitetura foi tomada. Nenhuma ADR nova sinalizada como necessária — as duas stories (US-I39, US-I40) são configuração/processo, não decisão de arquitetura que precise virar ADR formal por enquanto.

---

## 8. Perguntas em aberto

1. **Causa raiz real da queda de fichas/usuário (jun→jul, antes do anel):** ainda não identificada. É o item mais importante em aberto desta sessão.
2. **Direção real jul→ago depois de limpar o dado de teste:** o recálculo desta sessão (Grupo 5) sugere estabilidade/leve alta, mas não é comparável 1:1 com a baseline original (segmento diferente, janela truncada). Precisa de uma reextração limpa e comparável (mesmo segmento Planejadores, mesma janela completa) antes de virar conclusão.
3. **Legitimidade do outlier "(direct)" de junho:** 1.835 eventos / 104 usuários — é tráfego real ou também contaminação não identificada?
4. **CTR do anel:** aberto até 03/09 por decisão já tomada.

---

## 9. Recomendações para o próximo Kickoff (Sprint 17)

**Preferência do Rafa registrada nesta sessão:** ele pediu explicitamente pra colocar US-I39 e US-I40 na Sprint 17. Discovery não atribui sprint (ver nota de escopo abaixo) — mas isso fica registrado aqui como recomendação forte de prioridade pro Kickoff 17 decidir.

- Priorizar US-I39 e US-I40 pro Sprint 17 — baixo esforço (configuração, não mudança de produto), destrava leitura confiável de qualquer métrica futura, e é pré-requisito pra qualquer decisão de produto em cima de fichas/usuário ou CTR do anel.
- Depois que US-I39 estiver ativo, refazer a extração da baseline US-I33 com o mesmo filtro de tráfego de teste aplicado — a comparação "antes/depois" oficial do anel de recomendação deve usar dado limpo dos dois lados.
- Reabrir avaliação do CTR do anel em 03/09 (ou mais tarde, se o volume de sessão continuar baixo) — já recomendado no Handoff original da US-I33, reforçado aqui.
- Levar a pergunta 3 (legitimidade do "(direct)" de junho) e a causa raiz da queda pré-anel (pergunta 1) como candidatas a uma próxima sessão de Discovery ou de Métricas, não pra estimar ainda — não têm hipótese testável o suficiente.

**Nota de escopo:** por definição desta cerimônia, nenhuma story sai daqui com sprint atribuído — US-I39 e US-I40 estão com `Sprint: a definir` na tabela da seção 5, mesmo com a preferência do Rafa registrada acima. Atribuir sprint de fato é decisão do Kickoff.

---

*Fim do documento de discovery.*
