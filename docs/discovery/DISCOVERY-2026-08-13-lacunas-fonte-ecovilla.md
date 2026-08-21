# Discovery — Lacunas estruturais da fonte EcoVilla (endereço, link de compra, faixa etária/duração)

**Data:** 2026-08-13
**Sessão:** Cowork, disparada por revisão manual de ficha do Rafa
**Base:** `Handoffs/HANDOFF_v9_Onde_Brincar.md`, `Handoffs/Handoffs de Sprint/Handoff-Sprint-16.md`, `Handoffs/Handoffs de Sprint/Kickoff-Sprint-16.md`, código em `Cursor/scripts/scraper/ecovilla.ts` + `Cursor/scripts/normalizer/ecovilla.ts`, board Notion (US-E18, US-E19, US-S77, US-S79, US-S31)

---

## Origem desta sessão

Rafa revisou a ficha "Dia da Amazônia" (espaço Ecovila) e trouxe o achado ao Cowork:

> Ficha da atração no espaço Ecovila apresentando diversos campos não preenchidos. A limitação
> ocorre porque a Ecovila não possui páginas individuais por evento em seu site, mantendo apenas
> uma página geral de programação. A revisão exigiu complementação manual de dados. Status:
> Publicada (com preenchimento manual). O robô limita-se a raspar a página principal de
> programação da Ecovila, gerando fichas omissas e incompletas por falta de uma URL própria de
> destino.

## Fontes de sinal trazidas nesta sessão

- **Feedback operacional direto (revisão manual de ficha):** relato acima, sobre a ficha "Dia da
  Amazônia".
- **Escopo confirmado pelo Rafa, em resposta a pergunta de esclarecimento:** o sinal não é
  isolado — é "todas as fichas de EcoVilla Ri Happy", ou seja, um padrão recorrente da fonte, não
  um caso único.
- **Campos vazios confirmados pelo Rafa, em resposta a pergunta de esclarecimento:** classificação
  etária mínima/máxima, idade recomendada mínima/máxima, duração, preço, endereço, local. Além
  disso: o link de compra deveria ser o link que já está no bloco de título do evento na página de
  origem, e não está sendo capturado.
- **Origem da ficha confirmada pelo Rafa:** veio do scraper automatizado da EcoVilla (não é fonte
  manual nem Raindrop associada ao venue por engano).

**Força da evidência:** o relato é de 1 ficha revisada manualmente, mas o Rafa confirmou que o
padrão se repete em todas as fichas da fonte — não é 1 amostra isolada, é uma característica da
fonte inteira. A causa raiz de cada campo foi cruzada com o código real do scraper
(`scripts/scraper/ecovilla.ts`, `scripts/normalizer/ecovilla.ts`) e com decisões já registradas no
Sprint Board (US-S31, US-E18, US-S77/S79) — não é só relato, tem confirmação técnica direta pra
parte dos campos. Pra outra parte (classificação etária/duração), a causa raiz **não** foi
confirmada com o dado bruto real desta ficha específica — ver Problema 3.

---

## Diagnóstico

### Problema 1 — Endereço e Local nunca são preenchidos pelo scraper EcoVilla, mesmo sendo venue única, fixa e conhecida

**Causa raiz (confirmada por código):** `scripts/scraper/ecovilla.ts::buildLinha()` monta a linha
enriquecida com `venue` ("Teatro EcoVilla Ri Happy") e `bairro` ("Jardim Botânico") fixos, mas
**nunca** popula os campos `endereco` nem `local` (ambos opcionais em `LinhaInput`/
`LinhaEnriquecida`). O fallback automático que existe no pipeline pra esse tipo de gap
(`scripts/scraper/local-endereco-map.ts`, US-S76) só é alimentado por Sympla e Clubinho — EcoVilla
nunca escreve nem lê essa tabela. Resultado: 100% das fichas dessa fonte nascem sem endereço/local
estruturado, apesar do dado ser 100% estável (venue única, endereço não muda).

**Impacto:** Alto. Endereço é campo central de descoberta (geolocalização na ficha, mapas) e afeta
100% das fichas da fonte — inclusive as futuras, não só a já revisada.

**Esforço:** Baixo. É hardcode de 1 endereço fixo, mesma lógica já usada pra `venue`/`bairro`/
`categoria_origem` no mesmo arquivo — não precisa de geocoding nem heurística nova.

**Prioridade recomendada:** P1 — esforço baixo, resolve 100% dos casos futuros de uma vez, sem
depender de decisão de produto.

---

### Problema 2 — Link de compra ausente: **diagnóstico inicial estava errado, corrigido nesta sessão**

