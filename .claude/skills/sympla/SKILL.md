---
name: sympla
description: Roda o fluxo do Sympla no pipeline editorial do Onde Brincar (scrape → enrich → aprovar → check-novidades → pipeline-ia → checkpoint → import-sanity). Use quando o Rafa pedir para "puxar novidades do Sympla", "rodar o Sympla" ou equivalente, ou quando for a vez do Sympla na rotina completa (chamado pela skill Orquestradora, 2ª da ordem, depois do Clubinho). Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Sympla — Pipeline editorial (Onde Brincar)

Extraída do Fluxo 2 da skill `pipeline-editorial` (US-O22) na decomposição por fluxo decidida
na ADR de US-E4 (`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`) —
sem mudança de comportamento em relação ao fluxo original, só isolamento por fonte. 2ª da ordem
de execução do bloco de skills (Clubinho → Sympla → Raindrop → Avançar-datas → Orquestradora).

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
"Protocolo de cores compartilhado" — não repetida aqui (AC3 de US-E5). Mapeamento específico
desta skill:

- 🟢 `sympla-scrape`, `sympla-enrich`, `check-novidades`, `pipeline-ia`.
- 🔴 `import-sanity --execute`.

## Rotina

```
pnpm sympla-scrape
pnpm sympla-enrich
pnpm sympla-aprovar
```
`sympla-aprovar` é interativo — abre cada link e pergunta no terminal se aprova. Deixe o Rafa
conduzir essa parte, não tente automatizar a aprovação.

**Se o Rafa já disser a decisão em texto no chat** (ex.: "reprovo os dois, são repetidos") em
vez de rodar o comando ele mesmo: não tente automatizar via pipe (`printf "n\n" | pnpm
sympla-aprovar`) — o `readline` do script fecha antes da segunda pergunta por causa do delay do
`open` do link no browser, e o comando falha no meio. O caminho é editar
`data/input/sympla-revisao-pendente.json` direto: aprovados saem de lá e entram em
`data/input/sympla-raw-enriquecido.json` (sem o campo `revisao_manual`); rejeitados só saem de
`sympla-revisao-pendente.json` sem ir a lugar nenhum. Confirme o resultado antes de seguir.

```
pnpm check-novidades --source sympla
```
Se `check-novidades` disser 0 fichas novas, pare aqui e avise o Rafa — não vale a pena gastar
Gemini à toa.

```
pnpm pipeline-ia --source sympla
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
pnpm import-sanity --source sympla --execute
```
Isso só cria **draft** no Sanity — nunca publica. Lembre o Rafa: revisar e publicar no Studio
fica para ele, manualmente.

## Ao terminar

Feche com uma linha de contagem final clara — ex.: "Sympla: N fichas novas, M criadas como
draft (K em needs_human)". Esse é o formato que a skill `orquestradora` consolida no relatório
do pacote completo quando ela chama esta skill; ao rodar esta skill isolada (fora do pacote
completo), é só o resumo que o Rafa vê no fim desta rotina.
