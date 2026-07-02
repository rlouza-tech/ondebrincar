"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { buttonClassName } from "@/components/Button";
import { buildShareUrl, trackEvent, trackShareClick, type SaveClickParams } from "@/lib/analytics";

import type { Atracao } from "@/lib/sanity/types";

const TOAST_DURATION_MS = 2500;

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
  const [saveToastVisible, setSaveToastVisible] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSaveClick() {
    trackEvent("save_click", {
      attraction_id: atracao.slug,
      attraction_name: atracao.titulo,
      category: atracao.categoria,
      view_source: "detail_page",
    } satisfies SaveClickParams);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveToastVisible(true);
    saveTimerRef.current = setTimeout(() => setSaveToastVisible(false), TOAST_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleShareClick = async () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `https://ondebrincar.com.br/atracao/${atracao.slug}`;
    await trackShareClick(atracao, buildShareUrl(baseUrl, "ob_ficha"), "detail_page");
  };

  return (
    <div className="flex flex-wrap gap-3">
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={handleSaveClick}
          aria-label={`Salvar ${atracao.titulo}`}
          className={buttonClassName({ variant: "secondary", size: "md" })}
        >
          <HeartIcon filled={false} />
          Salvar
        </button>

        {saveToastVisible && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              backgroundColor: "#1C1917",
              color: "#FDFAF4",
              borderRadius: "8px",
              padding: "10px 12px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              zIndex: 9999,
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            <Clock size={14} strokeWidth={2} aria-hidden="true" />
            Favoritos em breve
          </div>
        )}
      </div>

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
