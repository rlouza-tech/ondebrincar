/**
 * Voz editorial Onde Brincar — US-S4.5
 * Fonte canônica de tom: docs/voice/onde-brincar.md
 * Persona âncora: Daniel Mendes, 38, pai da Lívia (4), Tijuca.
 */

import fs from "fs";
import path from "path";

export const AI_MODEL_LABEL = "gemini-flash-2.5";

const VOICE_GUIDE_PATH = path.join(process.cwd(), "docs/voice/onde-brincar.md");

/** Seções de instrução de voz injetadas no prompt — não inclui título, changelog nem fora de escopo. */
const VOICE_INSTRUCTION_HEADINGS = [
  "Quem fala",
  "Pra quem fala",
  "Tom",
  "Diferencial que a voz precisa carregar",
  "O que nunca fazer (voz, não dado)",
] as const;

/**
 * Exemplos canônicos extraídos de fichas reais aprovadas (batch 2026-05-26, auto_ok, confidence 5).
 * Atualizar sempre que novas fichas forem aprovadas e publicadas com padrão editorial superior.
 */
export const CANONICAL_EXAMPLES = [
  {
    titulo: "Peça com elenco infantil — primeira ida ao teatro (O Mágico de Oz, Gávea)",
    descricao:
      "O Mágico de Oz no Teatro Clara Nunes, no Shopping da Gávea, é um musical com 25 atores mirins que traz a história clássica de criança para criança. Ambiente fechado, sessão de 60 minutos — boa pedida para apresentar o teatro a crianças de 2 a 12 anos. Planeje o deslocamento para a Gávea.",
    mini_review:
      "Um clássico que ganha uma versão especial com elenco infantil, ideal para a primeira ida ao teatro. Com 60 minutos de duração, é um tempo bom para a faixa etária de 2 a 12 anos. Fica no Shopping da Gávea, então planeje o deslocamento — e garanta o ingresso com antecedência: as vendas encerram 1 hora antes.",
  },
  {
    titulo: "Musical Disney com lista de personagens e ressalva de ingresso (Show Mickey, Cachambi)",
    descricao:
      "O Show Musical do Mickey no Teatro Miguel Falabella, dentro do Norte Shopping (Cachambi), mistura bonecos, fantoches e humor com Mickey, Pateta, Moana, Mauí e a Ansiedade de Divertida Mente 2. Musical leve e interativo em ambiente fechado, 60 minutos, para crianças de 2 a 12 anos.",
    mini_review:
      "Um musical animado e colorido para os pequenos fãs da Disney. Com 60 minutos, é um programa ideal para o fim de semana no Norte Shopping, em Cachambi. As vendas encerram uma hora antes de cada sessão — garanta seu ingresso com antecedência para não perder a diversão.",
  },
  {
    titulo: "Peça temática com ressalva prática de deslocamento e horário (João e Maria, Cachambi)",
    descricao:
      "João e Maria - Uma Aventura Desconectada leva os irmãos a uma floresta encantada onde precisam resolver problemas sem internet. Encontram bruxa cozinheira e corvo amigável em 60 minutos de musical leve para crianças de 2 a 12 anos no Teatro Miguel Falabella, Norte Shopping (Cachambi).",
    mini_review:
      "Uma boa pedida para o fim de semana no Norte Shopping, no Cachambi. A história com o toque 'desconectado' é atual e estimula a imaginação dos pequenos. A duração de 60 minutos é ideal para a faixa etária. As vendas de ingresso encerram 1 hora antes da sessão — garanta seu lugar com antecedência.",
  },
] as const;

export function buildIncertezaInstruction(): string {
  return `POLÍTICA DE INCERTEZA
Se você estiver em dúvida sobre um fato (preço exato, horário, acessibilidade, duração, faixa etária), NÃO invente.
Em vez disso:
1. Marque o trecho duvidoso com a tag literal [INCERTO] em descricao ou mini_review.
2. Liste o campo correspondente em abstain_fields (ex.: preco_centavos, duracao_min, idade_max).
3. Prefira ressalva prática ("confirme no link de ingresso") a afirmação vaga.

Anti-padrão a evitar: NÃO afirme o valor incerto logo após [INCERTO].
❌ Errado: "[INCERTO] A duração de 30 minutos é ótima para os pequenos."
✅ Certo: "[INCERTO] Duração não confirmada no material disponível — confira antes de ir."

LIMITES DE CARACTERES (obrigatórios — o quality gate rejeita se violados):
- descricao: entre 50 e 600 caracteres. Se estiver chegando perto de 600, encerre a frase antes de atingir o limite. Não trunce no meio de uma palavra.
- mini_review: entre 50 e 500 caracteres. NUNCA ultrapasse 500 — o quality gate rejeita automaticamente. Ideal: até 400. Se estiver chegando em 500, corte na última frase completa antes do limite.
- programacao_texto: entre 5 e 200 caracteres. Para programações com muitas datas, use formato compacto (ex.: "Sáb e dom, 16h e 18h" em vez de listar cada dia individualmente).`;
}

function loadVoiceGuideMarkdown(): string {
  try {
    return fs.readFileSync(VOICE_GUIDE_PATH, "utf-8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Fonte de voz editorial não encontrada ou ilegível em ${VOICE_GUIDE_PATH}. ` +
        `O pipeline não pode rodar sem docs/voice/onde-brincar.md. Detalhe: ${detail}`,
    );
  }
}

/**
 * Extrai só as seções de instrução de voz do guia canônico.
 * Ignora título do documento, intro, "Fora de escopo" e Changelog.
 */
export function extractVoiceInstructionSections(markdown: string): string {
  const sections: string[] = [];

  for (const heading of VOICE_INSTRUCTION_HEADINGS) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`,
    );
    const match = markdown.match(pattern);
    if (!match) {
      throw new Error(
        `Seção "## ${heading}" ausente em ${VOICE_GUIDE_PATH}. ` +
          `Atualize docs/voice/onde-brincar.md ou VOICE_INSTRUCTION_HEADINGS.`,
      );
    }
    sections.push(`## ${heading}\n${match[1].trim()}`);
  }

  return sections.join("\n\n");
}

export function buildVoiceSystemPrompt(): string {
  const voiceGuide = extractVoiceInstructionSections(loadVoiceGuideMarkdown());

  const examplesBlock = CANONICAL_EXAMPLES.map(
    (exemplo, index) =>
      `Exemplo ${index + 1} — ${exemplo.titulo}:
descricao: "${exemplo.descricao}"
mini_review: "${exemplo.mini_review}"`,
  ).join("\n\n");

  return `${voiceGuide}

VOZ EDITORIAL — exemplos canônicos (referência de tom e estrutura):

${examplesBlock}

Política de abstenção: se o dado não estiver claro no input, ainda gere o melhor valor estrutural possível, mas liste o campo em abstain_fields e reduza confidence. Campos críticos são categoria, bairro, idade_min e idade_max; se você não tiver segurança neles, marque em abstain_fields.`;
}
