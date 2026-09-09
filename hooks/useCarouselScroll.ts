"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * US-I43/US-I47 — lógica de scroll horizontal compartilhada entre trilhas (Destaques,
 * carrosséis de zona): mostra/esconde as setinhas prev/next conforme a posição real de
 * scroll (`scrollLeft`/`clientWidth`/`scrollWidth`) e rola ~85% da largura visível por clique.
 */
export function useCarouselScroll(itemCount: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 2);
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [updateArrows, itemCount]);

  const scroll = useCallback((direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  return { trackRef, canScrollPrev, canScrollNext, scroll };
}
