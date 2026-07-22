# Discovery — US-S28: Investigação técnica e scraper Uhuu

**Story:** US-S28 (5 SP)
**Tipo de sessão:** Execução

---

## Assumption crítica — resultado

A story entrou com 🟡 assumption: SP=5 assume que a Uhuu **não** tem proteção
anti-scraping significativa. **Confirmado: não tem.**

- Um `curl` puro, sem cookies, sem sessão, com User-Agent genérico, contra a
  página de listagem retorna HTTP 200 com o HTML final completo (eventos já
  renderizados — nenhum "Just a moment", captcha, ou bloqueio Cloudflare).
- `robots.txt` (`https://uhuu.com/robots.txt`) só desautoriza `/busca`
  (mecanismo de busca interna) — todas as rotas usadas por este scraper
  (`/categoria/*`, `/evento/*`) estão liberadas.
- O rodapé do site anuncia "protected by Queue-Fair" — é uma sala de espera
  virtual (fila de compra) usada em picos de demanda de venda de ingresso,
  não uma proteção de navegação/scraping. Não foi acionada em nenhuma
  requisição desta investigação (listagem, paginação, ou página de evento).

**Conclusão:** ao contrário do Clubinho (precisa de Playwright + probe de API
+ fallback `--headed` para bloqueio 403 em headless) e do Sympla (SPA
hidratada, às vezes precisa de `--headed`), a Uhuu **não precisa de
Playwright**. O scraper usa `fetch` nativo + `jsdom` para parsear o HTML —
mais simples e mais rápido, sem sessão de navegador.

---

## Estrutura do site

- **Stack:** servidor Laravel (cookies `laravel_session`, `XSRF-TOKEN`),
  renderização 100% server-side. Sem `__NEXT_DATA__`, sem Nuxt, sem
  JSON-LD (`application/ld+json`) — diferente de Clubinho e Sympla.
- **Listagem por categoria:** `https://uhuu.com/categoria/{slug}-{id}?page=N`.
  Categoria relevante: `familia-infantil-11`. Paginação simples via
  query string, sem necessidade de scroll/JS.
- **Achado-chave:** cada card de evento na listagem
  (`.item.card-evento`) embute um `<script>` com uma chamada
  `gtag('event', 'select_item', { items: [{...}] })` contendo um payload
  estruturado com **todos os campos essenciais já prontos**: `item_name`,
  `local_nome`, `local_cidade`, `local_uf`, `event_date`, `event_hour`,
  `price`, `parental_rating`. Isso elimina a necessidade de parsing de texto
  livre para esses campos (equivalente, em utilidade, a uma API interna —
  a hipótese da story "site tem estrutura HTML ou API interna suficiente"
  se confirma, só que via analytics embutido, não um endpoint JSON).
