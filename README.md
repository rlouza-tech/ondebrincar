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

O prompt injeta a **data atual** e exige **transparência** quando `dias_apresentacao` não traz horário (quality gate valida regressão).

Decisão técnica: `docs/decisions/2026-05-15-s4-1b-pipeline-ia.md`, `docs/decisions/2026-05-20-s4-1e-f-prompt-transparencia.md`.

## Import para Sanity (US-S4.1c)

**Pré-requisitos:** CSV enriquecido em `data/output/` (rode `pnpm pipeline-ia` antes) e `.env.local` com as 3 variáveis Sanity (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_API_TOKEN`).

```bash
pnpm import-sanity --latest --limit 3 --dry-run
pnpm import-sanity data/output/planilha-enriquecida-<timestamp>.csv
```

Cria **drafts** idempotentes (`drafts.atracao-<slug>`). Skip se slug já existe em draft ou publicado. Revise em https://ondebrincar.com.br/studio (ou `http://localhost:3000/studio` local).

Decisão técnica: `docs/decisions/2026-05-19-s4-1c-import-sanity.md`.

## Associar imagens (US-S4.2)

**Pré-requisitos:** drafts no Sanity (`import-sanity`), imagens nomeadas por slug em `data/input/imagens/` (ex.: `{slug}.png`), CSV enriquecido em `data/output/`, `.env.local` com token Sanity **Editor** (obrigatório inclusive no `--dry-run` — leitura de drafts exige autenticação).

```bash
pnpm associate-imagens --latest --limit 3 --dry-run
pnpm associate-imagens --latest --limit 3
```

Faz patch de `foto` no draft (`drafts.atracao-<slug>`). Skip idempotente se `foto` já existe. Sem imagem no disco → skip silencioso. Otimiza com sharp (1200×800 inside, WebP).

Decisão técnica: `docs/decisions/2026-05-19-s4-2-associate-imagens.md`.

## Programação / temporalidade (US-I2.3)

Campos no schema Sanity: `tipo_programacao`, `programacao_texto`, `proxima_data`. Preenchidos pela pipeline IA a partir de `dias_apresentacao` e exibidos na ficha (`/atracao/[slug]`).

```bash
# Re-gerar CSV com campos de programação
pnpm pipeline-ia data/input/planilha-origem.csv --limit 3

# Patch em drafts existentes (idempotente)
pnpm update-drafts-programacao --latest --limit 3 --dry-run
pnpm update-drafts-programacao --latest --limit 3
```

Decisão técnica: `docs/decisions/2026-05-20-i2-3-temporalidade-schema.md`.

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
| `scripts/associate-imagens/` | CLI de imagens locais → foto em drafts |
| `scripts/update-drafts-programacao/` | CLI de patch de programação em drafts |
| `data/input/` | CSV de entrada (Clubinho) |
| `data/output/` | CSV/JSON gerados (gitignored) |
| `docs/` | Documentação técnica e ADRs |