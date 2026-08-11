import { describe, expect, it } from "vitest";
import { getFimDeSemanaReferencia, mesclarRecomendacoes, montarCandidatosComFallback } from "./recomendacoes";
import {
  recomendacoesPermanentesPorBairro,
  recomendacoesPermanentesPorTema,
  recomendacoesPorBairro,
  recomendacoesPorTema,
} from "./sanity/queries";

describe("US-I33 — queries de recomendação — allowlist de status", () => {
  it("recomendacoesPorTema filtra por status == operando (allowlist)", () => {
    expect(recomendacoesPorTema).toContain('status == "operando"');
  });

  it("recomendacoesPorBairro filtra por status == operando (allowlist)", () => {
    expect(recomendacoesPorBairro).toContain('status == "operando"');
  });
});

describe("US-I35 — queries de fallback permanente", () => {
  it("recomendacoesPermanentesPorBairro filtra permanente sem data e allowlist de status", () => {
    expect(recomendacoesPermanentesPorBairro).toContain('status == "operando"');
    expect(recomendacoesPermanentesPorBairro).toContain('tipo_programacao == "permanente"');
    expect(recomendacoesPermanentesPorBairro).toContain("!defined(proxima_data)");
  });

  it("recomendacoesPermanentesPorTema filtra permanente sem data e allowlist de status", () => {
    expect(recomendacoesPermanentesPorTema).toContain('status == "operando"');
    expect(recomendacoesPermanentesPorTema).toContain('tipo_programacao == "permanente"');
    expect(recomendacoesPermanentesPorTema).toContain("!defined(proxima_data)");
  });
});

