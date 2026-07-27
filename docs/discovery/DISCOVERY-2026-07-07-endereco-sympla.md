# Discovery — US-S38: Endereço vazio no Sympla (domínio padrão)

**Story:** US-S38 (spike)
**Tipo de sessão:** Execução — spike

---

## ⚠️ Nota sobre este arquivo

Este documento foi citado no handoff original de 07/07/2026 mas nunca foi de fato commitado
no repo (débito registrado em HANDOFF_v9, seção "Débito acumulado"). A seção "Rodada 1"
abaixo foi reconstruída a partir de `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-S38.md`
(handoff de sessão da época, que tem o relato completo) para preservar o histórico antes de
registrar a reabertura de 22/07. A seção "Rodada 2" é a investigação nova, feita hoje.

---

## Rodada 1 — 07/07/2026 (reconstruída do handoff de sessão)

**Conclusão da época:** sem bug ativo nas duas estratégias de extração de
`sympla-enrich.ts::extrairEndereco()` (`__NEXT_DATA__.eventsAddress` + fallback DOM).

- Testada a ficha "Gracie Kore": `__NEXT_DATA__` populado corretamente na página real,
  string extraída batia caractere por caractere com a planilha de 06/07 e com a ficha
  publicada.
- Hipótese para o "vazio" reportado na revisão de 06/07: efeito colateral transitório do
  bug de slug >128 caracteres (US-S26), não falha de extração.
- Amostra: **só 4 eventos Sympla processados desde 01/07** (lançamento da extração de
  endereço, US-S24) — os 4 corretos. Ressalva já registrada no próprio AC3 original: amostra
  pequena, sem casos de falha disponíveis para testar.
- Pós-fechamento: teste manual em lote (12 eventos únicos, domínio padrão) confirmou 100% de
  acerto; achou um gap real, mas em outro domínio (`bileto.sympla.com.br`, sem `__NEXT_DATA__`,
  conteúdo em shadow DOM) — motivou US-S40/US-S51, mecanismo diferente, não confundir.

---

## Rodada 2 — 22/07/2026 (REABERTURA)

### Gatilho da reabertura

Revisão de fichas de 16/07/2026 (`Handoffs/revisao-fichas-2026-07-16.md`) encontrou 3 fichas
Sympla, domínio padrão (`sympla.com.br/evento/...`, não bileto), publicadas com endereço
vazio — evidência mais forte que a rodada 1 (0 falhas em 4 amostras), motivando reabrir com
amostra de 3 falhas confirmadas:

- "1ª Edição do Start Kids" — `sympla.com.br/evento/1a-edicao-da-start-kids-corre-corrida-infantil-inclusiva/3497234`
- "Oficina de Boneco Tim Tim" — `sympla.com.br/evento/oficina-de-bonecos-tintintins/3500516`
- "Colônia de Férias Artísticas do Caqui" — URL não localizada na sessão de 16/07

### AC1 — `__NEXT_DATA__.eventsAddress` nas 3 páginas reais

Verificado ao vivo (Claude Browser, passando pelo challenge Cloudflare do Sympla) nas 2 URLs
confirmadas:

| Ficha | `eventsAddress` populado? | Valor |
|---|---|---|
| 1ª Edição do Start Kids | ✅ Sim | `Parque Realengo Susana Naspolini / Rua Professor Carlos Wenceslau, 290 / Realengo` |
| Oficina de Bonecos TinTinTins | ✅ Sim (mesmo após o evento encerrar — layout "evento já encerrou" não afeta `__NEXT_DATA__`) | `CRAB Sebrae - Centro de Referência do Artesanato Brasileiro / Praça Tiradentes, 69 / Centro` |

**A estrutura não mudou.** `__NEXT_DATA__.props.pageProps.hydrationData.eventHydration.event.eventsAddress`
segue no mesmo caminho que o código espera, com os mesmos campos (`address`, `addressNum`,
`addressAlt`, `neighborhood`).

### AC2 — Seletores DOM (Estratégia 2)

