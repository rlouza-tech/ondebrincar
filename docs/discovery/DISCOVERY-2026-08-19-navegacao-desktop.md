# DISCOVERY — Navegação desktop: destaques/carrossel na home, menu lateral de categorias e Right Rail estilo YouTube

**Data:** 2026-08-19
**Área investigada:** Navegação estrutural no desktop — paralelo à sessão de navegação mobile de 18/08
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** `docs/discovery/DISCOVERY-2026-08-18-navegacao-mobile-app-like.md`, `docs/discovery/DISCOVERY-2026-08-14-navegacao-recomendacao.md`, `docs/discovery/DISCOVERY-2026-07-22-benchmarks-engajamento-navegacao.md`, Discovery Board (Notion): "Melhorar a navegação do site"

---

## 1. Contexto

O Rafa trouxe 4 ideias de mudança na versão desktop do site, vindas de um estudo pessoal de benchmarking (Notion, página "Benchmarking", Pessoal → Dia a dia, editada 18/08, feita durante estudo de PM): (1) destaques da semana, (2) carrossel dinâmico por categoria/novidade/data, (3) menu lateral com categorias principais, (4) Right Rail de recomendações estilo YouTube. Pediu avaliação crítica ("se estou perdendo alguma coisa") e prototipação de cada ideia, no mesmo padrão da sessão de navegação mobile de 18/08.

## 2. Método

- Leitura do handoff mais recente (`Handoff-Sprint-17`, 13/08) pra contexto de sprint em curso.
- Leitura das 3 discoveries anteriores de navegação/recomendação (22/07, 14/08, 18/08) — as 4 ideias do Rafa encostam diretamente nelas.
- Fonte de sinal bruto pedida ao Rafa: inicialmente não localizei arquivo novo no Drive nem no repo; ampliei a busca até achar 2 fontes reais:
  - Nota pessoal **"Benchmarking"** no Notion (Pessoal → Dia a dia), editada 18/08 — de onde vêm as 4 ideias, quase literalmente (seção "Desktop" da nota).
  - Pasta de **sessões de usabilidade da US-I31** no Google Drive (link fornecido pelo Rafa nesta sessão) — continha **2 sessões já conduzidas** (Luan, 23/07, desktop; Dayana, 07/08, mobile), não refletidas como tal no board/handoff (ver achado colateral, seção 3).
- Leitura de código no repo (`Cursor/`): `components/SiteHeader.tsx` (header único — logo + busca, sem nav estrutural, mesmo componente pra qualquer breakpoint), `lib/filter-options.ts` (11 categorias), `components/AtracaoCard.tsx`, `app/home-content.tsx`, `tailwind.config.ts` (tokens reais pós-rebrand — mesmo cuidado que a sessão de 18/08 registrou como achado: `docs/design-tokens.md` está desatualizado, não usar).
- Checagem de ADRs em `docs/decisions/`: nenhuma bloqueia. `2026-05-21-i4-1-filtros-home.md` é complementar — mesma lógica de estado via querystring reaproveitável pelas 4 ideias.
- Consulta ao Discovery Board (Notion): card "Melhorar a navegação do site" já existe, Priorizado, com subseção da sessão de 18/08 — esta sessão é candidata a uma subseção equivalente (não editada nesta sessão, ver seção 9).
- Consulta ao Sprint Board (Notion) pra checar o maior Story ID do Épico I: bloqueada por limite de consulta na primeira tentativa desta sessão; **reconfirmada com sucesso na 4ª rodada de feedback** (a pedido do Rafa — "confirma você"). Maior Story ID real do Épico I no Sprint Board: `US-I42` ("Implementar menu inferior mobile", Sprint 17, Ready). `US-I43`–`US-I48` conferidos como livres (nenhum já existe no Notion) — **seguros de usar sem colisão.**
- Coleta de imagens reais do catálogo publicado (`cdn.sanity.io`) via navegação ao vivo em `ondebrincar.com.br`, pra montar os protótipos com fidelidade visual.
- Segunda e terceira rodadas de feedback do Rafa (depois do protótipo v5 aprovado): levantamento de uso de filtro por dimensão no GA4 (2 métodos: proxy por URL e evento `filter_used`), seguido de sinal qualitativo (2 conversas informais) e mapeamento bairro→zona cruzado ao vivo com o catálogo real do site — 3 rodadas completas registradas no Grupo 2.1 (ver seção Referências).
- **4ª rodada de feedback do Rafa:** protótipo atualizado pra v6 com os carrosséis de zona (ver seção 5), e 8 decisões fechadas de uma vez — divisão de US-I43 em 2 histórias (Destaques vs. Carrossel por zona), fechamento de US-I31, confirmação de Story IDs no Notion, reversão da decisão de esperar 03/09 pro Right Rail, nova história de instrumentação GA4 pro Sprint 18, ajuste do pool da US-I46, e adiamento consciente de 2 itens (dashboard de publicadas, sessão dedicada de admin) — ver Decisões tomadas (seção 7).
- **5ª rodada de feedback do Rafa:** pergunta direta sobre quantos itens aparecem por carrossel — fechado cap fixo de 8 cards por zona, protótipo atualizado pra v7 com dados reais — ver Decisões tomadas (seção 7).
- **6ª rodada de feedback do Rafa:** o Rafa trouxe uma proposta própria de recorte de histórias por sprint (8 itens, Sprint 17 e 18), confirmando via 3 respostas de esclarecimento (AskUserQuestion): carrossel de categoria descartado da V1 (só região), a sessão dedicada de design do admin acontece dentro do próprio Sprint 17 (não é mais adiada pra sessão futura separada), e a história "Ficha com abas" é o par mobile do Right Rail (que é desktop). Consultado o Sprint Board de novo pra confirmar `US-I49`–`US-I52` livres. Resultado: 4 histórias novas (US-I49, US-I50, US-I51, US-I52), reestruturação completa da tabela de histórias com sprints explícitos pra todas, e rebaixamento da US-I48 de "Sprint 18 confirmado" pra "avaliar depois" — ver Decisões tomadas (seção 7) e a resposta à pergunta "Melhor separar as histórias?" no Grupo 2.1.
- **7ª rodada de feedback do Rafa:** setinhas de rolagem adicionadas aos carrosséis (protótipo v8) depois de testar e sentir falta de um affordance clicável — ver Decisões tomadas.
- **8ª rodada de feedback do Rafa:** as 2 últimas perguntas em aberto da seção 8 (formato empilhado vs. abas, ordem de exibição por volume) confirmadas diretamente — "Quero pilhas mesmo" e "Concordo" — ver Decisões tomadas.
- **9ª rodada de feedback do Rafa:** pedido pra garantir que as histórias comentadas estivessem no Notion. Status novo "A refinar" criado no Sprint Board (pergunta de esclarecimento — o board não tinha estado pra "ainda em discovery") e as 10 páginas (US-I43–US-I52) criadas — ver Decisões tomadas e Referências.

---

## 3. Diagnóstico

### Achado colateral (fora do escopo desta sessão) — US-I31 já tem 2 sessões rodadas, não refletidas no board

**Descrição:** O board e o `Handoff-Sprint-17` registram US-I31 como "Bloqueada, aguardando agendamento da 3ª sessão de usabilidade" — como se nenhuma sessão tivesse ocorrido. A pasta do Drive mostra 2 sessões completas e registradas no template (Luan, 23/07, desktop; Dayana, 07/08, mobile). O próprio KIT de roteiro da US-I31 definiu a meta como "sinal direcional com 2-3 participantes" — ou seja, **2 sessões já podem estar dentro da margem que o próprio projeto definiu como suficiente.**

**Causa raiz:** Não é desta sessão — parece falha de sincronização entre execução (sessões rodadas no Drive) e atualização de status no board/Notion.

**Impacto:** Médio — não bloqueia esta sessão, mas gera desperdício (agendar uma 3ª sessão que talvez não seja necessária) e um achado real (a sessão do Luan, desktop) ficou sem uso até esta sessão o resgatar.

**Esforço:** N/A (achado administrativo).

**Prioridade recomendada:** ~~Levar ao Refinamento~~ **Resolvido nesta sessão (rodada 4 de feedback):** o Rafa decidiu fechar com as 2 sessões já rodadas (Luan, Dayana) — dentro da meta original de "2-3 sessões pra sinal direcional". Não precisa de 3ª sessão. Falta só sincronizar o Status no Notion (segue "Bloqueada" hoje, desatualizado — decisão é levar ao Refinamento como ação administrativa, não como pergunta em aberto) e produzir a síntese que os ACs 4-5 da story pedem (`docs/discovery/DISCOVERY-[data]-usabilidade-atritos-compartilhamento.md`, com 1 hipótese acionável por atrito), que ainda não existe.

---

### Grupo 1 — Desktop também não tem nenhuma camada de navegação estrutural além do filtro

**Descrição:** `SiteHeader.tsx` é um componente único (logo + botão de busca) usado em qualquer largura de tela — não existe variante desktop com nav. A sessão de usabilidade do Luan (única em desktop) confirma isso na prática: ele navegou exclusivamente por filtro (bairro → idade → tipo, nessa ordem), não usou nem tentou nenhum outro mecanismo de navegação porque nenhum existe. Ele não chegou a decidir por uma atração ("deu uma olhada geral").

**Causa raiz:** Mesma do Grupo 1 da sessão mobile (18/08) — ausência de affordance de navegação persistente, agora confirmada também no desktop.

**Impacto:** Alto — mesmo eixo já priorizado no board ("Melhorar a navegação do site").

**Esforço:** N/A (diagnóstico).

**Prioridade recomendada:** P1 — mas com uma ressalva importante: **o sinal aqui é mais fraco que o do mobile.** A sessão mobile tinha números (68% de sessão single-page, 82% de scroll até o fim, <2% de uso do filtro, medidos via Clarity/GA4). Aqui tenho 1 sessão de usabilidade e leitura de código — direcional, não estatístico. Não tratar como convicção fechada.

---

### Grupo 2 — "Destaques da semana" e "Carrossel dinâmico" retomam uma aposta já avaliada e nunca implementada

