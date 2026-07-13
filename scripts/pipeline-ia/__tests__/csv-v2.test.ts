import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readCSV } from "../csv";

describe("readCSV — compatibilidade scraper v2", () => {
  it("lê CSV de 8 colunas sem campos opcionais", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-v2-"));
    const path = join(dir, "legacy.csv");
    await writeFile(
      path,
      "nome,categoria_origem,venue,bairro,dias_apresentacao,desconto_percentual,preco_bruto,url_origem\nA,Destaques,Venue,Gávea,Dias 23,10%,R$10,https://example.com\n",
      "utf8",
    );
    const rows = await readCSV(path);
    expect(rows).toHaveLength(1);
    expect(rows[0].nome).toBe("A");
    expect(rows[0].sinopse_oficial).toBeUndefined();
  });

  it("lê CSV de 15 colunas com campos opcionais", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-v2-"));
    const path = join(dir, "v2.csv");
    await writeFile(
      path,
      `nome,categoria_origem,venue,bairro,dias_apresentacao,desconto_percentual,preco_bruto,url_origem,sinopse_oficial,horarios_sessao,duracao_minutos,idade_minima,idade_maxima,preco_inteira_centavos,url_ingresso
Peça,Teatro,Venue,Gávea,Dias 24,30%,de R$80,https://clubinho/oferta,Sinopse longa,Sáb 16h,60,4,12,8000,https://clubinho/ingresso
`,
      "utf8",
    );
    const rows = await readCSV(path);
    expect(rows[0].horarios_sessao).toBe("Sáb 16h");
    expect(rows[0].preco_inteira_centavos).toBe("8000");
    expect(rows[0].idade_maxima).toBe("12");
  });

  it("lê CSV com coluna endereco preenchida e preserva o valor (US-S41)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-v2-"));
    const path = join(dir, "com-endereco.csv");
    await writeFile(
      path,
      `nome,categoria_origem,venue,bairro,dias_apresentacao,desconto_percentual,preco_bruto,url_origem,sinopse_oficial,horarios_sessao,duracao_minutos,idade_minima,idade_maxima,preco_inteira_centavos,url_ingresso,preco_a_partir,endereco
Fantasy,Teatro Infantil,Teatro Clara Nunes,Gávea,Dias 18,50%,R$60,https://clubinho/oferta,Sinopse,Sáb 16h,60,0,,6000,https://clubinho/ingresso,true,"Rua Marquês de São Vicente, 52 — Gávea"
`,
      "utf8",
    );
    const rows = await readCSV(path);
    expect(rows[0].endereco).toBe("Rua Marquês de São Vicente, 52 — Gávea");
  });

  it("endereco fica undefined quando a coluna está ausente do CSV (compat retroativa)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "csv-v2-"));
    const path = join(dir, "sem-endereco.csv");
    await writeFile(
      path,
      "nome,categoria_origem,venue,bairro,dias_apresentacao,desconto_percentual,preco_bruto,url_origem\nA,Destaques,Venue,Gávea,Dias 23,10%,R$10,https://example.com\n",
      "utf8",
    );
    const rows = await readCSV(path);
    expect(rows[0].endereco).toBeUndefined();
  });
});
