# Modelo de dados — Onde Brincar

**Versão:** 1.0 **Data:** 15/mai/2026 **Story relacionada:** US-S5.1 (Sprint 1) **Status:** Base estável pro MVP (Q1–Q2 2026). Pode evoluir conforme stories trouxerem campos novos.

---

## Visão geral

Onde Brincar tem **3 camadas de armazenamento**, escolhidas por tipo de dado:


| Camada                  | Onde vive                      | O que mora aqui                                                                           |
| ----------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| **Conteúdo editorial**  | Sanity CMS                     | Atração, Categoria, Bairro, Tag, Status — tudo que o Rafael (editor) gerencia             |
| **Dados transacionais** | Vercel KV (ou Postgres futuro) | Usuário, Favorito, NPS_Response, Newsletter_Subscriber — tudo que pertence ao pai-usuário |
| **Eventos/analytics**   | GA4 + Looker Studio            | attraction_view, outbound_click, share_click — eventos do NSM                             |


Logs operacionais (Import_Log, AI_Job_Log) ficam em arquivos JSON no storage do projeto.

## Diagrama de entidades principais

tem

fica em

está em

tem várias

salva

referencia

responde

assina

Atracao

string

slug

PK

string

nome

number

idade_min

number

idade_max

number

preco

boolean

ai_generated

Categoria

string

slug

PK

string

nome

Bairro

string

slug

PK

string

nome

string

zona

Status

string

codigo

PK

operando|encerrada|em_obras|esgotada

Tag

string

slug

PK

string

nome

Usuario

string

id

PK

string

email

timestamp

created_at

Favorito

string

usuario_id

FK

string

atracao_slug

FK

timestamp

created_at

NPS_Response

string

usuario_id

FK

number

score

string

comment

string

source

email|in_app

Newsletter_Subscriber

string

email

PK

timestamp

subscribed_at

timestamp

unsubscribed_at

---

## 1. Entidades em Sanity CMS (conteúdo editorial)

### 1.1 Atração

**A entidade central.** Toda peça de teatro, parque, atividade, evento — uma Atração no schema.