**Descrição:** As duas ideias do Rafa não são novas — são a mesma proposta que já existia como **"Temas na home"** no spike de benchmark de 22/07 (`US-I32`), avaliada como **P2** (atrás do anel de recomendação), nunca virou story. A nota pessoal de Benchmarking do Rafa chegou na mesma ideia de novo, de forma independente, meses depois — duas fontes de estudo diferentes convergindo no mesmo lugar é sinal um pouco mais forte do que "um cheiro só".

**Causa raiz:** N/A — é retomada de aposta já mapeada, não achado novo.

**Impacto:** Alto — ataca o mesmo problema central (baixa navegação além do primeiro scroll) por um ângulo diferente do anel (descoberta na home, não recomendação pós-ficha).

**Esforço:** Médio — o "Carrossel dinâmico" reaproveita filtros/metadados já existentes (`categoria`, `data`, badge de novidade), sem mudança de schema. "Destaques da semana" **exige schema novo no Sanity + área no Studio** pra curadoria manual (decisão confirmada pelo Rafa) — maior esforço que o resto das 4 ideias desta sessão.

**Prioridade recomendada:** P1-P2 — decisão do Rafa nesta sessão: vale cross-device (mobile também), não é desktop-only.

---

### Grupo 2.1 — Agrupamento das abas do carrossel: de "sem sinal de região" a "zona por decisão do Rafa" (3 rodadas nesta sessão)

**Descrição:** esta seção passou por 3 rodadas de investigação na mesma sessão de feedback, e a decisão final contraria a leitura inicial dos números — vale registrar a trilha completa pra quem ler depois entender que a mudança de direção foi deliberada, não inconsistência do discovery.

**Rodada 1 — GA4, proxy por URL (Formato livre, "Caminho da página + string de consulta", 22/jul–18/ago, 384 usuários ativos):** bairro e categoria saíram estatisticamente empatados (4 usuários únicos cada, mesma ordem de grandeza que idade e data; preço e ambiente com 1 cada). Não sustentava a hipótese do Rafa de que região supera categoria — nem a refutava, a amostra é pequena demais pra qualquer leitura. Consistente com o achado antigo do board (<2% de uso do filtro em jun/2026): o problema não é qual filtro está em destaque, é que filtro em geral é pouco usado.

**Rodada 2 — código + evento `filter_used`:** o Rafa perguntou se dava pra investigar pelas URLs acessadas, já que o filtro muda a URL. Checagem do código (`components/HomeFilters.tsx`, `lib/analytics.ts`) confirmou que o filtro usa client-side routing (`router.replace()` do Next.js App Router, sem reload) — o proxy por URL/`page_view` é impreciso, deve ser tratado como estimativa mínima, não exata. Revelou uma fonte melhor: o código já dispara um evento dedicado `filter_used` a cada clique, com `filter_type` explícito (`neighborhood`/`age`/`category`/`price`/`environment`/`date`) — mas essa dimensão não está registrada no GA4 (só `view_source` está), então não dá pra abrir o breakdown por tipo hoje, e registrar agora não seria retroativo. Total do evento: 47 disparos em 28 dias (de 3.923 eventos totais) — mais alto que a soma da Rodada 1 (19), consistente com a suspeita de subcontagem do proxy por URL. **Recomendação técnica que continua de pé independente da decisão de zona/categoria:** registrar `filter_type` como dimensão personalizada no GA4 (Admin → Definições personalizadas, escopo Evento) — esforço baixo, o evento já dispara o parâmetro certo, só falta o cadastro.

**Rodada 3 — sinal qualitativo, fora do GA4:** o Rafa trouxe uma informação que os dois métodos acima não capturam — **duas conversas pessoais pedindo espontaneamente navegação por região:** uma amiga a quem ele mostrou o produto pessoalmente, outra que comentou por WhatsApp. **Ressalva de rigor, no mesmo padrão já aplicado a outros sinais fracos nesta sessão (ver Grupo 3):** são 2 conversas informais, não entrevistas estruturadas nem sessões de usabilidade roteirizadas (diferente das sessões do Luan/Dayana, que têm KIT de roteiro e registro formal em Drive) — é o sinal metodologicamente mais fraco desta sessão. Mas tem uma vantagem que o GA4 não tem: testa **intenção declarada**, não comportamento sob uma UI que hoje não existe (mesma leitura já registrada no Grupo 1 — não dá pra medir preferência por um mecanismo de navegação que nunca foi oferecido).

**Decisão do Rafa (fecha esta seção — reverte a recomendação original):** seguir com **zona**, não categoria, no agrupamento de lançamento do carrossel dinâmico — decisão consciente baseada no sinal qualitativo da Rodada 3, não nos números do GA4 (que continuam empatados/inconclusivos entre bairro e categoria).

**Mapeamento bairro→zona** (definido pelo Rafa nesta sessão, cruzado ao vivo com o catálogo real do site em produção via filtro Bairro em `ondebrincar.com.br` — cobre 100% das 121 atrações publicadas, sem bairro órfão):

| Zona | Atrações | % do catálogo |
|---|---|---|
| Zona Sul (Botafogo, Catete, Copacabana, Cosme Velho, Flamengo, Gávea, Glória, Ipanema, Jardim Botânico, Lagoa, Laranjeiras, Leblon, São Conrado, Urca, Parque do Flamengo) | 45 | ~37% |
| Zona Sudoeste — Barra/Jacarepaguá (Barra da Tijuca, Freguesia (Jacarepaguá), Gardênia Azul, Jacarepaguá, Recreio dos Bandeirantes, Taquara, Vila Valqueire) | 42 | ~35% |
| Zona Norte (Maracanã, Tijuca, Cachambi, Piedade, Madureira, Manguinhos, Vila da Penha, Vista Alegre, Penha) | 17 | ~14% |
| Zona Central (Centro, Cidade Nova, Gamboa, Porto Maravilha, Santa Teresa, São Cristóvão, Paquetá) | 12 | ~10% |
| Zona Oeste (Bangu, Pedra de Guaratiba, Realengo) | 5 | ~4% |
| **Total (41 bairros distintos no catálogo)** | **121** | **100%** |

No caminho, 2 ajustes ao mapeamento original do Rafa, achados durante o cruzamento com o catálogo: **"Zona Central" não existia na primeira versão** — nasceu nesta sessão pra cobrir Centro/Cidade Nova/Gamboa/Porto Maravilha/Santa Teresa/São Cristóvão/Paquetá, que não caíam em nenhuma das 4 zonas originais (18 atrações que ficariam sem navegação por zona); e **"Penha" (bairro oficial, diferente de "Vila da Penha") tinha ficado de fora** — corrigido, entra em Zona Norte.

**Achado colateral do cruzamento — desbalanceamento real entre zonas:** Zona Sul + Zona Sudoeste sozinhas são 72% do catálogo; Zona Oeste tem só 5 atrações (~4%), bem mais fina que as outras 4. **Decisão do Rafa:** lançar as 5 zonas mesmo assim, incluindo Zona Oeste com volume baixo — não bloquear a V1 por isso.

**Desenho da V1 (decisão do Rafa — substitui a recomendação "categoria" original desta seção):**
- Carrossel 1: **Destaques da semana** — curadoria manual (já decidido em US-I43).
- Carrosséis 2-6: **Zona Sul, Zona Sudoeste, Zona Norte, Zona Central, Zona Oeste** — estáticos, sem painel de configuração ainda.
- Categoria (Parque/Museu/Teatro) não desaparece do produto — continua viva no menu lateral (US-I44, já aprovado) e no filtro. Só sai do carrossel da home nesta V1; é reposicionamento de qual mecanismo cobre qual necessidade, não perda.

**Desenho da V2 — evolução (fecha o desenho mínimo da US-I46, que antes estava "a definir"):** pool de 8-10 carrosséis candidatos — as 5 zonas + categoria de volta como opção — com um painel de edição (provável Sanity Studio, mesma área de "Destaques da semana") onde o Rafa escolhe e ordena até 4 carrosséis extras além de Destaques. Ver US-I46 atualizada na seção 5.

**Causa raiz:** N/A — é decisão de produto baseada em sinal qualitativo, não achado de causa.

**Impacto:** Alto — reverte a recomendação registrada mais cedo nesta mesma sessão; documentado aqui com a trilha completa pra rastreabilidade.

**Esforço:** mapeamento bairro→zona vira um dicionário estático no código pra V1 (não precisa de campo novo no Sanity nem mudança de schema) — esforço baixo. Manutenção contínua: toda vez que uma atração nova entrar com um bairro fora dos 41 já mapeados, alguém (o Rafa) precisa adicionar ao dicionário, senão a atração fica sem zona e não aparece em nenhum carrossel — vale um AC específico sobre esse caso de borda (ver US-I43).

**Recomendação:** seguir a decisão do Rafa (zona, não categoria) para o lançamento do carrossel dinâmico. Registrar `filter_type` como dimensão personalizada no GA4 de qualquer forma (não depende desta decisão) pra ter dado quantitativo melhor em decisões futuras de navegação.

---

### Grupo 2.2 — "Melhor separar as histórias?" (pergunta direta do Rafa, 6ª rodada): sim, Destaques e Carrossel de Região viram par desktop+mobile

**Pergunta do Rafa:** ao propor o recorte de histórias por sprint, o Rafa notou que Destaques e Carrossel de Região "devem impactar desktop e mobile" e perguntou diretamente se era melhor separar em histórias distintas por dispositivo.

**Recomendação do Claude: sim, separar.** Três razões, a mesma lógica que este projeto já aplicou nas últimas duas sessões:

