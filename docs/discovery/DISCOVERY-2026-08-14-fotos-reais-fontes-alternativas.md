# DISCOVERY — Fotos Reais: Fontes Alternativas (Sympla vs. Press Release)

**Data:** 2026-08-14
**Área investigada:** Qualidade de imagem nas fichas (mesma dor do DISCOVERY-2026-08-03, ângulo novo de fonte)
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** DISCOVERY-2026-08-03-canal-releases-produtoras.md (Sprint Close mais recente: Sprint 16 fechada em 13/08, Sprint 17 aguardando Kickoff — ver `Handoffs/Handoffs de Sprint/Handoff-Sprint-17.md`)

---

## 1. Contexto

Rafa trouxe um sinal novo (2 amigos comentando em conversas de WhatsApp que preferiam ver fotos reais em vez de imagem gerada por IA — "achavam que ficava com cara de tudo igual") e duas hipóteses de fonte alternativa pra resolver isso: (a) usar como "imagem oficial" a própria imagem que aparece no canal de venda (Sympla), e (b) captar releases com foto oficial direto das produtoras/companhias de teatro.

**Achado importante logo na abertura da sessão:** a hipótese (b) não é nova — já tem trabalho substancial em andamento. `US-O27` (e-mail dedicado) e `US-O28` (outreach com produtoras mapeadas) foram concluídas na Sprint 16, com 5 e-mails reais já enviados em 13/08 (Opus, Ecovilla, Bromélia, Gabriel e Shirley, Bolofofos). Além disso, `US-E23` (spike, Sprint 16) já produziu um ADR aceito (`docs/decisions/2026-08-13-us-e23-spike-fluxo-publicacao-email.md`) desenhando a leitura automática das respostas via Gmail API, e a story de implementação (`US-E24`) já está Ready pra Sprint 17. Isso muda o enquadramento: pra hipótese (b), a sessão de hoje não é descoberta, é confirmação de que o caminho já está andando.

A hipótese (a) — Sympla como fonte de imagem — é genuinamente nova. Não há discovery, ADR ou story anterior sobre isso, e confirmei no código (`scripts/scraper/sympla-scrape.ts`, `scripts/scraper/types.ts`) que o scraper **não captura nenhuma URL de imagem hoje** — o campo nem existe no tipo `LinhaEnriquecida` usado pelo enriquecimento.

---

## 2. Método

- 1 sinal trazido pelo Rafa nesta sessão: comentário de pelo menos 2 amigos em conversas de WhatsApp, relato anedótico sem volume/frequência medida. Ao perguntar se o comentário era sobre atrações específicas (ex: teatro com IP protegido) ou mais genérico, Rafa confirmou: **genérico** — "preferiam ver imagens completas, reais" porque a versão atual "ficava com cara de tudo igual". Não é sobre um caso específico de IP, é sobre a sensação de repetição visual do fallback gerado por IA.
- Busca no repo por trabalho e decisões prévias relacionadas: 3 ADRs de imagem (`2026-05-21-i2-5-foto-opcional.md`, `2026-05-26-s4-8a-image-gen.md`, `2026-05-19-s4-2-associate-imagens.md`, `2026-08-13-us-e23-spike-fluxo-publicacao-email.md`), 1 discovery anterior direto (`DISCOVERY-2026-08-03-canal-releases-produtoras.md`), 1 KIT de usabilidade com achado relacionado já confirmado em 2/2 sessões (`KIT-US-I31-roteiro-usabilidade.md`, seção 11).
- Inspeção de código: `scripts/scraper/sympla-scrape.ts`, `scripts/scraper/sympla-enrich.ts`, `scripts/scraper/types.ts` (confirma ausência de captura de imagem), `scripts/fill-missing-images/index.ts` (confirma como o fallback de IA funciona hoje).
- Consulta ao Sprint Board (SQL, sem filtro de sprint) pra confirmar últimos IDs livres nos épicos S, O e I, e ao Discovery Board pra checar duplicidade — nenhuma story ou card existente sobre "Sympla como fonte de imagem" foi encontrado.
- Nenhuma investigação técnica ao vivo foi feita na página real do Sympla (ex: não confirmamos se existe `og:image` ou elemento equivalente) — é suposição técnica razoável (padrão comum em páginas de evento), não fato verificado.

