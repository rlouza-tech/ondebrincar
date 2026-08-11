import { describe, expect, it } from "vitest";
import { buildImagePrompt, buildImagePromptAnonymous, IMAGE_MODEL } from "../image-adapter";

/**
 * Nomes de atração historicamente problemáticos quando renderizados como texto
 * pela IA generativa: "Fábules & Fantasias", "Teatrinhio", "Gratulio",
 * "espetácaólo", "Viajem" — saídas malformadas que motivaram remover qualquer
 * instrução de texto embutido do prompt (US-E22).
 */
const CATEGORIAS_AMOSTRA = ["teatro", "parque", "museu"] as const;
const NOMES_PROBLEMATICOS = ["Fábules & Fantasias", "Teatrinhio", "Gratulio"];

describe("image-adapter", () => {
  describe("buildImagePrompt", () => {
    it.each(CATEGORIAS_AMOSTRA)(
      "não embute o nome da atração como texto na cena para categoria '%s'",
      (categoria) => {
        for (const nome of NOMES_PROBLEMATICOS) {
          const prompt = buildImagePrompt(nome, categoria, "Uma atração incrível para crianças.");
          expect(prompt).not.toContain(nome);
          expect(prompt).not.toContain(`"${nome}"`);
        }
      },
    );

    it("não usa mais placa, letreiro, faixa, quadro negro ou lousa para exibir o nome", () => {
      const prompt = buildImagePrompt("Circo Encantado da Alegria", "restaurante");
      expect(prompt).not.toMatch(/com o texto ["']/i);
      expect(prompt).not.toMatch(/placa .*com o texto|letreiro .*com o texto|faixa .*com o texto|quadro negro .*com o texto|lousa .*com o texto/i);
    });

    it("inclui contexto da descrição quando fornecida", () => {
      const prompt = buildImagePrompt("Circo Encantado", "parque", "Escorregador gigante e trepa-trepa novo.");
      expect(prompt).toContain("Contexto adicional");
      expect(prompt).toContain("Escorregador gigante");
    });

    it("reforça explicitamente a ausência de texto no sufixo de estilo", () => {
      const prompt = buildImagePrompt("Circo Encantado", "museu");
      expect(prompt.toLowerCase()).toContain("sem nenhum texto");
    });
  });

  describe("buildImagePromptAnonymous", () => {
    it.each(CATEGORIAS_AMOSTRA)(
      "nunca referencia nome de atração para categoria '%s'",
      (categoria) => {
        for (const nome of NOMES_PROBLEMATICOS) {
          const prompt = buildImagePromptAnonymous(categoria, "Uma atividade divertida para crianças.");
          expect(prompt).not.toContain(nome);
        }
      },
    );

    it("reforça explicitamente a ausência de texto no sufixo de estilo", () => {
      const prompt = buildImagePromptAnonymous("evento");
      expect(prompt.toLowerCase()).toContain("sem nenhum texto");
    });
  });

  it("prompts de buildImagePrompt e buildImagePromptAnonymous são equivalentes (nome nunca influencia a cena)", () => {
    const comNome = buildImagePrompt("Qualquer Nome de Atração", "praia", "Descrição idêntica.");
    const semNome = buildImagePromptAnonymous("praia", "Descrição idêntica.");
    expect(comNome).toBe(semNome);
  });

  it("expõe o modelo Gemini usado para geração de imagem", () => {
    expect(IMAGE_MODEL).toBe("gemini-2.5-flash-image");
  });
});
