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

## Pipeline IA (US-S4.1b)

Enriquece o CSV cru do Clubinho com Gemini Flash 2.5 + quality gate. **Não importa para o Sanity** — só gera artefatos em `data/output/`.

```bash
# Copie .env.example → .env.local e preencha GEMINI_API_KEY
pnpm pipeline-ia data/input/planilha-origem.csv
pnpm pipeline-ia data/input/planilha-origem.csv --limit 5 --model gemini-2.5-flash
```

Saídas: `planilha-enriquecida-<timestamp>.csv` e `pipeline-report-<timestamp>.json`.

Decisão técnica: `docs/decisions/2026-05-15-s4-1b-pipeline-ia.md`.

## Import para Sanity (US-S4.1c)

**Pré-requisitos:** CSV enriquecido em `data/output/` (rode `pnpm pipeline-ia` antes) e `.env.local` com as 3 variáveis Sanity (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`).

```bash
pnpm import-sanity --latest --limit 3 --dry-run
pnpm import-sanity data/output/planilha-enriquecida-<timestamp>.csv
```

Cria **drafts** idempotentes (`drafts.atracao-<slug>`). Skip se slug já existe em draft ou publicado. Revise em https://ondebrincar.com.br/studio (ou `http://localhost:3000/studio` local).

Decisão técnica: `docs/decisions/2026-05-19-s4-1c-import-sanity.md`.

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
| `scripts/pipeline-ia/` | CLI de enriquecimento com Gemini |
| `scripts/import-sanity/` | CLI de import CSV → drafts Sanity |
| `data/input/` | CSV de entrada (Clubinho) |
| `data/output/` | CSV/JSON gerados (gitignored) |
| `docs/` | Documentação técnica e ADRs |