const WEEKDAY_SHORT_PT: Record<number, string> = {
  0: "dom",
  1: "seg",
  2: "ter",
  3: "qua",
  4: "qui",
  5: "sex",
  6: "sáb",
};

/** Formata ISO date (YYYY-MM-DD) para exibição pt-BR. Ex.: "23 de maio (sex)". */
export function formatadorDeData(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const monthLabel = date.toLocaleDateString("pt-BR", {
    month: "long",
    timeZone: "UTC",
  });
  const weekday = WEEKDAY_SHORT_PT[date.getUTCDay()] ?? "";
  return `${day} de ${monthLabel} (${weekday})`;
}

/** Formata ISO date (YYYY-MM-DD) compacto para cards. Ex.: "sáb, 23 mai". */
export function formatDataCurta(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = WEEKDAY_SHORT_PT[date.getUTCDay()] ?? "";
  const monthLabel = date.toLocaleDateString("pt-BR", {
    month: "short",
    timeZone: "UTC",
  });
  return `${weekday}, ${day} ${monthLabel.replace(".", "")}`;
}
