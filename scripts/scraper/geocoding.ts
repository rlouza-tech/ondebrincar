/**
 * Geocoding reverso — Uhuu (US-S74)
 *
 * A Uhuu não expõe bairro/endereço em texto, só um link do Google Maps com
 * coordenadas na página do evento (ver scripts/scraper/uhuu.ts). Este módulo
 * converte essas coordenadas em bairro + endereço estruturado via Nominatim
 * (OpenStreetMap) — gratuito, sem chave de API, dentro do free tier para o
 * volume baixo desta fonte (confirmado: ~4-22 eventos por execução).
 *
 * Fallback: qualquer falha (rede, HTTP não-200, resposta sem os campos de
 * endereço esperados) retorna string vazia para o campo afetado — nunca
 * inventa bairro a partir de dado impreciso (mesmo princípio de abstenção
 * usado no abstain_fields do pipeline-ia, ver US-S13/US-S56).
 */

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "OndeBrincar/1.0 (contato: rlouza@gmail.com)";

/** Respeita a política de uso do Nominatim (máx. 1 req/s). */
export const GEOCODING_DELAY_MS = 1000;

export interface ReverseGeocodeResult {
  bairro: string;
  endereco: string;
}

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  road?: string;
  house_number?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

const VAZIO: ReverseGeocodeResult = { bairro: "", endereco: "" };

/** Converte lat/long em bairro + endereço estruturado. Nunca lança — falha vira campo vazio. */
export async function reverseGeocodeUhuu(
  latitude: string,
  longitude: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ReverseGeocodeResult> {
  if (!latitude.trim() || !longitude.trim()) return VAZIO;

  try {
    const url = `${NOMINATIM_REVERSE_URL}?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pt-BR`;
    const res = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return VAZIO;

    const data = (await res.json()) as NominatimResponse;
    const address = data.address ?? {};

    const bairro = (address.suburb ?? address.neighbourhood ?? "").trim();
    const endereco = address.road?.trim()
      ? [address.road.trim(), address.house_number?.trim()].filter(Boolean).join(", ")
      : "";

    return { bairro, endereco };
  } catch {
    return VAZIO;
  }
}
