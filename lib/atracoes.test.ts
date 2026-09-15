import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  filtrarAtracoes,
  formatFaixaEtaria,
  getAtracaoBySlug,
  getProximoFimDeSemana,
  mapSanityAtracao,
  normalizeCategoriaSlug,
  sanityImageUrl,
  type Atracao,
} from "./atracoes";
import { mockAtracoes } from "./mock-atracoes";
import type { SanityAtracaoDocument } from "./sanity/types";

describe("filtrarAtracoes", () => {
  it("filtra por bairro Tijuca", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { bairros: ["Tijuca"] });
    expect(resultados.length).toBe(2);
    expect(resultados.every((a) => a.bairro === "Tijuca")).toBe(true);
  });

  it("filtra por múltiplos bairros", () => {
    const tijuca = filtrarAtracoes(mockAtracoes, { bairros: ["Tijuca"] });
    const bairroExtra = mockAtracoes.find((a) => a.bairro !== "Tijuca")?.bairro;
    if (!bairroExtra) {
      return;
    }
    const resultados = filtrarAtracoes(mockAtracoes, {
      bairros: ["Tijuca", bairroExtra],
    });
    expect(resultados.length).toBeGreaterThan(tijuca.length);
    expect(
      resultados.every(
        (a) => a.bairro === "Tijuca" || a.bairro === bairroExtra,
      ),
    ).toBe(true);
  });

  it("filtra por idade dentro da faixa", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { idade: 4 });
    expect(resultados.some((a) => a.slug.includes("pequeno-principe"))).toBe(
      true,
    );
  });

  it("filtra por categoria teatro (mock com label legível)", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { categoria: "teatro" });
    expect(resultados.length).toBeGreaterThan(0);
    expect(
      resultados.every((a) => normalizeCategoriaSlug(a.categoria) === "teatro"),
    ).toBe(true);
  });

  it("filtra por preço gratuito", () => {
    const resultados = filtrarAtracoes(mockAtracoes, { preco: "gratuito" });
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((a) => a.precoTipo === "gratuito")).toBe(true);
  });

  it("filtra por ambiente outdoor", () => {
    const resultados = filtrarAtracoes(mockAtracoes, {
      indoorOutdoor: "outdoor",
    });
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados.every((a) => a.indoorOutdoor === "outdoor")).toBe(true);
  });

  it("filtro por idade exclui atrações com faixa etária 'a confirmar' (US-S20)", () => {
    const atracaoSemFaixa: Atracao = {
      ...mockAtracoes[0],
      slug: "atracao-sem-faixa-teste",
      idadeMin: null,
      idadeMax: null,
    };
    const resultados = filtrarAtracoes([atracaoSemFaixa, ...mockAtracoes], {
      idade: 5,
    });
    expect(
      resultados.some((a) => a.slug === "atracao-sem-faixa-teste"),
    ).toBe(false);
  });
});

function toISODateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atLocalNoon(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function atracaoComData(slug: string, proximaData?: string): Atracao {
  const { proximaData: _omit, ...base } = mockAtracoes[0];
  return proximaData
    ? { ...base, slug, proximaData }
    : { ...base, slug };
}

describe("getProximoFimDeSemana (US-I59)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const janelaEsseFimDeSemana: Array<{
    dia: string;
    hoje: string;
    inicio: string;
    fim: string;
  }> = [
    { dia: "segunda", hoje: "2026-09-14", inicio: "2026-09-18", fim: "2026-09-20" },
    { dia: "terça", hoje: "2026-09-15", inicio: "2026-09-18", fim: "2026-09-20" },
    { dia: "quarta", hoje: "2026-09-16", inicio: "2026-09-18", fim: "2026-09-20" },
    { dia: "quinta", hoje: "2026-09-17", inicio: "2026-09-18", fim: "2026-09-20" },
    { dia: "sexta", hoje: "2026-09-18", inicio: "2026-09-18", fim: "2026-09-20" },
    { dia: "sábado", hoje: "2026-09-19", inicio: "2026-09-19", fim: "2026-09-20" },
    { dia: "domingo", hoje: "2026-09-20", inicio: "2026-09-20", fim: "2026-09-20" },
  ];

  it.each(janelaEsseFimDeSemana)(
    "no $dia ($hoje) a janela é $inicio → $fim",
    ({ hoje, inicio, fim }) => {
      vi.setSystemTime(atLocalNoon(hoje));
      const janela = getProximoFimDeSemana(0);
      expect(toISODateLocal(janela.inicio)).toBe(inicio);
      expect(toISODateLocal(janela.fim)).toBe(fim);
      expect(janela.inicio.getHours()).toBe(0);
      expect(janela.fim.getHours()).toBe(23);
      expect(janela.fim.getMinutes()).toBe(59);
    },
  );

  it.each(janelaEsseFimDeSemana)(
    "no $dia ($hoje) 'próximo fim de semana' é sexta–domingo da semana seguinte",
    ({ hoje }) => {
      vi.setSystemTime(atLocalNoon(hoje));
      const janela = getProximoFimDeSemana(1);
      expect(toISODateLocal(janela.inicio)).toBe("2026-09-25");
      expect(toISODateLocal(janela.fim)).toBe("2026-09-27");
    },
  );
});

