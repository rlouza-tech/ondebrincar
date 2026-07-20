---
name: pipeline-editorial
description: Roda a rotina semanal do pipeline editorial do Onde Brincar (Clubinho, Sympla, avançar datas). Use quando o Rafa pedir para "rodar o pipeline", "puxar novidades do Clubinho/Sympla", "avançar datas", "rodar a rotina de segunda/quinta" ou equivalente. Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Pipeline editorial — Onde Brincar

Skill criada na spike US-O22 (Sprint 12, 07/07/2026), depois de uma sessão de discovery no
Cowork que debateu interface web vs. agente autônomo vs. skill. Decisão: skill primeiro —
ver o card US-O22 no Notion (Sprint Board) para o histórico completo da decisão.

## Antes de tudo

1. Confirme que está rodando via `claude` no terminal do Rafa, dentro da pasta do projeto —
   **não** dentro do Cowork. Se não tiver certeza, pergunte.
2. `git status` + `git branch --show-current` — confirme que está em `main` e sem mudanças
   não commitadas. Se houver trabalho pendente de sessão anterior (branch de feature com
   diffs, arquivos untracked), não descarte nada: pare e alinhe com o Rafa o que fazer com
   esse trabalho (commitar em branch própria, etc.) antes de seguir com a rotina. Já aconteceu
   de sessão anterior deixar 3 stories inteiras não commitadas no meio do caminho.
3. `git log main..origin/main --oneline` — confirme que não há mudança de código pendente
   que deveria vir antes.
4. Pergunte ao Rafa: **"O que rodar hoje? Clubinho, Sympla, avançar datas, ou tudo?"**
   Não assuma — dias diferentes têm necessidades diferentes.

## Protocolo de cores desta skill

- 🟢 **Roda direto, sem perguntar**: qualquer scrape, `check-novidades`, `pipeline-ia`,
  `check-atualizacoes` sem `--fix-dates`, e qualquer variante `--dry-run`. Nada disso escreve
  no Sanity nem gasta crédito de imagem.
- 🔴 **Pausa e pede confirmação explícita antes de rodar**: qualquer comando com `--execute`,
  `--fix-dates`, `--mark-expired` ou `--reactivate`. Todos escrevem no Sanity (dado real) e
  `import-sanity` também gasta crédito de geração de imagem (gasto real). Isso é regra do
  projeto (protocolo de cores do CLAUDE.md), não invenção desta skill.
- Nunca clique em "Publicar" no Studio nem peça pra automatizar isso — publicar é sempre
  decisão manual do Rafa, fora do escopo de qualquer script.

## Fluxo 1 — Clubinho

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

## Fluxo 2 — Sympla

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
Mesma regra do Clubinho: 0 novas = para aqui.

```
pnpm pipeline-ia --source sympla
```
Mesmo checkpoint do Fluxo 1: leia report + CSV, monte resumo legível, pergunte antes de importar.

```
pnpm import-sanity --source sympla --execute
```
Mesma observação: só cria draft, revisar/publicar é manual no Studio.

## Fluxo 3 — Avançar datas

Ordem importa — cada passo depende do anterior ter rodado antes:

1. **Varredura automática global** (cobre Clubinho e Sympla de uma vez, sem `--source`):
   ```
   pnpm auto-avancar-datas
   ```
   Mostre o resultado (quantas fichas com sugestão de data, e a origem — fonte viva ou texto
   salvo). Pergunte se aplica.
   ```
   pnpm auto-avancar-datas --execute
   ```

2. **Comparação com a fonte viva** (pega preço e data divergente em fichas ainda ativas, que o
   passo 1 não enxerga — e mostra o resíduo de vencidas sem sugestão):
   ```
   pnpm check-atualizacoes --source clubinho
   pnpm check-atualizacoes --source sympla
   ```
   Esse relatório costuma vir grande (dezenas de fichas expiradas + divergências de preço/
   descrição) — nunca jogue a lista crua no chat. Salve as fichas "sem sugestão de data" num
   arquivo (`data/output/revisao-manual-datas-<data>.md`, com slug, data expirada, programação
   da fonte, link **e a origem da sugestão quando houver uma**) e resuma no chat só a contagem +
   os poucos casos de divergência de preço genuína (ignore `descricao [sinopse vs AI-enriched]` —
   é o Gemini reescrevendo texto, não é divergência real). Se houver sugestão de data válida
   sobrando, pergunte e rode com `--fix-dates` por fonte.

   **US-S53 (20/07/2026):** tanto `auto-avancar-datas` quanto `check-atualizacoes` agora tentam
   a fonte viva (`dias_apresentacao` re-raspado no mesmo run) **antes** de cair no fallback de
   reler o `programacao_texto` já salvo no Sanity — corrige a causa raiz do incidente "A Casa da
   Gabi" (fichas com relistagem recorrente, comum no Clubinho, ficavam irresgatáveis depois de
   vencidas porque o dado fresco re-raspado era descartado). Cada sugestão vem marcada com a
   origem (`fonte viva` ou `texto salvo`) — priorize confiança na fonte viva ao decidir. Fichas
   com status `encerrada` ou `rejeitado` continuam sem nada de novo a ganhar desse relatório; se
   o Rafa perguntar, pode dizer que dá pra ignorar essas com segurança — só vale atenção em
   fichas ainda `operando` com data vencida.

3. **Revisão manual**: o que sobrou sem sugestão em nenhum dos dois passos acima — liste slug e
   link de origem, e peça pro Rafa decidir ficha por ficha no Studio (atualizar ou desistir).
   Não invente uma data.

   🔴 **Nunca vire `--mark-expired` sem abrir o link de origem individualmente** — mesmo com
   volume alto (13+ fichas numa rodada só, como aconteceu em 13/07). Foi exatamente pular esse
   passo sob volume que causou 2 despublicações indevidas reais ("A Casa da Gabi", 13/07; "Chaves
   — Foi sem querer querendo", 20/07) — ver `Handoffs/Handoffs de Execução/Handoff-US-S50-spike-
   mark-expired-casa-da-gabi.md`. Se o Rafa pedir pra acelerar em volume alto, isso é sinal pra
   parar e alinhar com ele, não pra pular a checagem individual.

4. **Fechar o ciclo de status**:
   ```
   pnpm mark-expired --reactivate --dry-run
   ```
   Pra qualquer ficha que o Rafa resgatou no passo 3 mas que ainda estava marcada "encerrada".
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
   comportamento errado do script. Pare, não confirme, e trate como achado a reportar pro Rafa
   em vez de seguir o roteiro padrão de "mostrar → confirmar → executar".
   Confirme, depois:
   ```
   pnpm mark-expired --mark-expired
   ```

## Fora de escopo (por enquanto)

- **Fonte Raindrop/manual**: `scripts/normalizer/manual.ts` e `--source manual` já existem e
  já funcionam em todos os scripts acima, mas o conversor Raindrop → `data/input/manual-raw.csv`
  ainda não foi escrito (story separada, fora desta spike). Quando existir, vira um quarto fluxo
  aqui, reaproveitando os mesmos passos de `check-novidades`/`pipeline-ia`/`import-sanity` já
  descritos acima com `--source manual`.
- **Painel web** (US-I30/US-I8, Sprint 15) e **agente de curadoria pré-import** (US-O20) são
  iniciativas separadas, não bloqueiam nem são bloqueadas por esta skill.