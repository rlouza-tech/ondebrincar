# Discovery — US-S46: Spike dedup cross-fonte
**Data:** 22/07/2026
**Story:** US-S46 (2 SP, spike — não implementa fix)
**Sprint:** 14

---

## Contexto

5 ocorrências confirmadas da mesma atração publicada como dois documentos Sanity
separados, vindos de fontes diferentes, em 3 pares de fontes distintos (Instagram/manual
+Clubinho ×2, Bilhete+Clubinho, Sympla+Clubinho). Última ocorrência: "Luiz e Nazinha"
(achada de novo em 22/07 durante a sessão US-S62) — `atracao-luiz-e-nazinha-...-jockey-
club-brasileiro` (Clubinho) vs. `atracao-luiz-e-nazinha-...-rio-de-janeiro-rj` (Sympla).
Todas as ocorrências foram pegas manualmente pelo Rafa antes de publicar — nenhuma
duplicata real chegou a ir ao ar.

Este spike responde: por que o mecanismo de dedup existente não pega isso, e o que fazer
a respeito.

---

## AC1 — Fontes e geração de identificador

### Fontes que alimentam o catálogo hoje

| Fonte | Normalizer | Observação |
|---|---|---|
| Clubinho | `scripts/normalizer/clubinho.ts` | CSV próprio do scraper; `venue` frequentemente ausente |
| Sympla | `scripts/normalizer/sympla.ts` | `venue` extraído do card do evento; bairro via regex sobre o `venue` |
| Manual/Instagram (US-A3) | `scripts/normalizer/manual.ts` | `manual-raw.csv`; `venue` tende a vir vazio |
| WhatsApp (triagem) | `scripts/normalizer/whatsapp.ts` | `whatsapp-triagem.csv`; `venue` sempre `""` |
| Raindrop | `scripts/raindrop-process/index.ts` | JSON com `raindrop_id` + campos canônicos; mapa `slug → raindrop_id` à parte |

Todas convergem para o mesmo formato canônico (`LinhaInput`/`PipelineInput`) antes de
gerar slug — **não há fórmula de slug fonte-específica**, só conteúdo fonte-específico.

### Geração de slug/`_id`

Fórmula única, centralizada em `scripts/lib/slug.ts:38-40` (duplicada quase idêntica em
`scripts/pipeline-ia/index.ts:130-182`):

```
buildSlugFromParts(nome, venue, bairro) = slugify([nome, venue || bairro].join(" "))
```

`slugify()` (`scripts/lib/slug.ts:3-10`) faz lowercase + remoção de acento + substituição
de não-alfanumérico por hífen. Truncamento com hash determinístico acima de 113 chars
(mitigação da US-S26, não relacionada a este bug). `_id` do Sanity = `atracao-${slug}`
(ou `drafts.atracao-${slug}`) — `scripts/import-sanity/mapper.ts:6`,
`scripts/import-sanity/index.ts:397-398`, `scripts/raindrop-process/index.ts:254-255`.

**Causa raiz confirmada:** como o slug é derivado do texto bruto de `nome` + (`venue` ou
`bairro`), a mesma atração real capturada por fontes diferentes — com grafia de nome
ligeiramente diferente, ou com `venue` presente numa fonte e ausente/diferente noutra —
produz **slugs distintos**. Não há bug de implementação; é uma limitação estrutural do
design atual: o slug não foi pensado para ser um identificador estável entre fontes, só
dentro de uma fonte.

---

## AC1 (cont.) — Mecanismo de dedup existente

Dedup hoje é **exclusivamente por igualdade exata de slug**, via `Set` lookup, em todos os
pontos do pipeline:

| Script | Onde | Contra o quê |
|---|---|---|
| `check-novidades` | `scripts/check-novidades/index.ts:108-135,160-162` | Slugs published+drafts e rejeitados |
| `import-sanity` | `scripts/import-sanity/index.ts:93-132` (`fetchExistingSlugs`, `fetchRejectedSlugs`, `filterNewRows`) | Idem |
| `raindrop-process` | `scripts/raindrop-process/index.ts:155-178` | Dedup interno do lote + contra Sanity, mesmo critério |
| `check-atualizacoes` | `scripts/check-atualizacoes/index.ts` | Casa candidatos com fichas existentes por slug |
| `auto-avancar-datas` | `scripts/auto-avancar-datas/index.ts:17-18` | Só reimporta `normalizeClubinho`+`normalizeSympla` — nem cobre manual/raindrop |

Confirmado por teste existente (`scripts/import-sanity/__tests__/dedup.test.ts:62-68`):
comparação é case-sensitive, sem qualquer normalização adicional além do `slugify()` já
embutido na geração do slug.

