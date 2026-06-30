import { describe, expect, it } from "vitest";
import { extractBairroFromVenue, VENUE_BAIRRO_MAP } from "../bairro-extractor";

describe("extractBairroFromVenue", () => {
  // --- venue_map ---

  describe("venue_map (prioridade 1)", () => {
    it("retorna bairro de venue exato no mapa", () => {
      const result = extractBairroFromVenue("Teatro Oi Futuro");
      expect(result).toEqual({ bairro: "Flamengo", method: "venue_map" });
    });

    it("é case-insensitive e ignora acentos", () => {
      const result = extractBairroFromVenue("TEATRO OI FUTURO");
      expect(result?.method).toBe("venue_map");
    });

    it("funciona com venue contendo informação extra antes/depois", () => {
      const result = extractBairroFromVenue("Espaço Cria – Cosme Velho");
      expect(result).toEqual({ bairro: "Santa Teresa", method: "venue_map" });
    });

    it("prefere venue_map a bairro_scan mesmo que bairro apareça no nome", () => {
      // "Teatro Bangu Shopping" → venue_map encontra antes do scan
      const result = extractBairroFromVenue("Teatro Bangu Shopping");
      expect(result?.method).toBe("venue_map");
      expect(result?.bairro).toBe("Bangu");
    });

    it("retorna null para venue vazio", () => {
      expect(extractBairroFromVenue("")).toBeNull();
    });

    it("retorna null para venue só de espaços", () => {
      expect(extractBairroFromVenue("   ")).toBeNull();
    });
  });

  // --- bairro_scan ---

  describe("bairro_scan (fallback 2)", () => {
    it("detecta bairro carioca no venue quando não está no mapa", () => {
      const result = extractBairroFromVenue("Algum Espaço Cultural - Copacabana, RJ");
      expect(result?.method).toBe("bairro_scan");
      expect(result?.bairro.toLowerCase()).toBe("copacabana");
    });

    it("detecta Ipanema em venue desconhecido", () => {
      const result = extractBairroFromVenue("Centro Cultural Ipanema");
      expect(result?.method).toBe("bairro_scan");
      expect(result?.bairro.toLowerCase()).toBe("ipanema");
    });

    it("prefere bairro mais longo quando há ambiguidade (barra da tijuca vs barra)", () => {
      const result = extractBairroFromVenue("Algum Espaço na Barra da Tijuca");
      expect(result?.bairro.toLowerCase()).toBe("barra da tijuca");
    });

    it("não confunde cidade com bairro: 'Rio de Janeiro' não vira bairro", () => {
      // "rio de janeiro" não está na BAIRROS_RIO — não deve retornar match
      const result = extractBairroFromVenue("R. Cosme Velho, 599 - Rio de Janeiro, RJ");
      // pode retornar null ou "cosme velho" via scan se estiver na lista — mas nunca "Rio de Janeiro"
      if (result) {
        expect(result.bairro.toLowerCase()).not.toBe("rio de janeiro");
      }
    });

    it("retorna null para venue totalmente irreconhecível", () => {
      const result = extractBairroFromVenue("Venue Inexistente XYZ-999");
      expect(result).toBeNull();
    });
  });

  // --- title case ---

  describe("capitalização do bairro retornado", () => {
    it("retorna bairro em title case via bairro_scan", () => {
      const result = extractBairroFromVenue("Algum Espaço - Botafogo, RJ");
      expect(result?.bairro).toBe("Botafogo");
    });

    it("retorna bairro composto com preposição em minúsculo (barra da tijuca)", () => {
      const result = extractBairroFromVenue("Shopping na Barra da Tijuca");
      // venue_map ou bairro_scan — ambos devem retornar "Barra da Tijuca"
      expect(result?.bairro).toBe("Barra da Tijuca");
    });
  });

  // --- cobertura do VENUE_BAIRRO_MAP ---

  describe("sanidade do VENUE_BAIRRO_MAP", () => {
    it("todas as chaves do mapa retornam resultado via venue_map", () => {
      for (const [key, expectedBairro] of Object.entries(VENUE_BAIRRO_MAP)) {
        const result = extractBairroFromVenue(key);
        expect(result, `chave "${key}" deveria ter match`).not.toBeNull();
        expect(result?.bairro).toBe(expectedBairro);
      }
    });
  });
});
