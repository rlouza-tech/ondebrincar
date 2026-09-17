import type { DocumentBadgeComponent } from "sanity";

/**
 * Badge no header do documento no Studio (US-S75).
 * Só aparece quando has_conteudo_sensivel=true — tom danger, distinto do
 * badge padrão de draft/published.
 */
export const conteudoSensivelBadge: DocumentBadgeComponent = (props) => {
  const doc = (props.draft ?? props.published) as
    | { has_conteudo_sensivel?: boolean }
    | undefined;

  if (doc?.has_conteudo_sensivel !== true) {
    return null;
  }

  return {
    label: "Conteúdo sensível",
    title:
      "Quality-gate encontrou motivo de conteúdo sensível (ex.: menção à persona interna). Não aprovar sem corrigir o texto.",
    color: "danger",
  };
};