Verificado nas 2 mesmas páginas: **nenhum dos seletores de `DOM_SELECTORS`/Estratégia 2 existe
mais** (`[data-testid='event-address']`, `address`, `[class*='EventLocation']`, etc. — todos
retornam 0 matches). O texto do endereço está visível na página ("Local: Parque Realengo
Susana Naspolini / Rua Professor Carlos Wenceslau, 290 Realengo") mas dentro de elementos
genéricos sem `data-testid` nem tag semântica `<address>`. **Estratégia 2 está morta** — mas
isso não importa na prática porque a Estratégia 1 (`__NEXT_DATA__`) sempre roda primeiro e
retorna antes de chegar no fallback DOM.

### AC3 — Causa raiz: NÃO é no scraper. É no `import-sanity`.

Esta é a virada do spike. Antes de aceitar a premissa da story (bug na extração), fui direto
aos dados reais do pipeline daquele dia:

**O CSV gerado pelo `pipeline-ia` no dia 16/07 (`data/output/planilha-enriquecida-2026-07-16T14-09-15-045Z.csv`,
usado como `source_csv` do import — confirmado em `data/output/import-report-2026-07-16T14-18-21-990Z.json`)
já tinha a coluna `endereco` corretamente preenchida para as 3 fichas:**

| Ficha | `endereco` no CSV (16/07, pré-import) |
|---|---|
| 1ª Edição do Start Kids | `Rua Professor Carlos Wenceslau, 290 — Realengo` |
| Oficina de Bonecos TinTinTins | `Praça Tiradentes, 69 — Centro` |
| Colônia de Férias Artística do CAC (= "Caqui" da revisão — nome real no Sympla é "CAC") | `Rua Delgado de Carvalho, 41 — Tijuca` |

O `import-report` confirma `created: 3, errors: 0` para as 3 — nenhuma falha de import.

**Onde o dado se perde:** `scripts/import-sanity/index.ts::readEnrichedCSV()` monta o objeto
`LinhaEnriquecida` linha por linha a partir do `record` do `csv-parse`, listando explicitamente
cada campo que quer ler (`nome`, `slug`, `categoria`, ... `pipeline_failed`). **`endereco` não
está nessa lista** — nunca foi adicionado. `linha.endereco` fica `undefined` para 100% das
linhas, não importa o que o CSV tenha. Em `scripts/import-sanity/mapper.ts:50-51`:

```ts
if (linha.endereco) {
  doc.endereco = linha.endereco;
}
```

Como `linha.endereco` é sempre `undefined`, essa condição nunca é verdadeira — **o campo
`endereco` nunca é escrito em nenhum documento criado pelo `import-sanity`**, mesmo quando o
CSV de entrada tem o valor certo.

Confirmado que este bug **ainda existe no HEAD atual** (`git show HEAD:scripts/import-sanity/index.ts`),
não é algo já corrigido depois — é um bug estrutural vivo hoje.

**Por que a rodada 1 (07/07) não achou isso:** a amostra de 4 eventos da época provavelmente
também sofreu o mesmo bug (o código de `import-sanity` já estava assim), mas o spike original
só comparou o dado bruto da página com a planilha e com o site publicado — sem checar se o
valor da planilha efetivamente chegou ao Sanity via o import, porque a pergunta da story era
"a extração falhou?", não "o dado se perdeu depois de extraído?". A hipótese de slug (US-S26)
parecia suficiente para explicar o único caso observado na época e ninguém comparou
CSV-pré-import vs. documento Sanity criado.

**Por que os 3 casos de 16/07 pareciam "vazio" mas a página publicada hoje mostra o endereço
certo:** o Rafa preencheu manualmente depois de notar o campo vazio no Studio (confirmado por
`_updatedAt` posterior a `_createdAt` nos 3 documentos, e pelo formato do texto — a versão em
produção não tem o travessão `" — "` que o scraper usa como separador, e bate exatamente com
o texto puro visível na seção "Local" da página do Sympla, não com o formato do CSV). Ou seja:
o dado publicado hoje é do Rafa, não do pipeline.

### Escopo: isolado ou padrão mais amplo?

**Padrão estrutural, não caso isolado.** Consultei o Sanity de produção direto (GROQ,
`origem == "sympla"`, 34 fichas). Excluindo as fichas anteriores a 01/07 (antes da extração de
endereço existir — natural não terem o campo) e as 2 já sabidamente cobertas por outro bug
(bileto/dedup), achei uma **4ª ficha, completamente nova, não reportada na revisão de 16/07**,
com o mesmo sintoma e ainda não corrigida manualmente:

- **"Arraiá do Apaga Fogo 2026" (criada 20/07/2026)** — CSV do dia
  (`planilha-enriquecida-2026-07-20T11-50-21-274Z.csv`) tem `endereco: "Avenida Prefeito
  Dulcídio Cardoso, 406 — Barra da Tijuca"`, mas o documento em produção **não tem `endereco`
  até agora** (verificado ao vivo nesta sessão). Prova que o bug não é específico das 3 fichas
  do bloco de 16/07 — é sistêmico em qualquer import de ficha Sympla com endereço capturado, e
  continua acontecendo (a última ocorrência confirmada é de 2 dias atrás).

**Impacto real:** todo import de ficha Sympla com endereço capturado pelo scraper perde esse
dado silenciosamente ao criar o documento no Sanity, a menos que alguém note e digite de novo
manualmente no Studio. Isso vale desde que a extração de endereço existe (US-S24, 01/07) — o
código de `import-sanity` nunca teve `endereco` na lista de campos lidos do CSV.

**Nota lateral:** o mesmo tipo de bug (campo existente no CSV mas ausente da lista hardcoded de
campos lidos por um parser) já tinha acontecido uma vez antes — US-S41 (Sprint 13) corrigiu
exatamente isso, mas em `scripts/pipeline-ia/csv.ts` (o leitor do CSV *bruto do scraper*, que
alimenta o pipeline-ia). O `import-sanity/index.ts::readEnrichedCSV()` é um parser **diferente**,
que lê a planilha *já enriquecida pelo pipeline-ia* (a saída, não a entrada) — o fix do US-S41
nunca tocou esse segundo arquivo, que tem exatamente a mesma classe de bug.

---

## Conclusão

- ❌ Não é bug de extração (`sympla-enrich.ts`). As duas estratégias funcionam; a Estratégia 1
  (`__NEXT_DATA__`) continua 100% correta na estrutura atual do Sympla.
- ⚠️ Estratégia 2 (seletores DOM) está tecnicamente morta (página mudou), mas irrelevante na
  prática — nunca é alcançada porque a Estratégia 1 sempre resolve primeiro.
- ✅ **Causa raiz real, confirmada com evidência direta:** `scripts/import-sanity/index.ts::readEnrichedCSV()`
  nunca lê a coluna `endereco` do CSV — o campo é descartado ao montar `LinhaEnriquecida`,
  então `mapper.ts` nunca escreve `doc.endereco`, para nenhuma ficha, de nenhuma fonte.
- ✅ **Padrão estrutural confirmado**, não caso isolado — 4ª ocorrência independente encontrada
  ("Arraiá do Apaga Fogo", 20/07), ainda não corrigida manualmente, fora da amostra original de
  16/07.

## Proposta (não implementada nesta sessão — spike, sem código de produção)

Fix de 1 linha, baixo risco: adicionar `endereco: record.endereco || undefined` (ou equivalente)
à lista de campos em `readEnrichedCSV()` (`scripts/import-sanity/index.ts`), no mesmo padrão dos
demais campos opcionais (`ai_model`, `duracao_min`). `mapper.ts` já trata o campo corretamente
uma vez que exista em `linha`. Recomendo tratar como story de fix separada — prioridade alta,
dado que é um bug ativo, afeta 100% dos imports Sympla com endereço capturado, e já gerou
retrabalho manual real pro Rafa em pelo menos 3 fichas.

Sugestão adicional de AC pro fix: teste cobrindo especificamente "CSV com coluna `endereco`
preenchida → documento Sanity criado com `endereco` setado" no nível de `import-sanity` (não só
em `pipeline-ia`, que já tem essa cobertura desde US-S41) — para não deixar essa lacuna de teste
se repetir numa 3ª camada do pipeline no futuro.