1. **Já é o padrão estabelecido no projeto.** O menu de navegação virou 2 histórias por dispositivo — US-I42 (menu inferior mobile, decidido na sessão de 18/08, com dado quantificado forte) e US-I44 (menu lateral desktop, decidido nesta sessão, com sinal mais fraco — ver Grupo 3 abaixo). Mesmo sendo "o mesmo conceito" de navegação estrutural, cada dispositivo teve sua própria validação, seu próprio protótipo e sua própria estimativa — porque, como o Grupo 3 registra, uma decisão de um dispositivo **não herda automaticamente** pro outro. Destaques e Região merecem o mesmo tratamento: são o mesmo conceito de produto, mas layout, espaço de tela e (possivelmente) comportamento de scroll/swipe divergem o suficiente entre mobile e desktop pra cada um precisar de seu próprio desenho.
2. **O próprio Rafa já pediu esse nível de separação para Destaques desktop** — "quero o layout dos destaques diferente, imagem maior" foi o motivo de dividir a US-I43 original em US-I43 (Destaques) e US-I47 (Região) na 4ª rodada. A mesma lógica (layout diverge o bastante pra justificar história própria) vale entre desktop e mobile do mesmo carrossel — inclusive é provável que o layout mobile do Destaques também precise ser "diferente" do carrossel padrão mobile, do mesmo jeito que o desktop precisou.
3. **Estimativa e sequenciamento ficam mais limpos.** Separado, dá pra levar a versão desktop (que já tem protótipo e desenho fechado nesta sessão) direto pro Refinamento, sem travar no fato de que a versão mobile ainda não tem prototipação nenhuma — nenhuma das duas telas construídas nesta sessão (Home, Ficha) cobre layout mobile. Numa história só, cross-device, o Refinamento inteiro ficaria bloqueado até alguém desenhar a parte mobile.

**Decisão aplicada nesta sessão:** US-I43 e US-I47 passam a ser explicitamente desktop (títulos e escopo ajustados na seção 5); duas novas histórias nascem como pares mobile — **US-I49** (Destaques, mobile) e **US-I50** (Região, mobile) — sem protótipo ainda, como spike a fazer numa sessão futura de navegação mobile (mesmo padrão da sessão de 18/08, que gerou US-I42).

---

### Grupo 3 — Menu lateral no desktop é hipótese mais fraca que o menu inferior mobile, e não herda a decisão dele automaticamente

**Descrição:** No mobile, a decisão por menu inferior teve dois apoios fortes: dado quantificado (<2% de uso do filtro, 68% de sessão sem saída) e um argumento estrutural de affordance (hambúrguer escondido tem o mesmo risco do filtro pouco usado). No desktop, nenhum dos dois se repete do mesmo jeito: não tenho métrica equivalente, e a única sessão de usabilidade em desktop (Luan) foi direto pro filtro sem sinalizar que sentiu falta de um menu — o que é ambíguo (pode ser preferência real, ou só falta de alternativa, mesma armadilha de leitura que o filtro mobile já mostrou não dar pra resolver sozinho).

**Causa raiz:** N/A — é decisão de arquitetura de informação, não achado de dado.

**Impacto:** Alto na hipótese, mas com confiança menor que os outros 3 grupos.

**Esforço:** Médio-Alto — **maior que os outros protótipos**: mexe no layout da página inteira (grid com sidebar), não é só um componente novo dentro do header.

**Prioridade recomendada:** P1-P2, mas via protótipo/teste antes de qualquer esforço de implementação — mais ainda que os outros 3, dado o sinal mais fraco.

---

### Grupo 4 — Right Rail é o anel de recomendação (US-I33) em formato desktop — decisão de esperar 03/09 revertida nesta sessão

**Descrição:** Right Rail estilo YouTube é a mesma aposta de conteúdo do anel "Continue o programa" (mesmos eixos: categoria, bairro/data), só muda a posição (lateral fixa vs. fim da ficha) e o gatilho de visibilidade (sempre visível vs. só depois do scroll completo). O CTR atual do anel é 0,57% em 8 dias — sinal fraco, com decisão original (14/08) de só reavaliar em 03/09/2026.

**Decisão revertida na 4ª rodada de feedback desta sessão:** o Rafa decidiu **não esperar** — "já sabemos que é um problema, navegação está muito baixa". Em vez de tratar o Right Rail como dependente do gate de CTR de 03/09, ele vira implementação agora, no mesmo lote das outras mudanças de navegação desta sessão (destaques/carrossel por zona, menu lateral). Racional: o problema que o Right Rail ataca (baixa navegação além do primeiro scroll na ficha) já está evidenciado por outros sinais desta e de sessões anteriores (Grupo 1, <2% uso de filtro, sessão do Luan) — não depende só do CTR do anel mobile pra ser considerado real.

**Causa raiz:** N/A — decisão de priorização, não achado novo.

**Impacto:** Alto — reverte uma decisão de gate de dados já registrada em 14/08; documentado aqui pra rastreabilidade (quem ler o handoff de 14/08 vai ver "esperar até 03/09" e precisa saber que isso mudou aqui).

**Esforço:** Baixo — reaproveita a query/lógica de recomendação que já existe (`RecommendationRing`), sem lógica de dados nova.

**Prioridade recomendada:** Segue direto pro Refinamento como story de implementação (não mais só spike) — ver US-I45 atualizada na seção 5.

---

## 4. Verificação — contradição com ADR existente

Nenhuma ADR em `docs/decisions/` bloqueia as ideias desta sessão. `2026-05-21-i4-1-filtros-home.md` é complementar: todas as 4 ideias reaproveitam o mecanismo de filtro via querystring já decidido, em vez de criar um sistema de navegação paralelo.

---

## 5. Histórias rascunhadas

**Nota sobre Story ID:** consulta ao Sprint Board confirmada nesta sessão (4ª rodada e reconfirmada na 6ª, a pedido do Rafa) — maior Story ID real do Épico I é `US-I42`. `US-I43`–`US-I52` conferidos livres no Notion, sem colisão. **US-I43 original (Destaques + Carrossel) foi dividida em 2 histórias na 4ª rodada** (Destaques vs. Carrossel por zona) e, na 6ª rodada, **Destaques e Carrossel de Região viraram pares desktop+mobile** (US-I49, US-I50 novas — ver Grupo 2.2), e a US-I46 original foi dividida em "Admin dos Destaques" (US-I51, nova) e "Admin do tema dos carrosséis" (US-I46, escopo ajustado).

**As 10 páginas (US-I43–US-I52) foram criadas no Sprint Board nesta sessão (9ª rodada)** — nenhuma existia antes. Foi preciso criar um Status novo no board, "A refinar" (não existia opção pra história ainda em discovery, só Ready/Em Progresso/Bloqueada/Concluída — decisão do Rafa: "Cria um status novo chamado 'A refinar' e coloca todas ali"). Todas as 10 entraram com esse Status; Épico "I — Interface"; Sprint conforme a tabela acima (US-I48 sem Sprint, por estar "a reavaliar"); SP deixado em branco no board (os "chute inicial" ficam só no texto, não é estimativa comprometida). Resumo de cada página reflete a versão mais recente desta seção 5.

**Nota sobre Sprint:** diferente da convenção padrão desta cerimônia ("Sprint: a definir", ver nota de escopo no fim da seção 9), **o Rafa atribuiu sprint explicitamente a todas as histórias nesta 6ª rodada** — trazendo sua própria proposta de recorte por sprint. Registrado como decisão explícita dele, não inferência do Claude.

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I43 | Spike: protótipo de Destaques da semana (desktop, layout próprio — card maior) | I — Interface | 1-2 (chute inicial) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I49 | Spike: protótipo de Destaques da semana (mobile) — par de US-I43 | I — Interface | a definir (sem protótipo ainda) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I47 | Spike: protótipo de Carrossel dinâmico por região (desktop, 5 zonas estáticas) | I — Interface | 2-3 (chute inicial) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I50 | Spike: protótipo de Carrossel dinâmico por região (mobile) — par de US-I47 | I — Interface | a definir (sem protótipo ainda) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I51 | Admin dos Destaques — painel no Sanity Studio pra curadoria manual da trilha | I — Interface | a definir (sessão dedicada de design do admin acontece dentro do Sprint 17) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I46 | Admin do tema dos carrosséis — painel pro Rafa escolher/ordenar quais carrosséis de zona/categoria aparecem na home | I — Interface | a definir (sessão dedicada de design do admin acontece dentro do Sprint 17) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I44 | Spike: protótipo de menu lateral de categorias (desktop) | I — Interface | 2 (chute inicial) | Ver abaixo | **Sprint 17** (decisão explícita do Rafa) |
| US-I45 | Right Rail de recomendação (desktop, formato do anel US-I33) — vira implementação, não espera 03/09 | I — Interface | 1-2 (chute inicial, reaproveita lógica existente) | Ver abaixo | **Sprint 18** (decisão explícita do Rafa) |
| US-I52 | Ficha com abas (Detalhes / Sugestões), estilo Netflix/Prime, logo abaixo da imagem (mobile) — par de US-I45 | I — Interface | a definir (sem protótipo ainda) | Ver abaixo | **Sprint 18** (decisão explícita do Rafa) |
| US-I48 | Registrar `filter_type` como dimensão personalizada no GA4 (Admin → Definições personalizadas) | I — Interface | 1 (chute inicial — é config, não código) | Ver abaixo | **Rebaixada da Sprint 18 fixa nesta 6ª rodada** — "vai ser avaliado depois, pode não ser mais necessário" (Rafa) |

---

### US-I43 — Spike: protótipo de Destaques da semana (desktop)

**Persona + cenário:** Daniel Mendes abre a home no desktop sem intenção específica ainda formada — hoje só vê o filtro colapsado e a listagem crua; nada sinaliza curadoria ou novidade antes dele já saber o que procurar.

**Hipótese:** Uma trilha editorial de destaques da semana, com curadoria manual do Rafa e layout visualmente mais forte que os carrosséis automáticos (imagem maior, mais destaque), dá um atalho de descoberta por curadoria pra quem chega sem intenção formada — e se diferencia visualmente do resto da home pra sinalizar que é conteúdo escolhido a dedo, não uma listagem qualquer.

