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

export async function invoke(
  phase: Phase, binaries: Record<'claude' | 'codex' | 'agy', string>, prompt: string,
  step: string, options: RunOptions, budget: number, evidenceProgram: string, engine: 'codex' | 'claude' = 'codex',
): Promise<{ report?: Report; tokens?: number; problem?: string; relay?: boolean }> {
  // engine 'codex' : agents principaux (Codex pour l'implémentation, Antigravity pour la revue visuelle) ; 'claude' : relais Claude.
  const schemaFile = join(step, 'report.schema.json')
  await writeFile(schemaFile, JSON.stringify(schema), { mode: 0o600 })
  let binary: string, args: string[], input: string | undefined
  let cwd = options.cwd
  const env = sessionEnv()
  const codex = phase === 'implement' && engine === 'codex'
  if (codex) {
    binary = binaries.codex
    args = ['--ask-for-approval', 'never', 'exec', '--ignore-user-config', '--sandbox', 'workspace-write',
      '--ephemeral', '--json', '--output-schema', schemaFile,
      '-c', 'mcp_servers={}', '-c', 'allow_login_shell=false', '-c', 'shell_environment_policy.inherit="core"', '-']
    input = prompt
  } else if (phase === 'critique') {
    // Contre-revue du diff par Antigravity : le diff est dans le prompt, aucun outil n'est permis.
    binary = binaries.agy
    cwd = join(step, 'critique')
    await mkdir(cwd, { recursive: true, mode: 0o700 })
    const settings = { permissions: { deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)', 'mcp(*)'] } }
    args = ['--sandbox', '--mode', 'plan', '--disable-slash-commands', '--log-file', '/dev/null', '--settings', JSON.stringify(settings),
      '--print-timeout', `${Math.max(1, Math.floor(options.timeout / 1000) - 2)}s`,
      '--output-format', 'json', '--json-schema', schemaFile, '-p', prompt]
  } else if (phase === 'ux' && engine === 'claude') {
    // Relais d'Antigravity : Claude relit les mêmes captures par le même serveur MCP, et n'a aucun autre outil.
    binary = binaries.claude
    cwd = join(step, 'visual-review-claude')
    await mkdir(cwd, { recursive: true, mode: 0o700 })
    const mcp = join(cwd, 'mcp.json')
    await writeFile(mcp, JSON.stringify({ mcpServers: { garageverse: { command: process.execPath, args: [evidenceProgram, step] } } }), { mode: 0o600 })
    args = ['--print', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
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
    args = ['--sandbox', '--mode', 'plan', '--disable-slash-commands', '--log-file', '/dev/null', '--settings', JSON.stringify(settings),
      '--print-timeout', `${Math.max(1, Math.floor(options.timeout / 1000) - 2)}s`,
      '--output-format', 'json', '--json-schema', schemaFile, '-p', prompt]
  } else {
    binary = binaries.claude
    // En relais de Codex, Claude édite la copie jetable et ne peut lancer que la vérification de typage.
    const relay = phase === 'implement'
    if (!relay) cwd = step
    args = ['--print', '--output-format', 'json', '--json-schema', JSON.stringify(schema),
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
  // Bac à sable de Codex indisponible (bwrap sans espaces de noms utilisateur, par exemple dans un conteneur) : Claude prend le relais.
  if (codex && /bwrap:|unprivileged_userns|user namespace/i.test(output)) {
    const reply = await invoke(phase, binaries, prompt, step, options, budget, evidenceProgram, 'claude')
    return { ...reply, tokens: (tokens ?? 0) + (reply.tokens ?? 0), relay: true }
  }
  // Antigravity à court de quota ou de session pour la revue visuelle : Claude la reprend, avec les mêmes captures.
  if (phase === 'ux' && engine === 'codex' && !final && /quota|RESOURCE_EXHAUSTED|\b429\b|not logged in|authentication/i.test(output)) {
    const reply = await invoke(phase, binaries, prompt, step, options, budget, evidenceProgram, 'claude')
    return { ...reply, tokens: (tokens ?? 0) + (reply.tokens ?? 0), relay: true }
  }
  if (result.problem || result.code !== 0) {
    const problem = failure(result)
    // Quota ou session Codex indisponible : Claude prend le relais dans la même copie de travail.
    if (codex && /quota|authentification/.test(problem)) {
      const reply = await invoke(phase, binaries, prompt, step, options, budget, evidenceProgram, 'claude')
      return { ...reply, tokens: (tokens ?? 0) + (reply.tokens ?? 0), relay: true }
    }
    return { problem, tokens }
  }
  try {
    const report = reportFrom(typeof final === 'string' ? JSON.parse(final) : final, phase)
    if (phase === 'ux' && report.status !== 'blocked') {
      const observed = (await readFile(join(step, 'inspected.ndjson'), 'utf8').catch(() => '')).split('\n')
        .filter(Boolean).map(line => JSON.parse(line))
      if (!observed.some(file => /^320-/.test(file)) || !observed.some(file => /^390-/.test(file)) || !observed.some(file => /^1280-/.test(file))) {
        return { problem: 'Antigravity n’a pas consulté les captures des trois formats (320, 390 et 1280 px)', tokens }
      }
    }
    return { report, tokens }
  } catch (error) {
    return { problem: failure(result) === 'code de sortie 0' ? (error as Error).message : failure(result), tokens }
  }
}
