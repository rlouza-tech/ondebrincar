# Design tokens (US-S3.1)

Tokens centralizados em `tailwind.config.ts`. Uso nas classes Tailwind (`text-primary`, `p-4`, `md:flex`, etc.).

> **Atualizado em 18/08/2026** (achado da sessão de discovery `DISCOVERY-2026-08-18-navegacao-mobile-app-like.md`): a versão anterior deste arquivo estava desatualizada desde antes do rebrand de identidade visual (Sprint 5, `Handoff Identidade Visual/`) — cores e fonte abaixo foram checadas direto contra `tailwind.config.ts`.

## Cores

### Tokens de marca (`brand.*`)

| Token | Hex | Classe exemplo | Uso |
|-------|-----|----------------|-----|
| **brand.primary** | `#F97316` | `bg-brand-primary`, `text-brand-primary` | Tangerina — CTA, links, logo accent |
| **brand.secondary** | `#0EA5E9` | `bg-brand-secondary` | Azul piscina — badges, ícones de categoria |
| **brand.accent** | `#84CC16` | `bg-brand-accent` | Verde parque — "hoje", "novo", tags positivas |

### Superfície e texto

| Token | Hex | Classe exemplo | Uso |
|-------|-----|----------------|-----|
| **surface.base** | `#FDFAF4` | `bg-surface-base` | Fundo da página |
| **surface.card** | `#F5F2EC` | `bg-surface-card` | Fundo de cards e seções alternadas |
| **surface.muted** | `#E7E5E4` | `border-surface-muted` | Bordas, separadores |
| **ink** (DEFAULT) | `#1C1917` | `text-ink` | Texto principal |
| **ink.mid** | `#78716C` | `text-ink-mid` | Subtítulos, metadados |
| **ink.soft** | `#A8A29E` | `text-ink-soft` | Labels, placeholders |

### Aliases legados (S3.1, ainda em uso em vários componentes)

| Token | Hex | Classe exemplo | Uso |
|-------|-----|----------------|-----|
| **primary** | `#F97316` (= brand.primary) | `bg-primary`, `text-primary` | Marca, títulos (h1, card title), navegação |
| **secondary** | `#0EA5E9` (= brand.secondary) | `bg-secondary`, `text-secondary` | Links, metadados de card, destaques |
| **success** | `#84CC16` (= brand.accent) | `bg-success`, `text-success` | Confirmações, "Curadoria humana", disponível |
| **warn** | `#F59E0B` | `bg-warn`, `text-warn` | Atenção, ressalvas |
| **error** | `#DC2626` | `bg-error`, `text-error` | Erros, indisponível |

Variantes `*-foreground` para texto sobre fundo sólido (`text-primary-foreground`).

## Tipografia

**Famílias:** Fraunces (`--font-display`, fallback `serif`) para títulos display (h1 da home, headings principais); Nunito (`--font-sans`, fallback `sans-serif`) para o restante — aplicada via `font-sans` (padrão) e `font-display` (opt-in).

| Nível | Classe | Tamanho | Line height |
|-------|--------|---------|-------------|
| xs | `text-xs` | 12px (0.75rem) | 16px |
| sm | `text-sm` | 14px (0.875rem) | 20px |
| base | `text-base` | 16px (1rem) | 24px |
| lg | `text-lg` | 18px (1.125rem) | 28px |
| xl | `text-xl` | 20px (1.25rem) | 28px |
| 2xl | `text-2xl` | 24px (1.5rem) | 32px |

`2xl` reservado para títulos de seção; corpo de texto usa `base` / `lg`. (Escala de tamanho não verificada como alterada pelo rebrand — mantida da versão anterior deste doc; `fontSize` não é sobrescrito em `tailwind.config.ts`, só `fontFamily` e `colors`.)

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
