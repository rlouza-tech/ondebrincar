# S3.2 — Componentes base

**Data:** 2026-05-15  
**Story:** US-S3.2

## Decisões

| Tema | Escolha | Motivo |
|------|---------|--------|
| Catálogo visual | `/design-system` (Next.js) | Storybook é overkill no MVP Lean |
| Primitivo de classe | `lib/cn.ts` local | Evita dependência `clsx`/`tailwind-merge` nesta story |
| AtracaoCard | Client component | Toggle de favorito interativo na vitrine |
| Imagem demo | `public/placeholder-atracao.svg` | Sem config de domínio remoto no `next.config` |
| shadcn/ui | Apenas referência de API | Não copiado; tokens S3.1 via Tailwind |

## Acessibilidade

- `focus-visible:outline` em controles interativos
- `aria-pressed` em FilterChip e favorito
- `aria-busy` / `disabled` em Button loading
- `aria-labelledby` no título do AtracaoCard
