# ADR — Fluxo de publicação a partir de e-mail de organizadores (@ondebrincar.com.br)

**Data:** 2026-08-13
**Status:** Aceita
**Story:** US-E23 (Sprint 16, spike — 2 SP)
**Constrói sobre:** US-O27 (e-mail dedicado, Concluída — endereço em Google Workspace pago e recebendo e-mails), `docs/discovery/KIT-US-I31-roteiro-usabilidade.md` seção 11 (causa raiz: foto ausente/genérica em atrações com organizador identificável), `docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md` (padrão de skill por fonte), `.claude/skills/raindrop/SKILL.md` (padrão de referência mais próximo)

---

## Contexto

A US-I31 (sessões de usabilidade) confirmou, em 2/2 sessões sem indução, que foto ausente ou genérica quebra confiança/decisão do usuário. Causa raiz documentada: `foto` é campo opcional desde maio (US-I2.5) pra não travar publicação em massa, com fallback de imagem gerada por IA — mas conteúdo com organizador identificável (Sympla, Eventim, Clubinho) tem uma solução melhor disponível: pedir foto oficial + permissão de uso direto ao organizador.

Este spike (US-E23) avalia a viabilidade técnica de um fluxo que **lê e-mails recebidos** na caixa dedicada (US-O27) e alimenta o pipeline de publicação com o que o organizador responder.

---

## AC1 — Viabilidade de leitura via Gmail API

**Recomendação: Gmail API via Service Account + Domain-wide Delegation, impersonando a caixa dedicada — não OAuth interativo, não IMAP/App Password.**

| Opção | Veredito | Por quê |
|---|---|---|
| **Service Account + Domain-wide Delegation** (escolhida) | ✅ | Como `ondebrincar.com.br` é um domínio Google Workspace (confirmado — US-O27 rodou em Workspace pago), o Rafa (super-admin) autoriza a service account uma única vez no Admin Console (Segurança → Controles de API → Delegação em todo o domínio) e o script chama a API server-to-server, sem fluxo de consentimento interativo, sem token expirando. Padrão corporativo padrão para "ler uma caixa compartilhada via automação". |
| OAuth 2.0 interativo (client ID/secret + refresh token) | ⚠️ Funciona, mas pior encaixe | Exige um consentimento inicial via navegador (não roda 100% headless) e, se o app OAuth ficar em modo "Testing" (não "Internal"), o refresh token expira em 7 dias — armadilha real pra automação recorrente. Resolvível marcando o app como "Internal" no consent screen (dispensa verificação do Google por estar restrito a usuários do Workspace), mas ainda exige 1 login humano no setup. Sem vantagem sobre Service Account pra este caso de uso. |
| IMAP + App Password | ❌ Não recomendada | Sem parsing MIME estruturado da API (attachment como blob avulso, sem `attachmentId`/mimeType limpo), e Google vem apertando cada vez mais o acesso via senha de app — caminho legado, não o oficial pra quem já está no ecossistema Workspace/Cloud. |

**Custo:** Gmail API é gratuita. O gasto real já foi autorizado e pago na US-O27 (Workspace).

