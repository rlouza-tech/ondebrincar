/**
 * delete-expired-drafts.mjs
 * 
 * Lista ou deleta drafts do Sanity com proxima_data < hoje.
 * 
 * Uso:
 *   node scripts/delete-expired-drafts.mjs            → dry run (só lista)
 *   node scripts/delete-expired-drafts.mjs --delete   → deleta de verdade
 * 
 * Coloque este arquivo em scripts/ na raiz do projeto.
 * Requer SANITY_API_TOKEN com permissão de escrita no .env.local
 */

import { createClient } from '@sanity/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// — Lê .env.local —
const envPath = resolve(process.cwd(), '.env.local')
if (!existsSync(envPath)) {
  console.error('❌ .env.local não encontrado. Rode na raiz do projeto.')
  process.exit(1)
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const [key, ...rest] = line.split('=')
      return [key.trim(), rest.join('=').trim().replace(/^["']|["']$/g, '')]
    })
)

const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID || env.SANITY_PROJECT_ID
const dataset   = env.NEXT_PUBLIC_SANITY_DATASET    || env.SANITY_DATASET || 'production'
const token     = env.SANITY_API_TOKEN

if (!projectId || !token) {
  console.error('❌ SANITY_PROJECT_ID e SANITY_API_TOKEN são obrigatórios no .env.local')
  process.exit(1)
}

const DRY_RUN = !process.argv.includes('--delete')
const today   = new Date().toISOString().split('T')[0]

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2024-06-01',
  useCdn: false,
})

async function main() {
  console.log(`\nProjeto: ${projectId} / Dataset: ${dataset}`)
  console.log(`Buscando drafts com proxima_data < ${today}...\n`)

  const drafts = await client.fetch(
    `*[_id in path("drafts.**") && defined(proxima_data) && proxima_data < $hoje] | order(proxima_data asc) {
      _id, nome, proxima_data
    }`,
    { hoje: today }
  )

  if (drafts.length === 0) {
    console.log('✅ Nenhum draft expirado encontrado.')
    return
  }

  const label = DRY_RUN ? '[DRY RUN]' : '[DELETANDO]'
  console.log(`${label} ${drafts.length} draft(s) expirado(s):\n`)
  drafts.forEach((d, i) => {
    const nome = d.nome || '(sem nome)'
    console.log(`  ${String(i + 1).padStart(2)}. ${nome.padEnd(50)} ${d.proxima_data}`)
  })

  if (DRY_RUN) {
    console.log(`\n⚠️  Dry run — nenhum documento foi alterado.`)
    console.log(`   Para deletar: node scripts/delete-expired-drafts.mjs --delete\n`)
    return
  }

  // Deleta em transação
  console.log('\nIniciando transação...')
  const tx = client.transaction()
  drafts.forEach(d => tx.delete(d._id))
  await tx.commit()
  console.log(`\n✅ ${drafts.length} draft(s) deletado(s).`)
}

main().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
