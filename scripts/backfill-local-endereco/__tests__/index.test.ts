import { describe, expect, it } from "vitest";
import {
  composeEnderecoClubinho,
  decidirBackfill,
  parseArgs,
  type ExtracaoLive,
  type FichaAtual,
} from "../index";
import type { LocalEnderecoPair } from "@/scripts/scraper/local-endereco-map";

const semFalha = (nome: string | null, endereco: string | null): ExtracaoLive => ({
  nome,
  endereco,
  falhou: false,
});

describe("decidirBackfill", () => {
  it("preserva a ficha e marca falhou quando a extração ao vivo não conseguiu nem abrir a fonte", () => {
    const atual: FichaAtual = { local: "Teatro X", endereco: null };
    const resultado = decidirBackfill(atual, { nome: null, endereco: null, falhou: true }, []);

    expect(resultado.categoria).toBe("falhou");
    expect(resultado.local).toBe("Teatro X");
    expect(resultado.endereco).toBeNull();
    expect(resultado.contaminado).toBe(false);
  });

  it("detecta contaminação da janela US-S59→US-S76 (endereco salvo == nome extraído ao vivo, normalizado)", () => {
    const atual: FichaAtual = { local: null, endereco: "Teatro Vannucci" };
    const extracao = semFalha("TEATRO VANNUCCI", "R. Marquês de São Vicente, 52 — Gávea");

    const resultado = decidirBackfill(atual, extracao, []);

    expect(resultado.contaminado).toBe(true);
    expect(resultado.categoria).toBe("endereco_corrigido");
    expect(resultado.local).toBe("TEATRO VANNUCCI");
    expect(resultado.endereco).toBe("R. Marquês de São Vicente, 52 — Gávea");
  });

  it("não marca contaminação quando o endereço salvo é um endereço real, diferente do nome extraído", () => {
    const atual: FichaAtual = { local: null, endereco: "R. Marquês de São Vicente, 52 — Gávea" };
    const extracao = semFalha("Teatro Vannucci", "R. Marquês de São Vicente, 52 — Gávea");

    const resultado = decidirBackfill(atual, extracao, []);

    expect(resultado.contaminado).toBe(false);
  });

  it("preenche local pela primeira vez (ficha pré-US-S76) via nome extraído + tabela para o endereço", () => {
    const atual: FichaAtual = { local: null, endereco: null };
    const extracao = semFalha("Norte Shopping", null);
    const tabela: LocalEnderecoPair[] = [
      { local: "Norte Shopping", endereco: "Av. Dom Hélder Câmara, 5474 — Cachambi" },
    ];

    const resultado = decidirBackfill(atual, extracao, tabela);

    expect(resultado.categoria).toBe("local_novo");
    expect(resultado.local).toBe("Norte Shopping");
    expect(resultado.endereco).toBe("Av. Dom Hélder Câmara, 5474 — Cachambi");
    expect(resultado.novoPar).toBe(false);
  });

  it("preenche endereco pela primeira vez (ficha já tinha local, faltava endereço) e grava o par novo na tabela", () => {
    const atual: FichaAtual = { local: "Teatro Riachuelo", endereco: null };
    const extracao = semFalha(null, "Rua do Passeio, 38 — Centro");

    const resultado = decidirBackfill(atual, extracao, []);

    expect(resultado.categoria).toBe("endereco_corrigido");
    expect(resultado.novoPar).toBe(true);
    expect(resultado.local).toBe("Teatro Riachuelo");
    expect(resultado.endereco).toBe("Rua do Passeio, 38 — Centro");
  });

  it("não repete par_gravado quando a ficha já está correta e o par já consta na tabela (idempotente)", () => {
    const atual: FichaAtual = { local: "Teatro Riachuelo", endereco: "Rua do Passeio, 38 — Centro" };
    const extracao = semFalha("Teatro Riachuelo", "Rua do Passeio, 38 — Centro");
    const tabela: LocalEnderecoPair[] = [
      { local: "Teatro Riachuelo", endereco: "Rua do Passeio, 38 — Centro" },
    ];

    const resultado = decidirBackfill(atual, extracao, tabela);

    expect(resultado.categoria).toBe("sem_mudanca");
  });

  it("grava par_gravado quando a ficha já está correta mas a tabela ainda não conhece o par (caso comum: tabela nasceu vazia)", () => {
    const atual: FichaAtual = { local: "Teatro Riachuelo", endereco: "Rua do Passeio, 38 — Centro" };
    const extracao = semFalha("Teatro Riachuelo", "Rua do Passeio, 38 — Centro");

    const resultado = decidirBackfill(atual, extracao, []);

    expect(resultado.categoria).toBe("par_gravado");
    expect(resultado.local).toBe("Teatro Riachuelo");
    expect(resultado.endereco).toBe("Rua do Passeio, 38 — Centro");
  });

  it("mantém sem_mudanca quando não há dado novo nem na extração nem na tabela", () => {
    const atual: FichaAtual = { local: null, endereco: null };
    const resultado = decidirBackfill(atual, semFalha(null, null), []);

    expect(resultado.categoria).toBe("sem_mudanca");
    expect(resultado.local).toBeNull();
    expect(resultado.endereco).toBeNull();
  });
});

describe("composeEnderecoClubinho", () => {
  it("compõe rua + número — complemento — bairro, igual a scrape-atracao.ts", () => {
    const endereco = composeEnderecoClubinho({
      street: "Rua Fonseca",
      number: "240",
      complement: "Shopping Bangu",
      neighborhood: "Bangu",
    });

    expect(endereco).toBe("Rua Fonseca, 240 — Shopping Bangu — Bangu");
  });

  it("retorna null quando não há street nem number", () => {
    expect(composeEnderecoClubinho({ neighborhood: "Centro" })).toBeNull();
    expect(composeEnderecoClubinho(undefined)).toBeNull();
  });

  it("omite complemento ausente sem deixar separador sobrando", () => {
    const endereco = composeEnderecoClubinho({
      street: "Praça Mauá",
      number: "1",
      neighborhood: "Centro",
    });

    expect(endereco).toBe("Praça Mauá, 1 — Centro");
  });
});

describe("parseArgs", () => {
  it("padrão é dry-run (execute=false), delay=2", () => {
    const opts = parseArgs(["node", "index.ts"]);
    expect(opts.execute).toBe(false);
    expect(opts.delay).toBe(2);
    expect(opts.limit).toBeUndefined();
  });

  it("--execute liga o modo de escrita", () => {
    expect(parseArgs(["node", "index.ts", "--execute"]).execute).toBe(true);
  });

  it("--delay e --limit aceitam valores customizados", () => {
    const opts = parseArgs(["node", "index.ts", "--delay", "3.5", "--limit", "10"]);
    expect(opts.delay).toBe(3.5);
    expect(opts.limit).toBe(10);
  });

  it("rejeita --delay negativo e --limit não positivo", () => {
    expect(() => parseArgs(["node", "index.ts", "--delay", "-1"])).toThrow();
    expect(() => parseArgs(["node", "index.ts", "--limit", "0"])).toThrow();
  });

  it("rejeita argumento desconhecido", () => {
    expect(() => parseArgs(["node", "index.ts", "--foo"])).toThrow();
  });
});
