# Discovery — US-S36: Endereço vazio/errado no Clubinho

**Data:** 06/jul/2026
**Story:** US-S36 (spike, 2 SP, Sprint 12)
**Tipo de sessão:** Execução — spike, sem fix implementado (por escopo)

---

## TL;DR

**Não é limitação de fonte. É bug de extração.** A API interna do Clubinho (`api.venues[0].address`)
tem o endereço completo (`street`, `number`, `neighborhood`) para as 6 fichas testadas hoje — 100% de
acerto, zero casos de dado realmente ausente na fonte. O scraper (`scrape-atracao.ts`) calcula
`endereco` corretamente **quando `api` não é null** — a lógica de montagem da string está certa.

A hipótese de maior confiança é que `fetchProductApi()` (chamada `fetch()` dentro do contexto do
Playwright, sujeita a Cloudflare) está retornando **não-200 silenciosamente** para parte das
requisições de produto durante o scrape em lote, causando fallback total pra
`mapPreviewFallback()` — que não tem endereço porque `ListingPreview` (dado da página de listagem)
nunca teve esse campo. Isso derruba `endereco` (e só ele, no caso mais comum) porque é o único
campo sem fallback alternativo — `categoria`/`preço` sobrevivem porque já vêm da listagem, `bairro`
sobrevive porque vem de um mapa estático de venue→bairro independente da API.

**Caso "Oficina [nome não confirmado] e Família" (citado na revisão de 06/07) provavelmente não é
Clubinho.** O sintoma descrito (texto errado, pego do topo da página em vez do bloco "Local") é
arquiteturalmente impossível no código atual do Clubinho, que não faz scraping de DOM pra
endereço — só lê o campo estruturado da API. Esse padrão de falha bate com a estratégia de
fallback por DOM que existe no Sympla (`sympla-enrich.ts`, 2 estratégias incluindo DOM), que é
justamente o escopo do spike irmão US-S38. Ver seção "Caso não confirmado" abaixo.

---

## AC1 — Fonte ou bug?

**Bug de extração, não limitação de fonte.** Evidência: 6 fichas Clubinho distintas (venues
diferentes, criadas em datas diferentes: 16/06, 24/06 e 01/07) tiveram o JSON bruto da API
consultado diretamente hoje (via chamada HTTP direta ao endpoint interno, fora do Playwright).
Todas retornaram `venues[0].address` completo com `street` + `number` + `neighborhood` (e
`complement` quando aplicável). Nenhum caso de venue genuinamente sem endereço na fonte.

## AC2 — Casos mapeados (JSON bruto vs. extração do scraper)

| Ficha | `venues[0].address` na API (hoje) | `endereco` na planilha enriquecida (rodada de hoje) | Diagnóstico |
|---|---|---|---|
| Maria Clara e JP — Brincar e Imaginar | `Rua Siqueira Campos, 143 — Sobreloja — Copacabana` (completo) | `''` (vazio) | Bug — dado existe, não chegou ao CSV |
| O Show da Luna | Mesmo venue acima, completo | `''` (vazio) | Bug — mesmo padrão |
| A Família Addams, Uma Comédia Musical | `Av. das Américas, 3555 — Barra da Tijuca` (completo) | `''` (vazio) | Bug — mesmo padrão |
| Auto da Compadecida | Mesmo venue (Teatro dos Grandes Atores), completo | `''` (vazio) | Bug — mesmo padrão |
| Arraiá do Sítio do PicaPau Amarelo | `Rua Jardim Botânico, 1008 — Jardim Botânico` (completo) | `''` (vazio) | Bug — mesmo padrão |
| Toy Story em Nova Aventura | `Rua Marquês de São Vicente, 52 — lj 265 — Gávea` (completo) | `''` (vazio) | Bug — mesmo padrão |

6 de 6 casos testados: fonte tem o dado completo, scraper entrega vazio. Volume suficiente pra
descartar "fonte incompleta" como causa principal do cluster de vazios.

*(Colônia de Férias Gecrear — Flamengo/Laranjeiras e Sábado Musical com Jubarte não tiveram o
JSON bruto consultado por tempo de sessão, mas seguem o mesmo padrão de sintoma — endereço vazio
na planilha — e não há motivo pra supor causa diferente sem evidência em contrário.)*

## AC3 — Causa raiz

### Onde o dado se perde

