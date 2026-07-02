"use client";

import { useEffect, useRef } from "react";
import {
  buildAttractionViewParams,
  trackEvent,
  type AttractionViewParams,
} from "@/lib/analytics";
import type { Atracao } from "@/lib/sanity/types";

export function useAttractionView(
  atracao: Atracao,
  source: AttractionViewParams["view_source"],
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || firedRef.current) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          timer = setTimeout(() => {
            if (!firedRef.current) {
              firedRef.current = true;
              trackEvent(
                "attraction_view",
                buildAttractionViewParams(atracao, source) satisfies AttractionViewParams,
              );
            }
          }, 2000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [atracao, source]);

  return cardRef;
}

export function useDetailAttractionView(atracao: Atracao) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const timer = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        trackEvent(
          "attraction_view",
          buildAttractionViewParams(atracao, "detail_page") satisfies AttractionViewParams,
        );
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [atracao]);
}
