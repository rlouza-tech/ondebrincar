"use client";

import { DestaqueCardMobile } from "@/components/DestaqueCardMobile";
import type { Atracao } from "@/lib/sanity/types";

export interface DestaquesTrilhaMobileProps {
  destaques: Atracao[];
}

/**
 * US-I49 — par mobile de DestaquesTrilha (US-I43): mesma curadoria/conteúdo (destaquesSemana,
 * US-I51), só a apresentação muda. Sem setinhas prev/next — Discovery de 19/08 (Grupo 2)
 * validou em dispositivo real que swipe nativo + peek de borda bastam no touch, diferente do
 * mouse no desktop.
 */
export function DestaquesTrilhaMobile({ destaques }: DestaquesTrilhaMobileProps) {
  if (destaques.length === 0) {
    return null;
  }

  return (
    <section aria-label="Destaques da semana" className="space-y-3">
      <h2 className="font-display text-[19px] font-semibold text-ink">✨ Destaques da semana</h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {destaques.map((atracao) => (
          <DestaqueCardMobile key={atracao.slug} atracao={atracao} />
        ))}
      </div>
    </section>
  );
}
