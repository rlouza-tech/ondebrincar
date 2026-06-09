# US-O1.1 — Painel de atrações vencidas

**Epic:** O — Operações editoriais  
**Status:** Ready  
**Estimativa:** 5 SP  
**Data de criação:** 2026-05-28  

---

## Persona + cenário

Rafael (editor/admin) abre o Studio e quer uma visão rápida de quais atrações já passaram da `proxima_data`. Hoje ele não tem como saber quais estão desatualizadas sem olhar manualmente ficha por ficha. O objetivo é ter uma interface que mostre esses registros agrupados e permita deletar os que não fazem mais sentido manter — sem precisar rodar scripts no terminal.

---

## Acceptance Criteria

**AC1 — Listagem automática**  
Ao acessar o painel, o sistema consulta o Sanity e exibe todas as atrações (publicadas e drafts) onde `proxima_data` é anterior à data de hoje.

**AC2 — Informações por item**  
Cada linha exibe: nome, bairro, `proxima_data`, e status (publicado / draft).

**AC3 — Seleção e deleção**  
O usuário consegue selecionar um ou mais itens e acionar "Deletar selecionados". O sistema pede confirmação antes de executar.

**AC4 — Feedback da operação**  
Após deletar, a lista é atualizada e exibe o número de itens removidos.

**AC5 — Estado vazio**  
Se não houver itens vencidos, o painel exibe mensagem: "Nenhuma atração vencida encontrada."

**AC6 — Acesso**  
O painel é acessível via `/admin/vencidos` no app Next.js. Não requer login externo — é protegido pela mesma variável `SANITY_API_TOKEN` (operação local/admin).

---

## Assumptions

- `proxima_data` está preenchida apenas em atrações do tipo `programacao: pontual`. Atrações permanentes (`em_cartaz`) não têm `proxima_data` e não aparecem no painel.
- A deleção remove o documento inteiro (publicado + draft se existir ambos). Não arquiva.
- A rota `/admin/vencidos` não será indexada (robots noindex) e não precisa de autenticação além do token já presente no `.env.local`.
- O painel não precisa de paginação no MVP — o volume esperado é baixo (< 50 itens por vez).

---

## Implementação sugerida

**Rota:** `app/admin/vencidos/page.tsx` (Server Component para fetch inicial + Client Component para interação)

**Fluxo:**
1. Server Component faz fetch no Sanity via `sanityWriteClient` com a query de vencidos.
2. Exibe lista com checkboxes (Client Component).
3. Botão "Deletar selecionados" chama uma Server Action que executa `sanityWriteClient.delete(id)` para cada ID selecionado.
4. Após deleção, revalida a rota (`revalidatePath`).

**Query GROQ:**
```groq
*[_type == "atracao" && defined(proxima_data) && proxima_data < $hoje]
| order(proxima_data asc)
{ _id, nome, bairro, proxima_data }
```

---

## Definition of Done

- [ ] AC1–AC6 verificados manualmente
- [ ] Testado com 0 itens vencidos (estado vazio)
- [ ] Testado com seleção parcial e deleção confirmada
- [ ] Build e lint verdes
- [ ] Rota com `noindex` no metadata
