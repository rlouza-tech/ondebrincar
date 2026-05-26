/**
 * image-adapter.ts
 * Gera prompts visuais para o Gemini 2.5 Flash Image por categoria de atração.
 * Estilo: ilustração colorida livro infantil brasileiro, sem rostos realistas, 4:3.
 * ADR: docs/decisions/2026-05-26-s4-8a-image-gen.md
 */

import type { Categoria } from "@/scripts/pipeline-ia/types";

export const IMAGE_MODEL = "gemini-2.5-flash-image";

const STYLE_SUFFIX =
  "Estilo: ilustração colorida no estilo livro infantil brasileiro, sem rostos realistas, traços arredondados e alegres, proporção 4:3.";

/**
 * Templates de cena base por categoria.
 * A cena descreve o ambiente/composição — o nome da atração vai numa placa/letreiro dentro da cena.
 */
const CENA_BASE: Record<Categoria, string> = {
  teatro:
    "palco de teatro com cortinas de veludo vermelho abertas, luzes de ribalta amarelas na beira do palco, cenário pintado ao fundo, atores fantasiados ao centro, plateia de crianças aplaudindo nas primeiras fileiras",
  parque:
    "parque ao ar livre em dia ensolarado, escorregador colorido e trepa-trepa à esquerda, gramado verde com flores, céu azul com nuvens fofas, balanços ao fundo, borboletas voando, palmeiras e árvores frondosas, silhueta de prédios do Rio ao horizonte",
  museu:
    "salão amplo de museu com pé-direito alto, painéis coloridos nas paredes, vitrine iluminada com objetos curiosos ao centro, crianças observando com expressão de espanto e maravilha, luz natural entrando por janelas altas",
  "atividade-extra":
    "espaço alegre e colorido com mesa grande coberta de materiais criativos, pincéis, tintas e papel espalhados, desenhos infantis pendurados em varal ao fundo, ambiente iluminado e acolhedor",
  evento:
    "palco festivo coberto de balões coloridos flutuando, confetes caindo do teto, bandeirolas e faixas de festa espalhadas, luzes cintilantes, clima de celebração e alegria, plateia animada ao fundo",
};

/**
 * Constrói a descrição da placa/letreiro com o nome da atração.
 * Varia o tipo de suporte conforme a categoria.
 */
function buildPlaca(nome: string, categoria: Categoria): string {
  const placas: Record<Categoria, string> = {
    teatro: `letreiro luminoso no canto superior direito com o texto "${nome}"`,
    parque: `placa de madeira fincada no gramado com o texto "${nome}"`,
    museu: `placa institucional elegante na parede com o texto "${nome}"`,
    "atividade-extra": `lousa verde ao fundo com o texto "${nome}" escrito em letras coloridas`,
    evento: `faixa festiva no topo com o texto "${nome}"`,
  };
  return placas[categoria];
}

/**
 * Extrai palavras-chave da descrição para enriquecer o prompt.
 * Limita a 120 caracteres para não sobrecarregar o prompt visual.
 */
function extrairContexto(descricao?: string): string {
  if (!descricao || descricao.trim().length < 10) return "";
  const truncado = descricao.trim().slice(0, 120);
  return ` Contexto adicional: ${truncado}.`;
}

/**
 * Constrói o prompt visual completo para o Gemini.
 *
 * @param nome - Nome da atração (vai na placa/letreiro)
 * @param categoria - Categoria editorial (define a cena base)
 * @param descricao - Descrição da atração (opcional, enriquece o contexto)
 */
export function buildImagePrompt(
  nome: string,
  categoria: Categoria,
  descricao?: string,
): string {
  const cena = CENA_BASE[categoria] ?? CENA_BASE["evento"];
  const placa = buildPlaca(nome, categoria);
  const contexto = extrairContexto(descricao);

  return `Crie uma ilustração com a seguinte cena: ${cena}, com ${placa}.${contexto} ${STYLE_SUFFIX}`;
}
