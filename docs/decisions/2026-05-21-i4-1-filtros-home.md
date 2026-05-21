# I4.1 — Filtros funcionais na Home

**Data:** 2026-05-21  
**Story:** US-I4.1

## Decisão

Filtros na **Home** (`/`), não em rota `/buscar` separada. Cinco grupos: Bairro, Idade (4 faixas), Categoria, Preço, Ambiente. Estado na URL (`?bairro=&idade=&categoria=&preco=&ambiente=`).

## `/buscar` → `/`

`app/buscar/page.tsx` usa `permanentRedirect()` preservando query string. URLs antigas (`/buscar?bairro=Tijuca`) continuam funcionando.

## Mobile-first

Chips em `flex-nowrap` + `overflow-x-auto` por grupo — evita quebra feia em telas estreitas sem esconder opções.

## Bairros dinâmicos

Lista extraída no Server Component a partir de `getAllAtracoes()` — escala com catálogo Sanity/mock sem hardcode.

## 4 faixas etárias fixas

Chips 0–2, 3–5, 6–9, 10–13 anos (valores representativos na URL: `idade=2|5|9|13`). Mais simples que input numérico em mobile; lógica: `idade_min <= idade <= idade_max`.

## Categoria no mock vs Sanity

`filtrarAtracoes` normaliza labels legíveis do mock (`Teatro infantil`) e slugs Sanity (`teatro`) via `normalizeCategoriaSlug`.

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| Client filter + URL | Instantâneo, shareable | Toda lista no HTML inicial |
| AND entre grupos | Previsível | Combinações vazias possíveis |
| `permanentRedirect` (308) | Padrão Next.js | Não é HTTP 301 literal |

## Fora de escopo

- Filtros server-side no Sanity GROQ (fase futura se catálogo crescer muito)
- Autocomplete de bairro
