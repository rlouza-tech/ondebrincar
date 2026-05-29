import {
  buildIncertezaInstruction,
  buildVoiceSystemPrompt,
} from "@/lib/prompts/voice-adapter";
import { getReferenceDateIso } from "./reference-date";
import type { LinhaInput } from "./types";

function buildScraperV2Block(linha: LinhaInput): string {
  const hasV2 =
    linha.sinopse_oficial ||
    linha.horarios_sessao ||
    linha.idade_minima ||
    linha.idade_maxima ||
    linha.preco_inteira_centavos ||
    linha.duracao_minutos;

  if (!hasV2) {
    return "";
  }

  return `
DADOS SCRAPER V2 (priorize sobre inferência — vêm da página oficial do Clubinho):
- sinopse_oficial: ${linha.sinopse_oficial ?? ""}
- horarios_sessao: ${linha.horarios_sessao ?? ""}
- duracao_minutos: ${linha.duracao_minutos ?? ""}
- idade_minima: ${linha.idade_minima ?? ""}
- idade_maxima: ${linha.idade_maxima ?? ""}
- preco_inteira_centavos: ${linha.preco_inteira_centavos ?? ""}
- url_ingresso: ${linha.url_ingresso ?? ""}

Se sinopse_oficial, horarios_sessao, idade_minima, idade_maxima ou preco_inteira_centavos estiverem preenchidos, priorize-os sobre qualquer inferência do texto livre.

Exceção — classificação etária:
- Se sinopse_oficial contiver "Classificação: Livre", use idade_min: 0, independente do valor de idade_minima.
- O campo idade_minima do scraper reflete a regra de meia-entrada (preço), não a classificação do espetáculo.

Exceção — duração suspeita:
- Se duracao_minutos for ≤ 5, descarte esse valor (provavelmente veio de "X minutos de caminhada").
- Trate duracao_min como null, marque em abstain_fields e adicione note_for_editor.`;
}

