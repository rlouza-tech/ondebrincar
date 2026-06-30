# ADR: Nunca criar funções nomeadas dentro de `page.evaluate`

**Data:** 2026-06-25  
**Status:** Aceito  
**Contexto:** Bug descoberto durante o pipeline Sympla (US-S15)

---

## Problema

`tsx` compila TypeScript com `keepNames: true` hardcoded (esbuild ~0.28). Isso faz o esbuild injetar um helper `__name` no topo do módulo Node para preservar o `.name` de funções. O problema: qualquer função nomeada — incluindo `const foo = () => {}` (nome inferido da variável) — recebe `__name(fn, "foo")` no código compilado.

Quando o Playwright serializa uma função passada a `page.evaluate(fn)`, ele extrai só o corpo da função via `.toString()`. O helper `__name` não vai junto — fica no escopo do módulo Node. O browser executa o código e quebra com `ReferenceError: __name is not defined`.

## Exemplo que quebra

```typescript
page.evaluate(() => {
  const parsePriceCents = (text: string) => { ... }; // ← __name injetado aqui
  // ...
});
```

Compilado pelo tsx vira:
```javascript
page.evaluate(() => {
  const parsePriceCents = __name((text) => { ... }, "parsePriceCents"); // browser não conhece __name
});
```

## Decisão

**Dentro de callbacks de `page.evaluate`, nunca criar funções nomeadas** — nem `function foo()`, nem `const foo = () => {}`.

Alternativas válidas:
- **Inline a lógica** diretamente no loop/expressão (preferido)
- **Passar dados como argumento** e processar fora do evaluate
- Funções anônimas passadas diretamente como argumento (ex: `.map(x => x * 2)`) são seguras — não têm nome inferido

## Consequência

O helper `parsePriceCents` da `extrairPrecos` foi removido e sua lógica inlining no loop `for...of`. Bug corrigido em 2026-06-25.

## Rastreabilidade

- Commit do bug: `d4a454b` (feat: US-S15)  
- Commit do fix: aplicado diretamente em `main` via sessão de pipeline
