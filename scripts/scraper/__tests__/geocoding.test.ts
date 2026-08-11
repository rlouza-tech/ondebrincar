import { describe, expect, it, vi } from "vitest";
import { reverseGeocodeUhuu } from "../geocoding";

/**
 * Payload real do Nominatim para -22.9663958,-43.1875042 (evento "Maria Clara
 * & JP - Brincar e Imaginar", Teatro Claro MAIS RJ), capturado durante a
 * investigação desta story (US-S74) via curl direto contra
 * nominatim.openstreetmap.org/reverse.
 */
const NOMINATIM_MARIA_CLARA_JP = {
  address: {
    amenity: "Termas L'uomo",
    house_number: "143",
    road: "Rua Siqueira Campos",
    neighbourhood: "Bairro Peixoto",
    suburb: "Copacabana",
    city: "Rio de Janeiro",
    state: "Rio de Janeiro",
    country: "Brasil",
  },
};

describe("reverseGeocodeUhuu", () => {
  it("caso real: coordenadas de Maria Clara & JP resolvem para bairro Copacabana", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(NOMINATIM_MARIA_CLARA_JP), { status: 200 }));

    const result = await reverseGeocodeUhuu("-22.9663958", "-43.1875042", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "Copacabana", endereco: "Rua Siqueira Campos, 143" });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("lat=-22.9663958&lon=-43.1875042"),
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": expect.any(String) }) }),
    );
  });

  it("caso de controle: lat/long vazios não chamam a API e retornam campos vazios", async () => {
    const fetchImpl = vi.fn();

    const result = await reverseGeocodeUhuu("", "", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "", endereco: "" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("abstém (campos vazios) quando a API retorna HTTP não-200", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 }));

    const result = await reverseGeocodeUhuu("-22.9", "-43.1", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "", endereco: "" });
  });

  it("abstém quando a chamada de rede lança erro", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await reverseGeocodeUhuu("-22.9", "-43.1", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "", endereco: "" });
  });

  it("abstém (não infere) quando a resposta não tem suburb/neighbourhood nem road — ex.: meio do mar", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ address: { country: "Brasil" } }), { status: 200 }),
    );

    const result = await reverseGeocodeUhuu("-23.5", "-42.0", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "", endereco: "" });
  });

  it("usa neighbourhood como bairro quando suburb está ausente", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ address: { neighbourhood: "Centro", road: "Rua X" } }), { status: 200 }),
    );

    const result = await reverseGeocodeUhuu("-22.9", "-43.1", fetchImpl as unknown as typeof fetch);

    expect(result).toEqual({ bairro: "Centro", endereco: "Rua X" });
  });
});