`scrape-atracao.ts::mapToLinha()` monta `endereco` só a partir de `api?.venues?.[0]?.address`.
A lógica de montagem (linhas 51–60) está correta: se `street` ou `number` existem, produz a
string formatada. **Não há bug nessa função** — testável isoladamente com o JSON real coletado
hoje, o resultado bateria com o esperado.

O problema é upstream: `fetchProductApi()` (`browser.ts`) faz um `fetch()` dentro do contexto do
browser Playwright e devolve `{status, data: null}` quando a resposta não é `200` — **sem logar
nada**. `scrapeAtracao()` então cai inteiro em `mapPreviewFallback(preview, pageData)`, ou seja
`api = null` pra aquela ficha inteira, não só o endereço.

### Por que só o endereço aparenta estar quebrado, e não tudo

Porque os outros campos têm fallback que não depende da chamada de API do produto:
- `categoria_origem` e `preco_bruto` já vêm de `ListingPreview` (extraído na página de listagem,
  não na página do produto) — sobrevivem ao fallback.
- `bairro` vem de `VENUE_BAIRRO_MAP`, um mapa estático de substring de venue → bairro
  (`bairro-extractor.ts`), completamente independente do JSON da API.
- `descricao` final é reescrita pelo Gemini na etapa `pipeline-ia`, que produz texto plausível
  mesmo com pouco input.
- `endereco` é o único campo que **só existe se a API do produto respondeu 200** — não tem
  fallback de nenhum tipo (nem preview, nem DOM, nem estático).

Isso explica o padrão observado: falha 100% consistente em endereço, sem degradar
visivelmente os outros campos — o que inicialmente parece "só o endereço tem bug", mas na
verdade é sintoma de uma falha mais ampla (API do produto não respondendo) que só o endereço
não tem como absorver.

### Por que a API do produto falharia silenciosamente

O próprio projeto já documenta que o Clubinho exige navegador **headed** por causa de Cloudflare
(`CLAUDE.md`, `ensureApiAccess()` em `scripts/scraper/index.ts`). Esse mecanismo existente faz um
probe **uma vez, no início do lote** — se `status !== 200` em headless, reabre o browser headed
para o resto da execução. Isso cobre bloqueio total desde o início, mas **não cobre degradação
no meio do lote**: se o Cloudflare (ou rate limiting) passar a bloquear chamadas específicas depois
de N requisições — comportamento plausível de proteção anti-bot — não há retry nem log por item
dentro de `scrapeAtracao()`/`fetchProductApi()`. A falha é absorvida em silêncio.

**Não consegui confirmar isso empiricamente nesta sessão** (sandbox não roda Playwright/pnpm —
ver débito conhecido "Sandbox não roda pnpm no repo Cursor"). Isso é uma hipótese de alta
confiança baseada em: (a) lógica de montagem correta, (b) dado 100% presente na fonte, (c)
único campo sem fallback, (d) precedente documentado de bloqueio Cloudflare no mesmo endpoint.
Não é fato observado diretamente — ver validação proposta no AC de proposta de fix.

### Caso não confirmado: "Oficina [nome não confirmado] e Família"

Não encontrei esse título nas rodadas de hoje (Clubinho ou Sympla) pra puxar o JSON bruto. O
sintoma descrito na revisão de 06/07 — "texto errado, pegou o topo da página em vez do bloco
Local no rodapé" — **não é reproduzível pelo código atual do Clubinho**, que não lê DOM pra
endereço, só o campo estruturado da API (aí o resultado é ou o valor certo, ou vazio — nunca
"texto de outro lugar da página"). Esse padrão de sintoma bate com a estratégia de fallback via
DOM que existe no Sympla (`sympla-enrich.ts`), que é o escopo do spike irmão US-S38.

**Recomendação:** confirmar com o Rafa a fonte real dessa ficha antes de tratá-la como caso do
Clubinho. Se for Sympla, o caso pertence ao US-S38, não ao US-S36 — evita meter um fix errado
na story errada.

## Proposta de fix (não implementado nesta sessão)

1. **Instrumentação primeiro (baixo risco, 🟢):** logar `status` e URL sempre que
   `fetchProductApi()` retornar não-200. Custo mínimo, zero mudança de comportamento. Converte a
   hipótese acima em fato observável na próxima rodada de scrape — hoje é a única forma de
   confirmar sem acesso a ambiente com Playwright.
