# Design tokens (US-S3.1)

Tokens centralizados em `tailwind.config.ts`. Uso nas classes Tailwind (`text-primary`, `p-4`, `md:flex`, etc.).

## Cores

| Token | Hex | Classe exemplo | Uso |
|-------|-----|----------------|-----|
| **primary** | `#1F3864` | `bg-primary`, `text-primary` | Marca, títulos, navegação |
| **secondary** | `#3B6EA8` | `bg-secondary`, `text-secondary` | Links, destaques, apoio à primária |
| **success** | `#10B981` | `bg-success`, `text-success` | Confirmações, disponível |
| **warn** | `#F59E0B` | `bg-warn`, `text-warn` | Atenção, ressalvas |
| **error** | `#DC2626` | `bg-error`, `text-error` | Erros, indisponível |

Variantes `*-foreground` para texto sobre fundo sólido (`text-primary-foreground`).

## Tipografia

**Família:** Inter (`next/font/google`), aplicada via `font-sans`.

| Nível | Classe | Tamanho | Line height |
|-------|--------|---------|-------------|
| xs | `text-xs` | 12px (0.75rem) | 16px |
| sm | `text-sm` | 14px (0.875rem) | 20px |
| base | `text-base` | 16px (1rem) | 24px |
| lg | `text-lg` | 18px (1.125rem) | 28px |
| xl | `text-xl` | 20px (1.25rem) | 28px |
| 2xl | `text-2xl` | 24px (1.5rem) | 32px |

`2xl` reservado para títulos de seção; corpo de texto usa `base` / `lg`.

## Espaçamento (base-4)

Escala padrão Tailwind: **1 unidade = 4px** (`0.25rem`).

| Classe | Valor |
|--------|-------|
| `p-1` / `m-1` | 4px |
| `p-2` / `m-2` | 8px |
| `p-4` / `m-4` | 16px |
| `p-6` / `m-6` | 24px |
| `p-8` / `m-8` | 32px |

Preferir múltiplos de 4 (`gap-4`, `px-6`, `py-8`) para consistência.

## Breakpoints (mobile-first)

Estilos sem prefixo = mobile. Prefixos sobrescrevem a partir do min-width:

| Prefixo | Min-width | Uso típico |
|---------|-----------|------------|
| _(default)_ | &lt; 640px | Mobile |
| `sm:` | 640px | Mobile largo |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Desktop largo |

Exemplo: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.
