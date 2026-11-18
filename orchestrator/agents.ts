import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execute, failure, redact, sessionEnv } from './process.ts'
import type { RunOptions } from './process.ts'

export type Phase = 'plan' | 'implement' | 'ux' | 'critique' | 'review'
export type Report = {
  status: 'pass' | 'changes' | 'blocked'
  summary: string
  criteria: string[]
  findings: string[]
  evidence: string[]
  patch: string
}

const textList = { type: 'array', items: { type: 'string' } }
const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['pass', 'changes', 'blocked'] },
    summary: { type: 'string' }, criteria: textList, findings: textList, evidence: textList, patch: { type: 'string' },
  },
  required: ['status', 'summary', 'criteria', 'findings', 'evidence', 'patch'],
}
export function reportFrom(value: unknown, phase: Phase): Report {
  if (!value || typeof value !== 'object') throw new Error('Rapport JSON absent')
  const r = value as Report
  if (!['pass', 'changes', 'blocked'].includes(r.status) || typeof r.summary !== 'string' ||
      !r.summary.trim() || typeof r.patch !== 'string' || r.patch.length > 150_000 ||
      ![r.criteria, r.findings, r.evidence].every(list => Array.isArray(list) && list.every(item => typeof item === 'string'))) {
    throw new Error('Rapport JSON invalide')
  }
  // Un rapport bavard est tronqué plutôt que rejeté : le cycle ne doit pas se bloquer sur une longueur.
  r.summary = r.summary.slice(0, 1500)
  for (const key of ['criteria', 'findings', 'evidence'] as const) r[key] = r[key].slice(0, 20).map(item => item.slice(0, 1000))
  if (phase === 'plan' && r.status === 'pass' && !r.criteria.length) throw new Error('Critères d’acceptation absents')
  return { status: r.status, summary: redact(r.summary), criteria: r.criteria.map(redact),
    findings: r.findings.map(redact), evidence: r.evidence.map(redact), patch: phase === 'implement' ? r.patch : '' }
}

// Un maillon = un moteur (CLI) et, facultativement, un modèle. Chaque phase a une chaîne ordonnée : si le maillon courant est à court de
// quota, sans session ou sans le modèle demandé, l'appel est rejoué sur le suivant, sur la même étape. `model` absent = modèle par défaut du CLI.
export type Engine = 'claude' | 'codex' | 'agy'
export type Link = { engine: Engine; model?: string }
export type Chains = Partial<Record<Phase, Link[]>>

// Moteurs que chaque phase sait piloter : implémentation = copie jetable (Codex, relais Claude), revue visuelle = captures (Antigravity, relais
// Claude), plan et revue = Claude sans outils, contre-revue = diff dans le prompt (Antigravity ou Claude).
export const ENGINES: Record<Phase, Engine[]> = {
  plan: ['claude'], implement: ['codex', 'claude'], ux: ['agy', 'claude'], critique: ['agy', 'claude'], review: ['claude'],
}
export const DEFAULT_CHAINS: Record<Phase, Link[]> = {
  plan: [{ engine: 'claude', model: 'claude-opus-5-5' }, { engine: 'claude', model: 'claude-sonnet-5-5' }],
  implement: [{ engine: 'codex' }, { engine: 'claude', model: 'claude-opus-5-5' }, { engine: 'claude', model: 'claude-sonnet-5-5' }],
  ux: [{ engine: 'agy' }, { engine: 'agy', model: 'gemini-4-hydrogen-high' }, { engine: 'agy', model: 'gemini-3.8-flash-high' },
    { engine: 'agy', model: 'claude-sonnet-5-5-high' }, { engine: 'agy', model: 'claude-opus-5-5-high' },
    { engine: 'claude', model: 'claude-opus-5-5' }, { engine: 'claude', model: 'claude-sonnet-5-5' }],
  critique: [{ engine: 'agy' }, { engine: 'agy', model: 'gemini-4-hydrogen-high' }, { engine: 'agy', model: 'gemini-3.8-flash-high' },
    { engine: 'agy', model: 'claude-sonnet-5-5-high' }, { engine: 'agy', model: 'claude-opus-5-5-high' }],
  review: [{ engine: 'claude', model: 'claude-opus-5-5' }, { engine: 'claude', model: 'claude-sonnet-5-5' }],
}
export const chainFor = (chains: Chains | undefined, phase: Phase) => chains?.[phase] ?? DEFAULT_CHAINS[phase]
export const describeLink = (link: Link) => link.engine + (link.model ? ' · ' + link.model : ' · modèle par défaut')