---

## 3. Diagnóstico

### Grupo 1 — Sinal de "imagem genérica" se repete, agora fora do produto, mas continua raso

**Descrição:** O achado de 2/2 sessões de usabilidade da US-I31 (Luan e Dayana, jul-ago/2026) — foto ausente/genérica quebra confiança e decisão — agora tem reforço de uma fonte totalmente diferente: 2 amigos do Rafa, fora de qualquer sessão observada, comentando espontaneamente em conversa de WhatsApp que a imagem "fica com cara de tudo igual". A queixa é sobre repetição visual do fallback gerado por IA (prompt parametrizado por categoria, sem variação real por local — ver ADR `2026-05-26-s4-8a-image-gen.md`), não especificamente sobre um caso de IP protegido.

**Causa raiz:** A mesma já documentada no KIT-US-I31 seção 11 — `foto` é campo opcional desde maio (US-I2.5), com fallback pra imagem gerada por Gemini usando templates de cena por categoria. Poucos templates por categoria tende a gerar composições parecidas entre atrações diferentes da mesma categoria.

**Impacto:** Médio-Alto — mesma leitura do discovery de 03/08, mas agora com um 3º e 4º ponto de sinal (os 2 amigos), todos anedóticos. **Ainda não sabemos o volume real**: quantas fichas ativas hoje têm imagem gerada por IA vs. foto real associada, e se isso de fato afeta conversão (clique em "Ver ingresso") — essa lacuna já estava registrada em 03/08 e continua aberta.

**Esforço:** Depende do caminho escolhido — ver Grupo 2.

**Prioridade recomendada:** P1 pra investigar caminhos de baixo esforço; a evidência é qualitativa e repetida (4 relatos independentes agora), mas nenhum é medição — não tratar como urgência quantificada.

---

### Grupo 2 — Dois caminhos concorrentes para foto real, com maturidade e risco muito diferentes

**Descrição:** Existem hoje dois caminhos possíveis pra substituir a imagem gerada por IA por algo real:

| | Caminho A — Sympla como fonte | Caminho B — Outreach/e-mail com organizador |
|---|---|---|
| Maturidade | Não iniciado — ideia nova de hoje | Avançado — US-O27/O28 concluídas, US-E23 ADR aceito, US-E24 Ready Sprint 17 |
| Esforço técnico | Provavelmente baixo (extensão do scraper já existente) — **não confirmado**, precisa de spike | Já dimensionado — skill própria no padrão Raindrop, ~3 SP + setup manual de Service Account |
| Direito de uso | **Incerto.** A imagem no Sympla foi enviada pelo organizador pra fins de venda de ingresso na própria Sympla — reusá-la num site terceiro (Onde Brincar) sem contato prévio é uma postura diferente do que o produto já decidiu fazer no Caminho B | Explícito por desenho — o e-mail de outreach já foi pensado pra pedir permissão de uso, exatamente por causa dessa preocupação (ver ADR US-E23, contexto) |
| Cobertura | Potencialmente mais ampla — não depende de resposta humana, cobre qualquer evento com página no Sympla/Clubinho | Depende de resposta do organizador — cobertura real ainda desconhecida (só 5 contatados até agora) |

**Causa raiz do gap:** o produto já tomou uma decisão implícita (via ADR do US-E23) de resolver o problema de direito de imagem pedindo permissão explícita — o Caminho A não foi avaliado sob essa mesma lente ainda porque só foi levantado hoje.

**Impacto:** Alto se o Caminho A for tecnicamente viável e o uso for validado como aceitável — resolveria a fatia de fichas com organizador identificável sem depender de resposta humana, muito mais rápido que o Caminho B.

**Esforço:** Baixo-Médio pra um spike técnico de viabilidade; a variável que muda tudo é a resposta de direito de uso, que não é uma pergunta técnica.

**Prioridade recomendada:** P1 pra levar a pergunta de direito de uso ao Rafa antes de comprometer qualquer esforço de engenharia — sem isso, um spike técnico corre o risco de validar algo que não pode ser publicado em produção.

---

### Grupo 3 — Mitigação de baixo esforço já identificada, nunca formalizada como story