**Assumptions explícitas:**
- Reaproveita o padrão já avaliado no spike de 22/07 ("Temas na home", P2) — não é ideia nova, é retomada.
- **Dividida do Carrossel dinâmico por zona (US-I47) na 4ª rodada** — antes era 1 story/protótipo só; o Rafa decidiu separar porque quer "o layout dos destaques diferente, imagem maior" — os dois usavam o mesmo componente visual (trilha horizontal), agora Destaques ganha o seu próprio (`.destaque-card`: card de 340px com imagem de 240px, contra 220px/165px do carrossel padrão — já implementado no protótipo v6).
- **Escopo restrito a desktop nesta rodada (6ª rodada) — ver Grupo 2.2.** Antes cross-device numa história só; separada em par pra ganhar desenho e estimativa próprios por dispositivo, mesmo racional de US-I42/US-I44 (menu mobile vs. desktop). Ver **US-I49** para o par mobile (ainda sem protótipo).
- **Precisa de curadoria manual, via área nova no Sanity Studio** (esclarecido pelo Rafa depois de ver o protótipo v1 — o que ele não queria não era a curadoria em si, era o rótulo "curadoria editorial" visível pro usuário final). Isso é escopo real de implementação: schema novo no Sanity + interface no Studio pra marcar/atualizar os destaques — **agora escopo da US-I51 (Admin dos Destaques), separada nesta 6ª rodada.**
- Protótipo testa clareza/apelo visual, não conversão — validação real (clique na trilha vs. clique na listagem) só depois de implementado.
- Título dos cards do Right Rail (ficha) aumentado (~13,5px → 15,5px) a pedido do Rafa, achado colateral desta sessão — texto estava pequeno demais na leitura da ficha.

**AC rascunho:**
- [x] Protótipo HTML navegável entregue nesta sessão (v6): trilha "Destaques da semana" com layout próprio (`.destaque-card`, imagem 240px), 5 cards com fotos reais do catálogo publicado.
- [ ] Levar ao Refinamento: definir com o Rafa quantos destaques por semana, e o que acontece se ele esquecer de atualizar (fica a semana passada visível? cai pra vazio?).
- [ ] Desenho do schema/interface no Sanity Studio: ver US-I51 (Admin dos Destaques).

---

### US-I49 — Spike: protótipo de Destaques da semana (mobile)

**Persona + cenário:** Mesma hipótese de US-I43 (Daniel Mendes, sem intenção formada), agora em contexto mobile — mesmo padrão de par por dispositivo que gerou US-I42 (menu mobile, sessão de 18/08) e US-I44 (menu desktop, esta sessão).

**Hipótese:** A mesma trilha editorial de destaques, adaptada pro layout mobile — provavelmente scroll horizontal com cards proporcionalmente menores que a versão desktop (`.destaque-card`, 340px, não cabe numa tela mobile sem ajuste) — dá o mesmo atalho de descoberta por curadoria no dispositivo onde a maior parte do tráfego acontece hoje (ver sessão de 18/08).

**Assumptions explícitas:**
- **Nova nesta 6ª rodada, criada a partir da recomendação do Claude de separar Destaques em par desktop+mobile** (ver Grupo 2.2) — o Rafa mencionou "1, 2 e 3 devem impactar desktop e mobile" ao propor o recorte de sprint.
- **Sem protótipo ainda** — esta sessão (19/08) foi desenhada como sessão de navegação desktop; o layout mobile específico de Destaques não foi prototipado. Precisa de uma sessão de spike própria antes do Refinamento, no mesmo padrão da sessão de 18/08.
- Compartilha a curadoria manual via Sanity Studio com US-I43 (mesmo conteúdo, US-I51 cobre o admin) — a diferença é só o layout/apresentação no front, não a fonte de dados.
- Reaproveita a mesma lógica de "reposicionamento, não perda" documentada em US-I43/US-I47 pra categoria — não se aplica aqui, mas mantém o mesmo padrão de fidelidade visual (fotos reais, cores/fontes reais) que os demais protótipos desta sessão, quando for feito.

**AC rascunho:**
- [ ] **Agendar spike de protótipo mobile** (fora do escopo desta sessão) antes de estimar ou levar ao Refinamento.
- [ ] Definir layout de card mobile pra Destaques (proporção, se cabe mais de 1 card por vez na viewport).
- [ ] Confirmar que o conteúdo (quais atrações, cadência semanal) é o mesmo de US-I43, só a apresentação muda.

---

### US-I51 — Admin dos Destaques (painel de curadoria manual no Sanity Studio)

**Persona + cenário:** Rafa (admin/curador do catálogo) precisa marcar/atualizar quais atrações são "Destaques da semana" (US-I43/US-I49) sem depender de mudança de código — hoje esse mecanismo não existe, é escopo novo de implementação.

**Hipótese:** Uma área própria no Sanity Studio pra escolher/ordenar as atrações da trilha "Destaques da semana" reduz o custo operacional de manter a curadoria em dia — sem essa interface, cada atualização semanal dependeria de alguém mexer em código ou dado bruto.

**Assumptions explícitas:**
- **Nova nesta 6ª rodada — separada da US-I46 original.** O Rafa listou "Admin dos destaques" e "Admin do tema dos carrosséis" como 2 itens distintos no recorte de sprint que trouxe; antes eram tratados dentro da mesma história (US-I46). Faz sentido como histórias separadas porque resolvem problemas diferentes: esta é sobre *o que aparece na trilha Destaques*; a US-I46 é sobre *quais trilhas/zonas aparecem na home*.
- **A sessão dedicada de discovery/design do admin (pedida pelo Rafa na 4ª rodada) acontece dentro do Sprint 17** — decisão da 6ª rodada ("Isso pode ser exatamente a sessão dedicada ao design do admin. Coloca no sprint 17"). Diferente do que estava registrado antes (sessão futura, fora do Sprint 17): agora o desenho técnico (schema, campos, fluxo de edição) é trabalho do próprio Sprint 17, não um pré-requisito bloqueante fora dele.
- Reaproveita a mesma área do Sanity Studio prevista pra "Destaques da semana" desde a US-I43 original — hipótese de partida, ainda a confirmar no desenho técnico.
- Cobre curadoria pra desktop (US-I43) e mobile (US-I49) — é o mesmo conteúdo/fonte de dados pros 2 dispositivos, só a apresentação no front diverge.

**AC rascunho:**
- [ ] Desenhar schema no Sanity (que campos: atrações selecionadas, ordem, período de vigência) — trabalho do Sprint 17.
- [ ] Desenhar interface no Studio pra marcar/reordenar destaques.
- [ ] Definir com o Rafa: quantos destaques por semana, e o que acontece se ele esquecer de atualizar (fica a semana passada visível? cai pra vazio?) — pergunta que já estava em US-I43, resolve aqui porque é escopo de admin.
- [ ] Sem estimativa de esforço até o desenho técnico (dentro do Sprint 17) estar fechado.

---

### US-I46 — Admin do tema dos carrosséis (painel pro Rafa escolher/ordenar quais zonas/categoria aparecem na home)

**Persona + cenário:** Rafa (admin/curador do catálogo), depois que os carrosséis de região (US-I47/US-I50) estiverem no ar, quer poder ligar/desligar ou reordenar quais zonas (ou categoria, se trouxer de volta) aparecem na home — sem depender de mudança de código a cada ajuste.

**Hipótese:** Um painel de configuração simples (provavelmente no Sanity Studio, mesma área prevista pra US-I51) que permita escolher e ordenar carrosséis ativos reduz o custo de iterar no agrupamento do carrossel depois do lançamento — importante porque o agrupamento de lançamento (zona, ver Grupo 2.1/US-I47) veio de sinal qualitativo fraco (2 conversas informais) e de um catálogo desbalanceado entre zonas (Zona Sul/Sudoeste = 72%, Zona Oeste = 4%), então a expectativa é *ajustar* depois de ver o carrossel em uso real — inclusive trazendo categoria de volta se o uso mostrar que zona não performa.

**Desenho mínimo, ajustado na 4ª rodada de feedback:** pool de 8-10 carrosséis candidatos — as 5 zonas da V1 (Sul, Sudoeste, Norte, Central, Oeste) + categoria de volta como opção — dos quais o Rafa escolhe e ordena **de 3 a 5** carrosséis extras além de Destaques (ajustado nesta rodada; a Rodada 3 do Grupo 2.1 tinha fechado em "até 4", o Rafa revisou pra uma faixa de 3-5).

**Assumptions explícitas:**
- **Escopo restrito ao tema/agrupamento dos carrosséis (zonas/categoria) nesta 6ª rodada** — a curadoria da trilha Destaques saiu pra US-I51 (ver acima). Antes as duas coisas viviam juntas em "US-I46".
- **A sessão dedicada de discovery/design do admin acontece dentro do Sprint 17** (decisão da 6ª rodada, mesma mudança registrada em US-I51) — não é mais um pré-requisito futuro fora do sprint; o desenho técnico (onde vive, como reordena, como o pool cresce) é trabalho do próprio Sprint 17.
- **Depende de US-I47/US-I50 (Carrossel por região) estarem desenhadas** — não faz sentido configurar o que ainda não existe como conceito, mesmo que a implementação do painel rode no mesmo sprint.
- Reaproveita a mesma área do Sanity Studio prevista pra US-I51, como hipótese de partida — a confirmar no desenho técnico do Sprint 17.
- Não substitui a decisão de agrupamento de lançamento (zona, ver US-I47/Grupo 2.1) — é o mecanismo pra *mudar* esse agrupamento depois, com menor custo que alterar código, inclusive voltando pra categoria se o dado de uso pedir.

**AC rascunho:**
- [x] Pool de candidatos definido nesta sessão: 5 zonas (Sul, Sudoeste, Norte, Central, Oeste) + categoria — de 3 a 5 escolhidos pelo Rafa além de Destaques (ajustado na 4ª rodada, era "até 4").
- [ ] Desenho técnico do painel (schema, reordenação, onde vive no Studio) — trabalho do Sprint 17, junto com US-I51.
- [ ] Definir se este painel também controla a trilha "Destaques da semana" (liga/desliga) ou só os carrosséis de zona/categoria — pauta a resolver no Sprint 17, junto com US-I51.
- [ ] Sem estimativa de esforço até o desenho técnico estar fechado.

---

### US-I44 — Spike: protótipo de menu lateral de categorias (desktop)

**Persona + cenário:** Luan (sessão real de usabilidade, 23/07) abre o site no desktop pra planejar o fim de semana com o Ben — hoje só filtra por bairro/idade/tipo em sequência, sem nenhum atalho de categoria visível fora do filtro colapsado.