// Profil d'une tâche : il décide de l'ordre des modèles à l'intérieur de chaque moteur. `heavy` passe les modèles les plus forts en premier,
// `light` les plus économes ; l'ordre des moteurs (Codex avant Claude, Antigravity avant Claude) ne change jamais.
export type Profile = 'light' | 'standard' | 'heavy'
export const PROFILES: Profile[] = ['light', 'standard', 'heavy']
type Sizing = { profile?: Profile; brief: string; requirements: string[]; paths: string[]; flow?: unknown[] }

// Une tâche explicite son profil ; sinon il vient de sa taille. Une correction déjà ratée monte toujours en `heavy`.
export function profileFor(task: Sizing, correction = 0): Profile {
  if (correction > 0) return 'heavy'
  if (task.profile) return task.profile
  const flow = task.flow?.length ?? 0
  if (task.requirements.length > 6 || task.paths.length > 3 || task.brief.length > 1500 || flow > 8 || task.paths.some(path => path.startsWith('supabase/'))) return 'heavy'
  if (task.requirements.length <= 2 && task.paths.length <= 1 && task.brief.length < 500 && !flow) return 'light'
  return 'standard'
}

// Sans modèle précisé, le CLI utilise son modèle principal : on le compte parmi les forts.
const tierOf = (link: Link): 0 | 1 => /sonnet|flash|haiku|low|medium/i.test(link.model ?? '') ? 1 : 0

export function orderChain(chain: Link[], profile: Profile): Link[] {
  if (profile === 'standard') return chain
  const ordered: Link[] = []
  for (let start = 0; start < chain.length;) {
    let end = start
    while (end < chain.length && chain[end].engine === chain[start].engine) end++
    const run = chain.slice(start, end)
    const strongFirst = profile === 'heavy'
    ordered.push(...run.map((link, index) => ({ link, index }))
      .sort((a, b) => (strongFirst ? tierOf(a.link) - tierOf(b.link) : tierOf(b.link) - tierOf(a.link)) || a.index - b.index)
      .map(entry => entry.link))
    start = end
  }
  return ordered
}

export function validateChains(chains: Chains | undefined) {
  if (chains === undefined) return
  if (!chains || typeof chains !== 'object' || Array.isArray(chains)) throw new Error('Chaînes de modèles invalides')
  for (const [phase, chain] of Object.entries(chains)) {
    if (!(phase in ENGINES) || !Array.isArray(chain) || !chain.length || chain.length > 8 ||
        !chain.every(link => link && typeof link === 'object' && ENGINES[phase as Phase].includes(link.engine) &&
          (link.model === undefined || (typeof link.model === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(link.model))))) {
      throw new Error('Chaîne de modèles invalide pour la phase ' + phase)
    }
  }
}

// Le maillon n'a pas pu répondre (quota, session, modèle absent, surcharge) : on passe au suivant plutôt que de bloquer le cycle.
const unavailable = /quota|RESOURCE_EXHAUSTED|rate.?limit|usage.?limit|overloaded|\b(?:429|529)\b|not logged in|authentication|authentification|invalid api key|invalid model|model[^\n]{0,40}(?:not found|not available|unavailable|not supported)/i

type Binaries = Record<Engine, string>
type Attempt = { report?: Report; tokens?: number; problem?: string; unavailable?: boolean }