describe("filtrarAtracoes data=fim-de-semana (US-I59)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const catalogo: Atracao[] = [
    atracaoComData("quinta", "2026-09-17"),
    atracaoComData("sexta", "2026-09-18"),
    atracaoComData("sabado", "2026-09-19"),
    atracaoComData("domingo", "2026-09-20"),
    atracaoComData("proxima-sexta", "2026-09-25"),
    atracaoComData("proximo-sabado", "2026-09-26"),
    atracaoComData("proximo-domingo", "2026-09-27"),
    atracaoComData("permanente"),
    atracaoComData("fora", "2026-10-10"),
  ];

  const esseFimDeSemana: Array<{ dia: string; hoje: string; slugs: string[] }> = [
    { dia: "segunda", hoje: "2026-09-14", slugs: ["sexta", "sabado", "domingo", "permanente"] },
    { dia: "terça", hoje: "2026-09-15", slugs: ["sexta", "sabado", "domingo", "permanente"] },
    { dia: "quarta", hoje: "2026-09-16", slugs: ["sexta", "sabado", "domingo", "permanente"] },
    { dia: "quinta", hoje: "2026-09-17", slugs: ["sexta", "sabado", "domingo", "permanente"] },
    { dia: "sexta", hoje: "2026-09-18", slugs: ["sexta", "sabado", "domingo", "permanente"] },
    { dia: "sábado", hoje: "2026-09-19", slugs: ["sabado", "domingo", "permanente"] },
    { dia: "domingo", hoje: "2026-09-20", slugs: ["domingo", "permanente"] },
  ];

  it.each(esseFimDeSemana)(
    "no $dia inclui só a janela restante do fim de semana",
    ({ hoje, slugs }) => {
      vi.setSystemTime(atLocalNoon(hoje));
      const resultados = filtrarAtracoes(catalogo, { data: "fim-de-semana" });
      expect(resultados.map((a) => a.slug).sort()).toEqual([...slugs].sort());
    },
  );

  it.each(esseFimDeSemana)(
    "no $dia o filtro 'próximo-fim-de-semana' mostra sex+sáb+dom seguintes",
    ({ hoje }) => {
      vi.setSystemTime(atLocalNoon(hoje));
      const resultados = filtrarAtracoes(catalogo, {
        data: "proximo-fim-de-semana",
      });
      expect(resultados.map((a) => a.slug).sort()).toEqual(
        ["proxima-sexta", "proximo-sabado", "proximo-domingo", "permanente"].sort(),
      );
    },
  );
});

describe("formatFaixaEtaria (US-S20)", () => {
  it("retorna 'A confirmar' quando idadeMin é null", () => {
    expect(formatFaixaEtaria(null, 12)).toBe("A confirmar");
  });

  it("retorna 'A confirmar' quando idadeMax é null", () => {
    expect(formatFaixaEtaria(4, null)).toBe("A confirmar");
  });

  it("retorna 'A confirmar' quando ambos são null", () => {
    expect(formatFaixaEtaria(null, null)).toBe("A confirmar");
  });

  it("mantém o comportamento numérico existente quando ambos preenchidos", () => {
    expect(formatFaixaEtaria(0, 18)).toBe("Até 18 anos");
    expect(formatFaixaEtaria(4, 4)).toBe("4 anos");
  });

  it("intervalo usa formato por extenso 'de X a Y anos' (US-I36)", () => {
    expect(formatFaixaEtaria(4, 10)).toBe("de 4 a 10 anos");
  });
});

