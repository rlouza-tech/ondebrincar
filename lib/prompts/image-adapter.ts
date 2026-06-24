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
    "palco de teatro vazio iluminado com cortinas de veludo vermelho abertas, luzes de ribalta douradas na beira do palco, cenário pintado com castelo e floresta ao fundo, props cênicos coloridos espalhados, holofotes apontados para o centro, cadeiras vazias da plateia em primeiro plano",
  parque:
    "parque ao ar livre em dia ensolarado, escorregador colorido e trepa-trepa à esquerda, gramado verde com flores, céu azul com nuvens fofas, balanços ao fundo, borboletas voando, palmeiras e árvores frondosas, silhueta de prédios do Rio ao horizonte",
  museu:
    "salão amplo de museu com pé-direito alto, painéis coloridos nas paredes, vitrine iluminada com objetos curiosos ao centro, crianças observando com expressão de espanto e maravilha, luz natural entrando por janelas altas",
  pracinha:
    "praça de bairro aconchegante com parquinho colorido ao centro, escorregador e balanços, árvores com sombra, banco de madeira, crianças brincando livremente, calçada de pedra portuguesa ao redor",
  "atividade-extra":
    "espaço alegre e colorido com mesa grande coberta de materiais criativos, pincéis, tintas e papel espalhados, desenhos infantis pendurados em varal ao fundo, ambiente iluminado e acolhedor",
  evento:
    "palco festivo coberto de balões coloridos flutuando, confetes caindo do teto, bandeirolas e faixas de festa espalhadas, luzes cintilantes, clima de celebração e alegria, plateia animada ao fundo",
  praia:
    "praia carioca em dia de sol, areia branca e mar azul calmo, crianças brincando na beira d'água, coqueiros inclinados, pipa voando ao longe, quiosque colorido ao fundo",
  "colonia-de-ferias":
    "espaço de colônia de férias ao ar livre com crianças em atividades diversas, monitores com coletes coloridos, bandeiras e faixas decorativas, gramado verde e sol brilhante, barracas e estações de atividade ao fundo",
  futebol:
    "campo de futebol infantil com gramado verde bem cuidado, goleiras coloridas, crianças uniformizadas disputando a bola no centro do campo, sol brilhante, torcida de pais nas arquibancadas ao fundo",
  restaurante:
    "restaurante familiar acolhedor com mesas redondas coloridas, cadeiras alegres, decoração com ilustrações infantis nas paredes, balcão iluminado ao fundo, ambiente festivo e convidativo",
  "festa-junina":
    "festa junina ao ar livre com bandeirolas coloridas triangulares cruzando o espaço, fogueira decorativa ao centro, barracas de comida típica, crianças com roupas xadrez e chapéu de palha dançando quadrilha",
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
    pracinha: `placa de madeira fincada no gramado com o texto "${nome}"`,
    "atividade-extra": `lousa verde ao fundo com o texto "${nome}" escrito em letras coloridas`,
    evento: `faixa festiva no topo com o texto "${nome}"`,
    praia: `placa de madeira na areia com o texto "${nome}"`,
    "colonia-de-ferias": `faixa de lona colorida suspensa na entrada com o texto "${nome}"`,
    futebol: `placa de madeira na lateral do campo com o texto "${nome}"`,
    restaurante: `quadro negro em cavalete na entrada com o texto "${nome}" escrito em letras estilizadas`,
    "festa-junina": `faixa de bandeirolas com o texto "${nome}" no centro`,
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

/**
 * Constrói o prompt visual sem nenhuma referência ao nome da atração.
 * Usado como fallback quando a geração com nome falha (ex: recusa por IP protegido).
 * A cena é genérica por categoria — sem letreiro, sem placa.
 *
 * @param categoria - Categoria editorial (define a cena base)
 * @param descricao - Descrição da atração (opcional, enriquece o contexto)
 */
export function buildImagePromptAnonymous(
  categoria: Categoria,
  descricao?: string,
): string {
  const cena = CENA_BASE[categoria] ?? CENA_BASE["evento"];
  const contexto = extrairContexto(descricao);

  return `Crie uma ilustração com a seguinte cena: ${cena}.${contexto} ${STYLE_SUFFIX}`;
}
