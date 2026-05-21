# I2.5 — Foto opcional no schema Atração

**Data:** 2026-05-21  
**Story:** US-I2.5

## Decisão

Remover `Rule.required()` do campo `foto` em `sanity/schemas/atracao.ts`. O subcampo `alt` permanece obrigatório **quando** há imagem (comportamento padrão do Sanity em campos opcionais).

## Razão

Desbloquear publicação em massa do catálogo (55+ fichas) sem exigir asset real por ficha. Fotos entram gradualmente via `associate-imagens` ou upload manual no Studio.

## Comportamento esperado

| Contexto | Comportamento |
|----------|----------------|
| Draft/publicado sem `foto` | Publicação permitida no Studio |
| Site público (`mapSanityAtracao`) | `imagemUrl` → `/placeholder-atracao.svg` (fallback já existente) |
| `associate-imagens` | Inalterado — patcha `foto` quando arquivo existe em `data/input/imagens/` |

## Placeholder

`public/placeholder-atracao.svg` — aspect ratio 4:3 (1200×900), paleta primary/secondary dos design tokens, texto "Foto em breve".

**Próxima evolução (US-Vis.1):** substituir placeholder genérico por arte da identidade visual quando branding estiver definido.

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| Placeholder local vs asset Sanity | Zero custo CDN; SSG simples | Visual genérico até US-Vis.1 |
| Não alterar `lib/atracoes.ts` | Fallback já testado | — |
