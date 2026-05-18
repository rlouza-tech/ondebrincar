"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AtracaoCardLink } from "@/components/AtracaoCardLink";
import { filtrarAtracoes, getAllAtracoes } from "@/lib/atracoes";

export function BuscarContent() {
  const searchParams = useSearchParams();
  const bairro = searchParams.get("bairro") ?? undefined;
  const idadeParam = searchParams.get("idade");
  const idade =
    idadeParam !== null && idadeParam !== ""
      ? Number.parseInt(idadeParam, 10)
      : undefined;

  const resultados = useMemo(() => {
    return filtrarAtracoes(getAllAtracoes(), {
      bairro,
      idade: idade !== undefined && !Number.isNaN(idade) ? idade : undefined,
    });
  }, [bairro, idade]);

  const filtrosAtivos = [
    bairro ? `bairro: ${bairro}` : null,
    idade !== undefined && !Number.isNaN(idade) ? `idade: ${idade}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <p className="text-sm text-secondary">
        {filtrosAtivos.length > 0
          ? `Filtros: ${filtrosAtivos.join(" · ")}`
          : "Nenhum filtro na URL. Ex.: /buscar?bairro=Tijuca&idade=4"}
      </p>

      {resultados.length === 0 ? (
        <p className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-primary">
          Nenhuma atração encontrada com esses filtros. Tente outro bairro ou
          faixa etária.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resultados.map((atracao) => (
            <li key={atracao.slug}>
              <AtracaoCardLink atracao={atracao} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
