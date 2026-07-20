---
name: orquestradora
description: Roda o pacote completo do pipeline editorial do Onde Brincar em sequência (Clubinho → Sympla → Raindrop → Avançar-datas), sem perguntar o que rodar — a resposta é sempre "tudo". Use quando o Rafa pedir para "rodar o pipeline", "rodar tudo", "rodar a rotina de segunda/quinta", "rodar o pacote completo" ou equivalente, sem especificar uma fonte única. Se ele pedir só uma fonte isolada, use a skill dela direto (clubinho, sympla, raindrop ou avancar-datas) em vez desta. Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Orquestradora — Pipeline editorial (Onde Brincar)

Última peça do bloco de 5 skills decidido na ADR de US-E4
(`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`). Diferente das
outras 4 (extração de um fluxo já existente), esta é lógica nova: dispatch sequencial +
agregação do relatório final. Substitui a pergunta "o que rodar hoje?" da antiga
`pipeline-editorial` por um anúncio direto do pacote completo (confirmado com o Rafa em
15/07: a resposta é sempre "tudo").

Não roda nenhum comando por conta própria: direciona sequencialmente para as 4 skills-filhas
(`clubinho`, `sympla`, `raindrop`, `avancar-datas`), na ordem usada nas 4 sessões anteriores do
bloco.

**Mecanismo de coordenação (ADR de US-E4):** skills não se chamam entre si — não têm agência
própria. Quem tem agência é você, nesta sessão com o Rafa. Esta skill é o roteiro que define a
ordem; a execução é sequencial, dentro desta mesma conversa. Não existe persistência de "o que
já rodou" entre sessões — se a sessão for interrompida no meio, não há retomada automática
(aceito como não-problema pela ADR, dado que a tendência é sempre rodar o pacote completo numa
sessão só, sem pausas longas).

## Antes de tudo

1. Confirme que está rodando via `claude` no terminal do Rafa, dentro da pasta do projeto —
   **não** dentro do Cowork. Se não tiver certeza, pergunte.
2. `git status` + `git branch --show-current` — confirme que está em `main` e sem mudanças
   não commitadas. Se houver trabalho pendente de sessão anterior (branch de feature com
   diffs, arquivos untracked), não descarte nada: pare e alinhe com o Rafa o que fazer com
   esse trabalho antes de seguir com a rotina.
3. `git log main..origin/main --oneline` — confirme que não há mudança de código pendente
   que deveria vir antes.
4. Anuncie direto: **"Rodando o pacote completo: Clubinho → Sympla → Raindrop →
   Avançar-datas. Avisa se quiser pular algum antes de eu começar."** Não pergunte "o que
   rodar hoje" — a resposta já confirmada pelo Rafa (15/07) é sempre "tudo". Se ele responder
   pedindo pra pular uma fonte ou rodar só uma, siga a instrução dele (ajuste a sequência, ou
   direcione direto pra skill individual, fora desta orquestração).

## Protocolo de cores compartilhado

Definição válida para as 4 skills-filhas — documentada aqui uma vez só (AC3 de US-E5), não
repetida em cada uma:

- 🟢 **Roda direto, sem perguntar**: qualquer scrape, leitura, `check-novidades`,
  `pipeline-ia`, montagem de lote, e qualquer variante `--dry-run` ou `--list`. Nada disso
  escreve no Sanity nem gasta crédito de imagem.
- 🔴 **Pausa e pede confirmação explícita antes de rodar**: qualquer comando com `--execute`,
  `--fix-dates`, `--mark-expired` ou `--reactivate` — todos escrevem no Sanity (dado real);
  `import-sanity` e `raindrop-process --execute` também gastam crédito de geração de imagem
  (gasto real), e este último move itens no Raindrop (ação real, não reversível pelo script).
  Regra do projeto (protocolo de cores do CLAUDE.md), não invenção desta skill.
- Nunca clique em "Publicar" no Studio nem peça pra automatizar isso — publicar é sempre
  decisão manual do Rafa, fora do escopo de qualquer script.
- O mapeamento específico de comandos 🟢/🔴 por fonte mora em cada skill-filha (varia:
  `import-sanity` no Clubinho/Sympla, `raindrop-process` no Raindrop, `auto-avancar-datas`/
  `mark-expired` no Avançar-datas) — esta seção só documenta o que os símbolos significam.

## Rotina

Direcione sequencialmente, sem repetir aqui o conteúdo de cada fluxo (AC6) — invoque cada
skill e siga a rotina dela até o fim, respeitando os checkpoints 🔴 que ela mesma descreve:

1. **Clubinho** (skill `clubinho`) — primeiro da ordem: é o fluxo que demora mais hoje.
2. **Sympla** (skill `sympla`).
3. **Raindrop** (skill `raindrop`).
4. **Avançar-datas** (skill `avancar-datas`) — por último, já que resolve fichas vencidas das
   fontes que acabaram de rodar (inclui as que Clubinho/Sympla acabaram de trazer).

Se uma skill parar cedo por falta de novidade (ex.: Clubinho ou Sympla reportando 0 fichas
novas — "pare aqui" no roteiro dela), isso encerra só aquele passo — continue para a próxima
skill da sequência normalmente, não interrompa o pacote inteiro por causa disso.

Guarde a linha final ("Ao terminar") que cada skill já reporta — é o material bruto do resumo
consolidado do passo seguinte.

## Ao terminar

Imprima um resumo consolidado de toda a sessão, combinando a linha final de cada skill que
rodou — atrações importadas por skill/fonte, e o total geral. Formato sugerido:

```
Pacote completo:
- Clubinho: N fichas novas, M draft (K needs_human)
- Sympla: N fichas novas, M draft (K needs_human)
- Raindrop: N itens processados, M draft (K needs_human, P rejeitados)
- Avançar-datas: N com sugestão (M fonte viva, K texto salvo), P avançadas, Q revisão
  manual pendente, R reativadas, S encerradas
Total de fichas criadas/atualizadas como draft: <soma de Clubinho + Sympla + Raindrop>
```

Se alguma skill foi pulada a pedido do Rafa, mencione explicitamente que ficou de fora do
resumo — não finja que rodou.

## Fora de escopo

- **Vigilância de Conteúdo** (`check-atualizacoes`, curadoria pré-import): Fase 2 da ADR de
  US-E4, bloqueada até US-O20 fechar. Não é chamada por esta orquestração.
- **Decidir se roda ou não**: esta skill não pergunta "o que rodar" — parte do princípio que a
  resposta é sempre "tudo" (confirmado pelo Rafa em 15/07). Se o Rafa quiser rodar só uma fonte
  isolada, é mais direto chamar a skill dela (`clubinho`, `sympla`, `raindrop` ou
  `avancar-datas`) em vez desta.