**Hipótese:** Um menu lateral fixo com as 11 categorias (mesma grade alfabética validada na sessão mobile de 18/08) dá uma segunda via de navegação por intenção no desktop, sem competir com o filtro.

**Assumptions explícitas:**
- **Sinal mais fraco que o do menu mobile:** não há métrica equivalente ao <2% de uso do filtro ou aos 68% de sessão single-page pro desktop — a única sessão de usabilidade em desktop (Luan) mostra ele indo direto pro filtro, sem indicar preferência por menu (leitura ambígua: pode ser preferência real ou só falta de alternativa).
- Custo estrutural maior que os outros 2 protótipos: exige mexer no layout da página (grid com sidebar), não só adicionar um componente.
- Reaproveita o filtro de categoria existente (`?categoria=`) — não é lógica nova de dados.

**AC rascunho:**
- [x] Protótipo HTML navegável com menu lateral fixo (atalhos + 11 categorias em ordem alfabética) entregue nesta sessão.
- [x] Rafa aprovou a direção depois de testar o protótipo — segue pra Refinamento como story de implementação, mesmo com o sinal mais fraco que os outros 3 grupos (decisão consciente do Rafa, registrada aqui — não é achado de dado adicional, é aposta de produto).
- [ ] Registrar decisão técnica (sidebar sempre visível, reaproveita filtro `categoria`) como nota pro Refinamento.

---

### US-I45 — Right Rail de recomendação (desktop) — vira implementação, não espera 03/09

**Persona + cenário:** Usuário desktop chega numa ficha (mesmo padrão de entrada direta já medido no projeto) e hoje só vê o anel de recomendação no fim da ficha (US-I33), que exige rolar até o fim pra aparecer.

**Hipótese:** Uma versão lateral (right rail), sempre visível sem precisar rolar, pode capturar atenção antes do fim do scroll — é fundamentalmente a mesma aposta de conteúdo já em teste via US-I33 (mesmos eixos: categoria, bairro/data). O CTR do anel (0,57%, 8 dias) segue fraco, mas **o Rafa decidiu nesta sessão não esperar o dado de 03/09** — o problema de baixa navegação já está evidenciado por outros sinais (Grupo 1) e não depende só desse número pra justificar o investimento.

**Assumptions explícitas:**
- Reaproveita a mesma query/lógica de recomendação do anel (US-I33) — não é lógica de dados nova, só posição/formato.
- **Decisão revertida nesta sessão (4ª rodada de feedback):** não fica mais amarrada ao resultado de 03/09 do anel atual — vira story de implementação já no próximo Refinamento, no mesmo lote das outras mudanças de navegação desta sessão.
- **O Right Rail é a única mudança em teste na ficha — o resto da ficha (idade, bairro, endereço, local, preço, ambiente, "quando ir", sinopse) mantém a mesma densidade de informação que já existe em produção.** No protótipo v1 essa parte tinha sido simplificada por engano (menos campos que a ficha real) — corrigido no v2 pra refletir os campos reais, depois do Rafa notar a diferença comparando com uma ficha real do site.

**AC rascunho:**
- [x] Protótipo HTML navegável com right rail na ficha (4 recomendações, mesma lógica do anel) e o restante da ficha replicando os campos reais de produção (idade, bairro, endereço, local, preço, ambiente, quando ir, sinopse), fotos reais, entregue nesta sessão.
- [x] Nota do protótipo atualizada (v6) removendo a referência ao gate de 03/09 — reflete a decisão de implementar agora.
- [ ] Levar ao Refinamento como story de implementação: registrar decisão técnica de reaproveitar o componente/lógica do `RecommendationRing` em vez de duplicar.

---

### US-I52 — Ficha com abas (Detalhes / Sugestões), estilo Netflix/Prime (mobile)

**Persona + cenário:** Usuário mobile chega numa ficha — o Right Rail (US-I45) é formato desktop (coluna lateral), que não existe em telas estreitas; precisa de um equivalente mobile pro mesmo objetivo (expor recomendações sem depender só do fim do scroll).

**Hipótese:** Uma ficha com abas — "Detalhes" e "Sugestões" — logo abaixo da imagem principal, no padrão Netflix/Prime, é o par mobile do Right Rail: mesma aposta de conteúdo (expor recomendação antes do fim do scroll), formato adaptado à tela estreita (abas em vez de coluna lateral).

**Assumptions explícitas:**
- **Nova nesta 6ª rodada.** O Rafa listou como item separado do Right Rail no recorte de sprint que trouxe; a relação entre os dois só ficou clara depois de perguntar — **"Right tail é desktop, a outra é mobile"** (resposta do Rafa). Não são ideias concorrentes nem duas features distintas: são a mesma aposta de produto, formato específico por dispositivo, mesmo padrão de US-I43/US-I49, US-I47/US-I50 e US-I42/US-I44.
- **Sem protótipo ainda** — assim como US-I49/US-I50, esta sessão foi desenhada como sessão de navegação desktop. Precisa de spike próprio (layout de abas, o que entra em "Detalhes" vs. o que já existe na ficha hoje) antes do Refinamento.
- Reaproveita a mesma lógica de recomendação do anel (US-I33) / Right Rail (US-I45) — mudança é de posição/formato (abas em vez de coluna lateral), não de lógica de dados.
- **A aba "Detalhes" precisa preservar a mesma densidade de informação da ficha real** (idade, bairro, endereço, local, preço, ambiente, "quando ir", sinopse) — mesma ressalva que valeu pra US-I45 no protótipo v1→v2 desta sessão (campos simplificados por engano, depois corrigidos).

**AC rascunho:**
- [ ] **Agendar spike de protótipo mobile** (fora do escopo desta sessão) antes de estimar ou levar ao Refinamento.
- [ ] Definir o que entra em cada aba: "Detalhes" (campos hoje visíveis na ficha) vs. "Sugestões" (mesma lógica de recomendação do Right Rail/anel).
- [ ] Confirmar se a aba abre em "Detalhes" por padrão ou lembra a última aba vista.

---

### US-I47 — Spike: protótipo de Carrossel dinâmico por região (desktop)

**Persona + cenário:** Daniel Mendes abre a home no desktop sem intenção específica formada e, segundo sinal qualitativo trazido pelo Rafa nesta sessão (2 conversas informais), pensa em "onde ir" por região da cidade — não por categoria de atração.

**Hipótese:** Carrosséis separados por zona (Zona Sul, Zona Sudoeste, Zona Norte, Zona Central, Zona Oeste), empilhados abaixo de Destaques, dão um atalho de descoberta por região que hoje não existe — mesmo o GA4 não sustentando essa preferência sobre categoria (ver Grupo 2.1), o Rafa decidiu seguir com zona por sinal qualitativo direto de usuárias reais.

**Assumptions explícitas:**
- **Dividida de "Destaques da semana" (US-I43) na 4ª rodada** — antes era 1 story só; separadas porque Destaques ganhou layout próprio (imagem maior).
- **Escopo restrito a desktop nesta rodada (6ª rodada) — ver Grupo 2.2.** Antes cross-device numa história só; separada em par pra ganhar desenho e estimativa próprios por dispositivo. Ver **US-I50** para o par mobile (ainda sem protótipo). O Rafa confirmou nesta 6ª rodada que só a região vai pro carrossel de lançamento — categoria fica só no menu lateral/filtro, sem carrossel próprio ("Vamos só com região primeiro").
- **Formato: carrosséis empilhados, um por zona (carrosséis 2 a 6 da home), não abas dentro de um carrossel só — confirmado explicitamente pelo Rafa na 8ª rodada ("Quero pilhas mesmo").** Isso é diferente da decisão anterior desta mesma sessão ("Formato do carrossel dinâmico: abas de categoria, não empilhado", Decisões tomadas) — a mudança de categoria pra zona também mudou o formato de exibição, de tabs pra trilhas empilhadas (uma por zona, sempre visíveis, sem clique pra trocar).
- Mapeamento bairro→zona fechado nesta sessão (5 zonas, 121/121 atrações do catálogo cobertas, ver tabela no Grupo 2.1) — vira dicionário estático no código pra V1, sem schema novo no Sanity.
- Categoria não desaparece do produto — continua no menu lateral (US-I44) e no filtro. Só sai do carrossel da home nesta V1.
- **Ordem de exibição (Claude sugeriu, a pedido do Rafa — "pode sugerir"; Rafa confirmou na 8ª rodada — "Concordo"):** por volume de atrações, da maior pra menor — Zona Sul (45) → Zona Sudoeste (42) → Zona Norte (17) → Zona Central (12) → Zona Oeste (5). Aplicada nos protótipos v6-v8.
- **AC técnico:** definir o que acontece com uma atração cujo bairro não está mapeado a nenhuma das 5 zonas — hoje o mapeamento cobre 100% do catálogo atual (121/121), mas é um dicionário estático que precisa ser mantido manualmente a cada bairro novo que entrar (ver também pergunta em aberto 7, seção 8, e o item do "dashboard de publicadas", Decisões tomadas).

**Cap de itens por carrossel (decidido na 5ª rodada de feedback, pergunta direta do Rafa sobre o protótipo):** cada carrossel de zona mostra no máximo **8 cards**, independente do total real da zona — evita que Zona Sul (45 atrações) vire um scroll horizontal gigante. O card "Ver todas — [Zona] →" sempre aparece no fim, mesmo em zonas com menos de 8 (ex: Zona Oeste, só 5 no total) — mantém a lógica de instrumentação já decidida (medir clique em "ver tudo" por zona), agora também mostrando o total real da zona no próprio card ("Ver todas — Zona Sul → (45 no total)"). Aplicado no protótipo v7 com dados reais de 8 atrações por zona (5 na Zona Oeste, que não bate o cap).