| Campo                         | Tipo                          | Obrigatório                  | Exemplo                                                                                        | Notas                                                                       |
| ----------------------------- | ----------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `nome`                        | string                        | sim                          | "Chapeuzinho Vermelho — Versão Musical"                                                        | Título visível                                                              |
| `slug`                        | slug (source: nome)           | sim, único                   | `chapeuzinho-vermelho-leblon`                                                                  | URL-friendly, identificador estável                                         |
| `categoria`                   | reference → Categoria         | sim                          | → `teatro`                                                                                     | Categoria pai                                                               |
| `idade_min`                   | number                        | sim                          | 3                                                                                              | Em anos                                                                     |
| `idade_max`                   | number                        | sim                          | 8                                                                                              | Em anos                                                                     |
| `duracao_min`                 | number                        | não                          | 60                                                                                             | Em minutos                                                                  |
| `preco`                       | number (centavos)             | não                          | 4000                                                                                           | R$ 40,00 = 4000 centavos. Evita float. Null = "não informado", 0 = gratuito |
| `link_compra`                 | url                           | condicional                  | [https://sympla.com.br/](https://sympla.com.br/)...                                            | Obrigatório se `status=operando`                                            |
| `partner`                     | enum string                   | condicional                  | `sympla`                                                                                       | `sympla` | `eventim` | `outro`. Junto com link_compra                       |
| `tracking_id`                 | string                        | não                          | `aff_xyz123`                                                                                   | ID de afiliação do partner                                                  |
| `bairro`                      | reference → Bairro            | sim                          | → `leblon`                                                                                     |                                                                             |
| `lat`                         | number                        | não                          | -22.9849                                                                                       | Latitude                                                                    |
| `lng`                         | number                        | não                          | -43.2210                                                                                       | Longitude                                                                   |
| `indoor_outdoor`              | enum string                   | sim                          | `indoor`                                                                                       | `indoor` | `outdoor` | `ambos`                                              |
| `status`                      | enum string                   | sim                          | `operando`                                                                                     | `operando` | `encerrada` | `em_obras` | `esgotada`                          |
| `descricao`                   | text (~1000 chars)            | sim                          | "Adaptação musical do clássico..."                                                             | Versão objetiva — vem do produtor ou scraping                               |
| `mini_review`                 | text (~500 chars)             | recomendado (Lean: opcional) | "Boa pra primeira ida ao teatro de criança 3-6. Ressalva: 60min sem intervalo pode ser longo." | Voz autoral do Onde Brincar                                                 |
| `foto`                        | image (Sanity asset, hotspot) | sim pra publicar             | (asset reference)                                                                              | Otimizada automaticamente via Sanity CDN                                    |
| `essencial_estacionamento`    | enum string                   | recomendado                  | `pago`                                                                                         | `sim` | `nao` | `pago` | `nao_informado`                                    |
| `essencial_banheiro_infantil` | enum string                   | recomendado                  | `sim`                                                                                          | `sim` | `nao` | `nao_informado`                                             |
| `essencial_reembolso`         | string curto                  | recomendado                  | "72h antes"                                                                                    | Política de reembolso                                                       |
| `tags`                        | array of references → Tag     | não                          | [`musical`, `classico`]                                                                        | Tags livres                                                                 |
| `ai_generated`                | boolean                       | sim (default false)          | `true`                                                                                         | `true` se texto foi adaptado via pipeline IA (US-S4.5)                      |
| `ai_model`                    | string                        | condicional                  | `gemini-flash-2.5`                                                                             | Modelo usado, se ai_generated=true                                          |
| `pendente_imagem`             | boolean                       | sim (default false)          | `false`                                                                                        | Flag pra admin (US-S4.3) — ficha sem foto pareada                           |
| `pipeline_failed`             | boolean                       | sim (default false)          | `false`                                                                                        | Flag pra admin — pipeline IA falhou e ficha não foi adaptada                |
| `fonte`                       | enum string                   | não                          | `clubinho`                                                                                     | `clubinho` | `sympla` | `planilha_manual` | `instagram`. Origem do dado     |
| `_createdAt`                  | timestamp (auto)              | auto                         | —                                                                                              | Sanity gerencia                                                             |
| `_updatedAt`                  | timestamp (auto)              | auto                         | —                                                                                              | Sanity gerencia                                                             |


**Relacionamentos:**

- N:1 com `Categoria` (uma atração tem uma categoria)
- N:1 com `Bairro` (uma atração fica em um bairro)
- N:M com `Tag` (uma atração pode ter várias tags; uma tag pertence a várias atrações)
- 1:N com `Favorito` (uma atração pode ser favoritada por vários usuários)

**Estados (status):**

```
operando ──→ encerrada (peça saiu de cartaz)
   │
   ├─→ em_obras (teatro fechado pra reforma; atração existe mas inacessível)
   │
   └─→ esgotada (ingressos esgotados; informação temporal, pode voltar pra operando)
```

### 1.2 Categoria

Agrupa atrações por tipo macro.


| Campo       | Tipo                       | Exemplo                                            |
| ----------- | -------------------------- | -------------------------------------------------- |
| `slug`      | slug                       | `teatro`                                           |
| `nome`      | string                     | "Teatro infantil"                                  |
| `descricao` | text                       | "Peças teatrais voltadas pra crianças até 13 anos" |
| `icone`     | string (lucide-react name) | `theater`                                          |
| `ordem`     | number                     | 1                                                  |


**Categorias previstas pro MVP:**

- `teatro` (âncora do MVP)
- `parque` (Q3)
- `museu` (Q3)
- `atividade-extra` (Q3 — circo, ballet, capoeira)
- `evento` (Q3 — festivais, feiras)

### 1.3 Bairro


| Campo        | Tipo        | Exemplo                              |
| ------------ | ----------- | ------------------------------------ |
| `slug`       | slug        | `leblon`                             |
| `nome`       | string      | "Leblon"                             |
| `zona`       | enum string | `sul` | `norte` | `oeste` | `centro` |
| `lat_centro` | number      | -22.9849                             |
| `lng_centro` | number      | -43.2210                             |


**Por que não usar string livre pra bairro:** queremos agrupar por zona (filtro KR4.1) e ter coordenada central pra cálculo de "outras coisas perto" (US-I18 — cortado no Lean, mas estrutura preparada pra Q3).

### 1.4 Tag

Tags livres pra filtros secundários.


| Campo  | Tipo   | Exemplo   |
| ------ | ------ | --------- |
| `slug` | slug   | `musical` |
| `nome` | string | "Musical" |


**Exemplos previstos:** `musical`, `classico`, `participativo`, `bilingue`, `acessivel-cadeirante`, `gratuito-municipal`, `com-libras`, etc.

### 1.5 Status (constante)

Não é uma "tabela" — é um enum hardcoded. Listo aqui pra referência:

typescript

```typescript
type Status = 'operando' | 'encerrada' | 'em_obras' | 'esgotada';
```

Cada valor tem cor/badge visual definidos em S3.1 (design tokens).

---

## 2. Entidades em banco transacional (Vercel KV ou Postgres)

**Decisão sobre stack:** começa com **Vercel KV** (Redis-style key-value) que é gratuito até 30k requests/dia — suficiente pro MVP. Se virar gargalo no Q3+, migra pra Postgres (Vercel Postgres ou Neon).

### 2.1 Usuário

Pai/mãe cadastrado pra usar favoritos (US-I14.1).


| Campo              | Tipo           | Obrigatório  | Exemplo                                     |
| ------------------ | -------------- | ------------ | ------------------------------------------- |
| `id`               | string (UUID)  | sim          | `usr_a1b2c3d4`                              |
| `email`            | string (único) | sim          | "[pai@exemplo.com](mailto:pai@exemplo.com)" |
| `email_verificado` | boolean        | sim          | `true`                                      |
| `created_at`       | timestamp      | sim          | `2026-10-15T18:30:00Z`                      |
| `last_login_at`    | timestamp      | sim          | `2026-11-20T09:12:00Z`                      |
| `nome`             | string         | não (futuro) | "Daniel"                                    |


**Auth flow (US-I14.1):** código numérico 6 dígitos enviado por e-mail (Resend). Sem senha. Sessão via JWT em cookie httpOnly por 7 dias.

**Privacidade:**

- Nunca exposto publicamente
- ID hash usado em URLs públicas (ex: lista compartilhada de favoritos): `sha256(id).substring(0, 12)`
- Email pessoal **nunca** logado em GA4 (sempre user_id_hash)

### 2.2 Favorito

Relacionamento N:M entre Usuário e Atração (US-I14.2).


| Campo          | Tipo                | Obrigatório | Exemplo                       |
| -------------- | ------------------- | ----------- | ----------------------------- |
| `usuario_id`   | reference → Usuário | sim         | `usr_a1b2c3d4`                |
| `atracao_slug` | reference → Atração | sim         | `chapeuzinho-vermelho-leblon` |
| `created_at`   | timestamp           | sim         | `2026-10-20T10:15:00Z`        |


**Chave composta:** (`usuario_id`, `atracao_slug`) — unique. Evita favoritar mesma atração 2x.

**Operações típicas:**

- `POST /api/favorites` — toggle (cria se não existe; remove se existe)
- `GET /api/favorites?user_id=X` — lista todas as atrações favoritas de um usuário
- `GET /api/favorites/count?atracao_slug=Y` — quantos salvaram (métrica de interesse, não exibida no MVP)

### 2.3 NPS_Response

Respostas ao NPS via e-mail mensal (US-I16.2, KR3.3).


| Campo          | Tipo                | Obrigatório | Exemplo                                                              |
| -------------- | ------------------- | ----------- | -------------------------------------------------------------------- |
| `id`           | UUID                | sim         | `nps_x1y2z3`                                                         |
| `usuario_id`   | reference → Usuário | sim         | `usr_a1b2c3d4`                                                       |
| `score`        | number (0-10)       | sim         | 8                                                                    |
| `comment`      | text (opcional)     | não         | "Adoro pra planejar fim de semana. Falta evento gratuito."           |
| `source`       | enum string         | sim         | `email` | `in_app` (Lean cortou in_app, mas campo preservado pra Q3) |
| `cohort_month` | string (YYYY-MM)    | sim         | `2026-11`                                                            |
| `created_at`   | timestamp           | sim         | `2026-11-02T14:00:00Z`                                               |


**Análise:** classificação Promotor (9-10), Passivo (7-8), Detrator (0-6). NPS = %Promotor − %Detrator.

### 2.4 Newsletter_Subscriber

Assinantes da newsletter semanal (US-I16.1).


| Campo             | Tipo                | Obrigatório | Exemplo                                     |
| ----------------- | ------------------- | ----------- | ------------------------------------------- |
| `email`           | string (PK)         | sim         | "[pai@exemplo.com](mailto:pai@exemplo.com)" |
| `usuario_id`      | reference → Usuário | não         | `usr_a1b2c3d4`                              |
| `subscribed_at`   | timestamp           | sim         | `2026-10-15T18:30:00Z`                      |
| `unsubscribed_at` | timestamp           | não         | `null`                                      |
| `source`          | enum string         | sim         | `home_cta` | `signup_optin` | `imported`    |


**Observação:** `usuario_id` é opcional porque não-usuários cadastrados também podem assinar newsletter (CTA na home pra qualquer visitante).

---

## 3. Eventos GA4 (analytics)

Não são "entidades" no sentido transacional — são eventos disparados pelo frontend, capturados pelo GA4 + Google Tag Manager.

Detalhamento completo será documentado no Artefato 15 (Plano de analytics). Eventos críticos pro NSM (US-I8.2):


| Evento            | Payload                   | Quando dispara                                                              | KR                                     |
| ----------------- | ------------------------- | --------------------------------------------------------------------------- | -------------------------------------- |
| `attraction_view` | `{atracao_slug, bairro}`  | Ficha visível ≥50% por ≥2s                                                  | KR3.1 (componente do WAU planejadores) |
| `outbound_click`  | `{atracao_slug, partner}` | Clique no CTA "Comprar ingresso"                                            | KR4.3                                  |
| `share_click`     | `{atracao_slug, canal}`   | Clique no botão compartilhar                                                | KR4.2                                  |
| `filter_used`     | `{filter, value}`         | Pai aplica algum filtro                                                     | KR4.1                                  |
| `save_click`      | `{atracao_slug}`          | Clique no coração (favoritar) — Lean cortou tracking, story preserva pra Q3 | —                                      |


**Privacidade:** GA4 usa cliente anônimo. Nenhum dado pessoal é enviado.

---

## 4. Logs operacionais (arquivos JSON em /tmp ou Vercel Blob)

### 4.1 Import_Log

Histórico de imports via planilha S4.1.

json

```json
{
  "id": "imp_20260712_183245",
  "timestamp": "2026-07-12T18:32:45Z",
  "source_file": "planilha-jul-w3.xlsx",
  "linhas_processadas": 10,
  "linhas_criadas": 5,
  "linhas_atualizadas": 3,
  "linhas_erro": 2,
  "duration_ms": 4200,
  "errors": [
    { "linha": 5, "slug": "peter-pan-recreio", "erro": "idade_max vazio" },
    { "linha": 6, "slug": "monstros-do-zoo", "erro": "preço inválido (texto)" }
  ]
}
```

### 4.2 AI_Job_Log

Histórico de chamadas ao pipeline IA (US-S4.5).

json

```json
{
  "id": "ai_20260714_142100",
  "timestamp": "2026-07-14T14:21:00Z",
  "model": "gemini-flash-2.5",
  "atracao_slug": "chapeuzinho-vermelho-leblon",
  "input_tokens": 1820,
  "output_tokens": 480,
  "custo_estimado_brl": 0.012,
  "status": "success",
  "flags_geradas": ["INCERTO_data_estreia"]
}
```

---

## 5. Mapeamento Planilha S4 → schema Sanity Atração

A planilha de import (US-S4.1) tem 15 colunas que espelham 1:1 os campos do schema:


| Coluna planilha   | Campo Sanity                                  | Conversão                            |
| ----------------- | --------------------------------------------- | ------------------------------------ |
| `slug`            | `slug.current`                                | direto                               |
| `nome`            | `nome`                                        | direto                               |
| `categoria`       | `categoria`                                   | string → reference (busca pela slug) |
| `idade_min`       | `idade_min`                                   | string → number                      |
| `idade_max`       | `idade_max`                                   | string → number                      |
| `duracao_min`     | `duracao_min`                                 | string → number                      |
| `preco`           | `preco`                                       | R$ → centavos (40 → 4000)            |
| `link_compra`     | `link_compra`                                 | direto (validação URL)               |
| `bairro`          | `bairro`                                      | string → reference (busca pela slug) |
| `zona`            | (não vai pro schema — `Bairro` tem)           | usado pra criar Bairro se novo       |
| `indoor_outdoor`  | `indoor_outdoor`                              | enum validation                      |
| `status`          | `status`                                      | enum validation                      |
| `descricao`       | `descricao`                                   | direto                               |
| `mini_review`     | `mini_review`                                 | direto                               |
| `imagem_filename` | (não vai pro schema — referência pra US-S4.2) | usado pra pareamento de imagem       |


**5 campos extras** que NÃO vêm da planilha (são preenchidos automaticamente):

- `ai_generated`, `ai_model`, `pendente_imagem`, `pipeline_failed`, `fonte`, `partner` (deduzido do link_compra)

---

## 6. Convenções gerais

### Identificadores

- **Sanity:** todos os documentos têm `_id` automático (UUID v4) + slug humanamente legível
- **Banco transacional:** UUID v4 pra IDs internos, e-mail como chave secundária pra Usuário

### Timestamps

- Sempre em **UTC ISO 8601** (`2026-10-15T18:30:00Z`)
- Conversão pra fuso BRT é responsabilidade do frontend (`Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`)

### Strings de enum

- Sempre em **kebab-case lowercase** (`em_obras`, não `Em Obras` ou `EM_OBRAS`)
- Validação por Zod no parser de planilha (US-S4.1) e no schema Sanity

### Imagens

- Sempre via **Sanity Asset Pipeline** (CDN com transformações)
- Tamanho de referência: 1200x800 (3:2) pra cards, 1920x1080 pra hero
- Formato preferencial: WebP (Sanity converte automaticamente via URL params)
- Alt text: campo obrigatório em cada asset (a11y — WCAG AA)

### Preços

- Sempre em **centavos** (number) no banco
- Conversão pra R$ no frontend: `(preco / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- `preco = 0` = gratuito (renderiza "Grátis" em vez de "R$ 0,00")
- `preco = null` = "não informado"

### Soft delete

- Atrações que saem de cartaz: `status = 'encerrada'`, **não deletadas** do banco. Permitem análise histórica e SEO de URLs antigas com redirect ou aviso.

---

## 7. Próximos passos (post-MVP, Q3+)

Quando o MVP fechar e o produto crescer, esperar evolução em:

- **Localização precisa:** geocoding automático de `bairro + endereço completo` → `lat/lng` exato (hoje guardamos centro do bairro)
- **Variants de Atração:** mesma peça em vários teatros (mesma Atração, vários `Spetting` filhos com data/hora/local/preço próprios)
- **Curadores externos:** entidade `Curador` referenciando autoria de mini-reviews quando houver múltiplos editores
- **Comentários de pais:** entidade `Comment` com moderação (H10 do journey)
- **Avaliações de pais:** `Rating` (1-5 estrelas) por atração (H10 também)
- **Listas curadas:** entidade `Lista` (ex: "10 peças pra primeira ida ao teatro", "Programa de domingo gratuito") com referências a múltiplas Atrações

---

**Referências cruzadas:**

- US-S4.1 — Parser planilha → Sanity (este modelo é o destino do import)
- US-I2.1 — Schema Sanity de Atração (implementação direta da seção 1.1)
- US-I8.2 — Eventos NSM (seção 3)
- US-I14.x — Auth + Favoritos (seção 2.1 + 2.2)
- US-I16.x — Newsletter + NPS (seção 2.3 + 2.4)
- Artefato 7 (OKRs) — KRs cobertos
- Artefato 9 (Epics + Stories) — stories que tocam cada entidade