describe("getFimDeSemanaReferencia", () => {
  it("retorna sáb/dom da mesma semana quando a data é uma quarta-feira", () => {
    // 2026-08-05 é uma quarta-feira
    expect(getFimDeSemanaReferencia("2026-08-05")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("mantém o próprio dia quando a data já é sábado", () => {
    // 2026-08-08 é sábado
    expect(getFimDeSemanaReferencia("2026-08-08")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("usa o sábado anterior quando a data é domingo", () => {
    // 2026-08-09 é domingo
    expect(getFimDeSemanaReferencia("2026-08-09")).toEqual({
      inicio: "2026-08-08",
      fim: "2026-08-09",
    });
  });

  it("sem proximaData (atração permanente), usa o próximo fim de semana a partir de hoje", () => {
    const semData = getFimDeSemanaReferencia(undefined);
    const dataInicio = new Date(`${semData.inicio}T12:00:00`);
    const dataFim = new Date(`${semData.fim}T12:00:00`);
    expect(dataInicio.getDay()).toBe(6); // sábado
    expect(dataFim.getDay()).toBe(0); // domingo
  });
});

describe("mesclarRecomendacoes", () => {
  const candidata = (slug: string) => ({
    slug,
    titulo: `Atração ${slug}`,
    categoria: "teatro",
    bairro: "Tijuca",
    proximaData: "2026-08-08",
    imagemUrl: "/foto.jpg",
  });

  it("intercala tema e bairro, marcando o eixo de cada card", () => {
    const resultado = mesclarRecomendacoes(
      [candidata("tema-1"), candidata("tema-2")],
      [candidata("bairro-1"), candidata("bairro-2")],
    );

    expect(resultado.map((r) => r.slug)).toEqual([
      "tema-1",
      "bairro-1",
      "tema-2",
      "bairro-2",
    ]);
    expect(resultado.map((r) => r.eixo)).toEqual(["tema", "bairro", "tema", "bairro"]);
  });

  it("remove duplicatas por slug, mantendo o primeiro eixo encontrado", () => {
    const resultado = mesclarRecomendacoes(
      [candidata("compartilhada"), candidata("tema-2")],
      [candidata("compartilhada"), candidata("bairro-2")],
    );

    const slugs = resultado.map((r) => r.slug);
    expect(slugs.filter((s) => s === "compartilhada")).toHaveLength(1);
    expect(resultado.find((r) => r.slug === "compartilhada")?.eixo).toBe("tema");
  });

  it("respeita o máximo de cards (padrão 4)", () => {
    const porTema = ["a", "b", "c", "d"].map(candidata);
    const porBairro = ["e", "f", "g", "h"].map(candidata);
    const resultado = mesclarRecomendacoes(porTema, porBairro);
    expect(resultado).toHaveLength(4);
  });

  it("retorna array vazio quando não há candidatos em nenhum eixo", () => {
    expect(mesclarRecomendacoes([], [])).toEqual([]);
  });

  it("usa só o eixo disponível quando o outro está vazio", () => {
    const resultado = mesclarRecomendacoes([candidata("tema-1")], []);
    expect(resultado).toEqual([{ ...candidata("tema-1"), eixo: "tema" }]);
  });
});

describe("US-I35 — montarCandidatosComFallback (recomendação de permanentes)", () => {
  const candidataPermanente = (slug: string, titulo: string, categoria = "Parque", bairro = "Tijuca") => ({
    slug,
    titulo,
    categoria,
    bairro,
    proximaData: undefined,
    imagemUrl: "/foto.jpg",
  });

  const candidataDatada = (slug: string, titulo: string, categoria = "Teatro infantil", bairro = "Tijuca") => ({
    slug,
    titulo,
    categoria,
    bairro,
    proximaData: "2026-08-15",
    imagemUrl: "/foto.jpg",
  });

  // AC1 — Parquinho da Lauro Müller: permanente com outro permanente no mesmo bairro.
  it("AC1: permanente com vizinho de bairro permanente (sem match com data) → eixo bairro recomenda o vizinho", () => {
    const vizinho = candidataPermanente("parquinho-lauro-muller", "Parquinho da Lauro Müller");
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [],
      porTemaPermanenteSemData: [],
      porBairroPermanenteSemData: [vizinho],
    });

    expect(resultado.porBairro).toEqual([vizinho]);
    expect(resultado.porTema).toEqual([]); // bairro já achou algo, tema não precisa de fallback
  });

  // AC2 — sem vizinho de bairro, mas com par na mesma categoria → fallback no eixo tema.
  it("AC2: sem vizinho de bairro (nem datado nem permanente) mas com par de categoria → eixo tema recomenda via fallback", () => {
    const parDeCategoria = candidataPermanente("outro-parque-permanente", "Outro Parque", "Parque", "Copacabana");
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [],
      porTemaPermanenteSemData: [parDeCategoria],
      porBairroPermanenteSemData: [],
    });

    expect(resultado.porBairro).toEqual([]);
    expect(resultado.porTema).toEqual([parDeCategoria]);
  });

  // AC3 — Praça dos Cavalinhos: já tem match com data, fallback só completa slots vagos.
  it("AC3: permanente com matches de data no bairro mantém prioridade — fallback é só anexado depois", () => {
    const eventoTeatro1 = candidataDatada("evento-teatro-1", "Peça A");
    const eventoTeatro2 = candidataDatada("evento-teatro-2", "Peça B");
    const eventoTeatro3 = candidataDatada("evento-teatro-3", "Peça C");
    const vizinhoPermanente = candidataPermanente("pracinha-vizinha", "Pracinha Vizinha");

    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [eventoTeatro1, eventoTeatro2, eventoTeatro3],
      porTemaPermanenteSemData: [],
      porBairroPermanenteSemData: [vizinhoPermanente],
    });

    // os 3 eventos com data continuam, na mesma ordem, na frente — fallback vem depois
    expect(resultado.porBairro).toEqual([eventoTeatro1, eventoTeatro2, eventoTeatro3, vizinhoPermanente]);
    // eixo bairro não ficou vazio, então tema não ganha fallback
    expect(resultado.porTema).toEqual([]);
  });

  // AC4 — restaurante de Del Castilho: genuinamente isolado, sem par de bairro nem categoria.
  it("AC4: permanente isolado (sem par de bairro nem categoria) continua sem recomendação", () => {
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [],
      porTemaPermanenteSemData: [],
      porBairroPermanenteSemData: [],
    });

    expect(resultado.porBairro).toEqual([]);
    expect(resultado.porTema).toEqual([]);
  });

  // AC5 — não-permanentes seguem exatamente o comportamento anterior (US-I33), zero regressão.
  it("AC5: origem evento_pontual ignora fallback mesmo se listas de permanente vierem preenchidas", () => {
    const datadoTema = [candidataDatada("tema-datado", "Tema Datado")];
    const datadoBairro = [candidataDatada("bairro-datado", "Bairro Datado")];
    const fallbackQueNuncaDeveriaEntrar = [candidataPermanente("nao-deveria-entrar", "Não Deveria Entrar")];

    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "evento_pontual",
      porTemaDatado: datadoTema,
      porBairroDatado: datadoBairro,
      porTemaPermanenteSemData: fallbackQueNuncaDeveriaEntrar,
      porBairroPermanenteSemData: fallbackQueNuncaDeveriaEntrar,
    });

    expect(resultado.porTema).toEqual(datadoTema);
    expect(resultado.porBairro).toEqual(datadoBairro);
  });

  it("AC5: origem evento_recorrente também ignora fallback (regra vale só pra 'permanente')", () => {
    const datadoBairro = [candidataDatada("bairro-datado", "Bairro Datado")];
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "evento_recorrente",
      porTemaDatado: [],
      porBairroDatado: datadoBairro,
      porTemaPermanenteSemData: [candidataPermanente("x", "X")],
      porBairroPermanenteSemData: [candidataPermanente("y", "Y")],
    });

    expect(resultado.porBairro).toEqual(datadoBairro);
    expect(resultado.porTema).toEqual([]);
  });

  it("ordena o fallback alfabeticamente por título, sem afetar a ordem dos datados", () => {
    const zebra = candidataPermanente("zebra", "Zebrinha Parque");
    const alfa = candidataPermanente("alfa", "Alfabeto Parque");
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [],
      porTemaPermanenteSemData: [],
      porBairroPermanenteSemData: [zebra, alfa],
    });

    expect(resultado.porBairro.map((c) => c.slug)).toEqual(["alfa", "zebra"]);
  });

  it("não duplica um candidato que já apareceu nos datados (mesmo slug no fallback)", () => {
    const jaDatado = candidataDatada("mesmo-slug", "Já Datado");
    const duplicataNoFallback = candidataPermanente("mesmo-slug", "Já Datado");
    const resultado = montarCandidatosComFallback({
      tipoProgramacaoOrigem: "permanente",
      porTemaDatado: [],
      porBairroDatado: [jaDatado],
      porTemaPermanenteSemData: [],
      porBairroPermanenteSemData: [duplicataNoFallback],
    });

    expect(resultado.porBairro).toEqual([jaDatado]);
  });
});