export function buildPrompt(linha: LinhaInput, referenceDate = new Date()): string {
  const dataAtual = getReferenceDateIso(referenceDate);
  const voice = buildVoiceSystemPrompt();
  const incerteza = buildIncertezaInstruction();
  const scraperV2 = buildScraperV2Block(linha);

  return `${voice}

${incerteza}
${scraperV2}

CONTEXTO TEMPORAL
Data atual de referência: ${dataAtual}
Quando inferir proxima_data, use essa data como referência.
NUNCA gere proxima_data no passado.
Se dias_apresentacao mencionar dias sem mês/ano explícitos (ex.: "Dias 23, 30, 31"),
assuma mês corrente ou próximo mês ainda não passado em relação a ${dataAtual}.
Se for ambíguo demais, retorne null em proxima_data e marque proxima_data em abstain_fields.

TRANSPARÊNCIA SOBRE LACUNAS
Quando dados críticos faltarem no input, NÃO invente — em vez disso, sinalize no texto ou em abstain_fields.
Casos comuns do scraper v1:
- dias_apresentacao lista dias mas SEM horário (ex.: "Dias 23, 30, 31"): em programacao_texto, inclua os dias E acrescente frase explícita como "Consulte horário ao clicar em 'Ver ingresso'".
  Exemplo completo: "Sessões nos dias 23, 24, 30 e 31. Consulte horário ao clicar em 'Ver ingresso'."
- preco_bruto vazio ou ambíguo: preco_centavos null + marque preco_centavos em abstain_fields.
- duração não inferível: duracao_min null + marque duracao_min em abstain_fields se relevante.
- Não omita a ressalva só porque programacao_texto já cabe nos 200 caracteres — priorize transparência.

Bom output: JSON estrito, sem markdown, descrições entre 50 e 600 caracteres, mini_review entre 50 e 400 caracteres. Mau output: usar frases como "não tenho informação", inventar endereço/duração/horário exatos sem pista, ou deixar campos críticos vagos.

Entrada crua:
- nome: ${linha.nome}
- categoria_origem: ${linha.categoria_origem}
- venue: ${linha.venue}
- bairro: ${linha.bairro}
- dias_apresentacao: ${linha.dias_apresentacao}
- desconto_percentual: ${linha.desconto_percentual}
- preco_bruto: ${linha.preco_bruto}
- url_origem: ${linha.url_origem}

Gere exclusivamente um JSON com os campos definidos no schema da resposta. Regras importantes:
- categoria: "teatro" | "parque" | "museu" | "atividade-extra" | "evento"
- idade_min e idade_max: inteiros 0-18
- duracao_min: inteiro ou null
- preco_centavos: inteiro ou null. Exemplos: "a partir de R$54,90" -> 5490; "de R$100" -> 10000; vazio -> null
- indoor_outdoor: "indoor" | "outdoor" | "ambos" (slugs técnicos do schema — veja regra de ambiente abaixo)
- descricao: 50-600 caracteres, objetiva, voz Onde Brincar (bairro ${linha.bairro} como contexto de planejamento)
- mini_review: 50-400 caracteres, voz autoral com ressalva franca

REGRAS DE EXTRAÇÃO (revisão editorial — siga à risca):
- idade_max: extraia o número exato mencionado no texto de entrada (nome, dias_apresentacao, categoria_origem, preco_bruto, url_origem) ou use idade_maxima do scraper v2 quando preenchido. Nunca infira nem arredonde.
  Se o texto diz "até 12 anos" ou "12+", retorne idade_max: 12 — nunca 8 ou outro valor por suposição de faixa etária.
  Se não houver menção clara de idade máxima, marque idade_max em abstain_fields e use o menor valor plausível só se idade_min exigir coerência.
- tipo_programacao: classifique assim:
  * "permanente": atração sem data de encerramento definida, aberta regularmente por tempo indeterminado (ex.: parques, museus, aquários com funcionamento contínuo).
  * "evento_pontual": datas de apresentação específicas listadas, temporada com fim previsto, espetáculo com sessões marcadas ou exposição temporária (ex.: peças de teatro, shows, Patrulha Canina com dias fixos).
  * "evento_recorrente": frequência sem lista de dias pontuais (ex.: "sábados e domingos" sem datas numéricas).
  Quando houver datas de sessão listadas (ex.: "Dias 23, 30, 31", "somente dia 24"), classifique SEMPRE como "evento_pontual" — nunca "permanente".
- horarios (em programacao_texto): extraia todos os horários mencionados no input, mesmo repetidos em vários dias.
  Se o texto diz "sessões às 16h" ou "16h e 18h", inclua em programacao_texto (ex.: "às 16h" ou "às 16h e 18h").
  Se houver horários diferentes por dia, liste todos na frase. Nunca omita horário quando houver qualquer menção no texto.
- proxima_data: retorne a próxima data de apresentação a partir de ${dataAtual}.
  Se houver múltiplas datas listadas, retorne a mais próxima que ainda não passou (formato YYYY-MM-DD).
  Se a atração for permanente e não tiver data específica inferível, retorne null.
  Nunca invente uma data que não esteja implícita ou explícita no input.
- preco_centavos: use preco_inteira_centavos do scraper v2 quando preenchido; senão extraia do preco_bruto ou de menções no texto (ex.: "R$ 80,00" -> 8000).
  Se mencionar "gratuito" ou "entrada franca", retorne 0.
  Só retorne null se não houver absolutamente nenhuma menção de preço no input.
- indoor_outdoor + voz editorial:
  * No JSON, use apenas: "indoor" | "outdoor" | "ambos".
  * Em descricao, mini_review e programacao_texto, descreva o ambiente em português: "ambiente fechado", "ao ar livre" ou "ambiente fechado e ao ar livre".
  * Nunca escreva "Indoor", "Outdoor", "indoor" ou "outdoor" nos campos de texto.

- PROGRAMAÇÃO: a partir de dias_apresentacao do input, inferir:
  - tipo_programacao: siga as regras de classificação acima.
  - programacao_texto: frase legível com dias E horários quando existirem. Se o input tiver só dias sem horário, SEMPRE inclua ressalva de consultar horário no ingresso. Exemplos:
    Input "Dias 23, 30, 31" → "Sessões nos dias 23, 30 e 31. Consulte horário ao clicar em 'Ver ingresso'."
    Input "Somente dia 24" → "Apenas no dia 24. Consulte horário ao clicar em 'Ver ingresso'."
    Input "Diariamente" → "Aberto diariamente"
    Input "Sábados e domingos 16h" → "Sábados e domingos às 16h" (horário presente — não precisa da frase extra)
    Input com "16h e 18h" → inclua ambos os horários explicitamente
    Vazio + categoria=parque → "Aberto diariamente (consulte horário no link)"
  - proxima_data: siga as regras de proxima_data acima.
- confidence: inteiro 1-5 (5 = muito confiante; 1 = chutei)
- abstain_fields: campos onde você não tem certeza
- notes_for_editor: avisos curtos para revisão humana, se necessário`;
}
