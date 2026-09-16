# DISCOVERY (complemento) — Menu inferior (mobile) deve substituir o miolo da home, não expandir embaixo dos carrosséis

**Data:** 2026-09-13 (código confirmado em 2026-09-15)
**Área investigada:** Home mobile — `BottomNav` (US-I42) + `home-content.tsx` (US-I56)
**Facilitador:** Rafa + Claude
**Sessão de referência:** `docs/discovery/DISCOVERY-2026-09-12-menu-lateral-substituir-carrosseis.md` (US-I57, par desktop — pergunta em aberto #2 deste documento é respondida aqui: sim, vale um Discovery/story separado pro mobile)

---

## 1. Contexto

Continuação direta da sessão de 12/09 (US-I57). O Rafa relatou o mesmo sintoma, agora no mobile: tocar em qualquer item do menu inferior (`BottomNav` — Início, Esse fim de semana, Grátis, Categorias) filtra, mas a lista aparece só na parte de baixo da tela, dando a impressão de que é um erro/travamento, em vez de navegar efetivamente para outra visão.

**Comportamento esperado:** tocar em qualquer item do menu inferior deve substituir a área central (Destaques + carrosséis de zona mobile) pela listagem completa filtrada — mesmo comportamento desejado para o desktop na US-I57, agora pro mobile.

## 2. Método

- **Sinal bruto:** observação direta do Rafa, mesma natureza do sinal da US-I57 (uso pessoal, sem GA4/Clarity).
- **Diagnóstico confirmado em código em 2026-09-15** (sessão de 12/09 tinha só o precedente da US-I57 + grep parcial de `BottomNav.tsx`; a reconexão em 15/09 permitiu ler os arquivos completos).
- **`components/BottomNav.tsx` lido por completo:** confirma a hipótese por precedente da sessão de 12/09. `BottomNav` é uma `<nav>` fixa (`fixed inset-x-0 bottom-0 z-40 ... lg:hidden`) com 4 itens (`NAV_ITEMS`), todos setando filtros via `buildHref`/`lib/nav-links.ts` — o mesmo helper compartilhado com `CategorySidebar`. Como a `<nav>` é fixa e independente do miolo rolável, a arquitetura já separa naturalmente "barra de navegação" de "conteúdo" — não precisa mover a barra, só trocar o que aparece no miolo.
- **Causa raiz confirmada, idêntica à da US-I57:** em `app/home-content.tsx`, a flag `expandido = expandidoManual || filtroAtivoNaUrl` não distingue viewport nem origem do toque — reage a qualquer filtro ativo na URL, venha de onde vier (`BottomNav`, `CategorySidebar`, link direto). O `useEffect` de scroll automático só dispara quando `expandidoManual` é setado por clique interno da própria Home (o botão "Ver tudo" do teaser), não quando o filtro chega via navegação de URL — por isso o toque no menu inferior expande a listagem abaixo dos carrosséis mobile, sem scroll, parecendo que nada aconteceu.
- **Achado adicional nesta rodada (15/09):** o mesmo padrão existe numa terceira porta de entrada — o botão/link "Ver todas — Zona X" ao final de cada carrossel de zona (`components/ZonaCarrossel.tsx`, desktop, US-I47; `components/ZonaCarrosselMobile.tsx`, mobile, US-I50). Os dois usam `zonaVerTodasHref(carrossel.bairros)` (`lib/zonas.ts`), que monta `/?bairro=X&bairro=Y` — o mesmo mecanismo de filtro por querystring. Isso confirma que a causa raiz é única e central (`home-content.tsx`), com pelo menos três portas de entrada afetadas: menu lateral (US-I57), menu inferior (esta story) e os links "Ver todas" dos carrosséis de zona (ver `docs/discovery/DISCOVERY-2026-09-15-ver-todas-carrossel-zona.md`, aberto nesta mesma sessão). Ver decisão de escopo nas Perguntas em aberto.

## 3. Diagnóstico

### Causa raiz (confirmada em código em 15/09)

Mesma raiz da US-I57: a flag `expandido` em `home-content.tsx` é única e não diferencia desktop/mobile nem origem do toque/clique. O `BottomNav` herdou o mesmo comportamento "expandir embaixo, sem scroll automático" que o `CategorySidebar` — por compartilhar o mesmo estado central, sem tratamento por origem.

**Caso especial confirmado:** `BottomNav.tsx` mostra que o item "Categorias" usa `overrides: { [CATEGORIA_TRIGGER_PARAM]: "1" }` — não aplica uma categoria diretamente, só sinaliza pra abrir o dropdown de categoria dentro de `HomeFilters`, já expandido. Isso é diferente do item "Categorias" do `CategorySidebar` (desktop), que lista as categorias diretamente no menu, uma por uma, e aplica o valor escolhido direto. Ou seja, o mobile precisa de tratamento específico pra esse item: substituir o miolo mostrando o seletor de categoria já aberto, em vez de uma categoria pré-escolhida. **Pergunta em aberto, decisão do Rafa pendente — ver seção 8.**

**Impacto:** direcional, sinal único (mesma ressalva da US-I57) — mas reforçado pelo achado de 15/09 de que o mesmo problema aparece numa 3ª porta de entrada (carrosséis de zona), sugerindo que é um padrão estrutural da Home, não um caso isolado do menu.

**Esforço:** Baixo-Médio, confirmado por precedente da US-I57 (mesmo mecanismo de "sinal de origem", reaproveitando `CATEGORIA_TRIGGER_PARAM`) — incerteza restante é só o caso especial do item "Categorias" mobile.

**Prioridade recomendada:** pronta pra ir a protótipo junto com a US-I57 (mesmo mecanismo técnico) — falta só fechar o caso "Categorias" e, possivelmente, decidir se os links "Ver todas" dos carrosséis de zona entram no mesmo protótipo (ver seção 8).

## 4. Verificação — contradição com ADR/decisão existente

- **US-I4.1:** sem contradição — a solução mobile segue a mesma linha da US-I57 (troca visual, mesma rota, filtro na querystring).
- **US-I57:** esta é uma story irmã, não uma revisão — o Rafa confirmou que quer uma story separada (mesmo padrão de US-I42/US-I44, que também trataram desktop e mobile como stories distintas para o mesmo menu).

## 5. História rascunhada

Story ID verificado via SQL no Sprint Board (Notion) — **`US-I58` criada no Notion, status "A refinar"**.

| Story ID | Título | Épico | SP estimado | Sprint | Status |
|---|---|---|---|---|---|
| US-I58 | Menu inferior (mobile) substitui o miolo da home pela lista completa filtrada, em vez de expandir embaixo dos carrosséis — par mobile da US-I57 | I — Interface | a definir | a definir | A refinar |

### US-I58 — Menu inferior (mobile) substitui o miolo, não expande embaixo

**Persona + cenário:** Daniel Mendes no celular toca em "Esse fim de semana" no menu inferior esperando ver a lista completa filtrada — hoje a lista aparece embaixo dos carrosséis mobile, sem indicação visual, parecendo um erro.

**Hipótese:** mesma da US-I57, aplicada ao `BottomNav`: tocar em qualquer item do menu inferior deve substituir a área central (Destaques + carrosséis de zona mobile) pela listagem completa filtrada — mesma rota Home, filtro na querystring, sem contrariar a US-I4.1.

**Assumptions explícitas:**

- Causa raiz **confirmada em código em 15/09** (`BottomNav.tsx` completo, `home-content.tsx`) — mesmo mecanismo da US-I57.
- Escopo: só mobile — story separada da US-I57 (decisão do Rafa).
- "Ir efetivamente pra outra página" confirmado como troca visual, mesma rota `/`, filtro na querystring — não uma rota dedicada (mesma decisão da US-I57, para manter consistência e a US-I4.1).
- **Caso especial não resolvido:** o item "Categorias" do `BottomNav` hoje só sinaliza abrir o dropdown (`abrirCategoria=1`), não aplica uma categoria específica como o menu lateral desktop faz. Precisa decidir: substituir o miolo mostrando o seletor já aberto, ou alguma outra solução — a fechar no refinamento.
- Mesmo mecanismo de "sinal de origem" cogitado pra US-I57 (reaproveitando o padrão de `CATEGORIA_TRIGGER_PARAM`) se aplica aqui, confirmado sem particularidade que mude a abordagem em `BottomNav.tsx`.
- Protótipo mobile obrigatório antes de qualquer implementação — mesma convenção da US-I57.

**AC rascunho:**

- [x] Confirmar em código (`BottomNav.tsx`, `home-content.tsx` mobile) a causa raiz — feito em 15/09.
- [ ] Protótipo mobile mostrando: (1) home mobile normal com Destaques + carrosséis; (2) home mobile após tocar num item do menu inferior, com o miolo substituído pela listagem completa filtrada.
- [ ] Rafa aprova o protótipo antes de qualquer código real.
- [ ] Tocar em "Início" (ou remover o filtro) volta a mostrar Destaques + carrosséis normalmente.
- [ ] Definir o comportamento do item "Categorias" (ver caso especial acima) — a fechar no refinamento.
- [ ] Chegar via link direto/compartilhado com filtro na URL continua caindo no comportamento atual (expande embaixo) — mesma diferença por origem da US-I57.
- [ ] Teste cobrindo: toque no menu inferior (substitui), link direto/compartilhado (expande embaixo, como hoje).

## 6. Parking lot

Nenhum item nesta sessão.

## 7. Decisões tomadas

- **Story separada da US-I57** (US-I58) — decisão do Rafa, mesmo padrão de US-I42/US-I44.
- **Mesma definição de "nova página" da US-I57** (troca visual, mesma rota) — decisão do Rafa.
- **Status "A refinar"** — mantido mesmo após confirmação em código, porque ainda falta fechar o caso "Categorias" (AC pendente) antes de virar Ready.

## 8. Perguntas em aberto

1. ~~Causa raiz precisa de confirmação em código~~ — **resolvida em 15/09**, ver seção 2-3.
2. ~~Comportamento do item "Categorias" do menu inferior~~ — **resolvida em 16/09** na sessão de execução. O protótipo (`docs/mockups/prototipo-us-i57-menu-lateral.html`, modo Mobile) confirmou que a decisão da US-I57 (substituir o miolo) generaliza para os 5 gatilhos, inclusive Categorias: o miolo vira a listagem completa com o seletor de categoria já aberto, sem categoria pré-escolhida. Não pediu divergência de produto.
3. ~~"Ver todas — Zona X"~~ — **resolvida em 15/09**: entra no escopo da US-I57 (desktop) e US-I58 (mobile). O href compartilhado (`zonaVerTodasHref`) já leva `substituir=1` desde a I57.
4. ~~SP~~ — 3 SP no Kickoff 19.

## 9. Recomendações para o próximo Kickoff

- US-I58 pode ir a protótipo junto com a US-I57 (mesmo mecanismo técnico) assim que o caso "Categorias" for fechado.
- Mesma fila de prioridade apontada no `Handoff-Sprint-19.md`: US-A28, US-A30, US-I53 (comprometidas na Sprint 18, nunca tocadas) vêm antes de qualquer candidata nova no Kickoff 19.

---

## Referências

- `docs/discovery/DISCOVERY-2026-09-12-menu-lateral-substituir-carrosseis.md` (US-I57, par desktop)
- `docs/discovery/DISCOVERY-2026-09-15-ver-todas-carrossel-zona.md` (achado relacionado, mesma causa raiz)
- `docs/decisions/2026-05-21-i4-1-filtros-home.md` (US-I4.1)
- Notion — Sprint Board: US-I58, status "A refinar", Épico I

---

*Fim do documento de discovery (complemento).*
