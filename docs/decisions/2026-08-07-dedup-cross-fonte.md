# ADR — Dedup cross-fonte: auditoria assíncrona por nome+bairro, aplicação sempre manual

**Data:** 2026-08-07 (registrada no Sprint Close 15, a pedido do Rafa — decisão tomada em
22/07/2026 no spike US-S46 e implementada em 22/07 via US-S63, integrada à rotina em
03/08 via US-S64/US-S65/US-S69)
**Status:** Aceita
**Stories:** US-S46 (spike), US-S63 (script de auditoria), US-S64 (status "Duplicada" +
aplicação), US-S65 (integração à Orquestradora), US-S69 (nota de risco no Avançar-datas)
**Constrói sobre:** `docs/discovery/DISCOVERY-2026-07-22-dedup-cross-fonte.md`

---

## Contexto

O dedup existente no pipeline (`check-novidades`, `import-sanity`, `raindrop-process`,
`check-atualizacoes`) sempre comparou só igualdade exata de `slug`. Como o slug é derivado
do texto bruto de `nome` + (`venue` ou `bairro`), a mesma atração real capturada por fontes
diferentes (Clubinho, Sympla, manual/Instagram, Raindrop) — com grafia de nome levemente
diferente, ou `venue` presente numa fonte e ausente/diferente noutra — gera slugs distintos
e passa despercebida. Não é bug de implementação: o slug nunca foi pensado como
identificador estável *entre* fontes, só *dentro* de uma fonte. Nenhum script cruza fontes
na mesma execução — cada rodada do pipeline opera sobre uma fonte por vez.

5 ocorrências confirmadas antes da decisão (todas pegas manualmente pelo Rafa antes de
publicar; nenhuma duplicata real chegou a ir ao ar), incluindo "Luiz e Nazinha"
(Clubinho × Sympla) e "Fantasy — Uma Viagem Musical" (Sympla × Clubinho).

## Decisão

**Auditoria assíncrona, nunca aplicação automática.** Um script standalone
(`scripts/check-duplicatas-cross-fonte.ts`) audita o catálogo publicado e gera um relatório
de pares candidatos — a decisão de marcar algo como duplicata é **sempre manual do Rafa**,
nunca em lote a partir do relatório.

**Chave de comparação:** nome normalizado (tokens sem stopwords PT-BR, sem acento) via Dice
coefficient, comparado só entre documentos de `origem` diferente, dentro do mesmo `bairro`
normalizado (partição barata que reduz O(n²) global para O(n²) por grupo pequeno). `bairro`
foi escolhido em vez de `venue` por ser campo obrigatório no schema — `venue` é inconsistente
entre fontes (ausente em Clubinho/manual/whatsapp).

**Threshold:** 0.6, validado empiricamente contra o Sanity de produção na sessão da US-S63
(238 atrações auditadas, 1 par capturado com score 1.0, zero falsos positivos). Validado com
apenas N=1 caso positivo real confirmado — sinal mais fraco que o ideal; revalidar quando uma
nova ocorrência real de duplicata cross-fonte for confirmada.

### Onde a checagem é acionada hoje

1. **Sob demanda, manual:** `pnpm check-duplicatas-cross-fonte` — roda a qualquer momento,
   gera relatório `.md` timestampado em `data/output/`.
2. **Automático, como último passo da Orquestradora** (US-S65): depois do Avançar-datas,
   sempre 🟢 read-only — nunca gate de escrita, nunca bloqueia os passos anteriores da
   rotina. O resumo consolidado da Orquestradora ("Ao terminar") destaca quando N > 0 pares
   candidatos aparecem.
3. **Aplicação da marcação "duplicada"** é sempre via `scripts/apply-duplicatas` (US-S64) —
   recebe slug(s) explícitos do Rafa (`--slug`), nunca lê o relatório e aplica sozinho.
   `--dry-run` é o padrão; só escreve com `--execute`.
4. **Nota de risco no Avançar-datas** (US-S69): antes de confirmar `mark-expired
   --reactivate`, um lembrete (não bloqueio automático) avisa que reativar uma ficha pode
   reforçar uma duplicata cross-fonte já publicada — recomenda checar contra o relatório
   antes de confirmar.

### Exibição pública

Confirmado por leitura direta do código (US-S64): as queries GROQ públicas já filtram por
**allowlist** `status == "operando"`, não por denylist de status individuais — o novo valor
`duplicada` no campo `status` já fica automaticamente fora da home, do filtro por bairro e
do sitemap, sem precisar de código novo. Travado com teste dedicado para essa allowlist não
virar denylist por acidente no futuro.

## Alternativas consideradas

**Opção B — checagem em tempo real dentro de `check-novidades`/`import-sanity`.**
Pegaria a duplicata antes mesmo dela virar documento (mais cedo no funil), mas adiciona
latência a toda execução do pipeline (compara contra a base inteira, não só o lote do dia)
e tem maior raio de dano em falso positivo — uma ficha nova silenciosamente pulada por
engano no meio de um lote grande é mais difícil de notar do que uma linha extra num
relatório de auditoria separado. **Descartada por ora.** Revisitar só se a Opção A, rodada
por mais sprints, mostrar que o atraso entre criação e detecção é um problema prático (ex.:
duplicata chegando a ir ao ar antes da próxima auditoria).

## Consequências

- Novo valor `duplicada` no `options.list` do campo `status` em `sanity/schemas/atracao.ts`.
- `check-duplicatas-cross-fonte.ts` exclui `rejeitado` e `duplicada` da própria auditoria —
  senão um par já resolvido reapareceria pra sempre nas próximas rodadas (achado corrigido
  na sessão da US-S64).
- **Falso negativo conhecido:** quando `bairro` diverge entre fontes para o mesmo local
  físico, o par não é comparado. Caso real confirmado: "Teatro I♥PRIO" cadastrado em 3
  bairros diferentes (Barra da Tijuca, Leblon, Lagoa) — o par "Luiz e Nazinha" que motivou o
  spike original não reproduziu na validação empírica por esse motivo. Limitação aceita, não
  bloqueador — comparar também data/faixa etária como sinal auxiliar ficaria para uma
  iteração futura, se o padrão se repetir.
- **Falso positivo:** mitigado por design — o script nunca aplica nada sozinho, só sinaliza
  para revisão humana, mesmo com similaridade altíssima.
- Quando a US-E17 (skill de checagem pós-publicação, Sprint 16) for desenhada, a chamada
  hoje inline na Orquestradora (US-S65) deve ser trocada pela chamada via skill — nota já
  registrada no corpo da própria US-S65 para não se perder.

## Nota de processo

Esta decisão foi tomada em spike (US-S46, 22/07/2026) e implementada no mesmo dia (US-S63),
mas só formalizada como ADR no Sprint Close da Sprint 15 (2026-08-07), a pedido explícito do
Rafa — mesmo padrão de formalização retroativa já usado para a ADR de decomposição de skills
(US-E4, Sprint 13).