**AC rascunho:**
- [x] Protótipo HTML atualizado nesta sessão (v7): 5 carrosséis de zona estáticos, empilhados abaixo de Destaques, cada um com até 8 cards reais (nome/bairro do catálogo publicado) e card "Ver todas — [Zona] → (N no total)" no fim.
- [x] Setinhas de rolagem (prev/next) adicionadas na 7ª rodada (v8) — ver Decisões tomadas.
- [x] Mapeamento bairro→zona fechado e validado contra o catálogo real (121/121 atrações cobertas, ver Grupo 2.1).
- [x] Cap de itens por carrossel definido: 8 cards fixos por zona, independente do tamanho real.
- [x] Formato empilhado confirmado pelo Rafa na 8ª rodada ("Quero pilhas mesmo").
- [x] Ordem de exibição por volume confirmada pelo Rafa na 8ª rodada ("Concordo").
- [ ] Levar ao Refinamento: implementação do dicionário bairro→zona no código, do cap de 8 itens por carrossel, e definição do fallback pra atração com bairro não mapeado.

---

### US-I50 — Spike: protótipo de Carrossel dinâmico por região (mobile)

**Persona + cenário:** Mesma hipótese de US-I47 (Daniel Mendes, navegação por região), agora em contexto mobile — mesmo padrão de par por dispositivo que gerou US-I42/US-I44.

**Hipótese:** Os mesmos 5 carrosséis de zona, adaptados pro layout mobile (provavelmente scroll horizontal com cards menores, empilhados verticalmente na ordem já sugerida — Sul, Sudoeste, Norte, Central, Oeste), dão o mesmo atalho de descoberta por região no dispositivo onde a maior parte do tráfego acontece.

**Assumptions explícitas:**
- **Nova nesta 6ª rodada**, mesma origem que US-I49 (ver Grupo 2.2).
- **Sem protótipo ainda** — precisa de spike próprio antes do Refinamento, mesmo padrão de US-I49.
- Reaproveita o mesmo dicionário bairro→zona e o mesmo cap de 8 itens por carrossel definidos em US-I47 — é a mesma fonte de dados e a mesma regra de negócio, só o layout de apresentação muda.
- Cap de 8 itens por carrossel pode não fazer sentido do mesmo jeito em mobile (tela mais estreita, scroll horizontal mais custoso) — vale revisitar no spike, não assumir que o número ideal é o mesmo do desktop.

**AC rascunho:**
- [ ] **Agendar spike de protótipo mobile** (fora do escopo desta sessão) antes de estimar ou levar ao Refinamento.
- [ ] Definir layout de carrossel mobile por zona (empilhado vertical, como no desktop, ou outro padrão de navegação entre zonas).
- [ ] Revisitar o cap de itens por carrossel pro contexto mobile — não assumir que 8 é o número certo sem validar.

---

### US-I48 — Registrar `filter_type` como dimensão personalizada no GA4

**Persona + cenário:** o Rafa (ou uma sessão de discovery futura) precisa responder "qual filtro é mais usado" com dado confiável — hoje só dá pra medir via proxy (URL/`page_view`) ou pela contagem total do evento `filter_used` (47 em 28 dias), sem breakdown por tipo, porque `filter_type` não está registrado como dimensão no GA4 (ver Grupo 2.1, Rodada 2).

**Hipótese:** Registrar `filter_type` (Admin → Definições personalizadas, escopo Evento) é uma config de baixo esforço que destrava o breakdown correto por tipo de filtro pra qualquer decisão futura de navegação — não depende de mudança de código, o evento já dispara o parâmetro certo.

**Assumptions explícitas:**
- **Não é retroativo** — só conta dados a partir do registro em diante. Quanto antes for feito, mais cedo fica disponível.
- **Criada na 4ª rodada com Sprint 18 fixo; rebaixada na 6ª rodada** — o Rafa revisou: "Filter type vai ser avaliado depois. Pode não ser mais necessário." Não é mais um compromisso firme de sprint; é uma história que existe, mas com prioridade e necessidade reavaliadas antes de entrar em qualquer sprint. Possível motivo (não confirmado pelo Rafa): com o carrossel de lançamento decidido por sinal qualitativo (zona, não pelo GA4 — ver Grupo 2.1), o caso de uso original desta história (medir `filter_type` pra decidir agrupamento) perdeu urgência.
- É config no painel do GA4, não código — esforço estimado baixo (1 SP, chute inicial) — estimativa ainda válida se a história for retomada.
- Pode incluir `filter_value` também, se fizer sentido registrar as duas dimensões juntas (a avaliar na execução).

**AC rascunho:**
- [ ] Acessar GA4 → Admin → Definições personalizadas → Criar dimensão personalizada, escopo Evento, parâmetro `filter_type` (evento `filter_used`).
- [ ] Confirmar se vale registrar `filter_value` também na mesma leva.
- [ ] Validar no GA4 (Exploração de teste) que a dimensão nova aparece disponível pra breakdown depois de alguns dias de coleta.
- [ ] **Antes de tudo: reavaliar com o Rafa se essa história ainda é necessária** (decisão da 6ª rodada) — não agendar sprint até essa reavaliação acontecer.

---

## 6. Parking lot

| Item | Hipótese | Motivo para não virar story agora |
|---|---|---|
| "Ativar a busca" (nota de Benchmarking, seção "Melhor a home") | Busca mais visível/funcional ajudaria navegação | Rafa não trouxe essa ideia pra esta sessão — está na mesma nota-fonte, mas fora do escopo declarado (4 ideias específicas) |
| Renomear caixa de recomendação pra "Outras opções perto daqui" (nota de Benchmarking, seções Desktop/Mobile) | Nome mais claro aumentaria uso do anel/right rail | Mesma razão acima — não foi trazida pelo Rafa nesta sessão; fica registrada pra uma sessão futura sobre o anel/right rail |
| Causa raiz "filtros não estimulam navegação" (nota de Benchmarking) | Pode ser vocabulário, affordance, ou desalinhamento com o hábito do usuário | Já é a mesma pergunta em aberto do card "Investigar visibilidade do filtro" (achado GA4 jun/2026) — não é achado novo desta sessão |

---

## 7. Decisões tomadas

**9ª rodada de feedback — sincronizar as histórias no Notion:** o Rafa pediu pra garantir que as 10 histórias comentadas nesta sessão (US-I43–US-I52) estivessem de fato criadas no Sprint Board — nenhuma existia ainda, só os IDs tinham sido verificados como livres. Antes de criar, faltava um Status que refletisse "ainda em discovery, não passou por Refinamento" — perguntei ao Rafa como resolver, já que o board só tinha Ready/Em Progresso/Bloqueada/Concluída. **Decisão: criar um Status novo, "A refinar", e usar em todas as 10.** Board atualizado (novo option no Status) e as 10 páginas criadas, cada uma com Resumo/AC condensado da seção 5 e link de volta pro discovery. Ver detalhe no fim da seção 5.

---

**8ª rodada de feedback — 2 confirmações diretas do Rafa sobre as perguntas 8 e 9 (seção 8):**

- **Formato do carrossel de zona: confirmado empilhado — "Quero pilhas mesmo."** Resolve a pergunta em aberto 8: eram 5 trilhas separadas (uma por zona, sempre visíveis), não abas dentro de um carrossel só. Era inferência do Claude desde a 4ª rodada, sem confirmação direta; agora está fechado.
- **Ordem de exibição dos 5 carrosséis de zona: confirmada — "Concordo."** Resolve a pergunta em aberto 9: mantém a ordem por volume de atrações, decrescente (Zona Sul → Sudoeste → Norte → Central → Oeste), já aplicada nos protótipos v6-v8.

---

**7ª rodada de feedback (protótipo v8):** o Rafa notou, ao testar o protótipo, que os carrosséis com mais itens do que cabe na tela não tinham nenhum affordance clicável pra indicar que dava pra rolar — só o scrollbar nativo fino, fácil de não perceber. **Fechado: cada trilha (Destaques + as 5 zonas) ganha 2 setinhas (prev/next)**, sobrepostas nas bordas do carrossel, que rolam ~85% da largura visível por clique (scroll suave) e **somem sozinhas quando não há mais o que rolar naquela direção** — a seta esquerda começa escondida (nada pra rolar pra trás) e a direita some quando o carrossel já mostra tudo (caso da Zona Oeste, só 5 itens). Aplicado no protótipo v8; vale levar como AC pro Refinamento de US-I43/US-I47/US-I49/US-I50 (é comportamento de front, não muda dado nem lógica de carrossel).

---

**6ª rodada de feedback — recorte de histórias por sprint trazido pelo Rafa, 8 decisões/esclarecimentos:**

- **O Rafa trouxe sua própria proposta de recorte de 8 histórias em 2 sprints** (Sprint 17: Destaques, Categoria, Região, Admin dos destaques, Admin do tema dos carrosséis, Menu lateral; Sprint 18: Right Rail, Ficha com abas) — mudança de postura em relação à convenção padrão desta cerimônia ("Sprint: a definir"); registrado como decisão explícita dele em todas as histórias afetadas.
- **Carrossel de categoria confirmado fora da V1 — "Vamos só com região primeiro."** Reconfirma (não contradiz) a decisão já tomada na 4ª rodada (Grupo 2.1, Rodada 3): categoria continua só no menu lateral (US-I44) e no filtro, sem carrossel próprio no lançamento.
- **A sessão dedicada de discovery/design do admin (pedida pelo Rafa na 4ª rodada) deixa de ser "sessão futura fora do Sprint 17" e passa a acontecer dentro do próprio Sprint 17** — "Isso pode ser exatamente a sessão dedicada ao design do admin. Coloca no sprint 17." Muda a assumption de US-I46/US-I51: o desenho técnico do painel de admin não é mais um bloqueio externo, é trabalho do sprint.
- **US-I46 original dividida em 2 histórias:** **US-I51 (Admin dos Destaques** — curadoria manual da trilha, no Sanity Studio) e **US-I46 (Admin do tema dos carrosséis** — escolher/ordenar quais zonas ou categoria aparecem na home). O Rafa já as listou como itens separados no recorte que trouxe.
- **"Melhor separar as histórias?" — pergunta direta do Rafa sobre Destaques e Carrossel de Região (que impactam desktop e mobile).** Recomendação do Claude: sim, separar — mesmo padrão já aplicado a US-I42/US-I44 (menu mobile vs. desktop), ver Grupo 2.2 pro racional completo. Aplicado: **US-I49** (Destaques, mobile) e **US-I50** (Região, mobile) criadas como pares das já existentes US-I43 e US-I47 (agora explicitamente desktop). Nenhuma das duas tem protótipo ainda — spike futuro, mesmo padrão da sessão mobile de 18/08.
- **Nova história US-I52 (Ficha com abas — Detalhes/Sugestões, estilo Netflix/Prime) criada como par mobile do Right Rail (US-I45, desktop).** Relação esclarecida depois de perguntar — **"Right tail é desktop, a outra é mobile"** (Rafa). Não são features concorrentes, são a mesma aposta de conteúdo em formato específico por dispositivo. Sem protótipo ainda.
- **US-I48 (registrar `filter_type` no GA4) rebaixada de "Sprint 18 confirmado" (decisão da 4ª rodada) pra "avaliar depois"** — "Filter type vai ser avaliado depois. Pode não ser mais necessário" (Rafa). A história continua existindo e desenhada (ver seção 5), mas sem compromisso de sprint até nova avaliação.
- **Story IDs novos confirmados livres no Sprint Board (Notion) nesta rodada:** `US-I49`–`US-I52`, mesma checagem que já tinha sido feita pra `US-I43`–`US-I48` na 4ª rodada — sem colisão.

