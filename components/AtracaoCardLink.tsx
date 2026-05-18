import Link from "next/link";
import { AtracaoCard } from "@/components/AtracaoCard";
import {
  formatFaixaEtaria,
  formatPreco,
} from "@/lib/atracoes";
import type { MockAtracao } from "@/lib/mock-atracoes";
import { cn } from "@/lib/cn";

export interface AtracaoCardLinkProps {
  atracao: MockAtracao;
  className?: string;
}

export function AtracaoCardLink({ atracao, className }: AtracaoCardLinkProps) {
  return (
    <Link
      href={`/atracao/${atracao.slug}`}
      className={cn(
        "block rounded-xl transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <AtracaoCard
        name={atracao.titulo}
        ageRange={formatFaixaEtaria(atracao.idadeMin, atracao.idadeMax)}
        price={formatPreco(atracao)}
        imageUrl={atracao.imagemUrl}
        imageAlt={`Foto: ${atracao.titulo}`}
      />
    </Link>
  );
}
