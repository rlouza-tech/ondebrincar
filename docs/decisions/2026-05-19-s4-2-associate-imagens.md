# S4.2 — Associar imagens locais a drafts Sanity

**Data:** 2026-05-19  
**Story:** US-S4.2

## Decisão

CLI separado `pnpm associate-imagens` (não estende `import-sanity`). Faz **patch** em drafts existentes (`drafts.atracao-<slug>`).

## Pasta e pareamento

- Imagens em `data/input/imagens/{slug}.{jpg,jpeg,png,webp}`
- Slugs vêm do CSV enriquecido (`--latest` ou caminho explícito)
- `venue` para o `alt` vem de `data/input/planilha-origem.csv` (mesmo algoritmo de slug da pipeline)

## Idempotência e skips

| Situação | Comportamento |
|----------|----------------|
| Sem arquivo de imagem | Skip silencioso (sem log stdout; entra no JSON) |
| Draft inexistente | Skip com log `draft_inexistente` |
| `foto` já preenchida | Skip com log `foto_existe` |
| Imagem encontrada | Upload + patch |

Sem alteração de schema: `foto` continua obrigatória para **publicar** no Studio; drafts podem existir sem foto até este CLI rodar.

## Otimização

`sharp`: resize `inside` 1200×800, saída WebP. Warnings de tamanho original (`>5MB`, `<100KB`) em stdout + relatório JSON — não bloqueiam upload.

## Alt

Template: `Foto: {nome} em {venue ?? bairro}`, truncado em 160 caracteres.

## Fora de escopo (MVP)

- UI `/admin/import`
- Google Drive API
- `pendente_imagem` / placeholder no CMS
