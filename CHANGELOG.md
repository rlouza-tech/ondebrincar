# Changelog

Todas as mudanças notáveis do projeto são documentadas aqui.
Formato: [Unreleased] / [Sprint X] — adicionado, corrigido, mudado.

---

## [Unreleased]

### Sprint 6

#### US-F1 — Botão "Salvar" sem feedback visual

- **`components/AtracaoDetailActions.tsx`**: botão Salvar desabilitado (`disabled`, `opacity-50`, `cursor-not-allowed`) com `title="Em breve"` e `aria-label` atualizado. Estado `favorite` e handler `handleSaveClick` removidos — nenhum evento `save_click` é disparado enquanto US-I14 (favoritos) não estiver implementado.
- **`components/AtracaoDetailActions.test.tsx`** (novo): 5 casos de teste — botão visível, desabilitado, texto correto, title correto, ausência de `save_click` ao clicar.

#### US-F2 — Gerenciar expectativa de busca no header

- **`components/SearchButton.tsx`** (novo): componente client-side que substitui o `<Link>` de busca no header. Clique exibe toast "Busca chegando em breve" (fundo `#1C1917`, texto `#FDFAF4`, border-radius 8px, ícone `Clock` do lucide) por 2.5s. Clique repetido reinicia o timer sem duplicar o toast.
- **`components/SiteHeader.tsx`**: substituído `<Link href="/">Buscar</Link>` por `<SearchButton />`.
- **`app/buscar/page.tsx`**: `permanentRedirect` removido; substituído por `redirect` simples (rota reservada para busca futura).
- **`lib/analytics.ts`**: evento `search_attempted` disparado via `trackEvent` a cada clique no botão.
- **`components/SearchButton.test.tsx`** (novo): 6 casos de teste com Vitest + react-dom/client (render, toast visível/oculto, timer de 2.5s, evento GTM, clique repetido).

#### US-S4.1e — Corrigir regras de extração e tom no prompt Gemini

- **`lib/prompts/voice-adapter.ts`**: `CANONICAL_EXAMPLES` substituídos por 3 fichas reais aprovadas do batch 2026-05-26 (O Mágico de Oz / Gávea, Show Musical do Mickey / Cachambi, João e Maria / Cachambi) — todos `auto_ok`, `confidence: 5`. Exemplos fictícios removidos.
- **`lib/prompts/voice-adapter.ts`**: `buildIncertezaInstruction()` expandida com anti-padrão explícito (proíbe afirmar valor incerto após `[INCERTO]`) e limites de caracteres obrigatórios para `descricao` (≤ 600), `mini_review` (≤ 400) e `programacao_texto` (≤ 200) com instrução de truncamento.
- **`scripts/pipeline-ia/prompt.ts`**: Exceção de classificação etária — quando `sinopse_oficial` contém "Classificação: Livre", `idade_min` é forçado para 0, ignorando `idade_minima` do scraper (que reflete regra de meia-entrada, não classificação do espetáculo).
- **`scripts/pipeline-ia/prompt.ts`**: Exceção de duração suspeita — `duracao_minutos ≤ 5` é descartado (padrão de "X minutos de caminhada" extraído erroneamente pelo scraper), tratado como `null` + `abstain_fields` + `notes_for_editor`.
- **`scripts/pipeline-ia/prompt.ts`**: Nova seção CARTAZ ESTENDIDO — esclarece uso de `evento_recorrente` vs `permanente` para temporadas longas.
- Testes: 91 passando (eram 73 antes da story).
- Custo batch 86 fichas: R$0,19 (limite AC4: R$0,20 ✅).

#### Débito técnico identificado

- **Cinemas não devem ser categoria suportada:** Kinoplex, UCI, Cinemark e Cinesystem entram no pipeline mas `idade_min/max` é sempre incerto (depende do filme) e o conteúdo foge da curadoria de atrações infantis. Story futura: bloquear `categoria: cinema` no scraper e/ou no quality gate. Parking lot.
- **Scraper extrai duração errada de contexto de transporte:** texto "X minutos de caminhada" na seção "Como chegar" é interpretado como `duracao_minutos`. Mitigado no prompt (valores ≤ 5 descartados), mas a correção correta é filtrar esse campo no scraper. Estimativa: 2 SP.
- **Browser crash cascade no scraper:** quando uma página devolve `chrome-error://chromewebdata/`, o `about:blank` de recovery ainda causa dominó nos ~12 items seguintes. Fix correto: reabrir a `page` (ou o browser) após detectar um crash, não apenas navegar para `about:blank`. Estimativa: 2 SP.
- **`retry-urls.ts` com URLs hardcoded:** funciona como solução pontual, mas se falhas recorrentes virarem padrão, o ideal é um flag `--retry-failed` no scraper principal que leia um arquivo de URLs falhas gerado automaticamente.

#### Adicionado

- **US-S4.2 — Filtro geográfico no scraper**
  - `scripts/scraper/parse.ts`: função `isLocalizacaoRioDeJaneiro(venue, bairro?)` — aceita
    venues com marcador explícito de RJ ("Rio de Janeiro" ou ", RJ"), rejeita marcadores de
    outros estados/cidades (SP, MG, BA, ES, PR, SC, RS, Niterói), e mantém eventos sem
    marcador geográfico (bairros cariocas ambíguos como Tijuca, Recreio).
  - `scripts/scraper/index.ts`: filtro aplicado no loop principal pós-scrape; log de execução
    exibe "X eventos aceitos / Y descartados (fora do município do RJ)".
  - `scripts/scraper/clubinho-api.ts`: interface `ClubinhoProductApi.venues[].address`
    extendida com `city?` e `state?` para uso futuro.
  - Testes unitários em `scripts/scraper/__tests__/parse.test.ts` cobrindo aceite por
    marcador RJ explícito, rejeição por SP/Niterói, e aceite de bairros ambíguos sem cidade.

---

## Sprint 5

- Identidade visual: logo MapPin + "onde brincar.", paleta 8 tokens, fontes Fraunces + Nunito.
- Filtros funcionais na Home (5 grupos, estado na URL).
- Página de atração completa (`/atracao/[slug]`) com CTA "Ver ingresso".
- GTM + Consent Mode v2 + 5 eventos NSM no dataLayer.
- `outbound_click` com `destination_type` (sympla / eventim / clubinho / official_site) + `partner`.

## Sprint 4

- Scraper v2: extração de `url_ingresso = productUrl` corretamente via API do Clubinho.
- Pipeline IA: Gemini Flash 2.5, custo médio R$0,15/batch de 86 fichas.
- Sanity v3 Studio embarcado em `/studio`.
