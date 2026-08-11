---
name: orquestradora
description: Roda o pacote completo do pipeline editorial do Onde Brincar em sequência (Clubinho → Sympla → Uhuu → EcoVilla → Raindrop → Avançar-datas), sem perguntar o que rodar — a resposta é sempre "tudo". Use quando o Rafa pedir para "rodar o pipeline", "rodar tudo", "rodar a rotina de segunda/quinta", "rodar o pacote completo" ou equivalente, sem especificar uma fonte única. Se ele pedir só uma fonte isolada, use a skill dela direto (clubinho, sympla, uhuu, ecovilla, raindrop ou avancar-datas) em vez desta. Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Orquestradora — Pipeline editorial (Onde Brincar)

Última peça do bloco original de 5 skills decidido na ADR de US-E4
(`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`). Diferente das
outras (extração de um fluxo já existente), esta é lógica nova: dispatch sequencial +
agregação do relatório final. Substitui a pergunta "o que rodar hoje?" da antiga
`pipeline-editorial` por um anúncio direto do pacote completo (confirmado com o Rafa em
15/07: a resposta é sempre "tudo").

**Atualizada na US-E15 (Sprint 15)** pra incluir a **Uhuu** como 5ª fonte automatizada —
mesmo mecanismo de dispatch, sem mudança na lógica de coordenação.

**Atualizada na US-S65 (Sprint 15)** pra incorporar a checagem de duplicata cross-fonte
(`check-duplicatas-cross-fonte`, fix da US-S63) como último passo da rotina, depois do
Avançar-datas — ver seções "Rotina" e "Ao terminar" abaixo.

**Atualizada na US-E20 (Sprint 16)** pra incluir a **EcoVilla** como 6ª fonte automatizada,
posicionada logo depois da Uhuu — mesma natureza de scraper automatizado headless, sem
dependência de ordem com as outras fontes (mesmo raciocínio usado pra posicionar a Uhuu na
US-E15). Mesmo mecanismo de dispatch, sem mudança na lógica de coordenação.

**Atualizada na US-E17 (Sprint 16)** pra trocar a chamada inline do script
`check-duplicatas-cross-fonte` (US-S65) pela chamada via skill própria `checagem-pos-publicacao`
— mesmo mecanismo de dispatch das demais skills-filhas, sem mudança na lógica de coordenação.

Não roda nenhum comando por conta própria: direciona sequencialmente para as 7 skills-filhas
(`clubinho`, `sympla`, `uhuu`, `ecovilla`, `raindrop`, `avancar-datas`,
`checagem-pos-publicacao`), na ordem descrita abaixo.

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
4. Anuncie direto: **"Rodando o pacote completo: Clubinho → Sympla → Uhuu → EcoVilla →
   Raindrop → Avançar-datas. Avisa se quiser pular algum antes de eu começar."** Não pergunte "o que
   rodar hoje" — a resposta já confirmada pelo Rafa (15/07) é sempre "tudo". Se ele responder
   pedindo pra pular uma fonte ou rodar só uma, siga a instrução dele (ajuste a sequência, ou
   direcione direto pra skill individual, fora desta orquestração).

## Protocolo de cores compartilhado

Definição válida para as 7 skills-filhas — documentada aqui uma vez só (AC3 de US-E5), não
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
  `import-sanity` no Clubinho/Sympla/Uhuu/EcoVilla, `raindrop-process` no Raindrop,
  `auto-avancar-datas`/`mark-expired` no Avançar-datas) — esta seção só documenta o que os
  símbolos significam.

## Rotina

Direcione sequencialmente, sem repetir aqui o conteúdo de cada fluxo (AC6) — invoque cada
skill e siga a rotina dela até o fim, respeitando os checkpoints 🔴 que ela mesma descreve:

1. **Clubinho** (skill `clubinho`) — primeiro da ordem: é o fluxo que demora mais hoje.
2. **Sympla** (skill `sympla`).
3. **Uhuu** (skill `uhuu`) — entra logo depois do Sympla: mesma natureza de scraper
   automatizado, sem dependência de ordem em relação às outras fontes.
4. **EcoVilla** (skill `ecovilla`) — entra logo depois da Uhuu: mesma natureza de scraper
   automatizado headless, sem dependência de ordem em relação às outras fontes (mesmo
   raciocínio usado pra posicionar a Uhuu).