---

**5ª rodada de feedback (protótipo v7):** o Rafa perguntou diretamente quantos itens aparecem por carrossel e quando surge "Ver todas" — pergunta genuína, não estava decidido. **Fechado: cap fixo de 8 cards por carrossel de zona**, independente do total real (Zona Sul tem 45, por exemplo) — evita scroll horizontal gigante nas zonas maiores. "Ver todas" continua sempre visível, agora com o total real da zona ao lado. Protótipo atualizado (v7) com 8 atrações reais por zona (exceto Zona Oeste, que só tem 5 no catálogo — mostra todas). Ver AC atualizado em US-I47.

**4ª rodada de feedback (protótipo v6) — 8 decisões fechadas de uma vez:**

- **US-I31 fecha com as 2 sessões já rodadas (Luan, Dayana)** — não precisa de 3ª sessão. Falta só sincronizar o Status no Notion (segue "Bloqueada", desatualizado) e produzir a síntese dos ACs 4-5.
- **US-I43 original dividida em 2 histórias: US-I43 (Destaques da semana, layout próprio) e US-I47 (Carrossel dinâmico por zona)** — o Rafa quer "o layout dos destaques diferente, imagem maior"; protótipo v6 já reflete isso (`.destaque-card`, 340px/imagem 240px, vs. `.tcard` padrão 220px/165px).
- **Story IDs confirmados no Notion a pedido do Rafa ("confirma você")** — maior ID real do Épico I é `US-I42`; `US-I43`–`US-I48` livres, sem colisão.
- **Right Rail (US-I45) não espera mais o dado de CTR de 03/09 — vira implementação agora.** "Já sabemos que é um problema, navegação está muito baixa" (Rafa). Reverte a decisão de 14/08.
- **Nova história US-I48 criada: registrar `filter_type` como dimensão personalizada no GA4, programada explicitamente pro Sprint 18** — decisão consciente de não fazer agora, é higiene de instrumentação pra depois.
- **US-I46 (painel configurável): pool de "até 4" carrosséis extras ajustado pra "de 3 a 5"** — e o desenho técnico do admin (onde vive, reordenação) fica pra **uma sessão dedicada futura**, fora do Refinamento de US-I43/I47.
- **"Dashboard de publicadas" (artefato/painel existente que lista atrações publicadas) vai ganhar visibilidade de zona** — pra que o Rafa veja rapidamente cobertura/atrações sem zona mapeada. Decisão de fazer, mas **tratada depois**, não nesta sessão — sem desenho ainda.
- **Ordem de exibição dos 5 carrosséis de zona: sugestão do Claude, confirmada explicitamente pelo Rafa na 8ª rodada** — por volume de atrações, decrescente (Sul → Sudoeste → Norte → Central → Oeste). Aplicada nos protótipos v6-v8.
- **Formato original do carrossel dinâmico (categoria): abas, não empilhado** — decisão fechada pelo Rafa no protótipo v2, com pelo menos 3 categorias como abas. **Superseded na 4ª rodada:** com a virada pra zona (US-I47), o formato virou carrosséis empilhados (um por zona, sempre visíveis) — ver ressalva de confirmação em US-I47. A aba "Tudo" e a lógica de instrumentação por trás dela não se aplicam mais do jeito que foram desenhadas (não há mais um único carrossel pra ter aba "Tudo"); o card "Ver todas — [Zona] →" no fim de cada trilha de zona assume esse papel de atalho + instrumento de medição por zona.
- **"Destaques da semana" tem curadoria manual via Sanity Studio, não é automático** — esclarecido pelo Rafa depois do protótipo v1: o problema era o rótulo "curadoria editorial" ficar visível pro usuário final, não a curadoria manual em si (que ele quer manter, com área própria no Studio).
- **Menu lateral aprovado pelo Rafa depois de testar o protótipo** — segue pra Refinamento como story de implementação, mesmo com o sinal mais fraco que os outros 3 grupos (ver Grupo 3) — decisão consciente dele, não achado de dado novo.
- **Escopo:** Destaques da semana (US-I43) + Carrossel dinâmico por zona (US-I47) valem cross-device (mobile também, não só desktop). Menu lateral e Right Rail são desktop-only.
- **Agrupamento do carrossel dinâmico: zona/região, não categoria — decisão revertida na Rodada 3 do Grupo 2.1.** O GA4 seguiu inconclusivo (bairro e categoria empatados nas 2 medições feitas), mas o Rafa trouxe um sinal qualitativo fora do GA4 — 2 conversas informais (amigas, uma pessoalmente e uma por WhatsApp) pedindo espontaneamente navegação por região — e decidiu por zona mesmo assim, mesmo sendo o sinal metodologicamente mais fraco da sessão.
- **Mapeamento bairro→zona fechado: 5 zonas (Sul, Sudoeste, Norte, Central, Oeste), cruzadas ao vivo com o catálogo real do site — 121/121 atrações cobertas, sem bairro órfão.** "Zona Central" é nova (não existia no mapeamento original do Rafa) e "Penha" foi corrigido pra entrar em Zona Norte — os dois ajustes nasceram do cruzamento feito nesta sessão.
- **Zona Oeste lança mesmo com só 5 atrações (~4% do catálogo)** — decisão consciente do Rafa de não bloquear ou reagrupar a V1 por causa do desbalanceamento entre zonas (Zona Sul + Sudoeste = 72% do catálogo).
- **V1: Destaques (curadoria manual, US-I43) + 5 carrosséis de zona estáticos (US-I47).** Categoria não desaparece do produto — continua no menu lateral (US-I44) e no filtro.
- **Right Rail:** título dos cards de recomendação aumentado (~13,5px → 15,5px) no protótipo, a pedido do Rafa.
- **Protótipos construídos nesta própria sessão** (HTML navegável, 2 telas: Home e Ficha), com cores/fontes reais (`tailwind.config.ts` — tangerina `#F97316`, azul piscina `#0EA5E9`, verde parque `#84CC16`, Fraunces + Nunito) e fotos reais do catálogo, capturadas ao vivo do site em produção (`cdn.sanity.io`) — mesmo cuidado de fidelidade visual que a sessão de 18/08 registrou como lição aprendida.
- Nenhuma ADR nova sinalizada como necessária agora.
- **Lição técnica sobre protótipos HTML autocontidos:** o protótipo v1 hotlinkava imagens direto do `cdn.sanity.io`. Não carregou no ambiente do Rafa (causa não confirmada — hipótese mais provável é o preview de arquivo do Cowork bloqueando recurso externo, mas não descartado 100%). Resolvido incorporando as fotos como `data:` URI (base64) direto no HTML, sem nenhuma dependência de rede pra exibir. **Vale aplicar isso por padrão em protótipos futuros** — mesmo cuidado que a sessão de 18/08 teve com `design-tokens.md` desatualizado: não basta a URL estar certa, o ambiente onde o protótipo é aberto importa.

---

## 8. Perguntas em aberto

1. ~~US-I31: fecha com 2 sessões ou precisa da 3ª?~~ **Resolvido na 4ª rodada:** fecha com as 2 já rodadas. Falta sincronizar Status no Notion e produzir a síntese (ACs 4-5).
2. ~~Destaques da semana + Carrossel dinâmico: juntos ou separados?~~ **Resolvido na 4ª rodada:** separados — viram 2 histórias (US-I43 e US-I47), cada uma com seu layout.
3. ~~Confirmar Story IDs reais no Notion~~ **Resolvido na 4ª rodada (e novamente na 6ª, pra US-I49–I52):** maior ID real do Épico I é `US-I42`; `US-I43`–`US-I52` livres.
4. ~~Right Rail: reabrir avaliação junto com o anel em 03/09?~~ **Resolvido na 4ª rodada:** não espera — vira implementação agora.
5. **Filtro dispara `page_view` novo no GA4 a cada mudança, ou só atualiza a URL via client-side routing?** **Resolvido** (ver Grupo 2.1, Rodada 2): confirmado por código que a URL muda via `router.replace()` (client-side, sem reload) — a medição por página/querystring é um proxy, não uma contagem exata. **Encaminhamento revisto na 6ª rodada:** US-I48 (registrar `filter_type` no GA4) não tem mais Sprint 18 garantido — "pode não ser mais necessário" (Rafa), avaliar depois.
6. ~~US-I46: pool e quantidade de extras?~~ **Resolvido na 4ª rodada:** pool de 8-10, de 3 a 5 extras (ajustado de "até 4"). ~~Ainda em aberto: o desenho técnico do painel em si.~~ **Resolvido na 6ª rodada:** a sessão dedicada de design do admin acontece dentro do Sprint 17 (não é mais adiada pra sessão futura fora dele) — ver US-I46/US-I51.
7. **Dicionário bairro→zona:** cobre 100% do catálogo atual (121/121 atrações), mas é mantido manualmente — o que acontece quando uma atração nova entrar com um bairro ainda não mapeado (fica sem zona? cai numa zona "outras"? bloqueia publicação?) ainda não foi decidido. Levar ao Refinamento junto com a implementação de US-I47. Relacionado: o Rafa decidiu atualizar o "dashboard de publicadas" pra dar visibilidade de zona/cobertura, mas isso também fica pra depois — sem desenho ainda (nem confirmação de qual artefato é esse "dashboard de publicadas" exatamente).
8. ~~Formato do carrossel de zona: empilhado (5 trilhas separadas) é mesmo a leitura certa, ou o Rafa queria abas como no formato de categoria anterior?~~ **Resolvido na 8ª rodada:** empilhado — "Quero pilhas mesmo."
9. ~~Ordem de exibição dos 5 carrosséis de zona: sugestão do Claude (por volume, decrescente) — o Rafa concorda com o critério?~~ **Resolvido na 8ª rodada:** "Concordo" — mantém a ordem por volume, decrescente.
10. ~~"Melhor separar as histórias?" (Destaques e Região, desktop x mobile)~~ **Resolvido nesta 6ª rodada:** sim, separar — ver Grupo 2.2 e US-I49/US-I50.
11. **Protótipo mobile de Destaques, Região e Ficha com abas (US-I49, US-I50, US-I52):** nenhum dos 3 foi prototipado nesta sessão (desenhada como sessão desktop). Precisa de sessão de spike própria — mesmo padrão da sessão de 18/08, que gerou o protótipo mobile de menu (US-I42) — antes de estimar ou levar ao Refinamento.

