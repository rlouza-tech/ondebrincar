# I2.3 — Temporalidade no schema Atração

**Data:** 2026-05-20  
**Story:** US-I2.3

## Decisão

Três campos híbridos no schema `atracao`:

| Campo | Tipo | Papel |
|-------|------|-------|
| `tipo_programacao` | enum | UI condicional e filtros futuros |
| `programacao_texto` | string (5–200 chars) | Frase legível para o pai — cobre ~95% dos casos |
| `proxima_data` | date opcional | Destaque de próxima sessão em eventos pontuais |

## Por quê não 5+ campos estruturados

`dias_semana`, `horario_abertura`, `data_fim_cartaz` etc. exigiriam parsing frágil da coluna `dias_apresentacao` do Clubinho (texto livre, inconsistente). MVP Lean: IA infere tipo + texto + data opcional; curador refina no Studio.

## Por quê não 1 campo único

`programacao_texto` sozinho não permite:
- render condicional na ficha ("Próxima sessão: …")
- filtros futuros por tipo (permanente vs evento)
- validação editorial separada

## Pipeline

`dias_apresentacao` da planilha origem passa a ser input explícito do prompt Gemini. Quality gate valida enum, tamanho do texto e formato ISO de `proxima_data`.

## Migração dos 3 drafts sandbox

CLI `pnpm update-drafts-programacao --latest --limit 3` patcha drafts existentes a partir do CSV enriquecido re-gerado pela pipeline. Idempotente: skip se `programacao_texto` já preenchido.

## Trade-offs

| Escolha | Prós | Contras |
|---------|------|---------|
| Texto livre + enum | Simples, cobre Clubinho | Menos queryável que campos estruturados |
| `proxima_data` opcional | Destaque útil na ficha | IA pode errar mês — curador revisa |
| Defaults no mapper frontend | Docs antigos não quebram | Texto genérico até migração |