- **Página de evento** (`/evento/{uf}/{cidade}/{slug}-{id}`): sinopse,
  duração e classificação indicativa completa só aparecem aqui, na aba
  "Sobre" (`.tabs-content-item.sobre`), em texto livre com o mesmo padrão
  observado no Clubinho ("CLASSIFICAÇÃO INDICATIVA: Livre", "DURAÇÃO
  APROXIMADA: 60 minutos") — por isso o scraper reaproveita
  `extractDuracaoMinutos` de `scripts/scraper/parse.ts` (com uma pequena
  normalização de texto, ver `scripts/scraper/uhuu.ts`).
- **Endereço:** a Uhuu **não expõe endereço textual** em nenhuma página —
  só um link para o Google Maps com coordenadas (`.../maps/place/-22.87,-43.46`).
  Sem geocoding (mesma decisão de projeto já registrada em
  `scripts/normalizer/sympla.ts`), o campo `endereco` fica vazio — mesmo
  padrão de gap já visto no Sympla antes de US-S40/S51/S61.
- **Bairro:** não é exposto separadamente (só `local_cidade`/`local_uf`,
  ex. "Rio de Janeiro"/"RJ") — fica vazio, para o Gemini tentar inferir do
  venue/sinopse.

## Mapeamento de campos vs. `LinhaEnriquecida`

Ver comentário completo em `scripts/normalizer/uhuu.ts` (AC6). Resumo:

| Campo | Vem de | Observação |
|---|---|---|
| `nome`, `venue`, `dias_apresentacao`, `url_origem`, `url_ingresso` | payload `gtag` do card de listagem | sempre presentes |
| `categoria_origem`, `sinopse_oficial`, `duracao_minutos` | página do evento (aba Sobre) | `duracao_minutos` fica vazio se o texto não citar "N minutos" |
| `idade_minima`, `idade_maxima` | `parental_rating` do card ("Livre" → 0–18; "N Anos" → N–vazio) | mesma convenção editorial de `parse.ts` |
| `preco_bruto`, `preco_inteira_centavos` | `price` do card | sempre "a partir de" — Uhuu não expõe preço cheio separado |
| `bairro`, `endereco`, `horarios_sessao`, `desconto_percentual` | — | sempre vazios; para Gemini preencher ou revisão manual |

---

## Filtro geográfico (AC3)

O card já traz `local_cidade`/`local_uf` estruturados e exatos (não é texto
livre tipo Sympla). Mesmo assim, o scraper reaproveita
`isLocalizacaoRioDeJaneiro()` (já usado por Clubinho e Sympla) para manter
consistência entre fontes — compõe `"{venue} - {cidade}, {uf}"` (a função
espera vírgula, a Uhuu usa barra: `"Rio de Janeiro/RJ"`) antes de chamar.
Validado em execução real: 22 eventos nacionais da categoria → 4 aceitos no
município do RJ, 0 falsos positivos/negativos na amostra observada
(inclusive rejeitando corretamente São Paulo, Recife, Fortaleza, Canoas
etc. na mesma categoria).

---

## AC5 — "pelo menos 5 eventos reais capturados": gap transparente

Execução real de validação (22/07/2026, `pnpm scrape --source uhuu`):

```
22 listados / 4 no município do RJ / 4 enriquecidos
```

Os 4 eventos capturados são reais, corretos e verificados manualmente
(Turminha do Teatro × 2 no Teatro Bangu Shopping, Maria Clara & JP no Teatro
Claro MAIS RJ, Kysha & Mine no Espaço Hall). **Isso é 1 evento abaixo do
piso de 5 do AC5.**

Isso não é um defeito do scraper — é o volume real, hoje, da categoria
"Família / Infantil" da Uhuu filtrada para o município do RJ. Confirmado
contando manualmente as duas páginas da categoria (12 + 10 cards
nacionais, 4 deles RJ) antes mesmo de escrever código.

**Causa da escassez:** a Uhuu categoriza de forma inconsistente — pelo
menos um evento claramente infantil ("Aventura Congelante", tributo musical
ao filme Frozen, classificação indicativa "Livre", 532 lugares no Teatro
Bangu Shopping) está taggeado como "Musical", não "Família / Infantil".
Mesmo padrão de inconsistência que já existe no Sympla (por isso
`sympla-scrape.ts` varre 5 categorias com um filtro de palavra-chave
`isConteudoInfantil`, não só a categoria "infantil").

**Testado e descartado para esta story:** um filtro por palavra-chave (nome
+ descrição) nos moldes do Sympla não pega "Aventura Congelante" — nem o
título nem a sinopse completa usam as palavras "infantil/criança/kids/
família/mirim". Filtrar por padroa `parental_rating` presente/"Livre" seria
mais eficaz para a Uhuu (funciona bem no exemplo testado), mas exigiria
varrer + buscar a página de cada evento de outras categorias
nacionalmente antes de saber a UF — aumento real de escopo (mais
requisições, mais uma dimensão de classificação) que não cabe no SP desta
story.

**Decisão tomada nesta sessão:** manter o escopo da story restrito à
categoria dedicada "Família / Infantil" (paridade com o Clubinho: uma
fonte, uma categoria, sem heurística de classificação cross-categoria) e
reportar o número real e honesto (4, não inflado). **Recomendação para o
Rafa:** se cobertura mais ampla for prioridade, abrir uma story de
sequência (mesmo padrão da expansão multi-categoria do Sympla) usando o
sinal `parental_rating` — que se mostrou mais confiável que
palavra-chave para este site — como critério de inclusão.

---

## Decisão de arquitetura: sem Playwright

Diferente de Clubinho (`scripts/scraper/browser.ts` + `scrape-listing.ts` +
`scrape-atracao.ts`) e Sympla (idem), `scripts/scraper/uhuu.ts` usa `fetch`
nativo + `jsdom` (já dependência do projeto, usado hoje só como ambiente de
teste do Vitest — `vitest.config.ts`). Não há `@types/jsdom` no projeto;
como `scripts/` já fica fora do `tsc` oficial (débito conhecido, ver
HANDOFF v9), foi adicionada uma declaração de tipos ambiente mínima em
`scripts/types/jsdom.d.ts` em vez de instalar um novo pacote.

Justificativa: a Uhuu não tem proteção que exija JS/sessão de navegador —
usar Playwright aqui seria complexidade sem benefício (mais lento, mais uma
dependência de infraestrutura por execução).