**Quota:** projeto novo tem 1.200.000 unidades/min (6.000/min por usuário) e teto diário de 80.000.000 unidades/dia — `messages.list` ~5 unidades, `messages.get` ~20, `attachments.get` ~5. Pra uma caixa de baixíssimo volume (respostas pontuais de organizadores), a margem é de ordens de grandeza, sem risco de esbarrar em limite. ([Google — Usage limits](https://developers.google.com/workspace/gmail/api/reference/quota); confirmado via busca em 13/08/2026, valores atualizados em 2026)

**Escopo recomendado:** `gmail.modify` (não `gmail.readonly`) — permite marcar/mover e-mails processados (label própria, ex. `Processado-OB`), espelhando o padrão da subcoleção "Processados" do Raindrop, sem escopo de delete.

**Setup (ação manual do Rafa, 🟡 explicar antes / não é código deste repo):**
1. Criar (ou reusar) projeto no Google Cloud Console, ativar Gmail API.
2. Criar Service Account, gerar chave JSON — guardar como os outros secrets (`.env.local`, nunca commitado).
3. Admin Console do Workspace → Segurança → Controles de API → Delegação em todo o domínio → autorizar o Client ID da service account com o escopo `https://www.googleapis.com/auth/gmail.modify`, impersonando a caixa dedicada.
4. Testar leitura com um e-mail de prova.

Nenhum destes passos precisa de verificação do Google (app "Internal"/DWD não expõe a terceiros).

---

## AC2 — Extração de anexos/texto da resposta do organizador

**Fluxo:**
1. `users.messages.list` na caixa dedicada, filtrando por não lidos ou por label própria (ex. `to:divulgacao@ondebrincar.com.br is:unread`).
2. Para cada mensagem, `users.messages.get(format=full)` e caminhar recursivamente por `payload.parts`:
   - **Texto:** preferir a parte `text/plain` (decodificar base64url). Cortar a citação da thread original com heurística (primeira linha que bate `^>` ou padrões tipo "Em ... escreveu:"/"On ... wrote:") — mesmo problema que qualquer cliente de e-mail resolve de forma imperfeita; documentar como heurística, não solução exata.
   - **Anexos:** partes com `filename` presente e `body.attachmentId`, filtradas por mimeType de imagem (`image/jpeg`, `image/png`, `image/webp`). Buscar o binário via `users.messages.attachments.get`, decodificar base64url.
3. **Texto livre, sem schema fixo** — resposta de organizador não segue formato. Reaproveitar o mesmo padrão de enriquecimento por LLM já usado no `pipeline-ia` (`@google/genai`, já é dependência do projeto) pra extrair campos estruturados (nome, sinopse, datas, preço, confirmação de permissão de uso) do texto solto, em vez de parsing determinístico.
4. Checkpoint humano antes de qualquer escrita no Sanity — mesmo protocolo 🟢/🔴 do Raindrop (dry-run mostra o que seria criado/atualizado, `--execute` só depois de aprovação).

**Casos de borda a esperar (não resolvidos neste spike, mapeados pra quando a implementação acontecer):**
- Organizador responde só com foto, sem texto (aceitar, sinalizar campos ausentes — mesmo padrão de `needs_human` do Raindrop).
- Organizador responde só com texto, sem imagem (fluxo permanece útil pro texto; imagem seguiria o fallback já existente).
- Múltiplas imagens no mesmo e-mail — v1 assume 1 imagem principal; galeria fica fora de escopo inicial.
- Sem confirmação explícita de permissão de uso no corpo do e-mail — não publicar a imagem sem esse sinal (é o ponto que motivou a nota de assumption desta story: o e-mail de solicitação precisa pedir permissão, não só "detalhes").

---

## Decisão (AC3) — Pipeline próprio, não alimenta US-M8

**Este fluxo vira um pipeline/skill próprio (padrão Raindrop), não uma entrada da US-M8 (Agente de conversão de conteúdo manual, 8 SP, Sprint 17).**

### Por quê

1. **Gatilho diferente.** US-M8 é upload avulso e sob demanda — o Rafa sobe 1 link/imagem/PDF quando decide, de conteúdo genérico solto. O fluxo de e-mail só existe porque o Rafa **já mandou um pedido** a um organizador específico sobre uma atração **já conhecida** (rascunho ou ficha existente) — sempre amarrado a um contexto pré-existente, nunca conteúdo novo e genérico.
2. **Dependência desnecessária.** US-M8 ainda não existe (Sprint 17). Amarrar a mitigação real do problema de foto/IP (levantado na US-I31) a uma dependência que só nasce depois adiaria a solução sem necessidade técnica — as duas partes (leitura de e-mail e conversão de upload avulso) não compartilham pipeline de entrada, só compartilham a camada de extração por IA.
3. **Overlap é só na camada de extração, não no fluxo inteiro.** Tanto e-mail quanto M8 vão usar Gemini (Vision pra imagem, texto pra campos) — mas isso já é um padrão compartilhado via `pipeline-ia`/`@google/genai`, não exige que os dois sejam a mesma feature ou o mesmo código de entrada.
4. **Padrão já validado no repo.** Raindrop (US-E8/S19) é estruturalmente idêntico ao que este fluxo precisa: fonte externa avulsa sem scraper dedicado, julgamento humano no meio (contradição texto/imagem, campos ambíguos), lote montado, dry-run → checkpoint → execute, item processado marcado pra não reprocessar. Reaproveitar essa forma é mais barato e mais testado do que encaixar em uma feature (M8) desenhada pra outro formato de entrada (arquivo avulso, preview editável de campos).

### Alternativas consideradas

- **Alimentar US-M8 como mais uma fonte de input:** descartada — exigiria redesenhar M8 pra aceitar gatilho por polling de caixa de entrada (hoje é upload manual) e adiaria a solução até Sprint 17 sem ganho real, já que o overlap real é só na camada de extração por IA, não no fluxo de entrada.
- **Fluxo 100% manual (Rafa lê o e-mail e roda `associate-imagens`/edita no Studio na mão):** descartada como solução final — funciona como fallback dia 1, mas não fecha o ciclo "pedir → receber → publicar" que motivou a story; o volume esperado (baixo, mas recorrente) justifica automação leve.

---

## Consequências

- Gera candidato de story pra implementação (não criada nesta sessão — decisão de nomear/estimar/priorizar fica pro Refinamento ou pro Rafa confirmar agora): skill nova no padrão Raindrop, ex. "leitura de e-mails de organizadores", ordem de grandeza semelhante a US-S19/Raindrop (3 SP) mais o setup único de Service Account/DWD (~15-30 min de trabalho manual do Rafa, uma vez só).
- Setup do Google Cloud/Service Account/DWD é pré-requisito de infraestrutura, não código — precisa acontecer numa sessão futura antes da 1ª execução real (mesmo padrão de US-N5/DMARC antes do 1º envio de newsletter: pré-condição manual do Rafa, sinalizar cedo pra não virar gargalo silencioso).
- `.env.local`/`.env.example` ganham uma nova variável (ex. `GMAIL_SERVICE_ACCOUNT_KEY_PATH` ou equivalente) quando a implementação entrar — não criada neste spike.
- Nenhuma mudança de schema/pipeline necessária neste spike — é decisão de arquitetura, sem código de produção.

## Nota de processo

Spike conduzido em sessão de execução em 2026-08-13. Overlap com US-M8 era assumption aberta desde a criação da story (07/08) — resolvida aqui, não deixada para o Kickoff 17.
