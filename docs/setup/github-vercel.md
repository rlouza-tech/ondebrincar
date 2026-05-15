# Setup GitHub + Vercel (US-S2.2)

Checklist manual para critérios de aceite que dependem das contas GitHub e Vercel.

## 1. Repositório GitHub privado

```bash
# Com GitHub CLI instalado e autenticado:
gh repo create ondebrincar --private --source=. --remote=origin --push
```

Ou: GitHub → **New repository** → nome `ondebrincar`, privado, sem README (já existe localmente).

```bash
git remote add origin git@github.com:rlouza-tech/ondebrincar.git
git push -u origin main
```

## 2. Projeto Vercel

1. [vercel.com/new](https://vercel.com/new) → importar `ondebrincar`.
2. Framework: **Next.js**; build: `pnpm build`; install: `pnpm install`.
3. Confirmar deploy de `main` e webhook em **Settings → Git**.

Preview por PR é automático quando o projeto está ligado ao repo.

## 3. Proteção da branch `main`

GitHub → **Settings → Branches → Add rule**:

- Branch name pattern: `main`
- **Require a pull request before merging** (1 approval)
- **Require status checks to pass** → selecionar job `lint-and-test` (após o primeiro PR com CI verde)
- **Do not allow bypassing**

## Validação dos ACs

| AC | Como validar |
|----|----------------|
| Repo + README | `github.com/rlouza-tech/ondebrincar` com este README |
| Vercel + webhook | Deploy em Production após push; Git integration ativa |
| Actions em PR | PR aberto → workflow CI verde |
| Preview URL | Comentário do Vercel bot no PR com link |
| `main` protegida | Push direto bloqueado; merge só via PR aprovado |
