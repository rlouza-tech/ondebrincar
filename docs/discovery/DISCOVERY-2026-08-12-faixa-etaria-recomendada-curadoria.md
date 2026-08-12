# Discovery — Faixa etária recomendada por curadoria (além da classificação legal)

**Data:** 2026-08-12
**Sessão:** Claude Code, disparada no meio da sessão de execução da US-S20 (Sprint 16), a
partir de uma pergunta do Rafa sobre o que tinha sido implementado.
**Base:** HANDOFF_v9_Onde_Brincar.md + card existente no Discovery Board (Notion,
"Faixa etária recomendada por curadoria (além da classificação legal)", criado 2026-07-02).

---

## Origem desta sessão

Durante a sessão de execução da US-S20 ("Inferir faixa etária por contexto quando ausente na
fonte", já concluída e mergeada — PR #171), o Rafa perguntou se um campo novo "Idade
recomendada" tinha sido criado. Não tinha: a US-S20 renomeou/reaproveitou os campos existentes
(`idade_min`/`idade_max` → "Idade recomendada mínima/máxima" no Sanity), sem separar
classificação oficial de recomendação curatorial.

Isso reabriu um card antigo do Discovery Board, parado desde 02/07/2026 como "Ideia" sem
critério fechado, sobre exatamente essa separação.

## Fontes de sinal trazidas nesta sessão

- **Feedback qualitativo direto (conversas do Rafa com usuários/interessados):** "boa parte de
  quem eu converso cita o filtro de idade como algo relevante. Outros não falam, mas o primeiro
  filtro que usam é o de idade."
- **Card do Discovery Board (02/07/2026):** ficha "Partiu 90" (festa temática anos 90)
  classificada como "livre" (correto legalmente), mas que serve melhor um público teen/adulto
  do que uma criança pequena — "livre" é o piso legal, não uma recomendação de produto.
- **Caso desta sprint (US-S20):** "Luluca: O Show" chegava sem faixa etária porque a fonte não
  classificava — mesma classe de problema, resolvida nesta sprint só para o caso de ausência
  total de dado, não para o caso "dado presente mas pouco útil" (ex.: "livre" genérico).
- **Métrica disponível mas conscientemente não usada como evidência principal:** existe
  tracking GA4 de uso de filtro (`lib/analytics.ts:36-40`, `filter_type: "age"`, com
  `results_count`). Perguntei se valia puxar esse número antes de diagnosticar. Decisão
  explícita do Rafa: não — "a pessoa pode usar o filtro, mas ficar frustrada porque tudo está
  ali. Nesse caso, eu confio mais no retorno que tenho." `results_count` alto não distingue uso
  satisfeito de uso frustrado, então não seria um teste válido da hipótese — o sinal qualitativo
  é mais direto para essa pergunta específica.

**Força da evidência:** qualitativa, consistente entre conversas diferentes, mas não
quantificada nem validada por métrica — é sinal de conversas informais, não pesquisa
estruturada (survey, sessão de usabilidade gravada). Registrado aqui como está, sem inflar.

---

## Diagnóstico

### Problema 1: o campo de faixa etária hoje mistura "quem pode entrar" (classificação legal)
com "pra quem o programa faz sentido" (recomendação de produto) — e quando a fonte só dá a
classificação legal ampla ("livre"), o filtro de idade perde poder de discriminar

**Causa raiz:** o pipeline (Gemini + normalizers) sempre extraiu só a classificação indicativa
legal quando presente na fonte, num único par de campos (`idade_min`/`idade_max`). A US-S20
adicionou uma camada de inferência por contexto sobre esses MESMOS campos para o caso de
ausência total de dado — mas não resolve o caso "dado presente e tecnicamente correto, porém
pouco útil pra decisão do usuário" (ex.: "livre" que legalmente cobre 0–18 mas que, na prática,
não é indicado pra bebê nem pra pré-adolescente da mesma forma).

**Impacto:** Alto. O filtro de idade é citado espontaneamente como relevante em conversas do
Rafa com usuários, e é descrito como o primeiro filtro usado por parte deles — é uma das
ferramentas centrais de descoberta do site, não um recurso secundário. Evidência qualitativa
consistente, mas ainda não validada por pesquisa estruturada.

**Esforço:** Médio. Boa parte da infraestrutura já existe e foi validada nesta própria sprint
(US-S20): inferência por contexto via Gemini com guardrails explícitos, mecanismo de
abstenção/`null` → "A confirmar" propagado pela pipeline inteira (schema Sanity opcional,
`quality-gate`, CSV enriquecido, `import-sanity`, frontend). O trabalho novo é
majoritariamente reorganizar essa lógica em dois campos em vez de um, não construir do zero.

**Prioridade recomendada:** P1 — não bloqueia nada em produção hoje (o campo atual funciona,
só não é ideal), mas é sinal direto e repetido sobre uma função central do produto.

---

## Decisões tomadas nesta sessão

1. **Dois campos, papéis diferentes:**
   - **Classificação oficial** (`idade_min`/`idade_max` atuais) — visível **só no Studio**
     (admin/interno). Deixa de receber inferência por contexto; volta a representar
     estritamente o que a fonte diz (classificação indicativa legal ou recomendação de público
     quando explícita no texto).
   - **Idade recomendada** (campo novo) — **visível no site público**, usada no filtro de idade
     e na exibição da ficha. Recebe a lógica de inferência por contexto que a US-S20 introduziu
     (as 3 regras: youtuber kids → 4–12, teatro bebês → 0–3, show infantil genérico → 0–12),
     além de qualquer recomendação explícita de público já extraída da fonte. Quando nem
     classificação nem inferência se aplicam: "A confirmar" (mesmo padrão da US-S20).