describe("getAtracaoBySlug", () => {
  it("retorna atração existente usando fallback mock", async () => {
    const atracao = await getAtracaoBySlug(
      "peca-o-pequeno-principe-teatro-clara-nunes",
    );
    expect(atracao?.titulo).toContain("Pequeno Príncipe");
  });
});

describe("Atracao type", () => {
  it("preserva o shape usado pelas rotas e cards", () => {
    const atracao = mockAtracoes[0] satisfies Atracao;

    expect(atracao).toMatchObject({
      slug: expect.any(String),
      titulo: expect.any(String),
      categoria: expect.any(String),
      idadeMin: expect.any(Number),
      idadeMax: expect.any(Number),
      bairro: expect.any(String),
      precoTipo: expect.stringMatching(/gratuito|pago/),
      indoorOutdoor: expect.stringMatching(/indoor|outdoor|ambos/),
      tipoProgramacao: expect.stringMatching(
        /evento_pontual|evento_recorrente|permanente/,
      ),
      programacaoTexto: expect.any(String),
      descricaoCurta: expect.any(String),
      imagemUrl: expect.any(String),
      linkExterno: expect.any(String),
    });
  });
});

describe("mapSanityAtracao", () => {
  function baseDocument(
    overrides: Partial<SanityAtracaoDocument> = {},
  ): SanityAtracaoDocument {
    return {
      _id: "atracao-teste",
      nome: "Teste",
      slug: { current: "teste" },
      categoria: "teatro",
      idade_recomendada_min: 4,
      idade_recomendada_max: 10,
      bairro: "Tijuca",
      indoor_outdoor: "indoor",
      status: "operando",
      tipo_programacao: "evento_pontual",
      programacao_texto: "Sessões nos dias 23, 30 e 31",
      descricao: "Descrição de teste com comprimento suficiente para validação.",
      ...overrides,
    };
  }

  it("com proxima_data null → propriedade proximaData ausente", () => {
    const atracao = mapSanityAtracao(
      baseDocument({ proxima_data: null }),
    );
    expect(atracao).not.toHaveProperty("proximaData");
  });

  it("com proxima_data preenchida → mapeia proximaData", () => {
    const atracao = mapSanityAtracao(
      baseDocument({ proxima_data: "2026-05-23" }),
    );
    expect(atracao.proximaData).toBe("2026-05-23");
  });

  it("sem foto no documento Sanity → usa placeholder local", () => {
    const atracao = mapSanityAtracao(baseDocument({ foto: undefined }));
    expect(atracao.imagemUrl).toBe("/placeholder-atracao.svg");
  });

  it("idade_recomendada_min/idade_recomendada_max ausentes no documento Sanity → idadeMin/idadeMax null (US-S20, US-I36)", () => {
    const atracao = mapSanityAtracao(
      baseDocument({ idade_recomendada_min: undefined, idade_recomendada_max: undefined }),
    );
    expect(atracao.idadeMin).toBeNull();
    expect(atracao.idadeMax).toBeNull();
  });
});

describe("sanityImageUrl", () => {
  it("anexa largura e auto=format a uma URL do CDN Sanity", () => {
    const url = sanityImageUrl(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg",
      800,
    );
    expect(url).toBe(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg?w=800&auto=format",
    );
  });

  it("aplica a largura pedida (1200px no detalhe)", () => {
    const url = sanityImageUrl(
      "https://cdn.sanity.io/images/projeto/production/foto.jpg",
      1200,
    );
    expect(url).toContain("w=1200");
  });

  it("URL local (placeholder) retorna sem alteração", () => {
    expect(sanityImageUrl("/placeholder-atracao.svg", 800)).toBe(
      "/placeholder-atracao.svg",
    );
  });

  it("string vazia retorna sem alteração", () => {
    expect(sanityImageUrl("", 800)).toBe("");
  });
});
