import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtracaoDetailActions } from "@/components/AtracaoDetailActions";
import { AttractionDetailTracker } from "@/components/AttractionDetailTracker";
import { JsonLd } from "@/components/JsonLd";
import { AddressLink } from "@/components/AddressLink";
import { OutboundLink } from "@/components/OutboundLink";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { buttonClassName } from "@/components/Button";
import {
  formatFaixaEtaria,
  formatPreco,
  getAtracaoBySlug,
  getAtracaoSlugs,
  sanityImageUrl,
} from "@/lib/atracoes";
import { formatadorDeData } from "@/lib/format-date";

interface AtracaoPageProps {
  params: { slug: string };
  searchParams?: { ref?: string };
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

  // US-I9.3: fórmula de title otimizada para SEO local
  const categoriaDisplay = atracao.categoria
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${atracao.titulo} — ${categoriaDisplay} em ${atracao.bairro} | Onde Brincar`;

  // US-I9.3: meta description com faixa etária e preço
  const faixa = formatFaixaEtaria(atracao.idadeMin, atracao.idadeMax);
  const preco = formatPreco(atracao);
  const descriptionRaw = `${atracao.descricaoCurta} · ${faixa} · ${preco}`;
  const description =
    descriptionRaw.length > 155 ? `${descriptionRaw.slice(0, 152)}...` : descriptionRaw;

  const hasImage = atracao.imagemUrl && !atracao.imagemUrl.includes("placeholder");
  // Sanity Image API: força 1200×630 cropped e WEBP otimizado (~< 1 MB)
  const ogImageUrl = hasImage
    ? `${atracao.imagemUrl}?w=1200&h=630&fit=crop&auto=format`
    : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      siteName: "Onde Brincar",
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: atracao.titulo,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

const BASE_URL = "https://ondebrincar.com.br";

function buildJsonLd(atracao: Awaited<ReturnType<typeof getAtracaoBySlug>>) {
  if (!atracao) return null;

  const url = `${BASE_URL}/atracao/${atracao.slug}`;
  const addressLocality = atracao.bairro || "Rio de Janeiro";

  const address = {
    "@type": "PostalAddress",
    addressLocality,
    addressRegion: "RJ",
    addressCountry: "BR",
  };

  if (atracao.proximaData) {
    const hasImage = atracao.imagemUrl && !atracao.imagemUrl.includes("placeholder");
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: atracao.titulo,
      startDate: atracao.proximaData,
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: addressLocality,
        address,
      },
      url,
      ...(atracao.descricaoCurta ? { description: atracao.descricaoCurta } : {}),
      ...(hasImage ? { image: `${atracao.imagemUrl}?w=1200&h=630&fit=crop&auto=format` } : {}),
    };

    if (atracao.precoTipo === "pago" && atracao.precoLabel) {
      const priceMatch = atracao.precoLabel.replace(/[^\d,]/g, "").replace(",", ".");
      schema.offers = {
        "@type": "Offer",
        price: priceMatch,
        priceCurrency: "BRL",
        url,
      };
    }

    return schema;
  }

  if (atracao.categoria === "restaurante") {
    return {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: atracao.titulo,
      address,
      url,
      ...(atracao.descricaoCurta ? { description: atracao.descricaoCurta } : {}),
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: atracao.titulo,
    address,
    url,
    ...(atracao.descricaoCurta ? { description: atracao.descricaoCurta } : {}),
  };
}

export default async function AtracaoPage({ params, searchParams }: AtracaoPageProps) {
  const atracao = await getAtracaoBySlug(params.slug);

  if (!atracao) {
    notFound();
  }

  const jsonLd = buildJsonLd(atracao);
  const backHref = searchParams?.ref ? `/?${decodeURIComponent(searchParams.ref)}` : "/";

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <AttractionDetailTracker atracao={atracao} />
      <SiteHeader />
      <main className="mx-auto max-w-screen-lg px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={backHref}
          className="mb-6 inline-block text-sm font-medium text-secondary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ← Voltar para a lista
        </Link>

        <article className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-primary/5">
            <Image
              src={sanityImageUrl(atracao.imagemUrl, 1200)}
              alt={`Foto: ${atracao.titulo}`}
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-secondary">
              {atracao.categoria}
            </p>
            <h1 className="text-2xl font-display font-bold text-primary md:text-3xl">
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
              {atracao.endereco ? (
                <div className="sm:col-span-2">
                  <dt className="font-medium text-primary">Endereço</dt>
                  <dd className="text-secondary">
                    <AddressLink atracao={atracao} endereco={atracao.endereco} />
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-medium text-primary">Preço</dt>
                <dd className="text-secondary">{formatPreco(atracao)}</dd>
              </div>
              <div>
                <dt className="font-medium text-primary">Ambiente</dt>
                <dd className="text-secondary">
                  {atracao.indoorOutdoor === "indoor"
                    ? "Interno"
                    : atracao.indoorOutdoor === "outdoor"
                      ? "Ao ar livre"
                      : "Interno e externo"}
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

            {atracao.linkExterno ? (
              <OutboundLink
                atracao={atracao}
                href={atracao.linkExterno}
                ctaLabel={atracao.tipoProgramacao === "permanente" ? "Visitar site" : "Ver ingressos"}
                isBuyTicket={atracao.tipoProgramacao !== "permanente"}
                className={buttonClassName({
                  variant: "primary",
                  size: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                {atracao.tipoProgramacao === "permanente" ? "Visitar site" : "Ver ingressos"}
              </OutboundLink>
            ) : null}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
