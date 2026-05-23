"use client";

import { useState } from "react";
import { buttonClassName } from "@/components/Button";
import { trackEvent, trackShareClick, type SaveClickParams } from "@/lib/analytics";
import type { Atracao } from "@/lib/sanity/types";
import { cn } from "@/lib/cn";

interface AtracaoDetailActionsProps {
  atracao: Atracao;
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

export function AtracaoDetailActions({ atracao }: AtracaoDetailActionsProps) {
  const [favorite, setFavorite] = useState(false);

  const handleSaveClick = () => {
    if (!favorite) {
      trackEvent("save_click", {
        attraction_id: atracao.slug,
        attraction_name: atracao.titulo,
        category: atracao.categoria,
        source: "detail_page",
      } satisfies SaveClickParams);
    }
    setFavorite((value) => !value);
  };

  const handleShareClick = async () => {
    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `/atracao/${atracao.slug}`;
    await trackShareClick(atracao, shareUrl, "detail_page");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={handleSaveClick}
        aria-pressed={favorite}
        aria-label={
          favorite
            ? `Remover ${atracao.titulo} dos favoritos`
            : `Salvar ${atracao.titulo}`
        }
        className={cn(
          buttonClassName({ variant: "secondary", size: "md" }),
          favorite && "text-error",
        )}
      >
        <HeartIcon filled={favorite} />
        {favorite ? "Salvo" : "Salvar"}
      </button>
      <button
        type="button"
        onClick={() => void handleShareClick()}
        aria-label={`Compartilhar ${atracao.titulo}`}
        className={buttonClassName({ variant: "secondary", size: "md" })}
      >
        <ShareIcon />
        Compartilhar
      </button>
    </div>
  );
}
