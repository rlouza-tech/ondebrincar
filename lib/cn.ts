type ClassValue = string | undefined | null | false;

/** Junta classes Tailwind omitindo valores falsy. */
export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}
