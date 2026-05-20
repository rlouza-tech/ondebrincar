import { describe, expect, it } from "vitest";
import { evaluate } from "../quality-gate";
import type { LinhaInput, RespostaGemini } from "../types";

function baseInput(): LinhaInput {
  return {
    nome: "O Mágico de Oz",
    categoria_origem: "Teatro",
    venue: "Teatro Clara Nunes",
    bairro: "Gávea",
    dias_apresentacao: "Dias 23, 30, 31",
    desconto_percentual: "10",
    preco_bruto: "R$ 54,90",
    url_origem: "https://example.com",
  };
}

function baseResposta(overrides: Partial<RespostaGemini> = {}): RespostaGemini {
  return {
    categoria: "teatro",
    idade_min: 4,
    idade_max: 10,
    duracao_min: 60,
    preco_centavos: 5490,
    indoor_outdoor: "indoor",
    descricao:
      "Peça musical infantil com figurinos coloridos e duração de cerca de 60 minutos, indicada para famílias com crianças pequenas.",
    mini_review:
      "Boa opção para primeira ida ao teatro com crianças. Ressalva: sessão sem intervalo pode cansar os mais novos no final.",
    tipo_programacao: "evento_pontual",
    programacao_texto: "Sessões nos dias 23, 30 e 31",
    proxima_data: "2026-05-23",
    confidence: 5,
    abstain_fields: [],
    ...overrides,
  };
}

describe("evaluate — programação", () => {
  it("tipo_programacao inválido → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        tipo_programacao: "invalido" as RespostaGemini["tipo_programacao"],
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("tipo_programacao_invalido");
  });

  it("programacao_texto curto demais → needs_human", () => {
    const result = evaluate(baseInput(), baseResposta({ programacao_texto: "abc" }));

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("programacao_texto_tamanho_invalido");
  });

  it("proxima_data com formato inválido → needs_human", () => {
    const result = evaluate(baseInput(), baseResposta({ proxima_data: "23/05/2026" }));

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("proxima_data_formato_invalido");
  });
});
