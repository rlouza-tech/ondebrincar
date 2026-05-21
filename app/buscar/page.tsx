import { permanentRedirect } from "next/navigation";

interface BuscarPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

function buildQueryString(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        params.append(key, value[index]);
      }
    }
  }

  return params.toString();
}

/** Redireciona /buscar → / preservando query params (filtros na Home). */
export default function BuscarPage({ searchParams = {} }: BuscarPageProps) {
  const query = buildQueryString(searchParams);
  permanentRedirect(query ? `/?${query}` : "/");
}
