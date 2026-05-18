# Onde Brincar

Hub de descoberta de atrações infantis no Rio de Janeiro.

**Stack:** Next.js 14 · TypeScript · Tailwind · Sanity CMS · Gemini Flash 2.5 · Vercel

**Status:** Em desenvolvimento (MVP previsto pra dez/2026)

**Produção:** [ondebrincar.com.br](https://ondebrincar.com.br) _(em breve)_

## Desenvolvimento

Requisitos: Node.js 22+, pnpm 9+.

```bash
pnpm install
pnpm dev
```

Abre http://localhost:3000.

```bash
pnpm lint
pnpm test
pnpm build
```

## Rotas (fase A — mock)

| Rota | Descrição |
|------|-----------|
| `/` | Home com grid de atrações |
| `/atracao/[slug]` | Ficha da atração (SSG) |
| `/buscar?bairro=&idade=` | Lista filtrada (ex.: `?bairro=Tijuca&idade=4`) |
| `/design-system` | Vitrine de componentes base |

Dados vêm do Sanity quando configurado; `lib/mock-atracoes.ts` permanece como fallback para dev e dataset vazio.

## Sanity Studio

A Studio fica embarcada no Next.js em `/studio`.

```bash
pnpm dev
```

Abre http://localhost:3000/studio. Os valores reais ficam em `.env.local`
(gitignored); use `.env.example` como referência.

Decisão técnica: `docs/decisions/2026-05-15-s2-2-sanity-setup.md`.

## CI/CD

- **GitHub Actions** (`.github/workflows/ci.yml`): `pnpm lint` + `pnpm test` em todo PR para `main`.
- **Vercel**: previews automáticos por PR.
- **Branch `main`**: proteção com review obrigatório (ver `docs/setup/github-vercel.md`).

## Estrutura

| Pasta | Função |
|---|---|
| `app/` | App Router do Next.js |
| `components/` | UI compartilhada |
| `lib/` | Utilitários e domínio leve |
| `database/` | Schema SQL de referência |
| `docs/design-tokens.md` | Cores, tipografia, espaçamento e breakpoints |
| `docs/components.md` | API dos componentes base (US-S3.2) |
| `sanity/schemas/` | Schemas editoriais do Sanity |
| `docs/` | Documentação técnica e ADRs |