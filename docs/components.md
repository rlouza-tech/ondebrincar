# Componentes base (US-S3.2)

Catálogo interativo: [`/design-system`](/design-system).

## Button

**Arquivo:** `components/Button.tsx`

| Prop | Valores | Default |
|------|---------|---------|
| `variant` | `primary`, `secondary`, `ghost` | `primary` |
| `size` | `sm`, `md`, `lg` | `md` |
| `loading` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |

**Estados:** default, hover, active, `disabled`, `loading` (`aria-busy`).

```tsx
<Button variant="secondary" size="lg">Ver atrações</Button>
<Button loading>Salvando…</Button>
```

## Card

**Arquivo:** `components/Card.tsx`

| Prop | Valores | Default |
|------|---------|---------|
| `padding` | `none`, `sm`, `md`, `lg` | `md` |

Container com borda suave e sombra. Usado como base do `AtracaoCard`.

## FilterChip

**Arquivo:** `components/FilterChip.tsx`

| Prop | Valores | Default |
|------|---------|---------|
| `label` | `string` | — |
| `selected` | `boolean` | `false` |

Pill clicável; `aria-pressed` reflete seleção.

```tsx
<FilterChip label="Zona Sul" selected onClick={…} />
```

## AtracaoCard

**Arquivo:** `components/AtracaoCard.tsx` (client component)

| Prop | Tipo | Descrição |
|------|------|-----------|
| `name` | `string` | Nome da atração |
| `ageRange` | `string` | Faixa etária |
| `price` | `string` | Preço ou "Gratuito" |
| `imageUrl` | `string` | URL da foto |
| `imageAlt` | `string` | Texto alternativo |
| `favorite` | `boolean` | Coração preenchido |
| `onFavoriteToggle` | `() => void` | Toggle de favorito |

Compõe `Card` + `Image` + botão favorito com `aria-pressed` e `aria-label`.
