import { describe, expect, it } from "vitest";
import { buildLinhaEnriquecida, inferOrigem } from "../index";
import type { LinhaInput, RespostaGemini } from "../types";

// US-S54: renomeação partner → origem, com o novo valor "raindrop".

describe("inferOrigem", () => {
  it("reconhece sympla", () => {
    expect(inferOrigem("https://www.sympla.com.br/evento/123")).toBe("sympla");
  });

  it("reconhece eventim", () => {
    expect(inferOrigem("https://www.eventim.com.br/event/nome")).toBe("eventim");
  });

  it("reconhece clubinho", () => {
    expect(inferOrigem("https://clubinhodeofertas.com.br/rio-de-janeiro/peca-1234")).toBe(
      "clubinho",
    );
  });

  it("reconhece uhuu (US-E13)", () => {
    expect(inferOrigem("https://www.uhuu.com/rio-de-janeiro/evento/exemplo")).toBe("uhuu");
  });

  it("reconhece ecovilla (US-E18)", () => {
    expect(inferOrigem("https://ecovillarihappy.com.br/programacao/")).toBe("ecovilla");
  });

  it("cai em outro para domínio desconhecido", () => {
    expect(inferOrigem("https://www.ingresso.com/evento/123")).toBe("outro");
  });
});

function baseInput(overrides: Partial<LinhaInput> = {}): LinhaInput {
  return {
    nome: "O Mágico de Oz",
    categoria_origem: "Teatro",
    venue: "Teatro Clara Nunes",
    bairro: "Gávea",
    dias_apresentacao: "Dias 23, 30, 31",
    desconto_percentual: "10",
    preco_bruto: "R$ 54,90",
    url_origem: "https://example.com",
    ...overrides,
  };
}

function baseResposta(overrides: Partial<RespostaGemini> = {}): RespostaGemini {
  return {
    categoria: "teatro",
    idade_min: 4,
    idade_max: 10,
    idade_recomendada_min: 4,
    idade_recomendada_max: 10,
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
    aviso_operacional: null,
    idade_inferida_por_contexto: false,
    ...overrides,
  };
}

describe("buildLinhaEnriquecida — origem", () => {
  const meta = { ai_generated: true, ai_model: "gemini-flash-2.5", pipeline_failed: false };

  it("infere origem pela URL quando não há override (fluxo padrão da pipeline)", () => {
    const linha = baseInput({ url_origem: "https://www.sympla.com.br/evento/123" });
    const enriched = buildLinhaEnriquecida(
      linha,
      baseResposta(),
      "auto_ok",
      [],
      "2026-07-20T12:00:00.000Z",
      meta,
    );

    expect(enriched.origem).toBe("sympla");
  });

  it("AC4: grava origem=raindrop quando o override é passado, mesmo com URL de site oficial", () => {
    const linha = baseInput({ url_origem: "https://parquelage.rj.gov.br" });
    const enriched = buildLinhaEnriquecida(
      linha,
      baseResposta(),
      "auto_ok",
      [],
      "2026-07-20T12:00:00.000Z",
      { ...meta, origem: "raindrop" },
    );

    expect(enriched.origem).toBe("raindrop");
  });
});
