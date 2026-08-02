"use client";

import Image from "next/image";
import { useId, type HTMLAttributes, type MouseEvent } from "react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

export interface AtracaoCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  ageRange: string;
  price: string;
  imageUrl: string;
  imageAlt: string;
  bairro?: string | null;
  proximaData?: string | null;
  categoria?: string | null;
  sempreDisponivel?: boolean;
  favorite?: boolean;
  onFavoriteToggle?: (event: MouseEvent<HTMLButtonElement>) => void;
  onShareClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

const CATEGORIA_CONFIG: Record<string, { label: string; bgClass: string }> = {
  teatro:            { label: "Teatro",    bgClass: "bg-brand-primary" },
  show:              { label: "Show",      bgClass: "bg-brand-secondary" },
  "atividade-extra": { label: "Atividade", bgClass: "bg-brand-accent" },
  museu:             { label: "Museu",     bgClass: "bg-brand-accent" },
  parque:            { label: "Parque",    bgClass: "bg-ink-mid" },
  pracinha:          { label: "Pracinha",  bgClass: "bg-ink-mid" },
  praia:             { label: "Praia",     bgClass: "bg-ink-mid" },
  evento:            { label: "Evento",    bgClass: "bg-ink-mid" },
};

function CategoriaBadge({ categoria }: { categoria: string }) {
  const config = CATEGORIA_CONFIG[categoria];
  if (!config) return null;
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-semibold text-white",
        config.bgClass,
      )}
    >
      {config.label}
    </span>
  );
}

function formatProximaData(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`); // evita timezone shift
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="size-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.769-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
      />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      className="size-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}

export function AtracaoCard({
  className,
  name,
  ageRange,
  price,
  imageUrl,
  imageAlt,
  bairro,
  proximaData,
  categoria,
  sempreDisponivel = false,
  favorite = false,
  onFavoriteToggle,
  onShareClick,
  ...props
}: AtracaoCardProps) {
  const titleId = useId();

  return (
    <Card
      padding="none"
      className={cn("overflow-hidden", className)}
      aria-labelledby={titleId}
      {...props}
    >
      <div className="relative aspect-[4/3] w-full bg-primary/5">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        {(categoria || onFavoriteToggle || onShareClick) && (
          <div className="absolute left-3 top-3 flex flex-col gap-2">
            {categoria && <CategoriaBadge categoria={categoria} />}
            {(onFavoriteToggle || onShareClick) && (
              <div className="flex gap-2">
                {onShareClick ? (
                  <button
                    type="button"
                    onClick={onShareClick}
                    aria-label={`Compartilhar ${name}`}
                    className={cn(
                      "rounded-full bg-white/90 p-2 text-primary/60 shadow-sm transition-colors hover:text-primary",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    )}
                  >
                    <ShareIcon />
                  </button>
                ) : null}
                {onFavoriteToggle ? (
                  <button
                    type="button"
                    onClick={onFavoriteToggle}
                    aria-pressed={favorite}
                    aria-label={
                      favorite
                        ? `Remover ${name} dos favoritos`
                        : `Adicionar ${name} aos favoritos`
                    }
                    className={cn(
                      "rounded-full bg-white/90 p-2 shadow-sm transition-colors",
                      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                      favorite ? "text-error" : "text-primary/60 hover:text-error",
                    )}
                  >
                    <HeartIcon filled={favorite} />
                  </button>
                ) : (
                  <span
                    className={cn(
                      "rounded-full bg-white/90 p-2 text-primary/40 shadow-sm",
                      favorite && "text-error",
                    )}
                    aria-hidden
                  >
                    <HeartIcon filled={favorite} />
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <h3 id={titleId} className="text-lg font-semibold text-primary">
          {name}
        </h3>
        <p className="truncate text-sm text-secondary">
          {[bairro, ageRange, price].filter(Boolean).join(" · ")}
        </p>
        {sempreDisponivel ? (
          <span
            className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{ background: "#F0FBD9", borderColor: "#BEF264", color: "#3F6212" }}
          >
            Sempre disponível
          </span>
        ) : proximaData ? (
          <span
            className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
            style={{ background: "#E0F2FE", borderColor: "#BAE6FD", color: "#0369A1" }}
            title="data aproximada — pode mudar"
          >
            {formatProximaData(proximaData)}
          </span>
        ) : null}
      </div>
    </Card>
  );
}
