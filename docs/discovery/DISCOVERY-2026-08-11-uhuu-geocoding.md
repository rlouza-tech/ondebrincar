# Discovery — US-S74: Geocoding reverso Uhuu (lat/long → bairro/endereço)

**Story:** US-S74 (3 SP)
**Tipo de sessão:** Execução

---

## Onde a coordenada fica disponível (AC1)

A Uhuu não expõe latitude/longitude em nenhum payload estruturado (nem no
`gtag` da listagem, nem em JSON-LD) — só no `href` do botão "Ver localização"
na página do evento, dentro do bloco `.event-details` com `i.icon-pin`:

```html
<a href="https://www.google.com/maps/place/-22.9663958,-43.1875042"
   target="_blank" class="btn-outline">Ver localização</a>
```

Confirmado via `curl` real contra
`https://uhuu.com/evento/rj/rio-de-janeiro/maria-clara-jp-brincar-e-imaginar-16532`
(evento "Maria Clara & JP - Brincar e Imaginar", Teatro Claro MAIS RJ — uma
das 3 fichas citadas na origem desta story). O seletor
`a[href*="google.com/maps/place/"]` é único na página (1 ocorrência), mais
robusto que depender da classe `btn-outline` (reutilizada em outros botões do
site, embora só apareça 1x nesta página específica).

O scraper não tinha essa extração implementada até esta story — `uhuu.ts`
(US-S28) mapeou a página do evento só para sinopse/duração/categoria.

---

## API de geocoding escolhida (AC2/assumption)

**Nominatim (OpenStreetMap)** — `https://nominatim.openstreetmap.org/reverse`.

- Gratuito, sem chave de API, sem cadastro.
- Política de uso: máx. 1 req/s, requer `User-Agent` identificando a
  aplicação. Cabe folgado no volume da Uhuu (4-22 eventos por execução,
  hoje) — sem risco de estourar limite, diferente do caso que gerou US-O24
  (Vercel Image Optimization, alto volume de imagens).
- Validado com a coordenada real da Maria Clara & JP:

```
curl "https://nominatim.openstreetmap.org/reverse?lat=-22.9663958&lon=-43.1875042&format=json&addressdetails=1&accept-language=pt-BR"
→ address.suburb = "Copacabana"  ✅ bate com o AC4 (bairro correto esperado)
→ address.road = "Rua Siqueira Campos", house_number = "143"
```

O nome do POI mais próximo (`address.amenity`/`name`, ex.: "Termas L'uomo")
não é usado — não corresponde ao venue do evento. Só os campos de hierarquia
geográfica (`suburb`/`neighbourhood`, `road`, `house_number`) são
aproveitados.

---

## Fallback / abstenção (AC3)

Implementado em `scripts/scraper/geocoding.ts` (`reverseGeocodeUhuu`):
qualquer falha (lat/long vazios, HTTP não-200, exceção de rede, resposta sem
`suburb`/`neighbourhood` nem `road`) retorna bairro/endereço vazios — nunca
infere a partir de dado impreciso. Mesmo princípio do abstain_fields do
pipeline-ia (US-S13/US-S56), aplicado aqui na camada de scraper.

Quando `bairro` sai preenchido do scraper, o Gemini não tenta mais inferir
(`scripts/pipeline-ia/prompt.ts:65` — bloco "INFERÊNCIA DE BAIRRO" só roda se
`bairro` do input estiver vazio). É esse mecanismo existente que corrige a
causa raiz do problema original (Gemini "adivinhando" bairro errado a partir
só do nome do venue, sem coordenada — gerou "Botafogo" em vez de
"Copacabana" na revisão de 06/08).

---

## Decisão de MVP anterior ("sem geocoding") — contexto

`scripts/normalizer/sympla.ts` e o discovery original da Uhuu
(`DISCOVERY-2026-07-22-scraper-uhuu.md`) citam uma decisão de não usar
geocoding, registrada originalmente no handoff da Sprint 6
(`Handoff-Sprint-6.md`): "decisão consciente de não usar geocoding no MVP.
Rever quando houver falso-positivo em produção." Essa decisão era sobre o
**filtro geográfico** (aceitar/rejeitar evento por texto, sem geocoding) —
não sobre preencher bairro/endereço. US-S74 não a contradiz: é uma extensão
pontual, escopada à fonte Uhuu, motivada por 3 ocorrências reais confirmadas
(padrão dominante da fonte, não exceção).
