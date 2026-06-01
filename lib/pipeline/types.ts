/**
 * Tipo canônico de entrada do pipeline IA.
 *
 * Toda fonte de dados (Clubinho, Sympla, etc.) deve ser normalizada para
 * este formato antes de ser processada pelo Gemini. Cada fonte tem seu
 * próprio normalizer em scripts/normalizer/.
 *
 * É um re-export de LinhaInput para manter retrocompatibilidade com o código
 * existente do pipeline enquanto a migração acontece.
 */
export type { LinhaInput as PipelineInput } from "@/scripts/pipeline-ia/types";
