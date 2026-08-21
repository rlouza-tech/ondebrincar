Sessão de discovery: protótipo mobile pra Destaques da semana, Carrossel por região e Ficha com abas.

Contexto: na sessão de navegação desktop de 19/08 (`docs/discovery/DISCOVERY-2026-08-19-navegacao-desktop.md`), separei 3 conceitos em pares desktop+mobile — o par desktop já tem protótipo e desenho fechado, o par mobile ainda não foi prototipado (a sessão foi desenhada como sessão desktop). São eles:

1. **Destaques da semana (mobile)** — US-I49, par de US-I43 (desktop). Trilha editorial com curadoria manual, card com imagem maior que o carrossel padrão.
2. **Carrossel dinâmico por região (mobile)** — US-I50, par de US-I47 (desktop). 5 carrosséis empilhados por zona (Sul, Sudoeste, Norte, Central, Oeste), formato e ordem já confirmados no desktop.
3. **Ficha com abas — Detalhes / Sugestões, estilo Netflix/Prime (mobile)** — US-I52, par de US-I45 (Right Rail desktop). Mesma aposta de conteúdo do Right Rail, em formato de abas por causa da tela estreita.

Decisões já fechadas no desktop que valem carregar pro mobile (não reabrir sem motivo):
- 5 zonas e o dicionário bairro→zona (Sul, Sudoeste, Norte, Central, Oeste — mapeamento validado contra o catálogo, 121/121 atrações).
- Formato empilhado (não abas) pro carrossel de região, e a ordem de exibição por volume decrescente.
- Curadoria de Destaques é manual, via Sanity Studio (US-I51 cobre o admin — mesmo conteúdo, muda só a apresentação por dispositivo).
- Right Rail e Ficha com abas reaproveitam a mesma lógica de recomendação do anel (US-I33) — muda só posição/formato.

O que abrir nesta sessão (não assumir, validar com protótipo):
- Layout de card mobile pra Destaques e Região (proporção, quantos cards cabem na viewport, se ainda faz sentido cap de 8 itens por carrossel como no desktop, ou se telas menores pedem outro número).
- Como o usuário rola os carrosséis no mobile (swipe nativo deve bastar — as setinhas de rolagem que adicionei no desktop, v8, existem porque scroll horizontal com mouse tem affordance ruim; touch não tem esse problema, mas vale confirmar).
- Layout de abas da Ficha (o que entra em "Detalhes" vs. "Sugestões", se abre em "Detalhes" por padrão).
- Qualquer achado de usabilidade mobile equivalente ao que apareceu na sessão de 18/08 (`docs/discovery/DISCOVERY-2026-08-18-navegacao-mobile-app-like.md`) — vale reler antes de começar, é a referência mais próxima de padrão mobile já validado no produto (menu inferior, US-I42).

Peço: protótipo HTML navegável (viewport mobile), fotos reais do catálogo publicado (mesmo cuidado do protótipo desktop — embutir como `data:` URI, nunca hotlink do `cdn.sanity.io`), e atualização do discovery doc de 19/08 com o que sair desta sessão (ou um novo discovery, se preferir manter os dois separados — decide o que fizer mais sentido).
