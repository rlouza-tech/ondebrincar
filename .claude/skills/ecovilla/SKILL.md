---
name: ecovilla
description: Roda o fluxo da EcoVilla no pipeline editorial do Onde Brincar (scrape → check-novidades → pipeline-ia → checkpoint → import-sanity). Use quando o Rafa pedir para "puxar novidades da EcoVilla", "rodar a EcoVilla" ou equivalente, ou quando for a vez da EcoVilla na rotina completa (chamada pela skill Orquestradora). Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill EcoVilla — Pipeline editorial (Onde Brincar)

6ª fonte do pipeline editorial, adicionada depois do bloco original de 5 skills decidido na
ADR de US-E4 (`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`).
US-E18 (Sprint 16) completou o suporte no `pipeline-ia`/`import-sanity`/schema/scraper. Esta
skill empacota o fluxo completo, no mesmo padrão da Uhuu (US-E14/E15).

## Antes de tudo

1. Confirme que está rodando via `claude` no terminal do Rafa, dentro da pasta do projeto —
   **não** dentro do Cowork. Se não tiver certeza, pergunte.
2. `git status` + `git branch --show-current` — confirme que está em `main` e sem mudanças
   não commitadas. Se houver trabalho pendente de sessão anterior (branch de feature com
   diffs, arquivos untracked), não descarte nada: pare e alinhe com o Rafa o que fazer com
   esse trabalho (commitar em branch própria, etc.) antes de seguir com a rotina.
3. `git log main..origin/main --oneline` — confirme que não há mudança de código pendente
   que deveria vir antes.

## Protocolo de cores desta skill

Definição geral de 🟢/🔴 (e o aviso de nunca publicar) mora na skill `orquestradora`, seção
"Protocolo de cores compartilhado" — não repetida aqui. Mapeamento específico desta skill:

- 🟢 `scrape`, `check-novidades`, `pipeline-ia`.
- 🔴 `import-sanity --execute`.

## Rotina

```
pnpm scrape --source ecovilla
pnpm check-novidades --source ecovilla
```
Se `check-novidades` disser 0 fichas novas, pare aqui e avise o Rafa — não vale a pena gastar
Gemini à toa.

```
pnpm pipeline-ia --source ecovilla
```
Isso grava `data/output/planilha-enriquecida-<timestamp>.csv` e
`data/output/pipeline-report-<timestamp>.json`.

**Checkpoint (substitui o dry-run do import-sanity):** leia o JSON do report (total, auto_ok,
needs_human, items_with_issues) e o CSV mais recente, e monte um resumo legível por ficha —
nome, categoria, bairro, preço, um trecho da descrição, e se caiu em `needs_human`. Nunca jogue
o CSV cru no terminal — o Rafa já disse que isso é ruim de ler. Pergunte: "importa todas, importa
só X e Y, ou ajusta antes?"

Só depois da resposta:
```
pnpm import-sanity --source ecovilla --execute
```
Isso só cria **draft** no Sanity — nunca publica. Lembre o Rafa: revisar e publicar no Studio
fica para ele, manualmente.

## Diferença em relação às outras fontes

Sem passo de `enrich` separado (mesma natureza da Uhuu) — o scraper da EcoVilla já sai
enriquecido numa passada só, direto da página de programação. Também não precisa de
`--headed` (diferente do Clubinho): o fluxo da EcoVilla não passa pelo probe de Cloudflare,
roda headless normalmente.

## Ao terminar

Feche com uma linha de contagem final clara — ex.: "EcoVilla: N fichas novas, M draft (K em
needs_human)". Esse é o formato que a skill `orquestradora` consolida no relatório do pacote
completo quando ela chama esta skill; ao rodar esta skill isolada (fora do pacote completo), é
só o resumo que o Rafa vê no fim desta rotina.
