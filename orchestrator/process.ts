import { spawn } from 'node:child_process'

export type RunOptions = {
  cwd: string
  timeout: number
  signal?: AbortSignal
  input?: string
  env?: NodeJS.ProcessEnv
  onLine?: (line: string) => void
}

export type Result = { code: number | null; stdout: string; stderr: string; problem?: string }

const maxOutput = 4 * 1024 * 1024

export function stopProcess(pid: number | undefined, signal: NodeJS.Signals = 'SIGTERM') {
  if (!pid) return
  try { process.kill(-pid, signal) } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
  }
}

export async function execute(command: string, args: string[], options: RunOptions): Promise<Result> {
  if (options.signal?.aborted) return { code: null, stdout: '', stderr: '', problem: 'arrêt demandé' }
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd, env: options.env, detached: true, stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = '', stderr = '', pending = '', bytes = 0
    let problem: string | undefined
    let killTimer: ReturnType<typeof setTimeout> | undefined
    const terminate = (reason: string) => {
      if (problem) return
      problem = reason
      stopProcess(child.pid)
      killTimer = setTimeout(() => stopProcess(child.pid, 'SIGKILL'), 1500)
      killTimer.unref()
    }
    const abort = () => terminate('arrêt demandé')
    const timer = setTimeout(() => terminate('délai dépassé'), options.timeout)
    options.signal?.addEventListener('abort', abort, { once: true })
    child.stdout.setEncoding('utf8').on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk)
      if (bytes > maxOutput) return terminate('volume de sortie dépassé')
      stdout += chunk
      if (!options.onLine) return
      pending += chunk
      const lines = pending.split('\n')
      pending = lines.pop() ?? ''
      for (const line of lines) options.onLine(line)
    })
    child.stderr.setEncoding('utf8').on('data', (chunk: string) => {
      bytes += Buffer.byteLength(chunk)
      if (bytes > maxOutput) return terminate('volume de sortie dépassé')
      stderr += chunk
    })
    child.stdin.on('error', () => {})
    child.stdin.end(options.input)
    child.on('error', (error: NodeJS.ErrnoException) => {
      problem ??= error.code === 'ENOENT' ? 'exécutable introuvable' : 'échec du lancement'
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (killTimer) {
        clearTimeout(killTimer)
        stopProcess(child.pid, 'SIGKILL')
      }
      options.signal?.removeEventListener('abort', abort)
      if (pending) options.onLine?.(pending)
      resolve({ code, stdout, stderr, problem: problem ?? (signal ? 'processus interrompu' : undefined) })
    })
  })
}

const secrets = Object.entries(process.env)
  .filter(([name, value]) => /TOKEN|SECRET|PASSWORD|API.?KEY|CREDENTIAL/i.test(name) && (value?.length ?? 0) >= 8)
  .map(([, value]) => value!)

export function redact(text: string) {
  for (const value of secrets) text = text.replaceAll(value, '[masqué]')
  return text
    .replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w-]{12,}|github_pat_[\w-]{12,}|AIza[\w-]{20,}|ya29\.[\w.-]{12,}|eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{6,})\b/g, '[masqué]')
    .replace(/\bBearer\s+[\w.+\/=-]+/gi, 'Bearer [masqué]')
    .replace(/((?:["']?(?:[\w-]*(?:token|secret|password|api[_-]?key)|authorization|cookie)["']?)\s*[:=]\s*)(["']?)[^\s"',;{}]+\2/gi, '$1[masqué]')
    .replace(/https?:\/\/[^/\s@]+@/gi, '[URL masquée]@')
}

export function sessionEnv(): NodeJS.ProcessEnv {
  const entries = Object.entries(process.env).filter(([key]) =>
    /^(PATH|HOME|USER|LOGNAME|TMPDIR|LANG|LC_\w+|TERM|XDG_CONFIG_HOME|XDG_DATA_HOME|XDG_CACHE_HOME|CODEX_HOME|CLAUDE_CONFIG_DIR)$/.test(key))
  return { ...Object.fromEntries(entries), NO_COLOR: '1', GIT_TERMINAL_PROMPT: '0' }
}

export function failure(result: Result) {
  if (result.problem) return result.problem
  const text = result.stderr + '\n' + result.stdout
  if (/not logged in|not authenticated|authentication required|login required|unauthorized|\b401\b|invalid api key|please (?:run|log in|sign in)/i.test(text)) return 'authentification nécessaire'
  if (/rate.limit|quota|usage.limit|\b429\b|budget.limit/i.test(text)) return 'quota ou budget atteint'
  if (/permission|sandbox|operation not permitted|access denied/i.test(text)) return 'permission ou confinement refusé'
  return `code de sortie ${result.code ?? 'inconnu'}`
}