**Descrição:** O próprio KIT-US-I31 (seção 11) já tinha separado o problema em duas camadas: "imagem sem informação real do lugar" (o que Grupo 1 descreve) e "nenhum rótulo avisando que a imagem é ilustrativa" (achado técnico: zero ocorrências de um aviso desse tipo no produto hoje). Essa segunda camada resolve a sensação de "pode ser fictício" (comentário literal do Luan) sem depender de nenhuma fonte de imagem nova — é a mitigação mais rápida disponível, mas nunca virou card no Sprint Board nem no Discovery Board (confirmado por busca no board hoje).

**Causa raiz:** Registrado no KIT como "mitigação em andamento" via Caminho B, então ficou sem card próprio — mas resolve uma fatia do problema (confiança/autenticidade) que o Caminho B sozinho não cobre pra fichas sem resposta do organizador.

**Impacto:** Médio — não resolve a "sensação de tudo igual" (Grupo 1), resolve a desconfiança de "isso é real?".

**Esforço:** Baixo — é UI/copy, não pipeline; a única incógnita é como sinalizar no schema/frontend que uma imagem específica foi gerada por IA (hoje não existe esse flag).

**Prioridade recomendada:** P1 — menor esforço de todo o diagnóstico, não bloqueado por nenhuma decisão de direito de uso.

---

## 4. Verificação — contradição com ADR existente

Nenhum ADR em `docs/decisions/` proíbe ou contradiz diretamente o Caminho A (Sympla como fonte de imagem). Não há bloqueio formal a apontar. Existe, no entanto, uma tensão real com a *lógica* por trás do ADR do US-E23 (pedir permissão explícita antes de publicar imagem de organizador) — registrada no Grupo 2 acima como pergunta em aberto, não como contradição que exija parar a sessão.

---

## 5. Histórias rascunhadas

IDs verificados no Sprint Board via SQL (sem filtro de sprint) em 14/08/2026 — últimos usados: Épico S → US-S81, Épico I → US-I36. `US-I38` segue sequencial ao `US-I37` já rascunhado nesta mesma sessão (não houve nova consulta ao board entre os dois — checar de novo no Refinamento antes de criar no Notion). Nenhuma duplicidade encontrada no Discovery Board.

> **Nota de método (adicionada após o rascunho inicial):** o Rafa propôs, depois de ver o diagnóstico, validar a hipótese com um protótipo antes de comprometer esforço de pipeline em qualquer um dos dois caminhos (US-S82 ou outreach). Isso virou a US-I38 abaixo — e muda a ordem recomendada na seção 9: validar primeiro, construir depois.

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I38 | Protótipo com fotos reais/oficiais testado em sessão de usabilidade | I — Interface | a definir | Ver abaixo | a definir |
| US-S82 | Spike: viabilidade de capturar imagem oficial no scraper Sympla/Clubinho | S — Scraper | a definir | Ver abaixo | a definir |
| US-I37 | Rotular imagem gerada por IA como "ilustrativa" no fallback do pipeline | I — Interface | a definir | Ver abaixo | a definir |

---

### US-I38 — Protótipo com fotos reais/oficiais testado em sessão de usabilidade

**Persona + cenário:** Rafael quer saber, antes de investir esforço de engenharia em qualquer um dos dois caminhos de captação (US-S82 ou a automação de outreach já em andamento), se trocar a imagem gerada por IA por foto real/oficial de fato muda o comportamento do usuário — não só a preferência declarada (o que os 2 amigos comentaram no WhatsApp é relato, não comportamento observado).

**Hipótese:** Um protótipo com uma amostra pequena de fichas (cobrindo pelo menos 1 categoria com IP protegido e 1 sem) usando fotos reais/oficiais coletadas manualmente — fora do pipeline automatizado — produz reação e comportamento observavelmente diferentes em sessão de usabilidade, comparado ao fallback de IA atual. Se a diferença não aparecer, isso muda a prioridade dos outros dois caminhos.

**Assumptions explícitas:**
- Fotos do protótipo são coletadas manualmente pelo Rafa (download avulso, uso restrito a teste fechado/não-publicado) — não passa pelo pipeline de produção nem resolve a questão de direito de uso em escala (US-S82, pergunta 1). Precisa confirmar que usar essas fotos num teste fechado e não-publicado é uma exposição de risco aceitável, mesmo sendo diferente de publicar em produção.
- Reaproveita o roteiro e a logística já validados na US-I31 (2-3 participantes, tarefa aberta, observação em vídeo, sem apontar o que está sendo testado).
- Não decide entre US-S82 (Sympla) e o caminho de outreach — só valida se a hipótese central ("foto real muda decisão/confiança") se sustenta o suficiente pra justificar investir em qualquer um dos dois em maior escala.

