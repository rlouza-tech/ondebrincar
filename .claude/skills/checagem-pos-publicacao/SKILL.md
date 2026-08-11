---
name: checagem-pos-publicacao
description: Roda checagens pós-publicação sobre o catálogo já publicado do Onde Brincar — hoje só dedup cross-fonte (`pnpm check-duplicatas-cross-fonte`), mas é o lugar natural pra qualquer verificação futura do mesmo tipo. Nesta primeira versão é chamada pela skill Orquestradora, como último passo do pacote completo — não pensada pra rodar isolada ainda. Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Checagem pós-publicação — Pipeline editorial (Onde Brincar)

Nasce da decisão do Kickoff da Sprint 15 (31/07): em vez de replicar a checagem de duplicata
cross-fonte em cada skill isolada (Clubinho, Sympla, Raindrop — US-S66/S67/S68, agora
superadas por esta story), ela vira uma skill própria, dedicada a checagens pós-publicação
sobre o catálogo já publicado. Hoje só dedup cross-fonte (ADR
`docs/decisions/2026-08-07-dedup-cross-fonte.md`), mas é o lugar natural pra qualquer
verificação futura do mesmo tipo.

## Protocolo de cores desta skill

Definição geral de 🟢/🔴 mora na skill `orquestradora`, seção "Protocolo de cores
compartilhado" — não repetida aqui.

- 🟢 `pnpm check-duplicatas-cross-fonte` — read-only, sem custo de Gemini/imagem, sem flag de
  aplicação (o script nunca escreve no Sanity).

## Rotina

```
pnpm check-duplicatas-cross-fonte
```

Do output, guarde: quantidade de pares candidatos e o caminho do relatório `.md` gerado
(`data/output/duplicatas-cross-fonte-*.md`).

Nunca aplica nada sozinha — só informa. Se achar pelo menos 1 candidato, avise o Rafa
explicitamente, sem esperar ele perguntar, e lembre que a decisão de qual ficha marcar como
`duplicada` é sempre manual dele, via `pnpm apply-duplicatas --slug <slug> --execute`
(US-S64).

## Fora de escopo

- **Aplicar a marcação `duplicada`**: sempre via `apply-duplicatas`, sempre manual do Rafa —
  nunca por esta skill.
- **Rodar isolada fora da Orquestradora**: nesta primeira versão, esta skill é chamada só
  como último passo do pacote completo (skill `orquestradora`). Se fizer sentido rodar
  isolada no futuro, é ajuste futuro — não decidido agora.

## Ao terminar

Feche com uma linha de resumo no mesmo formato agregável das demais skills-filhas — ex.:
"Duplicata cross-fonte: N pares candidatos encontrados (relatório: <caminho do .md>)". É o
formato que a skill `orquestradora` já consolida no resumo final do pacote completo.
