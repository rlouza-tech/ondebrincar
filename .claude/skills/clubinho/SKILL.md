---
name: clubinho
description: Roda o fluxo do Clubinho de Ofertas no pipeline editorial do Onde Brincar (scrape → check-novidades → pipeline-ia → checkpoint → import-sanity). Use quando o Rafa pedir para "puxar novidades do Clubinho", "rodar o Clubinho" ou equivalente, ou quando for o primeiro passo da rotina completa (chamado pela futura skill Orquestradora). Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Clubinho — Pipeline editorial (Onde Brincar)

Extraída do Fluxo 1 da skill `pipeline-editorial` (US-O22) na decomposição por fluxo decidida
na ADR de US-E4 (`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`) —
sem mudança de comportamento em relação ao fluxo original, só isolamento por fonte. Primeira da
ordem de execução do bloco de skills (Clubinho → Sympla → Raindrop → Avançar-datas →
Orquestradora); Rafa pediu essa posição porque é o fluxo que hoje demora mais.

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

- 🟢 **Roda direto, sem perguntar**: `scrape`, `check-novidades`, `pipeline-ia`. Nada disso
  escreve no Sanity nem gasta crédito de imagem.
- 🔴 **Pausa e pede confirmação explícita antes de rodar**: `import-sanity --execute` —
  escreve no Sanity (dado real) e gasta crédito de geração de imagem (gasto real). Regra do
  projeto (protocolo de cores do CLAUDE.md), não invenção desta skill.
- Nunca clique em "Publicar" no Studio nem peça pra automatizar isso — publicar é sempre
  decisão manual do Rafa, fora do escopo de qualquer script.

## Rotina

```
pnpm scrape --headed
pnpm check-novidades --source clubinho
```
Se `check-novidades` disser 0 fichas novas, pare aqui e avise o Rafa — não vale a pena gastar
Gemini à toa.

```
pnpm pipeline-ia --source clubinho
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
pnpm import-sanity --source clubinho --execute
```
Isso só cria **draft** no Sanity — nunca publica. Lembre o Rafa: revisar e publicar no Studio
fica para ele, manualmente.

## Ao terminar

Feche com uma linha de contagem final clara — ex.: "Clubinho: N fichas novas, M criadas como
draft (K em needs_human)". Esse é o formato que a futura skill Orquestradora (US-E5) vai
consolidar no relatório do pacote completo; até ela existir, é só o resumo que o Rafa vê no
fim desta rotina.
