# Changelog

Todas as mudanças notáveis do projeto são documentadas aqui.
Formato: [Unreleased] / [Sprint X] — adicionado, corrigido, mudado.

---

## [Unreleased]

### Sprint 6

#### Débito técnico identificado

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
