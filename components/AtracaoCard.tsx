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
  favorite?: boolean;
  onFavoriteToggle?: (event: MouseEvent<HTMLButtonElement>) => void;
  onShareClick?: (event: MouseEvent<HTMLButtonElement>) => void;
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
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
        {(onFavoriteToggle || onShareClick) && (
          <div className="absolute right-3 top-3 flex gap-2">
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
      <div className="space-y-1 p-4">
        <h3 id={titleId} className="text-lg font-semibold text-primary">
          {name}
        </h3>
        <p className="text-sm text-secondary">{ageRange}</p>
        <p className="text-base font-medium text-primary">{price}</p>
      </div>
    </Card>
  );
}