**Nenhum destes scripts cruza fontes na mesma execução.** Cada rodada do pipeline opera
sobre uma fonte por vez (`--source clubinho|sympla|manual`) — estrutural, não é omissão
pontual. `mark-expired` é a única exceção que varre todas as atrações publicadas de uma
vez, mas não usa slug/nome para lógica (opera sobre `_id`/`status`/`proxima_data`).

**Campo `origem` não participa da chave de dedup em lugar nenhum** — é só metadado
editorial (schema em `sanity/schemas/atracao.ts:109-132`: valores `sympla | eventim |
clubinho | raindrop | outro`).

### Fuzzy matching hoje

Nenhum. Busca por `levenshtein|jaro|fuzzy|string-similarity|fuse\.js|natural` em
`scripts/`, `lib/`, `sanity/` e `package.json` não retornou nenhuma lib nem função
caseira de comparação de similaridade. Confirmado explicitamente: **não existe hoje
nenhum mecanismo de fuzzy/similaridade** no pipeline.

### Schema Sanity — status "Duplicada"

`sanity/schemas/atracao.ts:163-180` — campo `status` tem valores `operando | encerrada |
em_obras | esgotada | rejeitado`. **Não existe valor "Duplicada"** ainda — decisão do
Rafa de 16/07/2026 (registrada em memória, ver `[[project-duplicatas-cross-source]]`) de
criar esse status segue sem story/AC formal no board.

Achado lateral relevante para a proposta: `bairro` é campo **obrigatório** no schema
(`Rule.required().min(2).max(80)`, linha ~132), populado no enriquecimento
(`pipeline-ia`) antes de chegar ao Sanity — diferente de `venue`, que é inconsistente
entre fontes (ausente em Clubinho/manual/whatsapp). Isso o torna um candidato melhor de
particionamento para dedup cross-fonte do que `venue`.

---

## AC2 — Proposta de dedup cross-fonte, com trade-offs

### Chave de comparação proposta

Em vez de comparar `venue` (inconsistente entre fontes), comparar:
**nome normalizado (tokens significativos, sem stopwords) + `bairro` (campo obrigatório,
já presente em todo documento Sanity publicado)**.

Isso evita dois problemas do dado bruto: `venue` vazio em várias fontes, e nomes com
sufixos/variações ("Sessão 3", "- Teatro X") que uma comparação char-a-char (Levenshtein
puro) penalizaria mais que uma comparação por conjunto de tokens (Jaccard/Dice).

### Onde rodar: 2 opções candidatas

**Opção A — Script de auditoria standalone (recomendada como 1º passo)**
Novo script (ex. `check-duplicatas-cross-fonte.ts`), mesmo padrão de
`check-atualizacoes`/`check-novidades` (relatório `.md`, não escreve nada sozinho):
1. Busca todos os `atracao` não-rejeitados (published+drafts) no Sanity.
2. Agrupa por `bairro` (partição barata, reduz comparações de O(n²) global para O(n²)
   por grupo pequeno).
3. Dentro de cada grupo, compara nome normalizado entre documentos de `origem`
   diferentes; acima de um limiar de similaridade, reporta o par como candidato.
4. Saída: relatório com os pares candidatos, para o Rafa decidir manualmente — igual ao
   padrão já usado em `check-atualizacoes --fix-dates` (nunca aplica sozinho).

Trade-offs: não bloqueia nada em tempo real (duplicata pode ser criada e só é pega na
próxima rodada da auditoria), mas é a opção de menor risco — não integra ao caminho de
escrita, roda sob demanda, e serve tanto para achar casos antigos (backlog) quanto novos.

**Opção B — Checagem em tempo real dentro de `check-novidades`/`import-sanity`**
Estender a dedup existente para, além do slug exato, rodar a mesma comparação fuzzy
contra o Sanity antes de criar o documento.

Trade-offs: pega a duplicata antes mesmo dela virar documento (mais cedo no funil), mas
adiciona latência a toda execução do pipeline (compara contra a base inteira, não só o
lote do dia) e tem maior raio de dano se der falso positivo — hoje uma ficha nova
silenciosamente pulada por engano no meio de um lote grande é mais difícil de notar do
que uma linha extra num relatório de auditoria separado.

**Recomendação:** começar pela Opção A. Só migrar para Opção B se a Opção A rodada por
algumas sprints mostrar que o atraso entre criação e detecção é um problema prático (ex.:
duplicata chega a ir ao ar antes da próxima auditoria).

### Falso positivo vs. falso negativo