5. **Raindrop** (skill `raindrop`).
6. **Avançar-datas** (skill `avancar-datas`) — por último entre as skills-filhas, já que
   resolve fichas vencidas das fontes que acabaram de rodar (inclui as que
   Clubinho/Sympla/Uhuu/EcoVilla acabaram de trazer).
7. **Checagem pós-publicação** (skill `checagem-pos-publicacao`) — por último, depois do
   Avançar-datas: hoje só dedup cross-fonte (US-S65/US-S63), mas é o lugar que absorve
   qualquer checagem futura do mesmo tipo (US-E17). Só funciona no terminal do Rafa (Claude
   Code), nunca no Cowork. Guarde do resumo dela: quantidade de pares candidatos e o caminho
   do relatório `.md` gerado. Nunca aplica nada sozinha — só diagnostica. Se achar pelo menos
   1 candidato, avise o Rafa explicitamente no resumo final, sem esperar ele perguntar, e
   lembre que a decisão de qual ficha marcar como `duplicada` (via
   `pnpm apply-duplicatas --slug <slug> --execute`, US-S64) é sempre manual dele.

Se uma skill parar cedo por falta de novidade (ex.: Clubinho, Sympla, Uhuu ou EcoVilla
reportando 0 fichas novas — "pare aqui" no roteiro dela), isso encerra só aquele passo —
continue para a próxima skill da sequência normalmente, não interrompa o pacote inteiro por
causa disso.

Guarde a linha final ("Ao terminar") que cada skill já reporta — é o material bruto do resumo
consolidado do passo seguinte.

## Ao terminar

Imprima um resumo consolidado de toda a sessão, combinando a linha final de cada skill que
rodou — atrações importadas por skill/fonte, e o total geral. Formato sugerido:

```
Pacote completo:
- Clubinho: N fichas novas, M draft (K needs_human)
- Sympla: N fichas novas, M draft (K needs_human)
- Uhuu: N fichas novas, M draft (K needs_human)
- EcoVilla: N fichas novas, M draft (K needs_human)
- Raindrop: N itens processados, M draft (K needs_human, P rejeitados)
- Avançar-datas: N com sugestão (M fonte viva, K texto salvo), P avançadas, Q revisão
  manual pendente, R reativadas, S encerradas
- Duplicata cross-fonte: N pares candidatos encontrados (relatório: <caminho do .md>)
Total de fichas criadas/atualizadas como draft: <soma de Clubinho + Sympla + Uhuu + EcoVilla + Raindrop>
```

Se a checagem de duplicata encontrar candidatos (N > 0), destaque isso fora da lista também —
não deixe só como mais uma linha do resumo, é um alerta que pode precisar de ação manual do
Rafa (`apply-duplicatas`) antes da próxima rodada.

Se alguma skill foi pulada a pedido do Rafa, mencione explicitamente que ficou de fora do
resumo — não finja que rodou.

## Fora de escopo

- **Vigilância de Conteúdo** (`check-atualizacoes`, curadoria pré-import): Fase 2 da ADR de
  US-E4, bloqueada até US-O20 fechar. Não é chamada por esta orquestração.
- **Checagem pós-publicação como gate de escrita**: o passo 7 da rotina (skill
  `checagem-pos-publicacao`) só diagnostica e avisa — nunca bloqueia, pausa ou condiciona os
  passos anteriores (Clubinho, Sympla, Uhuu, EcoVilla, Raindrop, Avançar-datas) à ausência de
  duplicatas. Aplicar o status `duplicada` continua sendo decisão manual do Rafa via
  `apply-duplicatas` (US-S64), sempre fora desta orquestração (decisão de Opção A da US-S63,
  travada — nunca vira gate).
- **Decidir se roda ou não**: esta skill não pergunta "o que rodar" — parte do princípio que a
  resposta é sempre "tudo" (confirmado pelo Rafa em 15/07). Se o Rafa quiser rodar só uma fonte
  isolada, é mais direto chamar a skill dela (`clubinho`, `sympla`, `uhuu`, `ecovilla`,
  `raindrop` ou `avancar-datas`) em vez desta. `checagem-pos-publicacao` não é uma fonte —
  nesta primeira versão só roda como último passo do pacote completo.