---

## 9. Recomendações para o próximo Kickoff

**Sprint 17:**
- **US-I44 (menu lateral, desktop)** já saiu desta sessão com direção aprovada pelo Rafa — pode ir direto pro Refinamento fechar DoR (persona/cenário/AC completo/estimativa), sem precisar de mais um spike.
- **US-I43 (Destaques da semana, desktop)** tem o desenho fechado (curadoria manual via Studio, layout próprio com imagem maior) — pode ir direto pro Refinamento.
- **US-I47 (Carrossel dinâmico por região, desktop)** tem o mapeamento bairro→zona fechado e validado contra o catálogo real, formato empilhado e ordem de exibição confirmados pelo Rafa na 8ª rodada — pode ir direto pro Refinamento.
- **US-I49 (Destaques, mobile) e US-I50 (Região, mobile)** — novas nesta 6ª rodada, sem protótipo. Precisam de sessão de spike mobile antes do Refinamento; não travam o Refinamento dos pares desktop (US-I43/US-I47), que já têm desenho fechado.
- **US-I51 (Admin dos Destaques) e US-I46 (Admin do tema dos carrosséis)** — desenho técnico (schema, interface no Studio, reordenação) é trabalho do próprio Sprint 17, não pré-requisito externo como estava registrado antes da 6ª rodada. Depende de US-I43/I47 (ou ao menos do conceito delas) estarem desenhadas.
- Todas as 7 histórias acima têm Sprint 17 atribuído explicitamente pelo Rafa nesta 6ª rodada.

**Sprint 18:**
- **US-I45 (Right Rail, desktop)** não espera mais 03/09 — pode ir direto pro Refinamento como story de implementação.
- **US-I52 (Ficha com abas, mobile)** — nova nesta 6ª rodada, par mobile de US-I45, sem protótipo. Mesma recomendação de US-I49/US-I50: spike mobile antes do Refinamento.
- **US-I48 (registrar `filter_type` no GA4)** — **não sai mais desta sessão com Sprint garantido** (rebaixada na 6ª rodada). Antes do Kickoff de qualquer sprint, reavaliar com o Rafa se ainda é necessária.

**Geral:**
- Levar ao Refinamento: revisão de status da US-I31 (fechada nesta sessão, falta só sincronizar Notion + síntese) e o dicionário bairro→zona + fallback (US-I47, pergunta 7). **As páginas US-I43–US-I52 já foram criadas no Sprint Board nesta sessão** (Status "A refinar") — não é mais pendência de Refinamento, só a mudança de Status pra "Ready" quando cada uma fechar DoR.
- **"Dashboard de publicadas" com visibilidade de zona** (decisão desta sessão, tratamento adiado) — quando for retomado, esclarecer primeiro qual artefato é esse exatamente antes de desenhar a mudança.
- **Sessão de spike mobile pra US-I49, US-I50 e US-I52** — recomendação nova desta rodada. Estas 3 histórias saem do Kickoff sem protótipo nem desenho fechado, diferente dos pares desktop; vale agendar uma sessão dedicada, no mesmo padrão da sessão de 18/08.
- Considerar anexar a esta sessão uma subseção no card "Melhorar a navegação do site" do Discovery Board (Notion), no mesmo padrão da subseção de 18/08 — não feito nesta sessão, fica como sugestão.

**Nota de escopo:** por definição desta cerimônia, todas as stories deveriam sair com `Sprint: a definir` na tabela da seção 5. **Nesta sessão o Rafa optou explicitamente por atribuir sprint real a todas as histórias** (6ª rodada, revisando a atribuição pontual já feita à US-I48 na 4ª rodada) — registrado como decisão dele em cada história, não inferência do Claude. Ainda assim, o Kickoff de cada sprint é o momento formal de confirmar/ajustar escopo e estimativa antes de puxar a história pra execução.

---

## Referências

- `docs/discovery/DISCOVERY-2026-08-18-navegacao-mobile-app-like.md`
- `docs/discovery/DISCOVERY-2026-08-14-navegacao-recomendacao.md`
- `docs/discovery/DISCOVERY-2026-07-22-benchmarks-engajamento-navegacao.md`
- Notion (pessoal): "Benchmarking" (Pessoal → Dia a dia, editada 18/08/2026)
- Google Drive: pasta de sessões de usabilidade US-I31 (Luan 23/07, Dayana 07/08, KIT de roteiro)
- Discovery Board (Notion): "Melhorar a navegação do site" (Priorizado, Épico I)
- `docs/decisions/2026-05-21-i4-1-filtros-home.md`
- Código: `components/SiteHeader.tsx`, `components/AtracaoCard.tsx`, `app/home-content.tsx`, `lib/filter-options.ts`, `tailwind.config.ts`, `components/HomeFilters.tsx` (dispara `filter_used` a cada clique em filtro), `lib/analytics.ts` (`trackEvent`, tipos dos 5 eventos NSM, incl. `FilterUsedParams`)
- GA4 (propriedade "Onde Brincar - Producao"): Exploração "Filtros mais usados" (Formato livre), ajustada nesta sessão pra "Caminho da página + string de consulta", 22/jul–18/ago/2026 — levantamento de uso de filtro por dimensão (Grupo 2.1, Rodada 1)
- GA4 (mesma propriedade): Exploração nova "Nome do evento" x "Contagem de eventos", 22/jul–18/ago/2026 — contagem total do evento `filter_used` (47) como checagem complementar do achado acima (Grupo 2.1, Rodada 2)
- Site em produção (`ondebrincar.com.br`): filtro Bairro (lista completa de 41 bairros do catálogo) e contagem de resultados por combinação de bairros, usado pra cruzar o mapeamento bairro→zona do Rafa contra as 121 atrações publicadas (Grupo 2.1, mapeamento)
- Sinal qualitativo (Grupo 2.1, Rodada 3): 2 conversas informais relatadas pelo Rafa nesta sessão — uma amiga a quem ele mostrou o produto pessoalmente, outra que comentou por WhatsApp, ambas pedindo espontaneamente navegação por região. Não é pesquisa estruturada (sem roteiro, sem registro formal) — sinal direcional, tratado com essa ressalva no texto.
- Protótipo HTML entregue nesta sessão: `protótipo-navegacao-desktop.html` (v8 — setinhas de rolagem por carrossel, cap de 8 cards por carrossel de zona, carrosséis por zona, Destaques com layout próprio, nota de Right Rail atualizada)
- Notion — Sprint Board (`collection://ef278312-03b1-4366-8831-8e2cff1562ff`): consultado na 4ª rodada pra confirmar Story IDs livres (`US-I43`–`US-I48`) e o status real de US-I31 ("Bloqueada", desatualizado); reconsultado na 6ª rodada pra confirmar `US-I49`–`US-I52` livres; na 9ª rodada, Status "A refinar" criado no board e as 10 páginas efetivamente criadas:
  - [US-I43 — Destaques (desktop)](https://app.notion.com/p/3c1e97b095aa81f7876df52b0020c4ec)
  - [US-I49 — Destaques (mobile)](https://app.notion.com/p/3c1e97b095aa815b86cdcce24e09a09e)
  - [US-I47 — Carrossel por região (desktop)](https://app.notion.com/p/3c1e97b095aa81c89a7cf057619b93be)
  - [US-I50 — Carrossel por região (mobile)](https://app.notion.com/p/3c1e97b095aa81b4a4f9e27dc1d79f67)
  - [US-I51 — Admin dos Destaques](https://app.notion.com/p/3c1e97b095aa81b88968fa0b2c2a24e7)
  - [US-I46 — Admin do tema dos carrosséis](https://app.notion.com/p/3c1e97b095aa815c8070eaa123d4eea6)
  - [US-I44 — Menu lateral (desktop)](https://app.notion.com/p/3c1e97b095aa81428be1e764a8dfee54)
  - [US-I45 — Right Rail (desktop)](https://app.notion.com/p/3c1e97b095aa811c97a4d95cf2928d99)
  - [US-I52 — Ficha com abas (mobile)](https://app.notion.com/p/3c1e97b095aa81de86a8d03d4af973c8)
  - [US-I48 — filter_type no GA4 (a reavaliar)](https://app.notion.com/p/3c1e97b095aa81379035f7002522fce3)
- Recorte de histórias por sprint (Grupo 2.2, 6ª rodada): proposta trazida pelo próprio Rafa (8 itens, Sprint 17 e 18), esclarecida via 3 perguntas de confirmação (categoria fora da V1, sessão de admin dentro do Sprint 17, Right Rail = desktop / Ficha com abas = mobile)

---

*Fim do documento de discovery.*
