import {
  buildIncertezaInstruction,
  buildVoiceSystemPrompt,
} from "@/lib/prompts/voice-adapter";
import { getReferenceDateIso } from "./reference-date";
import type { LinhaInput } from "./types";

/** Incrementar manualmente ao mudar o prompt (US-S6). */
export const PROMPT_VERSION = "v1.0.5";

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
- Se sinopse_oficial contiver "Classificação: Livre" (ou variação como "classificação livre"):
  - use idade_min: 0, independente do valor de idade_minima (que reflete regra de meia-entrada, não classificação do espetáculo)
  - use idade_max: 18, independente do valor de idade_maxima quando este vier de meia-entrada; se idade_maxima já chegar como 18, mantenha
- Exemplo: idade_minima: 2 + idade_maxima: 18 + sinopse "Classificação: Livre" → idade_min: 0, idade_max: 18 (o 2 é faixa de meia-entrada; 18 é o teto editorial para Classificação Livre).

Exceção — duração suspeita:
- Se duracao_minutos for ≤ 5, descarte esse valor (provavelmente veio de "X minutos de caminhada" ou outro contexto errado). Trate duracao_min como null, marque em abstain_fields e adicione note_for_editor: "duracao_minutos no input (Xmin) parece dado de distância/caminhada, não duração do espetáculo."`;
}

function buildBairroInferenciaBlock(linha: LinhaInput): string {
  if (linha.bairro.trim()) return "";

  const temEndereco = Boolean(linha.endereco?.trim());
  const enderecoLine = temEndereco ? `\n- endereco: ${linha.endereco}` : "";
  const fontesTexto = temEndereco
    ? 'a partir dos campos "venue" e "endereco" abaixo'
    : 'a partir do campo "venue" abaixo';

  return `
INFERÊNCIA DE BAIRRO (US-S16 / US-S25):
O campo "bairro" do input está vazio. Tente inferir o bairro carioca ${fontesTexto}.
- venue: ${linha.venue}${enderecoLine}
Se conseguir identificar com confiança (ex.: "Teatro Bangu Shopping" → "Bangu"; "Teatro Leblon" → "Leblon"; "Teatro Laura Alvim" → "Ipanema"; endereço "Rua Orestes, 28 — Santo Cristo" → "Santo Cristo"):
- Preencha o campo "bairro_inferido" no JSON de resposta com o nome do bairro (ex: "Centro", "Botafogo").
Se não tiver certeza suficiente em nenhum dos campos:
- Retorne "bairro_inferido": null
Este campo só existe quando bairro do input está vazio. Não o inclua quando bairro já estiver preenchido.`;
}

export function buildPrompt(linha: LinhaInput, referenceDate = new Date()): string {
  const dataAtual = getReferenceDateIso(referenceDate);
  const voice = buildVoiceSystemPrompt();
  const incerteza = buildIncertezaInstruction();
  const scraperV2 = buildScraperV2Block(linha);
  const bairroInferencia = buildBairroInferenciaBlock(linha);

  return `${voice}

${incerteza}
${scraperV2}
${bairroInferencia}

EXEMPLOS FEW-SHOT (use como referência de calibração — não copie os valores, aprenda o padrão)

=== EXEMPLO 1 — CASO FÁCIL (Clubinho, campos V2 ricos) ===
INPUT:
- nome: Top 10 da Galinha Pintadinha
- categoria_origem: Teatro Infantil
- venue: Teatro Bangu Shopping
- bairro: Bangu
- dias_apresentacao: Somente dia 06/06
- desconto_percentual: 50%
- preco_bruto: de R$80
- sinopse_oficial: "[...] Classificação: Livre. A Galinha Pintadinha desembarca no Rio com seleção das músicas mais amadas — Pintinho Amarelinho, Mariana, A Baratinha — em espetáculo de cores, dança e interatividade."
- horarios_sessao: 06/06 às 15:00
- duracao_minutos: 60
- idade_minima: 2
- idade_maxima: 18
- preco_inteira_centavos: 8000
OUTPUT:
{"categoria":"teatro","idade_min":0,"idade_max":18,"duracao_min":60,"preco_centavos":8000,"indoor_outdoor":"indoor","descricao":"Show musical com a Galinha Pintadinha no Teatro Bangu Shopping. As músicas mais amadas da Popó — Pintinho Amarelinho, Mariana, A Baratinha — ganham vida em espetáculo de cores, dança e interatividade. Sessão única.","mini_review":"Clássico certeiro para crianças até 4-5 anos que cresceram com a Pintadinha. Sessão única em Bangu; reserve com antecedência.","tipo_programacao":"evento_pontual","programacao_texto":"Apenas no dia 6 de junho às 15h.","proxima_data":"2026-06-06","confidence":5,"abstain_fields":[],"notes_for_editor":null}
NOTA: idade_min=0 e idade_max=18 porque sinopse diz "Classificação: Livre" — o campo idade_minima=2 era regra de meia-entrada; o scraper já converteu idade_maxima para 18 (teto editorial para Classificação Livre).

