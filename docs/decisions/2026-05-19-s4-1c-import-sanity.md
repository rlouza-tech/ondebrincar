# S4.1c — Import CSV enriquecido para drafts Sanity

**Data:** 2026-05-19  
**Story:** US-S4.1c

## Decisão

CLI `pnpm import-sanity` lê o CSV enriquecido da pipeline IA e cria **apenas drafts** no Sanity, nunca publica automaticamente.

## Idempotência com `_id` determinístico

- Draft: `drafts.atracao-<slug>` (prefixo `drafts.` = documento draft no Sanity)
- Publicado existente: `atracao-<slug>` (checagem antes de criar)

Se draft **ou** documento publicado com o mesmo slug já existir → **skip** (nunca sobrescreve trabalho humano).

Preferimos IDs legíveis em vez de UUID para facilitar debug e suporte editorial.

## O que entra no documento

- 15 campos editoriais do schema + `review_status` preservado da pipeline
- `status` fixo em `operando` na importação
- **Sem foto** — pareamento de imagem fica para US-S4.2
- `preco` e `duracao_min` omitidos do payload quando `null` no CSV (não envia literal `null`)

## Fluxo editorial

`review_status` (`auto_ok` | `needs_human`) guia o curador no Studio. Só após revisão manual o documento deve ser publicado (`human_approved` no schema).

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| Skip draft + published | Seguro, sem perda de edição humana | Slug alterado manualmente no Sanity não é detectado |
| `--dry-run` | Valida mapeamento sem writes | Ainda consulta Sanity para skips |
| `--latest` | Conveniente pós pipeline | Depende de `data/output/` local |

## Relatório

`data/output/import-report-<timestamp>.json` com total, created, skipped, errors e motivo por slug.
