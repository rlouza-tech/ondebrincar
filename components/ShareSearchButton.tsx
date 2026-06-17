"use client";

import { useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { buildShareUrl, trackEvent, type ShareClickParams } from "@/lib/analytics";
import { countActiveFilters } from "@/lib/atracoes";

interface ShareSearchButtonProps {
  searchParams: ReadonlyURLSearchParams;
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="size-4"
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

export function ShareSearchButton({ searchParams }: ShareSearchButtonProps) {
  const [copiado, setCopiado] = useState(false);

  if (countActiveFilters(searchParams) === 0) {
    return null;
  }

  async function compartilharBusca() {
    const shareUrl = buildShareUrl(window.location.href);
    await navigator.clipboard.writeText(shareUrl);

    trackEvent("share_click", {
      attraction_id: "home-filtrada",
      attraction_name: `Busca: ${searchParams.toString()}`,
      category: "busca",
      share_method: "copy_link",
      source: "listing_card",
    } satisfies ShareClickParams);

    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void compartilharBusca()}
      className="inline-flex items-center gap-1.5 text-sm text-secondary transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ShareIcon />
      <span>{copiado ? "Link copiado!" : "Compartilhar busca"}</span>
    </button>
  );
}