=== EXEMPLO 2 — CASO MÉDIO (Sympla, texto livre, dois turnos, preço ausente) ===
INPUT:
- nome: Colônia de Férias - Na Cozinha com a Kapim - JUL26
- categoria_origem: Teatro Infantil
- venue: R. Cosme Velho, 599 - Rio de Janeiro, RJ
- bairro: (vazio)
- dias_apresentacao: 13 de Jul a 17 de Jul
- preco_bruto: (vazio)
- sinopse_oficial: "[...] Para crianças de 3 a 10 anos. Turma da manhã: das 9h às 12h. Turma da tarde: das 14h às 17h. Local: Espaço Cria – Cosme Velho. Data: 13 a 17 de julho de 2026."
- horarios_sessao: (vazio)
- duracao_minutos: (vazio)
- idade_minima: (vazio)
- preco_inteira_centavos: (vazio)
OUTPUT:
{"categoria":"atividade-extra","idade_min":3,"idade_max":10,"duracao_min":180,"preco_centavos":null,"indoor_outdoor":"indoor","descricao":"Colônia de férias de culinária infantil no Espaço Cria, Cosme Velho. 15ª edição com tema Volta ao Mundo dos Sabores: cada dia uma cozinha diferente. Turmas por faixa etária (3-10 anos), com presença diária da nutricionista Gabriela Kapim.","mini_review":"Uma das colônias mais bem estruturadas do Rio — culinária como aventura, não como obrigação. Vagas limitadas. Preço não listado na Sympla; clique no link para ver lotes.","tipo_programacao":"evento_pontual","programacao_texto":"13 a 17 de julho. Turma da manhã das 9h às 12h ou turma da tarde das 14h às 17h.","proxima_data":"2026-07-13","confidence":4,"abstain_fields":["preco_centavos"],"notes_for_editor":"Preço não disponível na Sympla — consultar diretamente. Confirmar disponibilidade por turno (manhã/tarde)."}
NOTA: preco_centavos=null é aceitável quando Sympla não exibe preço. duracao_min=180 inferido dos horários explícitos na sinopse. Não use [INCERTO] no texto — sinalize incerteza apenas em abstain_fields e notes_for_editor.

=== EXEMPLO 3 — CASO BORDERLINE (Sympla, falso positivo — abstenção legítima) ===
INPUT:
- nome: Rick Silveira em A VIDA É FREUD na Barra da Tijuca [14/06]
- categoria_origem: Teatro Infantil
- venue: Barra Point - Espaço Provocações - Rio de Janeiro, RJ
- bairro: (vazio)
- dias_apresentacao: Domingo, 14 de Jun às 19:00
- preco_bruto: (vazio)
- sinopse_oficial: "E se uma sessão de terapia virasse um show de stand-up comedy? [...] esse show é voltado para quem já passou por algum tipo de trauma psicológico [...] Classificação Etária: 14 anos. Menores de 14 anos, somente acompanhados pelos pais ou responsáveis."
OUTPUT:
{"categoria":"evento","idade_min":14,"idade_max":null,"duracao_min":60,"preco_centavos":null,"indoor_outdoor":"indoor","descricao":"Show de stand-up comedy sobre psicanálise, traumas psicológicos e saúde mental. Rick Silveira fala abertamente sobre ansiedade, depressão e psicanálise em formato cômico. Classificação 14 anos.","mini_review":"Espetáculo adulto sobre terapia — o humor não é leve. Não é conteúdo infantil.","tipo_programacao":"evento_pontual","programacao_texto":"Domingo, 14 de junho às 19h.","proxima_data":"2026-06-14","confidence":1,"abstain_fields":["preco_centavos","idade_max"],"notes_for_editor":"FALSO POSITIVO: stand-up para adultos sobre psicanálise. Classificação 14 anos. Conteúdo não é infantil. Recomendar exclusão do catálogo."}
NOTA: quando o conteúdo claramente não é infantil, confidence=1 e notes_for_editor deve recomendar exclusão explicitamente. Não tente forçar um fit — abstenção total é a resposta correta.

