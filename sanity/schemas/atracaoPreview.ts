/**
 * Preview da ficha no desk do Studio (US-S75).
 * Extraído para ser testável sem subir o Studio: ficha com motivo sensível
 * recebe subtítulo distinto da ficha só com motivo de qualidade geral.
 */

import type { ReactNode } from "react";

export interface AtracaoPreviewInput {
  title?: string;
  bairro?: string;
  media?: ReactNode;
  hasConteudoSensivel?: boolean;
}

export interface AtracaoPreviewValue {
  title?: string;
  subtitle?: string;
  media?: ReactNode;
}

export function prepareAtracaoPreview(
  value: AtracaoPreviewInput,
): AtracaoPreviewValue {
  if (value.hasConteudoSensivel) {
    return {
      title: value.title,
      subtitle: value.bairro
        ? `⚠ Conteúdo sensível — ${value.bairro}`
        : "⚠ Conteúdo sensível",
      media: value.media,
    };
  }

  return {
    title: value.title,
    subtitle: value.bairro,
    media: value.media,
  };
}