## Metodologia

- `__NEXT_DATA__` e seletores DOM verificados ao vivo via Claude Browser (navegador real,
  passa pelo challenge Cloudflare do Sympla — confirmado via `read_network_requests` que existe
  um challenge JS ativo, `cdn-cgi/challenge-platform`, antes do conteúdo real).
- Causa raiz confirmada por comparação direta de 3 fontes de dado independentes: (1) CSV de
  saída do `pipeline-ia` do dia do import, (2) `import-report-*.json` do mesmo import, (3)
  consulta GROQ direta à API do Sanity de produção (`sanityClient`, credenciais de
  `.env.local`, somente leitura).
- Código lido: `scripts/scraper/sympla-enrich.ts` (`extrairEndereco`), `scripts/pipeline-ia/csv.ts`,
  `scripts/pipeline-ia/index.ts`, `scripts/import-sanity/index.ts` (`readEnrichedCSV`),
  `scripts/import-sanity/mapper.ts`, `scripts/import-sanity/types.ts`.
- Histórico git usado para confirmar que o código de `import-sanity/index.ts` em vigor no
  momento do import de 16/07 (`git log --before` → commit `6bae89d`) já tinha o mesmo bug —
  não é regressão recente, é bug estrutural desde que a extração de endereço existe.
- 3ª URL ("Colônia de Férias Artísticas do Caqui") não localizada por busca (Google/Sympla) —
  nome usado na revisão era o do venue ("Caqui"), nome real do evento no Sympla é "COLÔNIA DE
  FÉRIAS ARTÍSTICA DO CAC". Encontrada indiretamente via `import-report-*.json` do mesmo lote
  (slug batia com as outras 2), não pela URL em si.