async function attempt(
  phase: Phase, link: Link, binaries: Binaries, prompt: string,
  step: string, options: RunOptions, budget: number, evidenceProgram: string,
): Promise<Attempt> {
  const { engine } = link
  const modelArgs = link.model ? ['--model', link.model] : []
  const schemaFile = join(step, 'report.schema.json')
  await writeFile(schemaFile, JSON.stringify(schema), { mode: 0o600 })
  let binary: string, args: string[], input: string | undefined
  let cwd = options.cwd
  const env = sessionEnv()
  const codex = phase === 'implement' && engine === 'codex'
  if (codex) {
    binary = binaries.codex
    args = ['--ask-for-approval', 'never', 'exec', ...modelArgs, '--ignore-user-config', '--sandbox', 'workspace-write',
      '--ephemeral', '--json', '--output-schema', schemaFile,
      '-c', 'mcp_servers={}', '-c', 'allow_login_shell=false', '-c', 'shell_environment_policy.inherit="core"', '-']
    input = prompt
  } else if (phase === 'critique' && engine === 'agy') {
    // Contre-revue du diff par Antigravity : le diff est dans le prompt, aucun outil n'est permis.
    binary = binaries.agy
    cwd = join(step, 'critique')
    await mkdir(cwd, { recursive: true, mode: 0o700 })
    const settings = { permissions: { deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)', 'mcp(*)'] } }
    args = [...modelArgs, '--sandbox', '--mode', 'plan', '--disable-slash-commands', '--log-file', '/dev/null', '--settings', JSON.stringify(settings),
      '--print-timeout', `${Math.max(1, Math.floor(options.timeout / 1000) - 2)}s`,
      '--output-format', 'json', '--json-schema', schemaFile, '-p', prompt]
  } else if (phase === 'ux' && engine === 'claude') {
    // Relais d'Antigravity : Claude relit les mêmes captures par le même serveur MCP, et n'a aucun autre outil.
    binary = binaries.claude
    cwd = join(step, 'visual-review-claude')
    await mkdir(cwd, { recursive: true, mode: 0o700 })
    const mcp = join(cwd, 'mcp.json')
    await writeFile(mcp, JSON.stringify({ mcpServers: { garageverse: { command: process.execPath, args: [evidenceProgram, step] } } }), { mode: 0o600 })
    args = [...modelArgs, '--print', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
      '--permission-mode', 'dontAsk', '--tools', '', '--mcp-config', mcp, '--strict-mcp-config',
      '--allowedTools', 'mcp__garageverse__inspect_capture', '--setting-sources', '',
      '--no-session-persistence', '--no-chrome', '--max-budget-usd', String(budget)]
    input = prompt
  } else if (phase === 'ux') {
    binary = binaries.agy
    cwd = join(step, 'visual-review')
    await mkdir(join(cwd, '.agents'), { recursive: true, mode: 0o700 })
    await writeFile(join(cwd, '.agents', 'mcp_config.json'), JSON.stringify({
      mcpServers: { garageverse: { command: process.execPath, args: [evidenceProgram, step] } },
    }), { mode: 0o600 })
    const settings = {
      permissions: {
        deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)'],
        allow: ['mcp(garageverse/inspect_capture)'],
      },
    }
    args = [...modelArgs, '--sandbox', '--mode', 'plan', '--disable-slash-commands', '--log-file', '/dev/null', '--settings', JSON.stringify(settings),
      '--print-timeout', `${Math.max(1, Math.floor(options.timeout / 1000) - 2)}s`,
      '--output-format', 'json', '--json-schema', schemaFile, '-p', prompt]
  } else {
    binary = binaries.claude
    // En relais de Codex, Claude édite la copie jetable et ne peut lancer que la vérification de typage.
    const relay = phase === 'implement'
    if (!relay) cwd = step
    args = [...modelArgs, '--print', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
      ...(relay
        ? ['--permission-mode', 'acceptEdits', '--tools', 'Read,Edit,Write,Glob,Grep,Bash',
          '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash(node node_modules/.bin/vue-tsc --noEmit)']
        : ['--permission-mode', 'plan', '--tools', '']),
      '--strict-mcp-config', '--setting-sources', '',
      '--no-session-persistence', '--no-chrome', '--max-budget-usd', String(relay ? budget * 3 : budget)]
    input = prompt
  }

  let tokens: number | undefined, final: unknown
  const addUsage = (usage: unknown) => {
    if (!usage || typeof usage !== 'object') return
    const numbers = usage as Record<string, number>
    const value = numbers.total_tokens ??
      ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']
        .reduce((sum, key) => sum + (Number.isSafeInteger(numbers[key]) ? numbers[key] : 0), 0)
    if (Number.isSafeInteger(value) && value >= 0) tokens = (tokens ?? 0) + value
  }
  const result = await execute(binary, args, {
    ...options, cwd, env, input,
    onLine: codex ? line => {
      try {
        const event = JSON.parse(line)
        if (event.type === 'turn.completed') addUsage(event.usage)
        if (event.type === 'item.completed' && event.item?.type === 'agent_message') final = event.item.text
      } catch {}
    } : undefined,
  })
  if (!codex) {
    try {
      const json = JSON.parse(result.stdout)
      addUsage(json.usage)
      if (!json.is_error && ((phase !== 'ux' && phase !== 'critique') || engine === 'claude' || json.status === 'SUCCESS')) final = json.structured_output
    } catch {}
  }
  const output = result.stdout + '\n' + result.stderr
  // Bac à sable de Codex indisponible (bwrap sans espaces de noms utilisateur, par exemple dans un conteneur) : maillon suivant.
  if (codex && /bwrap:|unprivileged_userns|user namespace/i.test(output)) return { tokens, problem: 'bac à sable Codex indisponible', unavailable: true }
  // Quota, session, surcharge ou modèle absent : le maillon suivant de la chaîne reprend la même étape.
  if (!final && (unavailable.test(output) || /quota|authentification/.test(failure(result)))) {
    return { tokens, problem: failure(result), unavailable: true }
  }
  if (result.problem || result.code !== 0) return { problem: failure(result), tokens }
  try {
    const report = reportFrom(typeof final === 'string' ? JSON.parse(final) : final, phase)
    if (phase === 'ux' && report.status !== 'blocked') {
      const observed = (await readFile(join(step, 'inspected.ndjson'), 'utf8').catch(() => '')).split('\n')
        .filter(Boolean).map(line => JSON.parse(line))
      if (!observed.some(file => /^320-/.test(file)) || !observed.some(file => /^390-/.test(file)) || !observed.some(file => /^1280-/.test(file))) {
        return { problem: 'La revue visuelle n’a pas consulté les captures des trois formats (320, 390 et 1280 px)', tokens }
      }
    }
    return { report, tokens }
  } catch (error) {
    return { problem: failure(result) === 'code de sortie 0' ? (error as Error).message : failure(result), tokens }
  }
}

