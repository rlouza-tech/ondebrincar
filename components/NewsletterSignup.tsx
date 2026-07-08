"use client";

import { useEffect, useRef } from "react";

const BEEHIIV_FORM_ID = process.env.NEXT_PUBLIC_BEEHIIV_FORM_ID;
const BEEHIIV_LOADER_SRC = "https://subscribe-forms.beehiiv.com/v3/loader.js";

/**
 * US-N1 — embed do formulário de captura Beehiiv (audience "newsletter").
 *
 * O loader do Beehiiv usa a posição do próprio <script> no DOM pra decidir
 * onde renderizar o form (embed "Inline"). Por isso o script é criado e
 * anexado via useEffect dentro de um container próprio (containerRef),
 * em vez de usar next/script — o next/script não garante que o elemento
 * fique exatamente na posição do JSX pra estratégias afterInteractive/lazyOnload.
 *
 * Aparência (cor do botão, fonte, raio de borda etc.) é configurada no
 * próprio builder do Beehiiv, replicando os tokens do design system
 * (brand-primary #F97316, rounded-lg, Nunito) — ver AC2 da US-N1.
 */
export function NewsletterSignup() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!BEEHIIV_FORM_ID) return;
    const container = containerRef.current;
    if (!container) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = BEEHIIV_LOADER_SRC;
    script.setAttribute("data-beehiiv-form", BEEHIIV_FORM_ID);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, []);

  if (!BEEHIIV_FORM_ID) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="beehiiv-embed w-full max-w-xs sm:max-w-sm"
      role="region"
      aria-label="Assinar newsletter do Onde Brincar"
    />
  );
}
