# I8 — Analytics: GTM + Consent Mode v2 + 5 eventos NSM

**Data:** 2026-05-23  
**Stories:** US-I8.1, US-I8.2

## Decisão

Implementar analytics via **Google Tag Manager (GTM)**, com **Google Consent Mode v2** configurado por padrão e **5 eventos NSM** disparados pelo `dataLayer` do Next.js.

Container GTM: `GTM-TN6KCV25`

---

## US-I8.1 — GTM + Consent Mode v2

### Integração no Next.js

GTM é injetado em `app/layout.tsx` via `next/script`, com carregamento condicional por `NEXT_PUBLIC_GTM_ID`.

Dois scripts na ordem correta:

1. **`beforeInteractive`** — inicializa Consent Mode v2 com todas as permissões negadas por padrão
2. **`afterInteractive`** — carrega o container GTM

Fallback `<noscript><iframe>` incluído para ambientes sem JavaScript.

### Consent Mode v2 — default denied

```js
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
```

**Decisão:** manter `denied` por padrão. GA4 opera em modo de modelagem (modeled data) enquanto não houver consentimento explícito. Isso garante conformidade prévia com LGPD sem necessidade de banner no MVP.

**Trade-off aceito:** dados modelados têm menor precisão que dados coletados com consentimento. Aceito no MVP; revisitar ao implementar banner de consentimento.

---

## US-I8.2 — 5 eventos NSM via dataLayer

Todos os eventos são disparados via `trackEvent()` em `lib/analytics.ts`, que empurra para `window.dataLayer`.

### Eventos implementados

| Evento | Componente / Hook | Trigger |
|--------|-------------------|---------|
| `attraction_view` | `hooks/useAttractionView.ts` | Atração visível ≥ 500ms no viewport (IntersectionObserver) |
| `filter_used` | `components/HomeFilters.tsx` | Usuário ativa/desativa um chip de filtro |
| `save_click` | `components/AtracaoDetailActions.tsx`, `components/AtracaoCardLink.tsx` | Clique no botão de salvar atração |
| `share_click` | `components/ShareSearchButton.tsx`, `lib/analytics.ts#trackShareClick` | Compartilhamento via native share, clipboard ou WhatsApp |
| `outbound_click` | `components/OutboundLink.tsx` | Clique em link externo (Sympla, Eventim, site oficial, Instagram) |

### Relação com NSM

North star: **WAU Planejadores** — usuário que dispara ≥ 1 evento de intenção por semana.

Eventos de intenção: `save_click`, `share_click`, `outbound_click`. `attraction_view` e `filter_used` são eventos de descoberta e alimentam funis no GA4.

### Helper de utilidade

`lib/analytics.ts` exporta:
- `trackEvent(name, params)` — função base
- `buildAttractionViewParams(atracao, source)` — constrói payload tipado
- `detectDestinationType(url)` — classifica destino outbound automaticamente
- `trackShareClick(atracao, url, source)` — encapsula lógica de share method

---

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| GTM (vs. GA4 direto) | Flexibilidade sem redeploy para novos eventos; time de marketing pode criar tags | Latência extra do container; complexidade de setup inicial |
| `dataLayer` push (vs. gtag direto) | Desacoplado do vendor; testável via mock | Requer configurar triggers no GTM container |
| Consent Mode `denied` por padrão | LGPD-safe desde o MVP | Dados modelados (~70–80% precisão); zero conversão rastreada sem consentimento |
| 5 eventos no MVP | Cobre o NSM completo sem over-engineering | `save_click` não persiste (sem auth/favoritos ainda) |

---

## Fora de escopo

- Banner de consentimento / CMP (fase pós-MVP, junto com US-I14.1 auth)
- Teste unitário de `lib/analytics.ts` (mock `window.dataLayer`) — débito técnico registrado
- Eventos de conversão de afiliados (fase v2 com Sympla/Eventim)

---

## Pré-requisitos operacionais para DoD completa

1. `NEXT_PUBLIC_GTM_ID=GTM-TN6KCV25` configurado em Vercel → Settings → Environment Variables
2. Re-deploy do branch `main` no Vercel após configurar a env var
3. GTM container `GTM-TN6KCV25` publicado com tags GA4 + triggers para os 5 eventos
4. Validação via GTM Preview Mode em `ondebrincar.com.br`
