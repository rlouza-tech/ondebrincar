/**
 * Testes para generateAndAttachImage — lógica de fallback de imagem anônima.
 *
 * Cobre os 2 casos obrigatórios do AC6 de US-S21:
 *   1. Ficha com nome de IP protegido: primary falha, fallback anônimo tem sucesso.
 *   2. Erro genérico de API: primary falha, fallback também falha — retorna failed: true.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import type { LinhaEnriquecida } from "../types";

// --- Mocks ---

const mockGetDocument = vi.fn();
const mockUpload = vi.fn();
const mockSet = vi.fn();
const mockCommit = vi.fn();
const mockPatch = vi.fn(() => ({ set: mockSet }));

vi.mock("@/lib/sanity/client", () => ({
  hasSanityConfig: () => true,
  sanityClient: {},
  sanityWriteClient: {
    getDocument: mockGetDocument,
    assets: { upload: mockUpload },
    patch: mockPatch,
  },
}));

mockSet.mockReturnValue({ commit: mockCommit });

const mockGenerateImage = vi.fn();

vi.mock("@/scripts/pipeline-ia/imagen", () => ({
  generateImage: (...args: unknown[]) => mockGenerateImage(...args),
}));

// Importação após os mocks (vitest hoist automático com vi.mock)
const { generateAndAttachImage } = await import("../index");

// --- Fixtures ---

function baseLinha(overrides: Partial<LinhaEnriquecida> = {}): LinhaEnriquecida {
  return {
    nome: "A Bela e a Fera",
    slug: "a-bela-e-a-fera-teatro-municipal",
    categoria: "teatro",
    idade_min: 4,
    idade_max: 12,
    idade_recomendada_min: 4,
    idade_recomendada_max: 12,
    duracao_min: 60,
    preco_centavos: 5000,
    link_compra: "https://www.sympla.com.br/exemplo",
    origem: "sympla",
    bairro: "Centro",
    indoor_outdoor: "indoor",
    status: "operando",
    descricao: "Musical infantil baseado no conto clássico.",
    mini_review: "Ótimo espetáculo.",
    tipo_programacao: "evento_recorrente",
    programacao_texto: "Sábados 16h",
    proxima_data: null,
    data_fim: null,
    foto_url: "",
    aviso_operacional: null,
    review_status: "auto_ok",
    abstain_reasons: [],
    confidence: 5,
    processed_at: "2026-06-24T12:00:00.000Z",
    source_url: "https://www.sympla.com.br/evento/exemplo",
    ai_generated: true,
    ai_model: "gemini-flash-2.5",
    pipeline_failed: false,
    preco_a_partir: false,
    idade_inferida_por_contexto: false,
    ...overrides,
  };
}

const FAKE_BUFFER = Buffer.from("fake-image-data");
const FAKE_ASSET_ID = "image-abc123";

// --- Testes ---

describe("generateAndAttachImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Por padrão: draft sem foto existente
    mockGetDocument.mockResolvedValue({ _id: "drafts.atracao-a-bela-e-a-fera-teatro-municipal" });
    // Upload de asset bem-sucedido
    mockUpload.mockResolvedValue({ _id: FAKE_ASSET_ID });
    // patch().set().commit() bem-sucedido
    mockSet.mockReturnValue({ commit: mockCommit });
    mockCommit.mockResolvedValue({});
  });

  it("caso 1 (IP protegido): primary falha, fallback anônimo tem sucesso — retorna failed:false, fallback:true", async () => {
    // Primary: recusa por política de conteúdo (nome da atração com IP)
    mockGenerateImage
      .mockResolvedValueOnce({
        imageBuffer: null,
        mimeType: "image/png",
        failed: true,
        error: "SAFETY: conteúdo com IP protegido recusado pela política",
      })
      // Fallback anônimo: sucesso
      .mockResolvedValueOnce({
        imageBuffer: FAKE_BUFFER,
        mimeType: "image/png",
        failed: false,
      });

    const result = await generateAndAttachImage(baseLinha(), "drafts.atracao-a-bela-e-a-fera-teatro-municipal");

    expect(result.failed).toBe(false);
    expect(result.fallback).toBe(true);
    expect(result.error).toBeUndefined();

    // Deve ter chamado generateImage duas vezes: primary + fallback
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);

    // Nome da atração nunca é renderizado como texto na imagem (US-E22) — nem no
    // prompt primário nem no fallback anônimo.
    const primaryPrompt = mockGenerateImage.mock.calls[0][0] as string;
    expect(primaryPrompt).not.toContain("A Bela e a Fera");

    const fallbackPrompt = mockGenerateImage.mock.calls[1][0] as string;
    expect(fallbackPrompt).not.toContain("A Bela e a Fera");

    // Imagem deve ter sido upada e patchada no draft
    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockPatch).toHaveBeenCalledWith("drafts.atracao-a-bela-e-a-fera-teatro-municipal");
  });

  it("caso 2 (erro genérico de API): primary falha, fallback também falha — retorna failed:true", async () => {
    const apiError = "503 Service Unavailable";
    mockGenerateImage.mockResolvedValue({
      imageBuffer: null,
      mimeType: "image/png",
      failed: true,
      error: apiError,
    });

    const result = await generateAndAttachImage(baseLinha(), "drafts.atracao-a-bela-e-a-fera-teatro-municipal");

    expect(result.failed).toBe(true);
    expect(result.fallback).toBe(true); // fallback foi tentado
    expect(result.error).toBe(apiError);

    // Chamou primary + fallback — desistiu após as duas falhas
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);

    // Nenhum upload ou patch deve ter ocorrido
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("caminho feliz: primary tem sucesso — sem fallback", async () => {
    mockGenerateImage.mockResolvedValueOnce({
      imageBuffer: FAKE_BUFFER,
      mimeType: "image/png",
      failed: false,
    });

    const result = await generateAndAttachImage(baseLinha(), "drafts.atracao-a-bela-e-a-fera-teatro-municipal");

    expect(result.failed).toBe(false);
    expect(result.fallback).toBe(false);
    // Apenas uma chamada a generateImage
    expect(mockGenerateImage).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("idempotência: pula geração se foto já existe no draft", async () => {
    mockGetDocument.mockResolvedValue({
      _id: "drafts.atracao-a-bela-e-a-fera-teatro-municipal",
      foto: { _type: "image", asset: { _ref: "image-existing" } },
    });

    const result = await generateAndAttachImage(baseLinha(), "drafts.atracao-a-bela-e-a-fera-teatro-municipal");

    expect(result.failed).toBe(false);
    expect(result.fallback).toBe(false);
    expect(mockGenerateImage).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
