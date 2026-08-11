# Discovery — Boas práticas anti-alucinação no pipeline-ia

**Data:** 2026-08-07
**Sessão iniciada por:** Rafa, colando uma lista de 7 boas práticas de mercado pra reduzir
alucinação em pipelines de IA (fonte externa, verificada com fontes segundo o próprio Rafa),
pedindo avaliação de quais fazem sentido pro editorial do Onde Brincar.
**Escopo confirmado com o Rafa:** só `pipeline-ia` (fichas, Gemini). Pipelines de conteúdo
social (posts Instagram/LinkedIn via voice-builder, Claude) ficam de fora — arquitetura e
risco de alucinação são diferentes, mereceriam discovery própria se algum dia virar prioridade.

---

## Fontes de sinal

1. **Lista de 7 práticas colada pelo Rafa** (mercado): restringir à fonte, permitir
   abstenção, output estruturado, grounding/citação, verificação em 2ª passada, humano no
   loop, temperatura baixa.
2. **Código e ADRs do `pipeline-ia`** (leitura direta, 07/08/2026): `scripts/pipeline-ia/prompt.ts`,
   `gemini.ts`, `quality-gate.ts`, ADRs `2026-05-15-s4-1b-pipeline-ia.md`,
   `2026-05-20-s4-1e-f-prompt-transparencia.md`, `2026-06-03-s4-1d-few-shot-calibration.md`,
   `2026-05-25-s4-1g-quota-aware.md`.
