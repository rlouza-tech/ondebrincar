import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtracaoDetailActions } from "@/components/AtracaoDetailActions";
import { AttractionDetailTracker } from "@/components/AttractionDetailTracker";
import { OutboundLink } from "@/components/OutboundLink";
import { SiteHeader } from "@/components/SiteHeader";
import { buttonClassName } from "@/components/Button";
import {
  formatFaixaEtaria,
  formatPreco,
  getAtracaoBySlug,
  getAtracaoSlugs,
} from "@/lib/atracoes";
import { formatadorDeData } from "@/lib/format-date";

interface AtracaoPageProps {
  params: { slug: string };
}

export async function generateStaticParams() {
  const slugs = await getAtracaoSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: AtracaoPageProps): Promise<Metadata> {
  const atracao = await getAtracaoBySlug(params.slug);

  if (!atracao) {
    return {
      title: "Atração não encontrada | Onde Brincar",
    };
  }

  return {
    title: `${atracao.titulo} | Onde Brincar`,
    description: atracao.descricaoCurta,
  };
}

export default async function AtracaoPage({ params }: AtracaoPageProps) {
  const atracao = await getAtracaoBySlug(params.slug);

  if (!atracao) {
    notFound();
  }

  return (
    <>
      <AttractionDetailTracker atracao={atracao} />
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm font-medium text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ← Voltar para a lista
        </Link>

        <article className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-primary/5">
            <Image
              src={atracao.imagemUrl}
              alt={`Foto: ${atracao.titulo}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-secondary">
              {atracao.categoria}
            </p>
            <h1 className="text-2xl font-semibold text-primary md:text-3xl">
              {atracao.titulo}
            </h1>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-medium text-primary">Idade</dt>
                <dd className="text-secondary">
                  {formatFaixaEtaria(atracao.idadeMin, atracao.idadeMax)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-primary">Bairro</dt>
                <dd className="text-secondary">{atracao.bairro}</dd>
              </div>
              <div>
                <dt className="font-medium text-primary">Preço</dt>
                <dd className="text-secondary">{formatPreco(atracao)}</dd>
              </div>
              <div>
                <dt className="font-medium text-primary">Ambiente</dt>
                <dd className="capitalize text-secondary">
                  {atracao.indoorOutdoor}
                </dd>
              </div>
            </dl>

            <div className="rounded-lg bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-primary">Quando ir</p>
              <p className="text-base text-secondary">{atracao.programacaoTexto}</p>
              {atracao.proximaData ? (
                <p className="mt-1 text-xs text-secondary">
                  Próxima sessão: {formatadorDeData(atracao.proximaData)}
                </p>
              ) : null}
            </div>

            <p className="text-base leading-relaxed text-secondary">
              {atracao.descricaoCurta}
            </p>

            <AtracaoDetailActions atracao={atracao} />

            <OutboundLink
              atracao={atracao}
              href={atracao.linkExterno}
              ctaLabel="Ver ingresso"
              className={buttonClassName({
                variant: "primary",
                size: "lg",
                className: "w-full sm:w-auto",
              })}
            >
              Ver ingresso
            </OutboundLink>
          </div>
        </article>
      </main>
    </>
  );
}
