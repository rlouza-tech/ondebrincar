import { describe, expect, it, vi } from "vitest";
import {
  ALVOS_US_S82,
  decidirPatchLocal,
  fichaSemLocal,
  isUhuuEventUrl,
  parseArgs,
  reprocessarFichas,
  type FichaUhuuSemLocal,
} from "../reprocess-uhuu-local";

describe("isUhuuEventUrl", () => {
  it("aceita uhuu.com com ou sem www", () => {
    expect(isUhuuEventUrl("https://uhuu.com/evento/rj/x")).toBe(true);
    expect(isUhuuEventUrl("https://www.uhuu.com/evento/rj/x")).toBe(true);
  });

  it("rejeita vazio, inválido ou outro domínio", () => {
    expect(isUhuuEventUrl(null)).toBe(false);
    expect(isUhuuEventUrl("")).toBe(false);
    expect(isUhuuEventUrl("não é url")).toBe(false);
    expect(isUhuuEventUrl("https://clubinhodeofertas.com.br/x")).toBe(false);
  });
});

describe("fichaSemLocal", () => {
  it("trata null, vazio e só espaços como ausente", () => {
    expect(fichaSemLocal(null)).toBe(true);
    expect(fichaSemLocal("")).toBe(true);
    expect(fichaSemLocal("   ")).toBe(true);
    expect(fichaSemLocal("Teatro Bangu Shopping")).toBe(false);
  });
});

describe("decidirPatchLocal", () => {
  const base = {
    localAtual: null as string | null,
    linkCompra: "https://uhuu.com/evento/rj/rio-de-janeiro/gatinhos-1",
    venueCapturado: "Teatro Bangu Shopping",
    fetchOk: true,
  };

  it("preenche local com o venue capturado pelo adapter (AC2)", () => {
    expect(decidirPatchLocal(base)).toEqual({
      local: "Teatro Bangu Shopping",
      motivo: "patch_local",
    });
  });

  it("não sobrescreve ficha que já tem local", () => {
    expect(decidirPatchLocal({ ...base, localAtual: "Teatro Claro MAIS RJ" })).toEqual({
      local: "Teatro Claro MAIS RJ",
      motivo: "ja_tem_local",
    });
  });

  it("com forceRefresh, substitui o local manual pelo nome canônico da fonte (AC2)", () => {
    expect(
      decidirPatchLocal({
        ...base,
        localAtual: "Bangu Shopping",
        venueCapturado: "Teatro Bangu Shopping",
        forceRefresh: true,
      }),
    ).toEqual({
      local: "Teatro Bangu Shopping",
      motivo: "patch_local",
    });
  });

  it("com forceRefresh, preserva o local atual se a fonte falhar", () => {
    expect(
      decidirPatchLocal({
        ...base,
        localAtual: "Bangu Shopping",
        fetchOk: false,
        venueCapturado: null,
        forceRefresh: true,
      }),
    ).toEqual({
      local: "Bangu Shopping",
      motivo: "ja_tem_local",
    });
  });

  it("com forceRefresh, não patcha quando o adapter devolve o mesmo nome", () => {
    expect(
      decidirPatchLocal({
        ...base,
        localAtual: "Teatro Bangu Shopping",
        venueCapturado: "Teatro Bangu Shopping",
        forceRefresh: true,
      }),
    ).toEqual({
      local: "Teatro Bangu Shopping",
      motivo: "ja_tem_local",
    });
  });

  it("pula quando não há URL de origem", () => {
    expect(decidirPatchLocal({ ...base, linkCompra: null }).motivo).toBe("sem_url");
  });

  it("pula quando a URL não é da Uhuu", () => {
    expect(
      decidirPatchLocal({ ...base, linkCompra: "https://www.sympla.com.br/evento" }).motivo,
    ).toBe("url_nao_uhuu");
  });

  it("pula quando o fetch da página falha", () => {
    expect(decidirPatchLocal({ ...base, fetchOk: false, venueCapturado: null }).motivo).toBe(
      "fetch_falhou",
    );
  });

  it("pula quando a página não traz o nome do espaço", () => {
    expect(decidirPatchLocal({ ...base, venueCapturado: "" }).motivo).toBe("venue_ausente");
  });
});

describe("parseArgs", () => {
  it("dry-run é o padrão", () => {
    expect(parseArgs(["node", "reprocess-uhuu-local.ts"])).toEqual({
      execute: false,
      delayMs: 400,
    });
  });

  it("aceita --execute e --delay", () => {
    expect(
      parseArgs(["node", "reprocess-uhuu-local.ts", "--execute", "--delay", "0"]),
    ).toEqual({ execute: true, delayMs: 0 });
  });
});

describe("reprocessarFichas", () => {
  const gatinhos: FichaUhuuSemLocal = {
    _id: "atracao-casa-encantada-dos-gatinhos",
    nome: "A Casa Encantada dos Gatinhos",
    slug: "casa-encantada-dos-gatinhos",
    link_compra: "https://uhuu.com/evento/rj/rio-de-janeiro/gatinhos-1",
    local: null,
  };

  it("roda o adapter contra a página e agenda o patch do local (AC2)", async () => {
    const html = `
      <html><body>
        <strong id="pageEventLocal">Teatro Bangu Shopping</strong>
        <span class="event-category">Família / Infantil</span>
        <div class="tabs-content-item sobre">Peça infantil.</div>
      </body></html>
    `;
    const fetchImpl = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
    const patch = vi.fn(async () => 1);

    const result = await reprocessarFichas([gatinhos], {
      execute: false,
      delayMs: 0,
      fetchImpl,
      patch,
    });

    expect(result.patch_local).toBe(1);
    expect(result.itens[0].local).toBe("Teatro Bangu Shopping");
    expect(result.itens[0].motivo).toBe("patch_local");
    expect(patch).toHaveBeenCalledWith(
      "atracao-casa-encantada-dos-gatinhos",
      "Teatro Bangu Shopping",
      false,
    );
  });

  it("não chama patch quando o fetch falha", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const patch = vi.fn(async () => 0);

    const result = await reprocessarFichas([gatinhos], {
      execute: false,
      delayMs: 0,
      fetchImpl,
      patch,
    });

    expect(result.patch_local).toBe(0);
    expect(result.itens[0].motivo).toBe("fetch_falhou");
    expect(patch).not.toHaveBeenCalled();
  });

  it("atualiza as 3 fichas da US-S82 mesmo quando já têm local manual incompleto", async () => {
    const html = `
      <html><body>
        <strong id="pageEventLocal">Teatro Bangu Shopping</strong>
        <span class="event-category">Família / Infantil</span>
        <div class="tabs-content-item sobre">Peça infantil.</div>
      </body></html>
    `;
    const fetchImpl = vi.fn(async () => new Response(html, { status: 200 })) as unknown as typeof fetch;
    const patch = vi.fn(async () => 1);
    const alvo: FichaUhuuSemLocal = {
      _id: "atracao-a-casa-encantada-dos-gatinhos-teatro-bangu-shopping",
      nome: "A Casa Encantada dos Gatinhos",
      slug: ALVOS_US_S82[0],
      link_compra: "https://uhuu.com/evento/rj/rio-de-janeiro/gatinhos-1",
      local: "Bangu Shopping",
    };

    const result = await reprocessarFichas([alvo], {
      execute: false,
      delayMs: 0,
      fetchImpl,
      patch,
    });

    expect(result.patch_local).toBe(1);
    expect(result.itens[0].local).toBe("Teatro Bangu Shopping");
    expect(patch).toHaveBeenCalledWith(alvo._id, "Teatro Bangu Shopping", false);
  });
});
