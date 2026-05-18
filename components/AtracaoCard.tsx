"use client";

import Image from "next/image";
import { useId, type HTMLAttributes } from "react";
import { Card } from "@/components/Card";
import { cn } from "@/lib/cn";

export interface AtracaoCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  ageRange: string;
  price: string;
  imageUrl: string;
  imageAlt: string;
  favorite?: boolean;
  onFavoriteToggle?: () => void;
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
              "absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm transition-colors",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              favorite ? "text-error" : "text-primary/60 hover:text-error",
            )}
          >
            <HeartIcon filled={favorite} />
          </button>
        ) : (
          <span
            className={cn(
              "absolute right-3 top-3 rounded-full bg-white/90 p-2 text-primary/40 shadow-sm",
              favorite && "text-error",
            )}
            aria-hidden
          >
            <HeartIcon filled={favorite} />
          </span>
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