2. **Retry por item (🟡, precisa validar custo/tempo):** replicar o padrão já existente em
   `ensureApiAccess()` — se `fetchProductApi()` falhar no meio do lote, tentar reabrir sessão
   headed e refazer a chamada daquele produto antes de cair no fallback total.
3. **Fallback parcial (🟡, precisa investigar viabilidade):** se a API do produto falhar mas a
   página em si carregou (`pageData.fullText` disponível), avaliar se existe um bloco "Local"
   identificável no texto renderizado que sirva de fallback de endereço — mesma ideia do Sympla,
   adaptada ao Clubinho. Não confirmado se o Clubinho expõe esse bloco de forma parseável; isso
   seria trabalho de uma story de implementação, não deste spike.
4. **Caso "Oficina":** resolver separadamente — confirmar fonte com o Rafa antes de qualquer
   fix, não presumir que é Clubinho.

Nenhuma dessas ações foi implementada nesta sessão, por escopo do spike (US-S36 pede decisão de
causa raiz + proposta documentada, não fix em produção).

## Metodologia

- JSON bruto obtido via chamada HTTP direta ao endpoint interno (`clubinhodeofertas.com.br/api/...`),
  fora do contexto do Playwright do projeto — não reproduz 100% o ambiente real de scrape
  (user-agent, cookies de sessão, fingerprint anti-bot), mas confirma o estado da fonte
  no momento da consulta.
- URLs das 6 fichas obtidas via `source_url`/`link_compra` nas planilhas enriquecidas geradas
  hoje (`data/output/planilha-enriquecida-2026-07-06T13-*.csv`), cruzadas com os nomes da
  revisão de fichas de 06/07.
- Código lido: `scripts/scraper/scrape-atracao.ts`, `scripts/scraper/browser.ts`,
  `scripts/scraper/clubinho-api.ts`, `scripts/scraper/page-content.ts`, `scripts/scraper/types.ts`,
  `scripts/scraper/index.ts`, `scripts/scraper/retry-urls.ts`,
  `scripts/pipeline-ia/index.ts`, `scripts/pipeline-ia/bairro-extractor.ts`.
- Não rodei o scraper nem o pipeline nesta sessão (sandbox não executa Playwright/pnpm — débito
  conhecido do projeto).

## Instrumentação adicionada (06/07/2026, pós-spike)

A pedido do Rafa, item 1 da proposta de fix foi implementado — só instrumentação de diagnóstico,
sem mudar comportamento nem schema do CSV:

- `scripts/scraper/types.ts`: campo opcional `_apiStatus?: number` em `LinhaEnriquecida`
  (fora de `CSV_COLUMNS`, não aparece no CSV de saída).
- `scripts/scraper/scrape-atracao.ts`: grava o status retornado por `fetchProductApi()` em
  `_apiStatus` (tanto no caminho de sucesso quanto no fallback) e loga um `console.warn` com
  status + URL + nome da ficha sempre que a API do produto não retornar 200.
- `scripts/scraper/index.ts`: ao final da rodada, agrega quantas fichas caíram em fallback
  (`_apiStatus !== 200`) e imprime um resumo — `✅ ... para todas as N fichas` ou
  `⚠️ M/N fichas com fetchProductApi falhando ... status: ...`.

`tsc --noEmit` limpo (rodado no sandbox). Testes (`vitest`) não rodam no sandbox — precisam ser
confirmados no terminal do Rafa antes do merge. Sem casos de teste automatizado dedicados ao
scraper hoje (nenhum arquivo em `scripts/scraper/**/*.test.ts`).

**Próximo passo:** rodar `pnpm scrape` (rodada de quinta, 09/07) e conferir o resumo final do
log. Se `apiFailures > 0` e a lista de URLs bater com as fichas de endereço vazio já conhecidas,
a hipótese deste discovery vira fato confirmado — aí sim vale abrir story de implementação
(retry por item, no padrão de `ensureApiAccess()`).

## Assumption do kickoff, revisitada

O board avisou pra não presumir causa única entre os 10 casos. Achado: **9 dos 10 casos
("vazio") parecem ter a mesma causa raiz** (falha silenciosa de `fetchProductApi()`, sem
fallback pro campo endereço) — não porque assumi isso de saída, mas porque testei 6 amostras
com fontes/venues/datas diferentes e todas bateram no mesmo padrão. O 10º caso ("Oficina", texto
errado em vez de vazio) **não bate com esse padrão** e provavelmente nem pertence a esta story.