// Parcourt la chaîne de la phase jusqu'au premier maillon qui répond. Les jetons de tous les essais sont cumulés ; `switched` nomme le maillon
// de relais quand ce n'est pas le premier. Un échec qui n'est pas une indisponibilité (délai, rapport invalide) n'est pas rejoué sur un autre modèle.
export async function invoke(
  phase: Phase, binaries: Binaries, prompt: string, step: string, options: RunOptions, budget: number, evidenceProgram: string,
  chain: Link[] = DEFAULT_CHAINS[phase],
): Promise<{ report?: Report; tokens?: number; problem?: string; switched?: string }> {
  let tokens: number | undefined
  const tried: string[] = []
  for (const [index, link] of chain.entries()) {
    const reply = await attempt(phase, link, binaries, prompt, step, options, budget, evidenceProgram)
    if (reply.tokens !== undefined) tokens = (tokens ?? 0) + reply.tokens
    tried.push(describeLink(link) + ' (' + (reply.problem ?? 'indisponible') + ')')
    if (reply.unavailable) continue
    const switched = index > 0 ? describeLink(link) : undefined
    if (switched) reply.report?.evidence.push(`Modèle de relais (${phase}) : ${switched}`)
    return { report: reply.report, problem: reply.problem, tokens, switched }
  }
  return { problem: 'aucun modèle disponible · ' + tried.join(' ; '), tokens }
}