2. **Reverter o comportamento da US-S20** nos campos `idade_min`/`idade_max`: eles voltam a
   representar só classificação oficial pura, sem a inferência de contexto que a S20 colocou
   ali. Essa lógica migra para o campo novo.
3. **Critério de evidência para esta hipótese:** sinal qualitativo (conversas diretas) pesa mais
   que o proxy quantitativo disponível (`results_count` do filtro), porque o proxy não
   distingue satisfação de frustração. Decisão consciente do Rafa, registrada para não ser
   revisitada sem novo argumento.

**Vale virar ADR:** a decisão #1 (dois campos de faixa etária com papéis e visibilidade
diferentes) é uma decisão de modelo de dados que vai influenciar qualquer story futura que
toque faixa etária — sinalizo que merece um ADR (`docs/decisions/2026-08-12-faixa-etaria-oficial-vs-recomendada.md`
ou similar), mas não crio aqui — é decisão do Rafa formalizar quando/como.

---

## Stories rascunhadas

Último Story ID usado em cada épico (checado no Sprint Board via query): **US-S76** e
**US-I35**. Próximos disponíveis: US-S77, US-I36.

| Story ID | Título | Épico | SP estimado (chute) | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-S77 | Separar classificação oficial de idade recomendada no pipeline | S — Scraper | 3 (chute) | 1) Schema Sanity ganha campo novo `idade_recomendada_min`/`idade_recomendada_max` (público). 2) `idade_min`/`idade_max` voltam a representar só classificação oficial extraída da fonte — sem inferência por contexto — e ficam visíveis só no Studio (não integram mais o payload público). 3) A lógica de inferência por contexto da US-S20 (3 regras + abstenção → null) migra para popular `idade_recomendada_min`/`idade_recomendada_max`. 4) Quando a fonte já traz uma recomendação de público explícita (não só classificação legal), essa recomendação também popula o campo novo — critério exato de mapeamento a fechar no refinamento, com exemplos concretos (mesmo padrão de few-shot usado na US-S20). 5) Fichas já publicadas antes desta story têm dado de `idade_min`/`idade_max` gerado pela lógica da S20 (mistura classificação+inferência) — decidir no refinamento se precisa reprocessamento/backfill ou se só vale daqui pra frente. | a definir |
| US-I36 | Site usa Idade recomendada (não a oficial) na exibição e no filtro | I — Interface | 2 (chute) | 1) `formatFaixaEtaria` e a ficha de detalhe passam a ler `idade_recomendada_min`/`idade_recomendada_max`, não mais `idade_min`/`idade_max`. 2) Filtro de idade do site passa a filtrar por `idade_recomendada_min`/`idade_recomendada_max`. 3) Classificação oficial não aparece em nenhum lugar do site público (card, ficha, meta description, JSON-LD). 4) Analytics (`age_min`/`age_max` no evento de visualização) passa a refletir a idade recomendada. Depende da US-S77 (schema/dado precisa existir antes). | a definir |

---

## Parking lot

Nenhum item novo — o card original já tinha hipótese clara o suficiente para virar rascunho de
story nesta sessão (diferente de quando foi criado em 02/07, quando faltava critério).

---

## Perguntas em aberto

1. **Mecanismo de recomendação quando não há classificação nem pista de contexto óbvia:** regra
   determinística por categoria/palavra-chave, ou Gemini caso a caso com guardrails (como a
   US-S20 fez)? A US-S20 mostrou que Gemini com guardrails explícitos funciona, mas também que
   o modelo real ainda "escorrega" pra defaults genéricos se a instrução não for muito
   específica — vale considerar esse precedente ao decidir.
2. **Mapeamento exato oficial → recomendada quando a fonte já tem uma recomendação de público
   explícita** (não apenas classificação legal, ex.: "para crianças de 3 a 10 anos"): copia
   automaticamente pro campo recomendado, ou passa por uma camada de curadoria própria?
3. **Migração de dado histórico:** fichas já publicadas com o comportamento da US-S20 (que
   mistura classificação oficial e inferência de contexto num único campo) — precisa de
   reprocessamento, ou o novo comportamento só vale para fichas processadas dali pra frente?
4. **Prioridade real frente a outras lacunas de curadoria já mapeadas** (voz autoral, política
   de preço transparente, citadas no card original) — não avaliado nesta sessão, é decisão de
   Kickoff, não de Discovery.
5. Nome técnico definitivo dos campos novos no schema (`idade_recomendada_min`/`_max` foi só um
   nome de trabalho usado aqui) — trivial, mas fechar no refinamento junto com a convenção do
   projeto.

---

## Recomendações pro próximo Kickoff/Refinamento

- US-S77 e US-I36 têm hipótese e AC rascunho, mas **não estão Ready** — faltam as perguntas em
  aberto acima, especialmente #1 e #2 (mecanismo de recomendação e mapeamento oficial→
  recomendada), que são decisões de arquitetura e não podem ficar em aberto na DoR (mesma regra
  que travou a US-E23/O27/O28 nesta sprint).
- Rodar Refinamento dedicado para essas duas stories antes de qualquer Kickoff que as inclua,
  com exemplos concretos de fichas reais (mesmo padrão que funcionou na US-S20: few-shot +
  smoke test com Gemini real antes de fechar).
- Considerar registrar a decisão #1 (dois campos, papéis diferentes) como ADR antes do
  refinamento, já que ela vai orientar as ACs de ambas as stories.
- US-S77 bloqueia US-I36 — não fazem sentido em Kickoffs separados sem intenção explícita de
  deixar o site com o dado novo gerado mas não usado por um tempo.