**Primeira hipótese (registrada antes, e descartada agora):** cheguei a diagnosticar que
`extractUrlIngresso()` estaria descartando o link real por só aceitar hostname `ingresso.com`.
Rafa apontou que isso não bate com o comportamento real — os links de compra da EcoVilla são
sempre `ingresso.com` — e essa dúvida motivou conferir a página de origem ao vivo.

**Causa raiz real (confirmada ao vivo em `ecovillarihappy.com.br/programacao/`):** "Dia da
Amazônia" é um evento gratuito/temático (Amazônia, Folclore, Árvore, Abelhas, Pantanal aparecem no
mesmo padrão) e **não tem link nenhum no HTML de origem** — o bloco de título é texto puro, sem
`<a href>`. Já os espetáculos pagos (ex.: "Ritinha Rock'n Roll", "TcHiBuM!", "Mogli, O Musical")
têm link de título apontando corretamente pra `ingresso.com` com parâmetros UTM — e
`extractUrlIngresso()` já aceita esse padrão sem problema, porque hostname bate.

**Conclusão:** não é bug. Link de compra vazio em "Dia da Amazônia" é o comportamento correto —
a fonte não oferece link nenhum pra esse evento (é conteúdo informativo/gratuito, não ingresso). O
Problema 2 sai do diagnóstico como item de fix; vira ponto de partida pra uma pergunta de
arquitetura diferente — ver seção "Caminho A vs. Caminho B" mais abaixo, motivada por uma
observação nova do Rafa (todo link pago da EcoVilla é ingresso.com) que não é sobre esta ficha, é
sobre resiliência/cobertura futura da fonte.

---

### Problema 3 — Classificação etária e duração vazias: causa raiz não identificada com confiança a partir do sinal disponível

**Hipóteses, nenhuma confirmada:**

1. **Abstenção correta do sistema, não bug.** A duração nunca é extraída pelo scraper EcoVilla —
   por design (a página de programação não declara duração nenhuma) — e fica para o Gemini inferir
   a partir da sinopse, ou pra revisão manual (comentário explícito em
   `scripts/normalizer/ecovilla.ts`). Depois da US-S56 (fix de duração alucinada sem base no
   texto-fonte), o comportamento esperado é o Gemini **recusar** inventar duração sem evidência no
   texto — então "vazio" pode ser o sistema funcionando como projetado, não uma falha nova.
2. **Idade recomendada pode já ser abstenção esperada, não falta de cobertura.** US-S77 e US-S79
   (concluídas ontem, 12/08) reorganizaram esse campo e rodaram backfill em 124 fichas antigas: 87
   foram preenchidas, 32 seguem "A confirmar" legitimamente por falta de sinal suficiente na fonte
   — esse é o comportamento correto do sistema hoje, não um bug. Se "Dia da Amazônia" é uma ficha
   nova (criada depois da US-S77 entrar no pipeline-ia principal), ela já passaria pela lógica nova
   de inferência por contexto (3 regras) — e pode legitimamente cair em "sem sinal suficiente" se
   nenhuma das 3 regras (youtuber kids, teatro bebês, show infantil genérico) se aplicar a um
   evento temático como "Dia da Amazônia".
3. **Falha de extração no scraper, não abstenção.** Alternativa: a página da EcoVilla pode
   declarar uma classificação (`"Classificação: Livre"` ou `"Classificação: N anos"`) que o regex
   de `parseClassificacaoEcovilla()` não reconheceu (formato de texto diferente do esperado pra
   esse evento específico) — nesse caso o dado existe na fonte e foi perdido na extração, o que
   seria um bug real, não abstenção correta.

**Atualização — fetch ao vivo da página de origem nesta sessão:** conferido diretamente em
`ecovillarihappy.com.br/programacao/`, o card de "Dia da Amazônia" **declara** `"Classificação:
Livre"` na fonte. O regex de `parseClassificacaoEcovilla()` reconhece esse formato exato
(`/^livre$/i`) e deveria ter extraído `idade_minima="0"`, `idade_maxima="18"` sem problema — isso
enfraquece a hipótese 1 (abstenção correta) especificamente pra `idade_min`/`idade_max` (a
classificação oficial, Studio-only): o dado existe na fonte e é simples de parsear, então se saiu
vazio no Sanity, o problema está em outro ponto da esteira (scraper → `pipeline-ia` → Gemini →
Sanity), não em falta de dado na origem. Fortalece a hipótese 3 (bug real) pra esse campo
específico. Já pra `idade_recomendada_min`/`idade_recomendada_max` (o campo novo, público),
"Livre" cai exatamente no caso genérico que precisa de inferência por contexto (US-S77/S79) — "A
confirmar" aí pode ser abstenção legítima, se nenhuma das 3 regras heurísticas reconhecer um evento
temático/educativo como "Dia da Amazônia" (não é youtuber kids, nem teatro bebês, nem show infantil
genérico óbvio).

