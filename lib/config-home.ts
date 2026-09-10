import { hasSanityConfig, sanityClient } from "@/lib/sanity/client";
import { configHomeAtual } from "@/lib/sanity/queries";
import type { SanityConfigHomeDocument } from "@/lib/sanity/types";

/**
 * US-I47 — lê `configHome` (painel de curadoria da US-I46) pra saber quais carrosséis de
 * zona estão ativos e em que ordem. Sem Sanity configurado, sem documento salvo (Rafa ainda
 * não abriu o painel) ou erro de fetch: retorna `null` — o chamador cai no fallback das 5
 * zonas na ordem padrão do Discovery (decisão da sessão de execução US-I47, 09/09/2026).
 */
export async function getConfigHomeAtual(): Promise<SanityConfigHomeDocument | null> {
  if (!hasSanityConfig()) return null;

  try {
    return await sanityClient.fetch<SanityConfigHomeDocument | null>(
      configHomeAtual,
      {},
      { cache: "no-store" },
    );
  } catch {
    return null;
  }
}
