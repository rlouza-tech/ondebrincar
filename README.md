# Onde Brincar

Hub de descoberta de atrações infantis no Rio de Janeiro.

**Stack:** Next.js 14 · TypeScript · Tailwind · Sanity CMS · Gemini Flash 2.5 · Vercel

**Status:** Em desenvolvimento (MVP previsto pra dez/2026)

**Produção:** [ondebrincar.com.br](https://ondebrincar.com.br) _(em breve)_

## Desenvolvimento

Requisitos: Node.js 22+, pnpm 9+.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm test
pnpm build
```

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`): `pnpm lint` + `pnpm test` em todo PR para `main`.
- **Vercel**: previews automáticos por PR.
- **Branch `main`**: proteção com review obrigatório (ver `docs/setup/github-vercel.md`).

## Estrutura

| Caminho | Uso |
|---------|-----|
| `app/` | Rotas App Router |
| `components/` | UI compartilhada |
| `lib/` | Utilitários e domínio leve |
| `database/` | Schema SQL de referência |