**Ainda não dá pra fechar com 100% de certeza** sem olhar o dado bruto real (linha do CSV do
scraper ou o documento no Sanity da ficha) — mas o sinal agora aponta mais forte pra: `idade_min`/
`idade_max` vazio = provável bug na esteira scraper→pipeline; `idade_recomendada` em "A confirmar"
= provável abstenção correta, dado o tipo de evento. O spike (US-S81) segue necessário pra
confirmar isso e localizar o ponto exato da falha, se houver.

**Impacto:** provavelmente alto pra `idade_min`/`idade_max` (se confirmado bug, afeta toda ficha
EcoVilla com classificação simples tipo "Livre"/"N anos" — não só eventos temáticos).

**Esforço:** a definir — depende de onde a esteira estiver quebrando (spike primeiro).

**Prioridade recomendada:** nenhuma ainda pra fix — mas o spike (US-S81) sobe de prioridade dado
esse achado (evidência mais forte de bug real, não só duvida).

---

### Nota — Preço e duração vazios por design atual, não é bug isolado desta ficha

`scripts/normalizer/ecovilla.ts` documenta explicitamente que `preco_bruto`,
`preco_inteira_centavos`, `desconto_percentual`, `horarios_sessao` e `duracao_minutos` **sempre**
saem vazios do scraper EcoVilla — a página de programação não declara nenhum desses dados por
evento. Isso confirma a leitura operacional do Rafa ("robô se limita a raspar a página principal
de programação... gerando fichas omissas"): é uma limitação de fonte conhecida e aceita desde o
design original do scraper (US-S31, Sprint 15), não uma regressão. A pergunta em aberto não é "por
que está vazio", é "vale investir em preencher isso de outro jeito" — ver Parking Lot.

---

## Checagem de contradição com ADRs existentes

Nenhuma ADR em `docs/decisions/` trata especificamente da fonte EcoVilla ou desse tipo de
trade-off. Vale registrar uma tensão — não uma contradição formal de ADR, então não bloqueia esta
sessão, mas merece decisão consciente do Rafa: a fonte **Eventim** teve decisão oposta em situação
parecida (US-S30, Sprint 15) — não foi integrada ao pipeline automatizado porque sinopse, duração e
classificação indicativa não existem na fonte pra maioria dos eventos, ficando só como listagem
pra curadoria manual (skill `descoberta-eventim-onde-brincar`, sem publicação automática no
Sanity). A EcoVilla, com uma lacuna de dados parecida (mas não idêntica em grau — tem nome, data e
descrição sempre; às vezes tem classificação e link), foi integrada ao pipeline automatizado mesmo
assim (US-S31/E18), aceitando os campos vazios + revisão manual. Não necessariamente errado — os
graus de lacuna são diferentes — mas vale o Rafa confirmar conscientemente esse critério, já que
vai se repetir toda vez que uma fonte nova tiver dados parciais.

---

## Histórias rascunhadas

Último Story ID usado no épico S — Scraper (checado via busca no Sprint Board): **US-S79**
(Concluída, Sprint 16). Próximo disponível: **US-S80**.

| Story ID | Título | Épico | SP estimado (chute) | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-S80 | EcoVilla: preencher endereço/local fixos no scraper | S — Scraper | 1 (chute) | 1) `buildLinha()` em `scripts/scraper/ecovilla.ts` passa a popular `endereco` e `local` com valores fixos conhecidos (mesmo padrão hardcoded já usado pra `venue`/`bairro`/`categoria_origem`), sem depender do `local-endereco-map.ts` (que hoje só cobre Sympla/Clubinho). 2) Teste cobrindo o caso com dado real de pelo menos 1 ficha EcoVilla existente. 3) tsc limpo, testes verdes. | a definir |
| US-S81 | Spike: `idade_min`/`idade_max` vazios em "Dia da Amazônia" apesar da fonte declarar "Classificação: Livre" | S — Scraper | 1 (chute) | 1) Confirmado nesta sessão (fetch ao vivo): a fonte declara `"Classificação: Livre"` pro evento — o regex do scraper deveria ter extraído `0`/`18`. Conferir o dado bruto real (CSV do scraper ou documento no Sanity) da ficha "Dia da Amazônia" pra achar em que ponto da esteira (scraper → `pipeline-ia` → Gemini → import-sanity) o dado se perdeu. 2) Checar mais 2-3 fichas EcoVilla publicadas com classificação simples ("Livre"/"N anos") pra saber se é padrão ou caso isolado. 3) `idade_recomendada` ("A confirmar") tratar separado — pode ser abstenção correta (evento temático sem sinal claro pras 3 regras de inferência), não precisa investigar junto. 4) Relatório curto com a conclusão e o ponto exato da falha, pra decidir no refinamento se vira story de fix. | a definir |