CONTEXTO TEMPORAL
Data atual de referência: ${dataAtual}
Quando inferir proxima_data, use essa data como referência.
NUNCA gere proxima_data no passado.
Se dias_apresentacao mencionar dias sem mês/ano explícitos (ex.: "Dias 23, 30, 31"),
assuma mês corrente ou próximo mês ainda não passado em relação a ${dataAtual}.
Se for ambíguo demais, retorne null em proxima_data e marque proxima_data em abstain_fields.

TRANSPARÊNCIA SOBRE LACUNAS
Quando dados críticos faltarem no input, NÃO invente — em vez disso, sinalize no texto ou em abstain_fields.

CAMPOS QUE GEMINI NÃO DEVE PREENCHER SEM FONTE EXPLÍCITA NO INPUT:
- duracao_min: sem menção de duração no texto → null (não infira "60 min" por ser padrão de teatro ou atividade)
- preco_centavos: sem preço no input → null (não infira por categoria, venue ou contexto habitual)
- proxima_data: sem data inferível → null (não invente data "provável" ou "provável próximo fim de semana")
- idade_min / idade_max: sem menção de faixa etária → abstain_fields (não infira por categoria)
Regra geral: se você está adivinhando o valor, a resposta correta é null + abstain_fields + reduza confidence.
Casos comuns do scraper v1:
- dias_apresentacao lista dias mas SEM horário (ex.: "Dias 23, 30, 31"): em programacao_texto, inclua os dias E acrescente frase explícita como "Consulte horário ao clicar em 'Ver ingresso'".
  Exemplo completo: "Sessões nos dias 23, 24, 30 e 31. Consulte horário ao clicar em 'Ver ingresso'."
- preco_bruto vazio ou ambíguo: preco_centavos null + marque preco_centavos em abstain_fields.
- duração não inferível: duracao_min null + marque duracao_min em abstain_fields se relevante.
  REGRA ANTI-DURAÇÃO GENÉRICA (US-S18): nunca mencione duração estimada ou aproximada em descricao, mini_review ou programacao_texto quando não estiver explicitamente declarada no input. Frases como "duração aproximada de 60 minutos", "espetáculo com duração de 1 hora", "cerca de 1h de espetáculo" ou qualquer variação inferida são proibidas nos campos de texto. Se duracao_minutos do scraper v2 estiver preenchido, use apenas no campo JSON duracao_min — não o transcreva para o texto descritivo como "duração de X minutos". Quando a duração for desconhecida: duracao_min null + abstain_fields — nunca compense com estimativa no texto.
- Não omita a ressalva só porque programacao_texto já cabe nos 200 caracteres — priorize transparência.

CAMPO aviso_operacional: use este campo para qualquer aviso prático sobre compra, acesso ou disponibilidade — prazo de venda de ingressos, lotação limitada, retirada de ingresso físico, evento já encerrado, etc. Exemplos: "Vendas encerram 1h antes de cada sessão.", "Apresentação já ocorreu — verifique novas datas.", "Vagas limitadas; compre com antecedência."
- descricao e mini_review devem ser limpos, sem avisos operacionais.
- NUNCA use a palavra "Ressalva:" em nenhum campo de texto. O campo aviso_operacional já é o lugar correto para esse conteúdo.

Bom output: JSON estrito, sem markdown, descrições entre 50 e 600 caracteres, mini_review entre 50 e 400 caracteres. Mau output: usar frases como "não tenho informação", inventar endereço/duração/horário exatos sem pista, deixar campos críticos vagos, adicionar bloco "Ressalva:" ao final de qualquer campo de texto, ou mencionar duração estimada em texto descritivo sem fonte explícita no input (ex.: "duração aproximada de 60 minutos" quando duracao_minutos não veio no scraper v2 e o texto de entrada não menciona duração).