**AC rascunho:**
- [ ] Protótipo com pelo menos N fichas com foto real/oficial associada manualmente (staging ou fichas reais no Sanity, a decidir)
- [ ] Roteiro de sessão compara reação/comportamento entre fichas com foto real e fichas com fallback de IA (mesmo participante ou grupos distintos, a decidir no Refinamento)
- [ ] Pelo menos 2 sessões conduzidas, mesmo padrão de condução da US-I31 (silêncio, sondas neutras, sem apontar o que está sendo testado)
- [ ] Síntese explícita: a hipótese se sustenta com base em comportamento observado (não em resposta a pergunta direta tipo "você prefere foto real?")

---

### US-S82 — Spike: viabilidade de capturar imagem oficial no scraper Sympla/Clubinho

**Persona + cenário:** Rafael, curador do Onde Brincar, quer saber se dá pra extrair a imagem oficial do evento diretamente da página do Sympla/Clubinho durante o scraping que já roda hoje, sem depender de outreach manual nem de resposta de organizador.

**Hipótese:** As páginas de evento do Sympla e do Clubinho expõem uma imagem "oficial" (banner/capa — provavelmente via meta tag `og:image` ou elemento equivalente do DOM) que pode ser capturada no mesmo scrape já existente, sem infraestrutura nova.

**Assumptions explícitas:**
- Não confirmado se a imagem capturada teria resolução/qualidade suficiente pro padrão já usado no pipeline (`associate-imagens` espera resize 1200×800 via `sharp`).
- Este spike **não decide** a questão de direito de uso (Grupo 2) — só avalia viabilidade técnica. Publicar em produção fica bloqueado até essa decisão existir.
- `LinhaEnriquecida` (tipo usado pelo scraper) não tem campo de imagem hoje — qualquer captura exige extensão de schema interno, não só do schema Sanity.

**AC rascunho:**
- [ ] Confirmar se existe imagem oficial identificável (og:image ou equivalente) nas páginas de evento do Sympla e do Clubinho, com amostra de pelo menos N fichas reais
- [ ] Avaliar resolução/qualidade da imagem capturada vs. requisito do pipeline atual
- [ ] Documentar recomendação: captura viável no scrape atual, ou exige carregamento de página adicional (custo de tempo/infra)?
- [ ] Relatório do spike aponta explicitamente que a decisão de direito de uso é pré-requisito pra qualquer `--execute` em produção — não assumir permissão implícita

---

### US-I37 — Rotular imagem gerada por IA como "ilustrativa" no fallback do pipeline

**Persona + cenário:** Um usuário (like Luan, participante da US-I31, ou os 2 amigos do Rafa) vê uma ficha com imagem gerada por IA e não tem como saber se é uma foto real do local — isso já gerou desconfiança registrada explicitamente ("achei que podia ser fictício").

**Hipótese:** Um rótulo visual simples ("Imagem ilustrativa") na ficha, exibido só quando a imagem vem do fallback de geração por IA, resolve a desconfiança de autenticidade sem depender de nenhuma fonte de imagem nova — funciona mesmo antes de qualquer resultado dos Caminhos A ou B.

**Assumptions explícitas:**
- Não resolve a sensação de "tudo igual" (Grupo 1) — ataca só a camada de confiança/autenticidade, é complementar aos Caminhos A/B, não substituto.
- Hoje não existe um flag no schema/report indicando se uma imagem específica foi gerada por IA — precisa definir se isso vira campo novo ou é inferido de outra forma.

**AC rascunho:**
- [ ] Definir critério técnico pra identificar se uma foto é gerada por IA (campo novo no schema, ou inferência a partir de dado já existente no report de import)
- [ ] Rótulo "Imagem ilustrativa" visível na ficha quando a imagem for gerada por IA
- [ ] Rótulo não aparece quando a imagem for real (associada via `associate-imagens`, recebida por outreach, ou futura captura via Caminho A)
- [ ] Validação visual em pelo menos 1 ficha real antes de publicar

