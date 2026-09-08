# Discovery — Filtro de bairro: menu sem scroll estoura a tela

**Data:** 26/ago/2026
**Sessão:** Discovery (modalidade isolada, fora do ciclo de cerimônias)
**Handoff de referência:** `Handoffs/Handoffs de Sprint/Handoff-Sprint-17.md` (13/ago/2026, Sprint Close Sprint 16)

---

## Fontes de sinal

- **Feedback operacional — uso próprio do Rafa.** Sinal inicial da sessão.
- **Métrica — contagem de atrações por bairro, direto do dashboard Sanity ("Por bairro").** Trazida numa segunda rodada, depois que registrei como pergunta em aberto quantos bairros existiam hoje em produção. Rafa tinha dito de início que não traria métrica nesta sessão, mas voltou com o dado real assim que a pergunta ficou concreta.

## Sinal bruto

Relato do Rafa: o filtro de bairro cresceu muito (muitas opções) e, ao usá-lo, ele não consegue visualizar o que está abaixo do que cabe na tela. Ele sabe que existe pelo menos mais um bairro que deveria aparecer (Tijuca) e não consegue alcançá-lo.

Escopo confirmado por ele em resposta à pergunta de esclarecimento: **é só visualização/overflow, não falta de dado** — Tijuca provavelmente está na lista de opções, só não visível. O cenário específico que ele reproduziu: com o bairro **Grajaú** já selecionado (filtro em uso), ele tenta **adicionar Tijuca** e não consegue rolar até a opção.

**Dado trazido depois (dashboard Sanity, painel "Por bairro"):** hoje existem **44 bairros distintos** com pelo menos 1 atração publicada. Distribuição bem concentrada no topo — Barra da Tijuca (23), Gávea (18), Tijuca (14), Jardim Botânico (13) e Recreio dos Bandeirantes (8) puxam o catálogo — mas com uma cauda longa de pelo menos 22 bairros com só 1 atração cada (Grajaú, o bairro do exemplo do Rafa, é um deles). Isso confirma de fato — não só por inferência de código — que o menu de opções tem itens de sobra pra estourar qualquer altura razoável de tela.

## Diagnóstico

### Problema 1 — Menu de bairro sem altura máxima nem scroll interno

**Causa raiz identificada (alta confiança — verificada em código, não inferida do relato):**

`components/FilterDropdown.tsx` é o componente que renderiza a lista de opções do filtro de bairro (usado por `HomeFilters.tsx` via a prop `multiSelect`). O container do menu aberto é renderizado assim:

```
className="z-50 overflow-hidden rounded-xl border border-primary/10 bg-white py-1 shadow-md"
```

Não há `max-height` nem `overflow-y-auto` — só `overflow-hidden`, que **corta** conteúdo que excede o container, sem oferecer scroll. Como a lista de bairros é 100% dinâmica e sem limite (`app/page.tsx`: `Array.from(new Set(atracoes.map(a => a.bairro))).sort(...)`, direto do catálogo Sanity, sem cap nem paginação), o menu cresce em altura junto com o catálogo. A partir de um certo número de bairros, o menu passa da altura da viewport e as opções abaixo da dobra ficam inacessíveis — sem nenhuma forma de rolar até elas. Isso bate exatamente com o cenário reproduzido pelo Rafa: `toggleBairro` (a função chamada ao clicar numa opção com `multiSelect` ativo) mantém o menu aberto após a seleção — é o caminho de código que ele estava usando ao tentar adicionar Tijuca com Grajaú já selecionado.

**Contexto histórico (ADR):** `docs/decisions/2026-05-21-i4-1-filtros-home.md` (US-I4.1, 21/mai/2026) documenta a decisão original de tornar a lista de bairros dinâmica ("escala com catálogo Sanity/mock sem hardcode") e lista **"Autocomplete de bairro"** explicitamente como **fora de escopo** na época. Ou seja: o risco de a lista crescer demais já era previsto desde a decisão original — só não tinha estourado ainda. Não há contradição com essa ADR; o problema de hoje é a consequência prevista e adiada dela, não uma decisão que precisa ser revista para o fix imediato.

