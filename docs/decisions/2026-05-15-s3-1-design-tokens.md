# S3.1 — Design tokens Tailwind

**Data:** 2026-05-15  
**Story:** US-S3.1

## Decisões

| Tema | Escolha | Motivo |
|------|---------|--------|
| Cores semânticas | Hex do roadmap (`#10B981`, `#F59E0B`, `#DC2626`) | Coerência com artefatos visuais |
| Secondary | `#3B6EA8` | Tom médio da família azul da primária `#1F3864`; não estava no board com hex fixo |
| Tipografia | Inter via `next/font/google` | Free tier, legível, padrão de mercado |
| Espaçamento | Base-4 (default Tailwind) | Sem escala custom — AC atendido com documentação |
| Breakpoints | Default Tailwind v3 | `sm`–`xl` mobile-first de fábrica |

## Fora de escopo

- Tailwind v4 / CSS-first config
- Tokens em JSON separado do `tailwind.config.ts`
- Dark mode completo (apenas `prefers-color-scheme` básico em `globals.css`)
