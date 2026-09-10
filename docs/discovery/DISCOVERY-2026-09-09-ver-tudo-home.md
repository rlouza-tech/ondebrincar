# DISCOVERY — Botão "Ver tudo" pra listagem completa da home

**Data:** 2026-09-09
**Área investigada:** Home desktop, imediatamente após o merge da US-I47 (Carrossel dinâmico
por região)
**Facilitador:** Rafa + Claude
**Sessão anterior de referência:** `docs/discovery/DISCOVERY-2026-08-19-navegacao-desktop.md`
(mesma área da home — Destaques + carrosséis de zona)

---

## 1. Contexto

Logo depois do merge do PR #194 (US-I47), o Rafa usou a home em produção e notou que a área
de filtro completo (`HomeFilters`) + listagem completa (grid de todas as atrações) — que era a
home inteira antes de US-I43/US-I47 existirem — agora fica abaixo de bastante conteúdo
editorial (trilha Destaques + 5 carrosséis de zona). Pediu: "mudar o que acontece com a área
que tem todos os itens", trazendo como sinal só a própria observação de uso, sem dado de GA4
ou feedback de outro usuário ainda (confirmado explicitamente por ele nesta sessão, via
pergunta direta — evita inflar sinal fraco como se fosse forte).

## 2. Método

- Sinal bruto: mensagem direta do Rafa, fora de sessão formal, mais nenhuma fonte adicional
  (confirmado por ele — só observação de uso pessoal).
- Leitura do handoff mais recente (`HANDOFF_v9_Onde_Brincar.md`) e do handoff da sessão que
  acabou de fechar (`Handoffs/Handoffs de Sprint/Handoff-Sessao-US-I47.md`) pra contexto
  imediato de por que a listagem ficou mais abaixo na página.
- Leitura de código (`Cursor/`): `app/home-content.tsx` (ordem atual: hero → Destaques → 5
  carrosséis de zona → `HomeFilters` → `ActiveFilters` → contagem/grid), `components/
  HomeFilters.tsx`, `components/ShareSearchButton.tsx`, `components/ZonaCarrossel.tsx` (os
  cards "Ver todas — Zona X" da própria US-I47 linkam pra `/?bairro=X&bairro=Y`, esperando que
  a listagem filtrada apareça direto).
- Checagem de ADR existente: `docs/decisions/2026-05-21-i4-1-filtros-home.md` (US-I4.1) —
  decide filtro na Home com estado na URL. Não contradiz esconder a seção atrás de um botão,
  **desde que o estado da URL continue reabrindo a seção automaticamente** (ver AC3 abaixo) —
  ver seção 4.

## 3. Diagnóstico

### Grupo 1 — A listagem completa (o "resto do produto") ficou mais distante do primeiro scroll

**Descrição:** Antes de US-I43/US-I47, a home era: hero + filtro + listagem completa, tudo
visível de cara. Hoje, entre o hero e a listagem completa entraram 6 trilhas horizontais
(Destaques + 5 zonas) — quem quer simplesmente ver/filtrar o catálogo inteiro precisa rolar
por todo esse conteúdo editorial primeiro.

**Causa raiz:** Efeito colateral direto de empilhar conteúdo editorial nesta mesma página
(US-I43/US-I47), sem revisar a hierarquia do que já existia — não é um problema que já
existia antes dessas duas stories.

**Impacto:** Não medido ainda (sem GA4/Clarity pós-merge) — sinal é só a observação direta do
Rafa, tratada aqui como direcional, não como achado quantificado. Mesma ressalva de rigor já
aplicada a sinais fracos no Discovery de 19/08 (Grupo 2.1, Rodada 3).

**Esforço:** Baixo-Médio — não é lógica de dados nova, é mudar o gatilho de exibição de uma
seção que já existe e já funciona (`HomeFilters` + grid), com uma ressalva técnica real (AC3).

**Prioridade recomendada:** Levar direto ao protótipo — sinal simples o bastante (esconder uma
seção existente atrás de um botão) pra não precisar de mais uma rodada de investigação antes
de visualizar a mudança.

---

## 4. Verificação — contradição com ADR existente

Nenhuma contradição direta com `2026-05-21-i4-1-filtros-home.md`. Essa ADR fixa: filtro vive na
Home (não em `/buscar`), com estado na URL. **Ponto de atenção levantado nesta sessão, não
uma contradição, mas uma dependência técnica que o protótipo/implementação precisam respeitar:**
os cards "Ver todas — Zona X" da própria US-I47 (recém-lançada) e qualquer link/compartilhamento
existente (`ShareSearchButton`) já contam com a seção de filtro+listagem aparecendo
automaticamente quando a URL chega com filtro ativo (`?bairro=...`). Se o "Ver tudo" virar um
gate que esconde a seção por padrão, chegar via um desses links com a seção escondida quebraria
o comportamento que a US-I47 acabou de entregar. **Isso vira AC explícito (AC3) — não pode ser
resolvido nesta sessão de Discovery, precisa estar no protótipo.**

---

## 5. Histórias rascunhadas

**Nota sobre Story ID:** consultado o Sprint Board (Notion) nesta sessão via SQL — maior Story
ID real do Épico I é `US-I55`. `US-I56` confirmado livre.

**Nota sobre Sprint:** por convenção desta cerimônia, toda story sairia com `Sprint: a definir`.
**O Rafa pediu explicitamente "joga no sprint 18"** nesta sessão — mesmo padrão de override que
ele já usou no Discovery de 19/08 (decisão dele, registrada aqui, não inferência do Claude).