---

## Parking lot

- **Preço/duração vazios por design do scraper EcoVilla — vale investir em preencher, ou aceitar
  revisão manual pra sempre?** Tem hipótese: pra eventos pagos (que já têm link `ingresso.com`
  capturado corretamente hoje), a mesma arquitetura de enrich que já existe pra Sympla
  (`scripts/scraper/sympla-enrich.ts`) poderia seguir esse link até a página de destino pra buscar
  preço/duração. Pra eventos gratuitos/temáticos sem link (como "Dia da Amazônia"), não tem fonte
  nenhuma pra buscar — ficam sempre manuais. Esforço não estimado e depende de decisão de produto
  sobre prioridade dessa fonte. **Motivo de não virar story agora:** ainda não tem decisão do Rafa
  sobre investir nisso ou manter revisão manual como solução permanente pra essa fonte (nem
  confirmação de que vale o esforço pro volume atual, venue única).
- **Validar `categoria_origem` fixo ("Teatro Infantil") no scraper EcoVilla.** Já é débito
  registrado no `Handoff-Sprint-16.md` (item 5), pendente de validação numa revisão de fichas que
  incluísse eventos EcoVilla — esta sessão foi essa revisão, mas o Rafa não reportou esse campo
  como errado na ficha "Dia da Amazônia". **Motivo de não virar story nova:** não há sinal de que
  esteja quebrado nesta ficha específica; o débito já registrado segue como está, sem confirmação
  nem invalidação nesta sessão.
- **Caminho B (fonte agregadora "ingresso.com")** — ver seção dedicada acima. Não vira story: sem
  caso real hoje que justifique (Rafa já checou e não achou outra venue infantil na plataforma),
  mesmo perfil de risco da Eventim (não integrada por motivo parecido).

---

## Decisões tomadas nesta sessão

Nenhuma decisão de produto, arquitetura ou processo foi tomada nesta sessão — só diagnóstico e
rascunho de stories. Nenhum ADR a criar por enquanto.

---

## Caminho A vs. Caminho B — arquitetura pra fontes que vendem via ingresso.com

Observação nova do Rafa, motivada pela correção do Problema 2: todo link pago da EcoVilla aponta
pra `ingresso.com`. Checou manualmente se existe hoje algum outro teatro infantil vendendo pela
mesma plataforma — não achou nenhum. Pergunta em aberto: reforçar o scraper específico da EcoVilla
(que já assume `ingresso.com` implicitamente) ou construir uma fonte nova, agregadora, que varre o
próprio `ingresso.com` e cobriria qualquer venue que venda por lá — inclusive futuras.

**Investigação técnica feita nesta sessão (fetch ao vivo de `ingresso.com/teatros`):** a listagem
de espetáculos não vem no HTML estático — é carregada via JavaScript (SPA), sem nenhuma tag ou
filtro de "infantil" visível na estrutura estática. Ou seja, tecnicamente mais parecido com o
Clubinho (Playwright, JS rendering, possível anti-bot) do que com EcoVilla/Uhuu (HTML estático,
`fetch` + `jsdom` bastam).

