import { NextRequest, NextResponse } from "next/server";
import { hasSanityConfig, sanityWriteClient } from "@/lib/sanity/client";
import { destaquesSemanaParaRotacao, idsAtracoesAtivas } from "@/lib/sanity/queries";
import { MIN_DESTAQUES, precisaRotacionar, sortearNovaCuradoria } from "@/lib/destaques";

export const dynamic = "force-dynamic";

const SINGLETON_ID = "destaquesSemana";

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * US-I51 — Vercel Cron (semanal, ver vercel.json) chama esta rota, que checa
 * `ultimaCuradoria` e só sorteia novos destaques quando a curadoria manual estiver
 * desatualizada (7+ dias). Nunca esconde a seção nem trava a home.
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }
  if (!hasSanityConfig()) {
    return NextResponse.json({ error: "Sanity não configurado" }, { status: 500 });
  }

  const doc = await sanityWriteClient.fetch<{
    _id: string;
    ultimaCuradoria?: string;
  } | null>(destaquesSemanaParaRotacao);

  if (!precisaRotacionar(doc?.ultimaCuradoria)) {
    return NextResponse.json({ rotacionado: false, motivo: "curadoria manual ainda vigente" });
  }

  const idsElegiveis = await sanityWriteClient.fetch<string[]>(idsAtracoesAtivas);
  const novosIds = sortearNovaCuradoria(idsElegiveis, MIN_DESTAQUES);

  if (novosIds.length < MIN_DESTAQUES) {
    return NextResponse.json(
      { rotacionado: false, motivo: "catálogo ativo não tem atrações suficientes" },
      { status: 200 },
    );
  }

  const ultimaCuradoria = new Date().toISOString();
  await sanityWriteClient.createIfNotExists({
    _id: SINGLETON_ID,
    _type: "destaquesSemana",
    atracoes: [],
    ultimaCuradoria,
  });
  await sanityWriteClient
    .patch(doc?._id ?? SINGLETON_ID)
    .set({
      atracoes: novosIds.map((id) => ({ _type: "reference", _ref: id, _key: id })),
      ultimaCuradoria,
    })
    .commit();

  return NextResponse.json({ rotacionado: true, atracoes: novosIds, ultimaCuradoria });
}