3. **Incidente real confirmado**: `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-S71.md` —
   vazamento de menção à persona interna (Daniel/Lívia) em 11 fichas publicadas, apesar de
   bloqueio anterior (US-S32/PR#132). 4 das 11 fichas já tinham `review_status: human_approved`.
4. **Débito documentado**: `Handoffs/Handoffs de Sprint/Handoff-Sprint-16.md`, item 7 do
   débito consolidado — mesmo achado da US-S71, ainda sem story de fix, cotado para quando a
   US-E17 (skill de checagem pós-publicação, Sprint 16) for desenhada.

Confirmado com o Rafa: sem sinal adicional além destes — não seguir com métricas de GA4 ou
outros incidentes não documentados aqui.

---

## Diagnóstico

### Já implementado — preservar, não é gap

| Prática (nº da lista) | Onde está no código/ADR | Evidência |
|---|---|---|
| #1 Restringir à fonte | `prompt.ts`, seção "TRANSPARÊNCIA SOBRE LACUNAS": instrução explícita de não inventar, sinalizar lacuna em vez de completar | ADR `2026-05-20-s4-1e-f-prompt-transparencia.md` |
| #2 Permitir abstenção | Campo `abstain_fields` no schema de resposta, com regra de quais campos não podem abster (categoria, bairro, idade_min, idade_max) | ADR `2026-05-15-s4-1b-pipeline-ia.md` |
| #3 Output estruturado | `responseSchema` + `responseMimeType: application/json` na chamada Gemini | ADR `2026-05-15-s4-1b-pipeline-ia.md` |
| #7 Temperatura baixa | `temperature: 0.2` em `scripts/pipeline-ia/gemini.ts:189` | Leitura direta do código |

Essas 4 práticas não geram story nem ação — já são decisão vigente. Registrado aqui só pra
não serem "readotadas" achando que é gap novo numa sessão futura.

### Gaps — problemas identificados

**P1 — Gate de revisão humana falha especificamente em conteúdo sensível**

- **Descrição:** o quality-gate rejeita (`needs_human`) quando detecta menção à persona
  interna, mas isso não é suficiente — a revisão humana que vem depois não trata essa reason
  de forma diferente de qualquer outra (tamanho de texto, enum inválido, etc.), e acabou
  aprovando o problema mesmo assim em 4 de 11 casos.
- **Causa raiz:** reasons de conteúdo sensível e reasons de qualidade geral aparecem
  misturadas no fluxo de revisão, sem destaque visual ou hierarquia — nada sinaliza "esse
  motivo é mais grave que aquele".
- **Impacto:** Alto. É o único dos 3 gaps com **incidente real confirmado em produção**, e
  já aconteceu 2x na mesma história (o vazamento original que motivou US-S32, e depois o
  gap de enforcement que motivou US-S71).
- **Esforço:** Baixo-médio — a observação de solução já está registrada (destaque visual
  mais forte pra reasons de conteúdo sensível), só falta desenhar.
- **Prioridade recomendada:** P1.
- **Força da evidência:** sólida — dado real (4/11 fichas), não inferência.

**P2 — Sem grounding/citação de trecho-fonte (prática #4 da lista)**

- **Descrição:** a pipeline extrai campos do texto bruto do scraper, mas não pede ao Gemini
  que aponte de qual trecho da fonte tirou cada valor. A auditoria de qualidade hoje
  (`quality-gate.ts`) é estrutural (schema, enums, faixas) e heurística sobre o texto de
  saída — não compara a saída contra a entrada.
- **Causa raiz:** nunca foi desenhado; a arquitetura de quality-gate desde a US-S4.1b
  focou em validar forma, não rastreabilidade de conteúdo.
- **Impacto:** Médio — hoje, quando uma ficha erra um dado, a única forma de descobrir é
  auditoria manual campo a campo contra a fonte.
- **Esforço:** Médio — exigiria campo extra no schema de resposta (ex: trecho de origem por
  campo crítico) e decidir para quais campos vale a pena.
- **Prioridade recomendada:** P2.
- **Força da evidência:** fraca — nenhum incidente real de dado extraído incorretamente
  (vs. instrução ignorada) registrado até aqui. Motivação é preventiva, baseada na prática
  de mercado, não em dado observado no projeto.

**P3 — Sem verificação em segunda passada (prática #5 da lista)**

- **Descrição:** não existe uma chamada de IA separada que relê o texto-fonte e valida se
  cada campo gerado é sustentado por ele. O que existe é regra determinística de código,
  adicionada reativamente a cada incidente (ex: `mencaoPersonaInterna` criada depois da
  US-S71).
- **Causa raiz:** arquitetura sempre foi single-pass, decisão deliberada e documentada —
  ver nota de contradição de ADR abaixo.
- **Impacto:** Médio em tese, mas **nenhum caso real de alucinação factual clássica** (dado
  inventado dentro de um campo válido) está registrado — os dois incidentes reais
  conhecidos (US-S71, débitos de bairro/preço da US-S4.1d) são gap de regra ou lacuna de
  dado na fonte, não o modelo inventando um fato.
- **Esforço:** Alto — dobraria chamadas de IA por ficha. Rate limit já é gargalo conhecido
  (15 RPM free tier, ADR `2026-05-25-s4-1g-quota-aware.md` existe justamente pra lidar com
  estouro de cota).
- **Prioridade recomendada:** P3 — parking lot, não story.
- **Força da evidência:** fraca.

### Checagem contra ADR existente

Não achei ADR que proíba explicitamente uma segunda verificação, mas há um precedente de
arquitetura relevante: a ADR `2026-08-07-dedup-cross-fonte.md` decidiu, para um problema
parecido (checagem que poderia ser real-time e bloqueante), optar por **auditoria
assíncrona, nunca gate automático bloqueante** — mesmo espírito human-in-the-loop já usado
em US-O8/US-O9. Se P2 ou P3 virarem story no futuro, esse é o precedente arquitetural mais
alinhado ao projeto (relatório à parte / campo extra no schema, não uma segunda chamada de
IA bloqueando a pipeline). Não é uma contradição que exija parar — é um guia de forma para
quando/se a story for desenhada.

---

## Rascunho de histórias

**Atualização (07/08/2026, mesma sessão):** ao tentar incorporar a hipótese de P1 como AC da
US-E17 (como o texto original desta seção propunha), a leitura direta da página da US-E17 no
Notion mostrou que ela já está com escopo fechado — SP=1, Ready, ACs específicos só sobre
dedup cross-fonte pós-publicação. A hipótese de P1 é sobre o gate de revisão
antes/no-momento-do-import, natureza diferente. Colar ali infracionaria o próprio
Definition of Ready (assumption de escopo mudando depois de "Ready") e o anti-padrão de
backlog inflado por adição sem critério. Decisão do Rafa: virar story separada.

| Story ID | Título | Épico | SP estimado | AC rascunho | Sprint |
|---|---|---|---|---|---|
| US-S75 (reservado — próximo livre no épico S, confirmado via query no Sprint Board) | Destaque de reasons de conteúdo sensível no quality-gate para revisão manual | S — Scraper | a definir | (1) `quality-gate.ts` classifica cada reason em categoria `conteudo_sensivel` vs. `qualidade_geral`; (2) categoria visível no material de revisão (Studio ou relatório); (3) teste cobrindo a classificação da reason existente (`mencao_persona_interna`) | a definir |

Criada no Discovery Board do Notion, depois promovida a pedido do Rafa (07/08/2026) direto
pro Sprint Board, **Sprint 16, Status "Bloqueada"** (não "Ready" — SP não estimado e
assumption de onde o destaque aparece ainda aberta; mesmo padrão já criticado na US-I29,
"Ready é rótulo incorreto aqui"). Card no Discovery Board marcado "Priorizado" (não duplica
mais como candidata solta). Páginas:
- Sprint Board: https://app.notion.com/p/3b5e97b095aa81bfa76bd3c2bb4715fe
- Discovery Board (origem): https://app.notion.com/p/3b5e97b095aa81b2b27af4edbdcf8016

Assumptions em aberto (onde o destaque aparece na prática, SP) ficam para o Refinamento
antes de virar Ready pro Kickoff — esta sessão não fecha DoR.

---

## Parking lot

| Item | Motivo de não virar história agora |
|---|---|
| P2 — Grounding/citação de trecho-fonte | Esforço médio sem incidente real que justifique urgência — reconsiderar se aparecer um caso de dado extraído errado (não instrução ignorada) |
| P3 — Verificação em segunda passada | Esforço alto, dobra custo de API já com rate limit apertado, contradiz o espírito custo-consciente do ADR S4.1g, zero incidente real do tipo que resolveria — reconsiderar só se um caso real de fato inventado for confirmado |

---

## Decisões tomadas

- Escopo desta sessão restrito a `pipeline-ia` (fichas) — pipelines de conteúdo social
  ficam fora, discovery própria se virar prioridade.
- 4 das 7 práticas de mercado já estão implementadas — não readotar em sessão futura achando
  que é gap novo.
- P1 vira story nova (US-S75), não AC da US-E17 — escopo da US-E17 já estava fechado
  (Ready, SP=1) e é de natureza diferente (pós-publicação vs. gate de import). Decisão do
  Rafa, 07/08/2026.
- A pedido explícito do Rafa (fora do escopo padrão de Discovery), US-S75 foi colocada
  direto em Sprint 16 — Status "Bloqueada", não "Ready", porque SP e a assumption de onde o
  destaque aparece ainda estão abertos. Fica para o Refinamento fechar isso antes do Kickoff.

Nenhuma decisão de arquitetura ou processo nova o suficiente para merecer ADR própria nesta
sessão.

---

## Perguntas em aberto

- P2/P3 seguem sem sinal real — vale, numa próxima sessão de curadoria de fichas, o Rafa
  registrar explicitamente quando encontrar um dado extraído errado (não texto vazado), pra
  esse discovery ganhar sinal de verdade em vez de ficar só na prática de mercado?

---

## Recomendações pro próximo Kickoff/Refinamento

- US-S75 já está em Sprint 16 (Bloqueada) — precisa passar por Refinamento antes do Kickoff
  virar Ready: falta decidir onde o destaque aparece na prática (Studio vs. relatório) e
  estimar SP.
- P2 e P3 seguem no parking lot — não são candidatas a entrar em sprint até ganharem sinal
  real (não é o caso de "esforço vs. prioridade atual", é literalmente falta de evidência de
  necessidade).
