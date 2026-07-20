---
name: raindrop
description: Roda o fluxo do Raindrop no pipeline editorial do Onde Brincar (--list → ler cada item → decidir método de extração por domínio → montar lote JSON → dry-run → execute → mover para "Processados"). Use quando o Rafa pedir para "puxar novidades do Raindrop", "rodar o Raindrop" ou equivalente, ou quando for a vez do Raindrop na rotina completa (chamado pela futura skill Orquestradora, 3ª da ordem, depois do Sympla). Só funciona no Claude Code, rodando no terminal local do projeto — não funciona no Cowork (sandbox não roda pnpm nem git deste repo).
---

# Skill Raindrop — Pipeline editorial (Onde Brincar)

Skill nova (não é extração de seção existente — o Raindrop nunca fez parte da skill
monolítica `pipeline-editorial`), escrita a partir do handoff de fechamento da US-S19
(`Handoffs/Handoffs de Execução/Handoff-US-S19-fechamento.md`) na decomposição por fluxo
decidida na ADR de US-E4
(`docs/decisions/2026-07-15-us-e4-decomposicao-skills-pipeline-editorial.md`). 3ª da ordem
de execução do bloco de skills (Clubinho → Sympla → Raindrop → Avançar-datas →
Orquestradora).

**Interação diferente das outras skills do bloco:** Clubinho e Sympla são "rodar e esperar
o relatório" — scraper automático, CSV, checkpoint único. Raindrop é "ler cada item, decidir
o método de extração, montar o lote manualmente, e às vezes perguntar no meio" — não tem
scraper dedicado, os links chegam avulsos (posts salvos no Raindrop: Instagram, sites de
evento sem scraper próprio).

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

- 🟢 **Roda direto, sem perguntar**: `--list`, leitura de cada item (API/WebFetch/Chrome
  conforme domínio), montagem do lote em JSON, `--dry-run`. Nada disso escreve no Sanity
  nem gasta crédito de imagem, nem move nada no Raindrop.
- 🔴 **Pausa e pede confirmação explícita antes de rodar**: `--execute` — escreve no Sanity
  (dado real), gasta crédito de geração de imagem (gasto real) e move os itens processados
  para "Processados" no Raindrop (ação real, não reversível por este script). Regra do
  projeto (protocolo de cores do CLAUDE.md), não invenção desta skill.
- Nunca clique em "Publicar" no Studio nem peça pra automatizar isso — publicar é sempre
  decisão manual do Rafa, fora do escopo de qualquer script.

## Rotina

**1. Listar itens pendentes:**
```
pnpm raindrop-process --list
```
Lista cada item da coleção "Onde Brincar" (id, título, link, domínio, excerpt, cover). Se
vier vazio, pare aqui e avise o Rafa — não há nada pra processar.

**2. Ler cada item e decidir o método de extração por domínio** (validado no spike da
US-S19, contra os 13 itens reais da coleção):

| Domínio | Método | Observação |
|---|---|---|
| `instagram.com` | API sozinha | `excerpt` já vem com a legenda completa do post, sem truncar — não abra a URL |
| `feverup.com` | API + WebFetch | `excerpt` da API vem truncado; WebFetch traz nome, local, datas, preço, faixa etária, acessibilidade |
| `diariodorio.com` | Chrome obrigatório | WebFetch falha (403 Forbidden) |
| `ingresse.com` | Chrome obrigatório | SPA sem SSR — WebFetch vem vazio; aguarde ~2s pro JS renderizar |
| `bileto.sympla.com.br` | Chrome + leitura visual | Página canvas-based — nem o Chrome extrai texto via DOM, só o screenshot funciona (mesmo gap rastreado como US-S40) |
| outro domínio não visto ainda | Tente API/`excerpt` primeiro, depois WebFetch, Chrome como último recurso | Documente o resultado — pode virar linha nova nesta tabela |

**3. Se notar contradição entre o texto e a imagem do item, pergunte ao Rafa antes de
incluir no lote.** Isso é julgamento humano — não automatizável (AC6, documentado como
parte do fluxo manual). Não aconteceu nos 13 itens reais da US-S19, mas pode acontecer.

**4. Monte o lote manualmente em JSON** (array de objetos), um arquivo em
`data/input/` ou local temporário à sua escolha. Campos obrigatórios por item:
`raindrop_id`, `nome`, `venue`, `bairro`, `url_origem`. Campos opcionais úteis: `endereco`,
`sinopse_oficial`, `horarios_sessao`, `preco_inteira_centavos`, `url_ingresso`, e
`data_hint` (formato `YYYY-MM-DD`) sempre que a data do evento estiver explícita no texto
bruto — alimenta o check de expiração pré-Gemini (AC7 da US-S19, evita gastar cota do
Gemini com evento já vencido). Se dois links apontarem pro mesmo evento (ex.: dois posts de
Instagram diferentes divulgando a mesma atração), inclua os dois no lote sem se preocupar —
o script já faz dedup in-batch automaticamente (mantém o primeiro, rejeita o segundo com
`rejected_dedup: duplicado_no_lote`).

**5. Rode o dry-run:**
```
pnpm raindrop-process <lote.json> --dry-run
```
Não escreve no Sanity nem move nada no Raindrop. Mostra no console o resumo por outcome
(`created`, `needs_human`, `rejected_dedup`, `rejected_expirado_pre_gemini`,
`rejected_geo`, `rejected_link`) e o detalhe por item.

**Checkpoint:** leia o resumo e monte um resumo legível por ficha — nome, categoria,
bairro, preço, um trecho da descrição, e se caiu em `needs_human`. Nunca jogue o JSON/log
cru no terminal sem organizar — o Rafa já disse que isso é ruim de ler. Pergunte: "importa
todas, importa só X e Y, ou ajusta antes?"

**6. Só depois da resposta, rode o execute:**
```
pnpm raindrop-process <lote.json> --execute
```
Isso cria/atualiza **draft** no Sanity (nunca publica) e move os itens processados
(tudo exceto os que deram `error`) para a subcoleção "Processados" no Raindrop — evita
reprocessar o mesmo item na próxima rodada. Lembre o Rafa: revisar e publicar no Studio
fica para ele, manualmente.

## Ao terminar

Feche com uma linha de contagem final clara — ex.: "Raindrop: N itens processados, M
criados/atualizados como draft (K em needs_human), P rejeitados (dedup/geo/link/expirado)".
Esse é o formato que a futura skill Orquestradora (US-E5) vai consolidar no relatório do
pacote completo; até ela existir, é só o resumo que o Rafa vê no fim desta rotina.
