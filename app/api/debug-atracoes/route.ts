import { sanityClient, hasSanityConfig, sanityConfig } from "@/lib/sanity/client";
import { atracoesAtivas } from "@/lib/sanity/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasSanityConfig()) {
    return Response.json({ error: "Sanity não configurado" });
  }

  const hoje = new Date().toISOString().slice(0, 10);

  try {
    const docs = await sanityClient.fetch(
      atracoesAtivas,
      { hoje },
      { cache: "no-store" },
    );

    return Response.json({
      hoje,
      now_utc: new Date().toISOString(),
      projectId: sanityConfig.projectId,
      dataset: sanityConfig.dataset,
      total: docs.length,
      primeiros_3: docs.slice(0, 3).map((d: { nome: string; proxima_data?: string; status: string }) => ({
        nome: d.nome,
        proxima_data: d.proxima_data ?? null,
        status: d.status,
      })),
    });
  } catch (err) {
    return Response.json({ erro: String(err) }, { status: 500 });
  }
}
