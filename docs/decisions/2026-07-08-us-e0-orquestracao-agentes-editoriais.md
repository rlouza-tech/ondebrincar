# ADR — Arquitetura de orquestração de agentes editoriais

**Data:** 2026-07-08
**Status:** Aceito
**Story relacionada:** US-E0 (Sprint 12, Épico E — Editorial). Pré-requisito para US-A1 (gerador de posts Instagram) e demais stories downstream do épico Editorial.
**Discovery de origem:** `Produto/Discovery/DISCOVERY-2026-06-17-arquitetura-agentes.md`

---

## Contexto

O pipeline de ingestão (scraper → Gemini → import-sanity) já tem um padrão de orquestração decidido em US-O8 (Discovery 2026-06-09): scripts Node/TS simples, checkpoint de estado em JSON local, Agent SDK adiado para uma eventual fase 2. Esse precedente não cobre o lado da publicação: quando uma atração é publicada no Sanity, nada hoje avisa os agentes do épico Editorial (ex: US-A1, gerador de posts Instagram) de que há conteúdo novo para virar post.

Sem decisão explícita, cada story do épico Editorial corre o risco de assumir um modelo de trigger e de estado diferente — problema que o próprio US-E0 existe para prevenir.

Contexto já resolvido antes desta ADR:
- Interface de aprovação de rascunhos: Google Docs, pasta "Rascunhos Instagram" no Drive (decidido 2026-06-18).
- Sanity tem suporte nativo a GROQ-powered Webhooks (sanity.io/manage → API → Webhooks), confirmado viável sem infraestrutura adicional.
- Princípio de Human-in-the-Loop para ações com efeito editorial já é prática adotada no projeto (ex: US-O9, curadoria pré-import).

---

## Decisão

### 1. Trigger model: Webhook Sanity GROQ-powered → fila (não dispara geração diretamente)

Um webhook nativo do Sanity, filtrado por GROQ (`_type == "atracao" && !(_id in path("drafts.**"))` ou equivalente), dispara em publish. O webhook **não** aciona a geração de conteúdo diretamente — ele apenas grava a atração na fila de estado (ver decisão 2). A geração de posts em si continua sob comando explícito de Rafa, seguindo o mesmo padrão human-in-the-loop já usado em US-O8/US-O9.

### 2. State management: JSON local (`data/editorial-state.json`)

Histórico de posts já gerados/publicados e fila de rascunhos pendentes vivem em um arquivo JSON commitado no repo — mesmo padrão de checkpoint já usado no orquestrador de ingestão (US-O8, `data/.pipeline-state.json`).

---

## Alternativas descartadas

### Trigger model

| Opção | Por que foi descartada |
|---|---|
| Cron + script (polling, padrão check-novidades) | Funciona, mas joga fora um recurso nativo e gratuito do Sanity (webhook) em troca de latência de polling sem necessidade real |
| Workflow tool (n8n / Make.com) | Move lógica de negócio para fora do repo/git — quebra o padrão do projeto de tudo versionado e documentado em ADR; adiciona dependência paga sem ganho claro no volume atual |
| Claude Agent SDK como trigger autônomo | Mesmo salto que já foi conscientemente adiado em US-O8 ("fase 2, se o MVP mostrar limitação"). Prematuro para o volume atual (poucos posts por semana); haveria custo de API por run sem justificativa de complexidade que exija decisão autônoma |
| **Webhook Sanity → fila** | **Aceito** — nativo, gratuito, elimina polling, e preserva supervisão humana na etapa de geração (a mais cara e mais sensível a qualidade editorial) |

### State management

| Opção | Por que foi descartada |
|---|---|
| Novo tipo de documento no Sanity (`socialPost`) | Single source of truth seria mais elegante, mas exige criar/migrar schema — esforço de implementação maior que o necessário para o volume atual. Fica como opção de evolução se a fila crescer o suficiente para justificar uma UI dedicada no Studio |
| Notion | Duplicaria estado entre Sanity (conteúdo) e Notion (fila), exigindo sincronização entre os dois — undercut do próprio motivo de ter um webhook nativo |
| **JSON local** | **Aceito** — custo zero, consistente com o precedente já validado em produção (US-O8), sem novo ponto de sincronização |

---

## Consequências

- **Consistência arquitetural com US-O8.** O épico Editorial herda o mesmo padrão de orquestração do épico Operações — menos superfície de conceitos novos para manter.
- **Latência zero no trigger, mas não na geração.** O webhook grava a fila instantaneamente ao publicar, mas o post só é gerado quando Rafa aciona o passo seguinte — igual ao pipeline de ingestão hoje. Se o volume de publicação crescer a ponto de tornar a geração manual um gargalo, a decisão de automatizar essa etapa é nova (não coberta por esta ADR) e deve ser revisitada com dados reais de operação.
- **Novo componente de infraestrutura.** O webhook exige um endpoint HTTP (rota Next.js em `/api`, hospedada na Vercel) que recebe o payload do Sanity e grava na fila. A implementação desse endpoint é escopo de story futura (provável candidata: parte de US-A1 ou uma story de infra dedicada), não desta spike.
- **Sem UI de fila.** Diferente da opção Sanity-schema, a fila em JSON não tem interface visual — Rafa inspeciona abrindo o arquivo. Aceitável no volume atual; se a fila crescer, migrar para documento Sanity é a evolução natural (registrar como novo ADR se/quando acontecer, não como reabertura desta).
- **Migração implícita se volume crescer.** Nem o webhook nem o JSON impõem lock-in: o schema Sanity fica documentado aqui como plano B explícito, o que evita reabrir a mesma discussão do zero.

---

## Pendências manuais (Rafa)

1. Nenhuma ação imediata — esta ADR documenta decisão de arquitetura, sem implementação nesta spike (2 SP, conforme escopo de US-E0).
2. Quando uma story de implementação entrar em sprint (ex: como parte de US-A1), configurar o webhook em sanity.io/manage → API → Webhooks apontando para o endpoint a ser criado.
