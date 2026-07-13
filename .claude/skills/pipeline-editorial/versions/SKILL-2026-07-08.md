---
name: pipeline-editorial
description: Roda a rotina semanal do pipeline editorial do Onde Brincar (Clubinho, Sympla, avançar datas). Use quando o Rafa pedir para "rodar o pipeline", "puxar novidades do Clubinho/Sympla", "avançar datas", "rodar a rotina de segunda/quinta" ou equivalente. Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Pipeline editorial — Onde Brincar

Skill criada na spike US-O21 (Sprint 12, 07/07/2026), depois de uma sessão de discovery no
Cowork que debateu interface web vs. agente autônomo vs. skill. Decisão: skill primeiro —
ver o card US-O21 no Notion (Sprint Board) para o histórico completo da decisão.

## Antes de tudo

1. Confirme que está rodando via `claude` no terminal do Rafa, dentro da pasta do projeto —
   **não** dentro do Cowork. Se não tiver certeza, pergunte.
2. `git log main..origin/main --oneline` — confirme que não há mudança de código pendente
   que deveria vir antes.
3. Pergunte ao Rafa: **"O que rodar hoje? Clubinho, Sympla, avançar datas, ou tudo?"**
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
   Mostre o resultado (quantas fichas com sugestão de data). Pergunte se aplica.
   ```
   pnpm auto-avancar-datas --execute
   ```

2. **Comparação com a fonte viva** (pega preço e data divergente em fichas ainda ativas, que o
   passo 1 não enxerga — e mostra o resíduo de vencidas sem sugestão):
   ```
   pnpm check-atualizacoes --source clubinho
   pnpm check-atualizacoes --source sympla
   ```
   Se houver sugestão de data válida sobrando, pergunte e rode com `--fix-dates` por fonte.

3. **Revisão manual**: o que sobrou sem sugestão em nenhum dos dois passos acima — liste slug e
   link de origem, e peça pro Rafa decidir ficha por ficha no Studio (atualizar ou desistir).
   Não invente uma data.

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