**Falso positivo** (dois documentos diferentes sinalizados como duplicata, mas são
atrações reais distintas): risco real quando duas atrações diferentes no mesmo bairro têm
nome genérico parecido (ex. dois espetáculos infantis diferentes chamados "Circo X" em
bairros diferentes com o mesmo nome de bairro, ou duas edições de uma colônia de férias
com nomes de turma diferentes). Mitigação: nunca auto-aplicar o status "Duplicada" — só
sinalizar para revisão humana, mesmo que a similaridade seja altíssima. Mesmo princípio
já usado para `--fix-dates` e para o achado de duplicata em `[[project-duplicatas-cross-
source]]` (Rafa decide caso a caso).

**Falso negativo** (duplicata real não detectada): risco quando o nome muda o bastante
entre fontes que nem a comparação por tokens pega (ex. um evento chamado por um nome na
divulgação do Instagram e por outro nome comercial no Sympla, sem sobreposição de
palavras). Comparação por bairro reduz mas não elimina esse risco — no limite, exigiria
também comparar data/faixa etária como sinal auxiliar. Não é coberto pela proposta inicial
— registrar como limitação conhecida, não bloqueador.

### Threshold e biblioteca

Não há hoje nenhuma lib de fuzzy matching no projeto (confirmado no AC1) — precisa
adicionar uma (ex. `string-similarity` para Dice coefficient, ou implementação própria de
Jaccard sobre tokens, que evita dependência nova). Threshold exato fica para a story de
implementação decidir com dados reais dos 5 casos já confirmados como conjunto de
validação manual (rodar a comparação contra os pares conhecidos antes de fixar o número).

---

## AC3 — Fix não implementado

Conforme escopo do spike, nenhum código de produção foi alterado nesta sessão. Este
documento é o output esperado — causa raiz confirmada + proposta com trade-offs — para
decisão em Kickoff futuro (Sprint 15, conforme já sinalizado no handoff da Sprint 13).

**Decisão pendente para o Kickoff:** (1) aceitar a Opção A como primeiro passo; (2) criar
formalmente o status "Duplicada" no schema (já decidido pelo Rafa em 16/07, sem story
ainda); (3) escolher a lib/algoritmo de similaridade e o threshold.

---

## Retrospectiva de sessão

### O que foi bom

1. Delegar o mapeamento de código (geração de slug por fonte, mecanismo de dedup,
   presença/ausência de fuzzy matching) para uma exploração dedicada trouxe paths e
   linhas exatas rapidamente, sem eu precisar varrer `scripts/` inteiro manualmente —
   e todos os achados-chave foram conferidos por leitura direta antes de entrar no
   documento (slug.ts, dedup do import-sanity, schema do Sanity), em vez de confiar cegamente no relatório do agente.
2. A memória `[[project-duplicatas-cross-source]]` já tinha o caso "Luiz e Nazinha"
   registrado de sessões anteriores — isso confirmou rápido que o padrão é conhecido e
   recorrente, e evitou eu tratar o achado como novidade isolada.
3. Notei que `bairro` é campo obrigatório no schema (ao contrário de `venue`, inconsistente
   entre fontes) durante a investigação do schema — isso virou a base da proposta de chave
   de comparação (nome + bairro em vez de nome + venue), um detalhe que não estava em
   nenhum handoff anterior.

### O que pode melhorar

1. Não validei o threshold de similaridade com nenhum teste real contra os 5 casos
   confirmados (ex. rodar Jaccard/Dice manualmente nos nomes reais das duplicatas
   conhecidas) — a proposta ainda é teórica nesse ponto, ficou para a story de
   implementação decidir sem dado empírico prévio.
2. Não confirmei com o Rafa se o fluxo "manual/Instagram (US-A3)" e "WhatsApp (triagem)"
   são a mesma coisa ou dois fluxos distintos — tratei como fontes separadas no
   levantamento por serem normalizers diferentes, mas isso pode estar duplicando conceito
   sem necessidade.
3. A branch atual (`fix/us-s62-backfill-endereco`) segue checked-out de uma sessão
   anterior, sem PR aberta ainda — não bloqueou este spike (só leitura), mas é o mesmo
   padrão de "branch esquecida entre sessões" já sinalizado na Sprint 13. Não troquei de
   branch nem investiguei o motivo, por estar fora do escopo deste spike.

### Plano de ação

| Melhoria | Ação | Dono | Quando |
|---|---|---|---|
| Threshold de similaridade sem validação empírica | Rodar a comparação (Jaccard/Dice) contra os 5 casos reais conhecidos antes de fixar o número definitivo | Claude | Story de implementação do fix (Sprint 15) |
| Sobreposição não confirmada entre fluxo manual/Instagram e WhatsApp | Perguntar ao Rafa se são o mesmo fluxo editorial ou dois distintos | Rafa | Kickoff Sprint 15 |
| Branch `fix/us-s62-backfill-endereco` sem PR aberta | Confirmar status da PR do US-S62 e decidir se abre PR ou descarta | Rafa | Quando conveniente |