| | Caminho A — reforçar o scraper EcoVilla (arquitetura atual: 1 scraper por venue) | Caminho B — nova fonte "ingresso.com" (agregador, cobre qualquer venue que venda lá) |
|---|---|---|
| **O que muda** | Nada estrutural — a EcoVilla já só aceita `ingresso.com` nos links pagos (`extractUrlIngresso`), e isso já funciona hoje. "Reforçar" aqui seria só deixar essa dependência explícita/documentada, sem mudar comportamento. | Nova fonte do zero: scraper de listagem com paginação, parser de estrutura JS-renderizada (precisa Playwright, mesmo padrão do Clubinho), normalizer, valor novo em `Origem`/schema, `pipeline-ia`/`import-sanity` reconhecendo a fonte (mesmo trabalho da US-E18), skill própria. |
| **Esforço** | Baixo — nenhuma mudança de código necessária pra esse ponto específico (já funciona); o esforço real da sessão é só o Problema 1 (endereço/local), já rascunhado como US-S80. | Alto — da mesma ordem de grandeza da construção original do Clubinho (anti-bot) ou da Uhuu completa (scraper + integração de pipeline), possivelmente maior pelo filtro de categoria. |
| **Risco técnico** | Baixo. Escopo isolado, já validado em produção pros eventos pagos. | Alto. SPA sem filtro de categoria visível estaticamente — precisaria de exploração dinâmica (DevTools/API interna, como foi feito pro Clubinho) só pra saber se "infantil" é uma tag confiável ou se a triagem teria que ser por texto/heurística, com risco de trazer show adulto junto. |
| **Risco de produto** | Nenhum novo — mantém o padrão "1 scraper por venue conhecida", que é como Uhuu/Clubinho/Sympla/EcoVilla já funcionam. | Precedente direto e recente: a Eventim (US-S30, Sprint 15) foi avaliada pra virar fonte agregadora e a decisão foi **não integrar**, justamente pela dificuldade de garantir dados completos e filtro confiável de categoria num catálogo genérico. Caminho B tem o mesmo perfil de risco. |
| **Benefício** | Resolve o que existe hoje (EcoVilla). Se a EcoVilla trocar de vendedor de ingresso amanhã, o scraper EcoVilla-específico continua funcionando (não depende de domínio nenhum pra capturar dados básicos — só o `link_compra` fica sem valor até alguém notar e ajustar `extractUrlIngresso`, mesmo risco de hoje). | Cobriria qualquer venue nova que apareça vendendo por `ingresso.com` — mas hoje isso é 100% especulativo: o próprio Rafa checou e não achou nenhuma outra venue infantil na plataforma. |

**Leitura:** Caminho B tem o mesmo formato do experimento já rodado com a Eventim — catálogo
agregador genérico, sem filtro de categoria confiável, sem caso real hoje pra justificar o
esforço. Caminho A não exige trabalho novo (o comportamento já é correto), só documentação da
dependência implícita. Registro como pergunta em aberto pro Rafa decidir — não é decisão desta
sessão de Discovery (fora de escopo tomar decisão de arquitetura aqui), e não rascunho story pro
Caminho B sem um caso real que justifique (evitar backlog especulativo).

---

## Perguntas em aberto

1. **Critério de integração pra fontes com dados parciais:** a EcoVilla foi automatizada aceitando
   campos vazios + revisão manual; a Eventim foi deixada de fora do pipeline pelo motivo oposto
   (dados incompletos demais). Vale um critério explícito pra próximas fontes (que grau de lacuna
   ainda compensa automatizar vs. manter só como listagem manual)?
2. **Vale investir em enrich de preço/duração pra EcoVilla** seguindo o link de compra real (que
   já é capturado corretamente hoje pros eventos pagos), no mesmo padrão do `sympla-enrich.ts`?
   Ou aceitar que campos vazios + revisão manual é a solução permanente pra essa fonte (venue
   única, baixo volume)?
3. **US-S81 (spike) pode virar 2 conclusões diferentes** — bug de extração (vira story de fix) ou
   abstenção correta (encerra sem story). Fechar isso antes de comprometer capacidade de sprint
   pra um fix que pode não ser necessário.
4. **Caminho A vs. Caminho B (fonte agregadora ingresso.com):** sem caso real hoje, mas vale o
   Rafa confirmar que concorda com adiar Caminho B até aparecer uma 2ª venue infantil na
   plataforma — ver seção dedicada acima.

---

## Recomendações pro próximo Kickoff/Refinamento

- US-S80 e US-S81 têm hipótese e AC rascunho, mas não estão Ready — faltam passar por
  Refinamento (persona/cenário completos, SP calibrado, assumptions fechadas) antes de entrarem
  em qualquer Kickoff.
- US-S81 é pré-requisito de diagnóstico, não de código — rodar antes ou em paralelo à US-S80,
  não depois: o resultado dela pode gerar uma 3ª story (fix de extração) que ainda não existe.
- A pergunta em aberto #1 (critério de integração pra fontes com dados parciais) é uma decisão de
  produto que vale discutir fora do fluxo normal de Kickoff — não é urgente, mas vai se repetir
  toda vez que uma fonte nova malformada aparecer.
- Considerar levar a pergunta em aberto #2 (investir em enrich vs. aceitar manual permanente) pra
  discussão de priorização geral da fonte EcoVilla — ela é pequena (venue única) hoje, então pode
  não valer o esforço de enrich ainda; mas vale decisão consciente, não default por omissão.