Entrada crua:
- nome: ${linha.nome}
- categoria_origem: ${linha.categoria_origem}
- venue: ${linha.venue}
- bairro: ${linha.bairro}
- endereco: ${linha.endereco ?? ""}
- dias_apresentacao: ${linha.dias_apresentacao}
- desconto_percentual: ${linha.desconto_percentual}
- preco_bruto: ${linha.preco_bruto}
- url_origem: ${linha.url_origem}

INSTRUÇÃO DE ENDEREÇO: o campo "endereco" acima vem do scraper quando disponível (ex.: Sympla fornece o endereço do venue). Se preenchido, use-o como está — não reescreva. Se vazio, não invente; deixe null. Este campo não faz parte do seu JSON de saída — será propagado automaticamente pelo pipeline.

Gere exclusivamente um JSON com os campos definidos no schema da resposta. Quando solicitado pela seção "INFERÊNCIA DE BAIRRO" acima, inclua também o campo "bairro_inferido". Regras importantes:
- categoria: "teatro" | "parque" | "pracinha" | "museu" | "atividade-extra" | "evento" | "praia"
  Use a categoria_origem como ponto de partida — só reclassifique se houver evidência clara de categoria diferente.
  Use "pracinha" para praças de bairro com parquinho infantil. Use "praia" para praias. Use "parque" para parques maiores, reservas e espaços verdes extensos. Use "teatro" apenas para espetáculos com sessão marcada e ingresso.
- idade_min e idade_max: inteiros 0-18
- duracao_min: inteiro ou null. Refere-se exclusivamente à duração real do espetáculo/atividade em si.
  NÃO use tempos mencionados em contexto operacional como valor de duracao_min. Exemplos proibidos:
  ❌ "chegar 15 min antes" → duracao_min: 15 (instrução de chegada, não duração)
  ❌ "portões abrem 30 min antes" → duracao_min: 30 (aviso de acesso, não duração)
  ❌ "retirar ingresso 20 min antes" → duracao_min: 20 (logística, não duração)
  Se a duração real não estiver explícita, retorne null e marque duracao_min em abstain_fields.
- preco_centavos: inteiro ou null. Exemplos: "a partir de R$54,90" -> 5490; "de R$100" -> 10000; vazio -> null
- indoor_outdoor: "indoor" | "outdoor" | "ambos" (slugs técnicos do schema — veja regra de ambiente abaixo)
- descricao: 50-600 caracteres, objetiva, voz Onde Brincar (bairro ${linha.bairro} como contexto de planejamento)
- mini_review: 50-400 caracteres, voz autoral com ressalva franca

REGRAS DE EXTRAÇÃO (revisão editorial — siga à risca):
- idade_max: extraia o número exato mencionado no texto de entrada (nome, dias_apresentacao, categoria_origem, preco_bruto, url_origem) ou use idade_maxima do scraper v2 quando preenchido. Nunca infira nem arredonde.
  Se o texto diz "até 12 anos" ou "12+", retorne idade_max: 12 — nunca 8 ou outro valor por suposição de faixa etária.
  Se não houver menção clara de idade máxima, marque idade_max em abstain_fields e use o menor valor plausível só se idade_min exigir coerência.
  REGRA ANTI-MEIA-ENTRADA: se a única menção de faixa etária no texto for em contexto de meia-entrada ou desconto (ex: "meia-entrada: crianças de 0 a 12 anos", "paga meia de 3 a 12 anos"), NÃO infira idade_max a partir desse número — marque em abstain_fields com nota "faixa etária inferida de regra de meia-entrada, não de classificação indicativa".
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
- notes_for_editor: avisos curtos para revisão humana, se necessário

CARTAZ ESTENDIDO / TEMPORADA PRORROGADA:
Quando dias_apresentacao listar datas que se estendem por semanas ou meses (ex.: "Sessões de julho a setembro", "Sábados até dezembro"), classifique como "evento_recorrente" — não como "permanente".
"Permanente" é só para atrações sem data de encerramento prevista que funcionam continuamente (parques, museus em operação regular).
Se houver pista de "temporada prorrogada" ou "em cartaz estendido", use notes_for_editor para sinalizar ao editor.`;
}
