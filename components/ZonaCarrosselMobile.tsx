"use client";

import Link from "next/link";
import { ZonaCardMobile } from "@/components/ZonaCardMobile";
import { CAP_CARROSSEL_ZONA_MOBILE, zonaVerTodasHref, type CarrosselZona, type ZonaId } from "@/lib/zonas";

export interface ZonaCarrosselMobileProps {
  carrossel: CarrosselZona;
}

const ZONA_LABEL: Record<ZonaId, string> = {
  "zona-sul": "🏖️ Zona Sul",
  "zona-sudoeste": "🌴 Zona Sudoeste",
  "zona-norte": "🏙️ Zona Norte",
  "zona-central": "🏛️ Zona Central",
  "zona-oeste": "🌇 Zona Oeste",
};

const ZONA_NOME: Record<ZonaId, string> = {
  "zona-sul": "Zona Sul",
  "zona-sudoeste": "Zona Sudoeste",
  "zona-norte": "Zona Norte",
  "zona-central": "Zona Central",
  "zona-oeste": "Zona Oeste",
};

/**
 * US-I50 — par mobile de `ZonaCarrossel` (US-I47): mesmo dicionário bairro→zona e mesmo
 * fallback (herdados de `carrossel`, já montado por `montarCarrosseisZona`), apresentação
 * própria — cap de 4 por zona (não 8), sem setinhas de rolagem (swipe nativo + peek de
 * borda, Discovery 19/08 Grupo 2). O cap mobile é um `slice` sobre os até 8 itens que o
 * chamador já entrega, não uma nova busca de dados.
 */
export function ZonaCarrosselMobile({ carrossel }: ZonaCarrosselMobileProps) {
  const nome = ZONA_NOME[carrossel.id];
  const atracoesMobile = carrossel.atracoes.slice(0, CAP_CARROSSEL_ZONA_MOBILE);

  return (
    <section aria-label={nome} className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-[17px] font-semibold text-ink">{ZONA_LABEL[carrossel.id]}</h2>
        <span className="text-xs font-semibold text-secondary">{carrossel.total} atrações</span>
      </div>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
        {atracoesMobile.map((atracao) => (
          <ZonaCardMobile key={atracao.slug} atracao={atracao} />
        ))}
        <Link
          href={zonaVerTodasHref(carrossel.bairros)}
          className="flex h-[110px] w-[30%] shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-xl bg-primary px-2 text-center text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <span className="text-[12.5px] font-extrabold">Ver todas</span>
          <span className="text-[11px] opacity-90">{nome}</span>
          <span className="text-[10px] opacity-80">({carrossel.total} no total)</span>
          <span className="text-base">→</span>
        </Link>
      </div>
    </section>
  );
}
