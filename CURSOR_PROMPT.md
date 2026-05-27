# Prompt para o Cursor — Onde Brincar · Setup de Identidade Visual

## Contexto
Estou construindo o MVP do **Onde Brincar**, um hub de atrações infantis no Rio de Janeiro feito em **Next.js 14 (App Router) + Tailwind CSS**.

A identidade visual já foi definida e os arquivos de referência estão na raiz do projeto:
- `tailwind.config.ts` — tokens de cor e tipografia já configurados
- `components/Logo.tsx` — componente de logo pronto

## Fontes (Google Fonts)
Adicione as fontes **Fraunces** e **Nunito** no `app/layout.tsx` via `next/font/google`:

```ts
import { Nunito, Fraunces } from 'next/font/google'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '600', '700', '800', '900'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['300', '500', '700', '900'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
})
```

Aplique as variáveis CSS no `<html>`:
```tsx
<html className={`${nunito.variable} ${fraunces.variable}`}>
```

## Tarefas

1. **Substituir** o `tailwind.config.ts` existente pelo arquivo fornecido
2. **Adicionar** as fontes no `app/layout.tsx` conforme acima
3. **Criar** `components/Logo.tsx` com o arquivo fornecido
4. **Garantir** que `font-display` aponta para Fraunces e `font-sans` para Nunito no config

## Uso do Logo (referência)
```tsx
// Navbar (fundo claro)
<Logo variant="light" size="md" />

// Footer ou fundo escuro
<Logo variant="dark" size="sm" />

// Banner brand (fundo laranja)
<Logo variant="brand" size="lg" />

// Sem ícone (só texto)
<Logo variant="light" size="md" showIcon={false} />
```

## Tokens disponíveis após o setup
```
bg-brand-primary    → #F97316  (laranja — CTA, botões)
bg-brand-secondary  → #0EA5E9  (azul — badges)
bg-brand-accent     → #84CC16  (verde — tag "hoje", "novo")
bg-surface-base     → #FDFAF4  (fundo da página)
bg-surface-card     → #F5F2EC  (fundo de cards)
bg-surface-muted    → #E7E5E4  (bordas)
text-ink            → #1C1917  (texto principal)
text-ink-mid        → #78716C  (texto secundário)
text-ink-soft       → #A8A29E  (labels, placeholders)
font-display        → Fraunces (títulos)
font-sans           → Nunito   (corpo, UI)
```

## Observações
- O projeto usa App Router (`app/`), não Pages Router
- Não alterar nenhuma lógica de negócio existente — apenas setup visual
- Após o setup, rodar `npm run dev` e confirmar que o logo renderiza sem erros
