---
name: avancar-datas
description: Roda o fluxo de avançar datas de fichas expiradas no pipeline editorial do Onde Brincar (auto-avancar-datas → revisão manual → mark-expired). Use quando o Rafa pedir para "avançar datas", "resolver fichas vencidas", "rodar o avançar-datas" ou equivalente, ou quando for a vez do avançar-datas na rotina completa (chamado pela skill Orquestradora, 4ª da ordem, depois do Raindrop). Não inclui check-atualizacoes — isso é da futura skill Vigilância de Conteúdo (Fase 2, bloqueada até US-O20 fechar). Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Avançar-datas — Pipeline editorial (Onde Brincar)

Extraída do Fluxo 3 da skill `pipeline-editorial` (US-O22) na decomposição por fluxo decidida
na ADR de US-E4 (`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`),
**sem** o passo `check-atualizacoes` — reservado para a futura skill Vigilância de Conteúdo
(Fase 2, bloqueada até US-O20 fechar). 4ª da ordem de execução do bloco de skills (Clubinho →
Sympla → Raindrop → Avançar-datas → Orquestradora).

Escrita **depois** do fix de US-S53 (mesma sessão), então documenta o comportamento já
corrigido: `auto-avancar-datas` e `check-atualizacoes` tentam a fonte viva
(`dias_apresentacao` re-raspado no mesmo run) antes de cair no fallback de reler o
`programacao_texto` já salvo no Sanity — corrige a causa raiz do incidente "A Casa da Gabi"
(fichas com relistagem recorrente, comum no Clubinho, ficavam irresgatáveis depois de vencidas
porque o dado fresco re-raspado era descartado). Ver
`Handoffs/Handoffs de Execução/Handoff-US-S50-spike-mark-expired-casa-da-gabi.md` (causa raiz
completa) e `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-E8.md` (prompt de abertura desta
sessão, combinando US-S53 + US-E9).

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

- 🟢 `auto-avancar-datas` (dry-run, sem `--execute`), `mark-expired --dry-run` (com ou sem
  `--reactivate`/`--mark-expired`).
- 🔴 `auto-avancar-datas --execute`, `mark-expired --reactivate`, `mark-expired
  --mark-expired`.

## Rotina

**1. Varredura automática global** (cobre Clubinho, Sympla, Uhuu e EcoVilla de uma vez, sem
`--source` — o script carrega a fonte viva das quatro internamente):
```
pnpm auto-avancar-datas
```
Mostre o resultado: quantas fichas com sugestão de data, e a origem de cada uma (`fonte viva`
ou `texto salvo` — o console já rotula). Priorize confiança nas marcadas `fonte viva`, são o
dado mais fresco. Pergunte se aplica.
```
pnpm auto-avancar-datas --execute
```

**2. Revisão manual**: o que sobrou sem sugestão no passo 1 — liste slug, data expirada e link
de origem (`link_compra`, quando houver), e peça pro Rafa decidir ficha por ficha no Studio
(atualizar a data ou desistir). Não invente uma data.

🔴 **Nunca vire `--mark-expired` sem abrir o link de origem individualmente** — mesmo com
volume alto (13+ fichas numa rodada só, como aconteceu em 13/07). Foi exatamente pular esse
passo sob volume que causou 2 despublicações indevidas reais em produção ("A Casa da Gabi",
13/07; "Chaves — Foi sem querer querendo", 20/07) — ver handoff da spike US-S50 linkado acima.
Se o Rafa pedir pra acelerar em volume alto, isso é sinal pra parar e alinhar com ele, não pra
pular a checagem individual.

**3. Fechar o ciclo de status:**
```
pnpm mark-expired --reactivate --dry-run
```
Pra qualquer ficha que o Rafa resgatou no passo 2 mas que ainda estava marcada "encerrada".

⚠️ **Risco identificado (US-S69, análise pós-US-S63, sem sobreposição funcional direta com o
dedup cross-fonte):** reativar uma ficha aqui pode reviver uma duplicata cross-fonte de outra
ficha já publicada — transforma um problema de "duas drafts" em "duas fichas publicadas", pior
que o estado original. Antes de confirmar o `--reactivate` de verdade, dê uma olhada rápida se
o slug (ou nome/venue) que está sendo reativado não bate com nenhum candidato já conhecido de
duplicata cross-fonte (relatório da US-S65/check-duplicatas-cross-fonte, se tiver rodado
recentemente). **Isso é lembrete, não passo obrigatório** — decisão consciente do Kickoff da
Sprint 15 de não travar o fluxo com uma checagem automática pra um risco ainda hipotético, não
observado na prática até agora. Se acontecer de verdade, reabrir e reavaliar como passo
obrigatório.

Confirme, depois:
```
pnpm mark-expired --reactivate
```
Depois, pro que sobrou vencido de vez:
```
pnpm mark-expired --dry-run --mark-expired
```
**Antes de confirmar, olhe a coluna de status atual do dry-run com atenção** — se algum item
tiver status que não devia virar "encerrada" (ex.: `rejeitado`, ou qualquer coisa que não seja
uma ficha ativa normal), isso não é o uso comum do comando, é o dry-run expondo um
comportamento errado do script. Pare, não confirme, e trate como achado a reportar pro Rafa em
vez de seguir o roteiro padrão de "mostrar → confirmar → executar".
Confirme, depois:
```
pnpm mark-expired --mark-expired
```

## Fora de escopo (por enquanto)

- **`check-atualizacoes`**: cruza preço e descrição divergentes em fichas ainda ativas, além de
  mostrar um segundo resíduo de vencidas sem sugestão — reservado para a futura skill Vigilância
  de Conteúdo (Fase 2 da ADR de US-E4), bloqueada até US-O20 (curadoria pré-import) fechar. Até
  lá, se o Rafa quiser rodar esse cruzamento, é fora desta skill — use o comando direto
  (`pnpm check-atualizacoes --source clubinho|sympla`) ou a skill `pipeline-editorial` enquanto
  ela seguir ativa.

## Ao terminar

Feche com uma linha de contagem final clara — ex.: "Avançar-datas: N fichas com sugestão (M da
fonte viva, K do texto salvo), P avançadas, Q sem sugestão (revisão manual pendente), R
reativadas, S marcadas encerradas". Esse é o formato que a skill `orquestradora` consolida no
relatório do pacote completo quando ela chama esta skill; ao rodar esta skill isolada (fora do
pacote completo), é só o resumo que o Rafa vê no fim desta rotina.
