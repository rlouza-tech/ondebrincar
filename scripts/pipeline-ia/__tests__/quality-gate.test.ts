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
    programacao_texto:
      "Sessões nos dias 23, 30 e 31. Consulte horário ao clicar em 'Ver ingresso'.",
    proxima_data: "2026-05-23",
    data_fim: null,
    confidence: 5,
    abstain_fields: [],
    idade_inferida_por_contexto: false,
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

  it("proxima_data no passado → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ proxima_data: "2023-10-23" }),
      { referenceDate: new Date("2026-05-20T12:00:00.000Z") },
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("proxima_data_no_passado");
  });

  // US-S37
  it("data_fim com formato inválido → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ proxima_data: "2026-07-06", data_fim: "10/07/2026" }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("data_fim_formato_invalido");
  });

  it("data_fim anterior a proxima_data → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ proxima_data: "2026-07-10", data_fim: "2026-07-06" }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("data_fim_anterior_a_proxima_data");
  });

  it("data_fim válida e posterior a proxima_data (evento multi-dia contínuo) → sem reason", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ proxima_data: "2026-07-06", data_fim: "2026-07-10" }),
    );

    expect(result.reasons).not.toContain("data_fim_formato_invalido");
    expect(result.reasons).not.toContain("data_fim_anterior_a_proxima_data");
  });

  it("data_fim null (evento de um dia só) → sem reason", () => {
    const result = evaluate(baseInput(), baseResposta({ data_fim: null }));

    expect(result.reasons).not.toContain("data_fim_formato_invalido");
    expect(result.reasons).not.toContain("data_fim_anterior_a_proxima_data");
  });

  it("dias sem horário no input e programacao sem ressalva → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        programacao_texto: "Sessões nos dias 23, 30 e 31",
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("programacao_lacuna_horario_nao_sinalizada");
  });
});

describe("evaluate — incerteza", () => {
  it("marcador [INCERTO] → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        mini_review:
          "Programa interessante na região central. [INCERTO] Acessibilidade — confirme com a bilheteria antes de ir.",
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("marcador_incerto");
  });
});

describe("evaluate — persona interna (US-S71)", () => {
  it("menção a 'Daniel' na mini_review → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        mini_review:
          "É um programa cultural divertido para o fim de semana, ideal para Daniel levar a filha e curtir juntos.",
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("mencao_persona_interna");
  });

  it("menção a 'Lívia' (com acento) na descricao → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        descricao:
          "Peça musical infantil ideal para crianças como a Lívia, de 4 anos, que adoram figurinos coloridos e música ao vivo.",
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("mencao_persona_interna");
  });

  it("menção a 'Livia' (sem acento) na programacao_texto → needs_human", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        programacao_texto: "Leve a Livia para aproveitar sábados e domingos às 16h.",
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(result.reasons).toContain("mencao_persona_interna");
  });

  it("texto sem menção à persona → não sinaliza mencao_persona_interna", () => {
    const result = evaluate(baseInput(), baseResposta());

    expect(result.reasons).not.toContain("mencao_persona_interna");
  });
});

describe("evaluate — faixa etária null (US-S20)", () => {
  it("idade_min e idade_max null, sem abstain_fields → não quebra e não sinaliza idade_min_maior_que_idade_max nem idade_fora_do_intervalo_0_18", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ idade_min: null, idade_max: null }),
    );

    expect(result.reasons).not.toContain("idade_min_maior_que_idade_max");
    expect(result.reasons).not.toContain("idade_fora_do_intervalo_0_18");
  });

  it("idade_min e idade_max null e marcados em abstain_fields → needs_human (abstencao_campo_critico)", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({
        idade_min: null,
        idade_max: null,
        abstain_fields: ["idade_min", "idade_max"],
      }),
    );

    expect(result.status).toBe("needs_human");
    expect(
      result.reasons.some((r) => r.startsWith("abstencao_campo_critico")),
    ).toBe(true);
  });

  it("apenas idade_max null (idade_min preenchido) → não quebra a comparação idade_min > idade_max", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ idade_min: 14, idade_max: null, abstain_fields: ["idade_max"] }),
    );

    expect(result.reasons).not.toContain("idade_min_maior_que_idade_max");
    expect(result.reasons).not.toContain("idade_fora_do_intervalo_0_18");
  });

  it("idade_min/idade_max válidos e fora de ordem → ainda sinaliza idade_min_maior_que_idade_max", () => {
    const result = evaluate(
      baseInput(),
      baseResposta({ idade_min: 10, idade_max: 4 }),
    );

    expect(result.reasons).toContain("idade_min_maior_que_idade_max");
  });
});
