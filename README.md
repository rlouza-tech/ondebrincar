# Onde Brincar

Hub de descoberta de atrações infantis no Rio de Janeiro (pré-lançamento Q1–Q2 2026). Curadoria humana + funcionalidade para pais cariocas planejando o programa de fim de semana.

**URL:** https://ondebrincar.com.br

**Stack:** Next.js 14 (App Router), TypeScript, pnpm, Sanity, Vercel, Resend, Vitest.

## Desenvolvimento

Requisitos: Node.js 20+, pnpm 9+.

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm lint
pnpm test
pnpm build
```

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`): `pnpm lint` + `pnpm test` em todo PR para `main`.
- **Vercel**: importe o repositório no dashboard; previews automáticos por PR.
- **Branch `main`**: proteção com review obrigatório (ver `docs/setup/github-vercel.md`).

## Estrutura

| Caminho | Uso |
|---------|-----|
| `app/` | Rotas App Router |
| `components/` | UI compartilhada |
| `lib/` | Utilitários e domínio leve |
| `database/` | Schema SQL de referência |

## Onde Brincar
Hub de descoberta de atrações infantis no Rio de Janeiro.