---

## 6. Parking lot

| Item | Hipótese | Motivo para não virar story agora |
|---|---|---|
| Captação direta (fotografia própria) para espaços sem organizador identificável (praças, parques — caso Dayana, US-I31) | Fotografar pessoalmente esses espaços resolveria o bucket de imagem real que nenhum dos dois caminhos de hoje cobre (nem Sympla, nem outreach, porque não há organizador/evento) | Não foi o sinal trazido nesta sessão; exige esforço de campo (visitar/fotografar), fora do escopo de pipeline técnico — já registrado como bucket separado no KIT-US-I31 seção 11 |
| Definir política de uso de imagem do Sympla | Se o Rafa decidir que reusar a imagem do Sympla é aceitável (com ou sem aviso ao organizador), isso desbloqueia o US-S82 pra produção | Não é uma hipótese testável — é uma decisão de produto/risco que só o Rafa pode tomar; ver seção 7 |
| Ampliar outreach pros ~25 espetáculos sem produtora mapeada (achado da US-O28) | Mais outreach = mais cobertura do Caminho B | Já registrado como débito no `Handoff-Sprint-17.md`, não é sinal novo desta sessão |

---

## 7. Decisões tomadas

Nenhuma decisão de produto ou arquitetura foi tomada nesta sessão — escopo padrão de Discovery mantido (sem atribuição de sprint, sem commit de escopo). Nenhuma ADR existente foi contradita a ponto de exigir pausa (ver seção 4).

---

## 8. Perguntas em aberto

1. **Direito de uso da imagem do Sympla:** é aceitável reusar, no Onde Brincar, uma imagem hospedada no Sympla (enviada pelo organizador pra fins de venda de ingresso na própria plataforma deles)? Precisa de aviso ao organizador, ou o Rafa está confortável em tratar como uso justo por ser citação/divulgação sem fins de venda direta da imagem? Bloqueia qualquer `--execute` do US-S82.
2. **Volume real:** quantas fichas ativas hoje têm imagem gerada por IA vs. foto real (via `associate-imagens` ou upload manual)? Sem esse número, "imagem genérica" continua sendo um problema sentido, não medido — mesma lacuna do discovery de 03/08.
3. **Prioridade relativa entre US-S82 e US-I37:** o rótulo (US-I37) é mais barato e resolve uma fatia real do problema (confiança) — faz sentido entrar antes do spike técnico (US-S82), que ainda tem uma variável de risco (direito de uso) não resolvida?
4. **Sobreposição com US-E24:** quando US-E24 (leitura automática de e-mail) entrar em produção, ela cobre a fatia "organizador respondeu com foto". O US-S82, se viável, cobre uma fatia diferente e mais ampla (qualquer evento com página no Sympla/Clubinho, sem esperar resposta). Vale tratar como complementares desde já, ou faz sentido validar um antes do outro?

---

## 9. Recomendações para o próximo Kickoff (Sprint 17)

**Já resolvido/contextualizado nesta sessão:**
- O Caminho B (outreach/e-mail) não precisa de nova rodada de Discovery — já está avançado (US-O27/O28 concluídas, US-E24 Ready).

**Antes de estimar no Kickoff/Refinamento:**
- Levar a pergunta 1 (direito de uso do Sympla) ao Rafa explicitamente — a resposta muda se o US-S82 vale a pena entrar em sprint agora ou fica represado até essa decisão.
- Estimar SP de US-I38, US-S82 e US-I37 — nenhuma das três tem SP ainda.
- Ordem sugerida pela própria lógica do diagnóstico (validar antes de construir): **US-I38 primeiro** (barato, testa a hipótese central com comportamento real, não depende de resolver direito de uso em escala) → resultado dela informa se vale a pena priorizar US-S82 (mais caro, mais rápido de escalar, risco de direito de uso) e/ou US-I37 (mais barato, resolve só a camada de confiança, não depende de nenhuma fonte nova).

**Não entra neste Kickoff:**
- Captação fotográfica direta de espaços sem organizador (parking lot — sem sinal novo, esforço de campo)
- Ampliação do outreach pros ~25 espetáculos sem produtora mapeada (já é débito rastreado, não nasceu aqui)

---

*Fim do documento de discovery.*
