"use client";

import { Clock, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const TOAST_DURATION_MS = 2500;

export function SearchButton() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleClick() {
    trackEvent("search_attempted");

    // Se já está visível, reinicia o timer
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), TOAST_DURATION_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Buscar"
        className="text-ink-mid hover:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary text-sm font-medium flex items-center gap-1"
      >
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <span>Buscar</span>
      </button>

      {visible && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
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
          Busca chegando em breve
        </div>
      )}
    </div>
  );
}