| Story ID | Título | Épico | SP estimado | Sprint |
|---|---|---|---|---|
| US-I56 | Botão "Ver tudo" pra revelar a listagem/filtro completa da home (hoje sempre visível abaixo dos carrosséis) | I — Interface | a definir (sem protótipo ainda) | **Sprint 18** (decisão explícita do Rafa) |

### US-I56 — Botão "Ver tudo" pra listagem completa da home

**Persona + cenário:** Daniel Mendes (ou o próprio Rafa, testando o produto) rola a home e
passa pela trilha Destaques e pelos 5 carrosséis de zona antes de chegar na listagem completa
com filtro — hoje essa listagem sempre aparece, ocupando espaço e distância de scroll mesmo
para quem só quer navegar pelo conteúdo editorial das trilhas.

**Hipótese:** Substituir a seção de filtro (`HomeFilters`) + listagem completa (grid de
`AtracaoCardLink`) — que hoje sempre renderiza abaixo dos carrosséis — por um único botão "Ver
tudo", que ao ser clicado revela exatamente o que essa seção já é hoje (mesmo filtro, mesma
listagem, sem mudança de comportamento interno), deixa a home mais enxuta e com hierarquia mais
clara entre "conteúdo curado" (Destaques + zonas) e "catálogo completo" (atrás do botão) — sem
remover acesso a nada.

**Assumptions explícitas:**
- Sinal é só observação direta do Rafa (confirmado por ele) — sem dado de GA4/Clarity ainda.
  Tratar como hipótese de produto a validar depois de implementado, não como achado quantificado.
- **AC crítico, achado nesta sessão (não estava na descrição original do Rafa):** a home
  precisa continuar abrindo a seção automaticamente (sem exigir clique em "Ver tudo") quando
  chega com filtro ativo via querystring — inclui os links "Ver todas — Zona X" da própria
  US-I47 e qualquer busca compartilhada via `ShareSearchButton`. Sem isso, a mudança quebra
  duas features que acabaram de entrar em produção.
- Não é lógica de dados nova — `HomeFilters`/`filtrarAtracoes`/grid continuam exatamente como
  são hoje; muda só o gatilho de exibição (sempre visível → atrás de um botão, exceto no caso
  acima).
- **Protótipo obrigatório antes de qualquer implementação** — gate explícito pedido pelo Rafa
  nesta sessão, não decisão do Claude.

**AC rascunho:**
- [ ] Protótipo HTML (padrão do projeto — fotos reais via `data:` URI, cores/fontes reais)
  mostrando: (1) home com Destaques + 5 zonas + botão "Ver tudo" no lugar da listagem completa;
  (2) home com o botão clicado, revelando filtro + listagem exatamente como hoje.
- [ ] Rafa aprova o protótipo antes de qualquer código real.
- [ ] Definir com o Rafa: nome final do botão ("Ver tudo" é ponto de partida, não fechado),
  posição exata (logo abaixo do último carrossel de zona, hipótese de partida), e se
  expandir/colapsar anima ou é instantâneo.
- [ ] AC técnico (achado nesta sessão): com filtro ativo na URL (`?bairro=...`, `?categoria=...`
  etc.), a seção aparece já expandida, sem exigir clique — não pode quebrar "Ver todas — Zona X"
  (US-I47) nem `ShareSearchButton`.
- [ ] Definir se o clique em "Ver tudo" dispara evento de analytics (reaproveitar `trackEvent`,
  mesmo padrão do resto do projeto) — a fechar em Refinamento.
- [ ] Teste cobrindo: estado colapsado (só botão), estado expandido por clique, e estado
  expandido automaticamente por filtro ativo na URL.

---

## 6. Parking lot

Nenhum item nesta sessão — o único sinal trazido já tinha hipótese explícita e virou história.

---

## 7. Decisões tomadas

- **Sprint atribuído explicitamente pelo Rafa: Sprint 18** (override da convenção padrão desta
  cerimônia, mesmo padrão já usado no Discovery de 19/08).
- **Protótipo é gate obrigatório antes de qualquer implementação** — pedido explícito do Rafa,
  registrado como AC, não apenas como preferência de processo.
- Nenhuma ADR nova sinalizada como necessária — a dependência com `2026-05-21-i4-1-filtros-home.md`
  (AC3) é uma restrição de implementação, não uma mudança de decisão de arquitetura.

---

## 8. Perguntas em aberto

1. Nome final do botão ("Ver tudo" é a sugestão inicial do Rafa, não fechado).
2. Expandir anima (accordion) ou troca instantânea?
3. Vale medir clique no botão via evento dedicado, ou não é prioridade agora?
4. SP — sem protótipo ainda, chute inicial não seria confiável; deixado em branco.

---

## 9. Recomendações para o próximo Kickoff

- **US-I56** entra na Sprint 18 (decisão já tomada pelo Rafa) — mas a **primeira ação de
  qualquer sessão que pegar essa história é montar e mostrar o protótipo**, antes de tocar em
  `app/home-content.tsx`. Só depois de aprovado é que a implementação (incluindo o AC técnico
  de auto-expandir com filtro ativo na URL) deve começar.

---

## Referências

- `docs/discovery/DISCOVERY-2026-08-19-navegacao-desktop.md`
- `docs/decisions/2026-05-21-i4-1-filtros-home.md`
- `Handoffs/Handoffs de Sprint/Handoff-Sessao-US-I47.md`
- Código: `app/home-content.tsx`, `components/HomeFilters.tsx`, `components/ZonaCarrossel.tsx`
  (cards "Ver todas — Zona X"), `components/ShareSearchButton.tsx`
- Notion — Sprint Board (`collection://ef278312-03b1-4366-8831-8e2cff1562ff`): consultado via
  SQL nesta sessão pra confirmar `US-I56` livre (maior ID do Épico I era `US-I55`).

---

*Fim do documento de discovery.*
