"use client";

import { useDetailAttractionView } from "@/hooks/useAttractionView";
import type { Atracao } from "@/lib/sanity/types";

interface AttractionDetailTrackerProps {
  atracao: Atracao;
}

export function AttractionDetailTracker({ atracao }: AttractionDetailTrackerProps) {
  useDetailAttractionView(atracao);
  return null;
}
