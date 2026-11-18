import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { execute, sessionEnv } from './process.ts'

// Les cycles validés s'empilent sur un « tronc d'intégration » : une référence cachée (refs/orchestrator/<base>) du dépôt de travail.
// Elle ne touche ni la branche de base, ni le dossier de travail, ni un clone supplémentaire. `land` reprend ensuite ses commits dans la branche de base.
const gitArgs = ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgSign=false']
// Identité du committeur des commits intégrés (l'auteur reste celui du patch), pour ne rien exiger de la configuration Git de la machine.
const identity = { GIT_COMMITTER_NAME: 'GarageVerse Orchestrator', GIT_COMMITTER_EMAIL: 'orchestrator@garageverse.local' }

export const trunkRef = (base: string) => `refs/orchestrator/${base}`
const branchRef = (base: string) => `refs/heads/${base}`

const git = (repo: string, args: string[]) =>
  execute('git', [...gitArgs, ...args], { cwd: repo, env: { ...sessionEnv(), ...identity }, timeout: 60_000 })
async function text(repo: string, args: string[], label: string) {
  const result = await git(repo, args)
  if (result.code !== 0 || result.problem) throw new Error(label + ' · ' + (result.stderr || result.stdout || result.problem || '').trim().slice(0, 300))
  return result.stdout.trim()
}
const exists = async (repo: string, ref: string) => (await git(repo, ['show-ref', '--verify', '--quiet', ref])).code === 0
const isAncestor = async (repo: string, ancestor: string, descendant: string) =>
  (await git(repo, ['merge-base', '--is-ancestor', ancestor, descendant])).code === 0

// D'où part un cycle : la branche de base, ou le tronc s'il la prolonge (cycles déjà intégrés, pas encore repris).
export async function startPoint(repo: string, base: string): Promise<string> {
  if (!await exists(repo, branchRef(base))) throw new Error(`La branche ${base} est absente du dépôt`)
  if (!await exists(repo, trunkRef(base))) return branchRef(base)
  if (await isAncestor(repo, branchRef(base), trunkRef(base))) return trunkRef(base)
  if (await isAncestor(repo, trunkRef(base), branchRef(base))) return branchRef(base)
  throw new Error(`Le tronc d’intégration a divergé de ${base} : le reprendre avec « land » ou supprimer ${trunkRef(base)}`)
}

// Applique le patch d'un cycle sur le tronc, dans une copie de travail jetable : le dépôt de travail n'est jamais modifié.
export async function integratePatch(repo: string, base: string, patch: string, workRoot: string): Promise<string> {
  const start = await startPoint(repo, base)
  const dir = join(workRoot, 'integration-' + randomUUID().slice(0, 8))
  await text(repo, ['worktree', 'add', '--detach', dir, start], 'Copie de travail')
  try {
    const applied = await git(dir, ['am', '--3way', patch])
    if (applied.code !== 0 || applied.problem) {
      await git(dir, ['am', '--abort'])
      throw new Error('Intégration · le patch ne s’applique plus sur la branche de base')
    }
    const head = await text(dir, ['rev-parse', 'HEAD'], 'Commit intégré')
    await text(repo, ['update-ref', trunkRef(base), head], 'Tronc d’intégration')
    return head
  } finally {
    await git(repo, ['worktree', 'remove', '--force', dir])
    await rm(dir, { recursive: true, force: true })
    await git(repo, ['worktree', 'prune'])
  }
}

// Reprend les commits du tronc dans la branche de base du dépôt de travail (avance rapide, ou reprise commit par commit si la
// branche a avancé entre-temps), puis supprime le tronc. Renvoie la liste des commits repris. Le push reste manuel.
export async function land(repo: string, base: string): Promise<string[]> {
  if (!await exists(repo, trunkRef(base))) throw new Error('Aucun cycle intégré à reprendre')
  if (await text(repo, ['branch', '--show-current'], 'Branche active') !== base) throw new Error(`Se placer d’abord sur la branche ${base}`)
  if (await text(repo, ['status', '--porcelain'], 'État du dépôt')) throw new Error('Le dépôt a des modifications non commitées')
  if (await isAncestor(repo, trunkRef(base), branchRef(base))) {
    await text(repo, ['update-ref', '-d', trunkRef(base)], 'Suppression du tronc')
    return []
  }
  const common = await text(repo, ['merge-base', branchRef(base), trunkRef(base)], 'Ancêtre commun')
  const commits = (await text(repo, ['log', '--reverse', '--format=%h %s', `${common}..${trunkRef(base)}`], 'Commits à reprendre')).split('\n').filter(Boolean)
  if (await isAncestor(repo, branchRef(base), trunkRef(base))) await text(repo, ['merge', '--ff-only', trunkRef(base)], 'Avance rapide')
  else {
    const picked = await git(repo, ['cherry-pick', `${common}..${trunkRef(base)}`])
    if (picked.code !== 0 || picked.problem) {
      await git(repo, ['cherry-pick', '--abort'])
      throw new Error('Reprise · conflit avec la branche ' + base + ', tronc conservé')
    }
  }
  await text(repo, ['update-ref', '-d', trunkRef(base)], 'Suppression du tronc')
  return commits
}