- **Impacto:** Alto, e agora confirmado por dado real, não só hipótese — com 44 bairros distintos hoje em produção, o menu tem itens de sobra pra passar da altura de qualquer tela. Bloqueia literalmente a ação de adicionar mais um bairro ao filtro assim que isso acontece — e o catálogo está em expansão ativa (bloco EcoVilla e outras fontes novas na Sprint 16, por exemplo), então a lista só tende a crescer, não a encolher.
- **Esforço:** Baixo (hipótese inicial). O fix mínimo é de CSS — trocar `overflow-hidden` por `max-h-[algum valor] overflow-y-auto` no container do menu em `FilterDropdown.tsx`. Não testei em viewport real nem validei o valor ideal de altura — isso é detalhe de implementação, a resolver no refinamento, não nesta sessão.
- **Prioridade recomendada:** P1. Alto impacto e esforço aparentemente baixo — mas o Rafa sinalizou urgência ("resolver o quanto antes"); se para ele isso for P0, é decisão dele no Kickoff/Refinamento, não algo que eu decida aqui.
- **Força do sinal:** o relato inicial era raso (1 relato, do próprio Rafa) — mas deixou de ser convicção fraca: a causa raiz foi confirmada lendo o código-fonte real do componente e a ADR original, e o alcance do impacto foi confirmado com dado real do Sanity (44 bairros, cauda longa de 22+ com só 1 atração). Diagnóstico sólido nas duas pontas agora.

## Histórias

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-I53 | Limitar altura do menu de bairro com scroll interno | I | 2 (chute inicial, não validado) | 1. Dado que a lista de opções de bairro excede a altura disponível na viewport, o menu deve ter altura máxima definida e exibir scroll vertical interno — nunca cortar opções sem acesso a elas.<br>2. Cenário reproduzido pelo Rafa (bairro Grajaú já selecionado, tentando adicionar Tijuca) funciona: dá pra rolar até Tijuca e selecioná-la sem fechar o menu.<br>3. Fix aplicado tanto em mobile quanto desktop — mesmo componente (`FilterDropdown.tsx`) é usado nos dois breakpoints. | a definir |

ID verificado via query SQL no Sprint Board (`Story ID` do Épico I, sem filtro de sprint) — maior ID existente hoje é US-I52; US-I53 confirmado livre.

## Parking lot

Nenhum item nesta sessão. O único sinal trazido já tinha hipótese clara e virou story — não sobrou observação solta sem hipótese.

## Decisões tomadas

- **Não revisitar "autocomplete de bairro" nesta leva.** Cheguei a registrar como pergunta em aberto se valeria a pena reabrir essa opção (fora de escopo desde a ADR i4.1, maio/2026), mas o Rafa decidiu explicitamente manter o fix simples de scroll como suficiente — sem abrir escopo maior de busca/autocomplete agora. Não vira story, não vira Discovery separado, fica descartado por decisão direta dele.

## Perguntas em aberto

1. **Altura máxima ideal do menu (quantos itens visíveis antes de precisar rolar)?** Não decidido nesta sessão — fica para o refinamento, junto com teste em viewport real (mobile e desktop). Com 44 bairros no total e uma cauda longa de itens de 1 atração só, vale considerar mostrar algo entre 6 e 10 opções visíveis por vez como ponto de partida — não é decisão fechada, é sugestão a validar no refinamento.

## Recomendações pro próximo Kickoff/Refinamento

- US-I53 é candidata a entrar rápido: esforço baixo, impacto alto (confirmado com dado real — 44 bairros na lista), urgência declarada pelo Rafa. Mas a decisão de quando ela entra (sprint atual, próxima, ou fora de ciclo por urgência) não é desta sessão — é do Kickoff ou de uma decisão pontual do Rafa.
- No refinamento, usar a distribuição real de bairros (44 no total, 5 concentram a maioria das atrações, 22+ têm só 1 cada) pra calibrar a altura máxima do menu e decidir o AC de altura com mais precisão do que um chute.
