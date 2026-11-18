// Une file commune partage les requêtes et garde en mémoire les URL décodées pendant la session.
type Priority = 'target' | 'essential' | 'background'
type Loader = (url: string, signal: AbortSignal, lowPriority: boolean) => Promise<unknown>
interface Progress { loaded: number; total: number; errors: number }
interface Request {
  priority: Priority
  complete: (failed: boolean) => void
}
interface Job {
  requests: Set<Request>
  controller?: AbortController
}

export async function decodeImage(url: string, signal: AbortSignal, lowPriority: boolean) {
  const image = new Image()
  image.fetchPriority = lowPriority ? 'low' : 'auto'
  const abort = () => image.removeAttribute('src')
  signal.addEventListener('abort', abort, { once: true })
  try {
    signal.throwIfAborted()
    image.src = url
    await image.decode()
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

export function createPreloader(load: Loader = decodeImage, concurrency = 6) {
  const cached = new Set<string>()
  const jobs = new Map<string, Job>()
  const order: Priority[] = ['target', 'essential', 'background']
  let running = 0
  let paused = true

  function priority(job: Job) {
    let rank = order.length
    for (const request of job.requests) rank = Math.min(rank, order.indexOf(request.priority))
    return order[rank] as Priority | undefined
  }

  function pump() {
    const foreground = [...jobs.values()].some(job => {
      const level = priority(job)
      return level === 'target' || level === 'essential'
    })
    let continuingBackground = 0
    for (const job of jobs.values()) {
      if (!job.controller || job.controller.signal.aborted) continue
      const level = priority(job)
      if (!level || (level === 'background' && (paused || foreground || ++continuingBackground > 2))) job.controller.abort()
    }
    for (const level of order) {
      if (level === 'background' && (paused || foreground)) break
      for (const [url, job] of jobs) {
        if (running >= concurrency || (level === 'background' && running >= 2)) break
        if (job.controller || priority(job) !== level) continue
        const controller = new AbortController()
        job.controller = controller
        const background = level === 'background'
        running++

        function finish(failed: boolean) {
          running--
          job.controller = undefined
          if (!failed || !controller.signal.aborted || !job.requests.size) {
            jobs.delete(url)
            if (!failed) cached.add(url)
            for (const request of job.requests) request.complete(failed)
          }
          pump()
        }

        void Promise.resolve().then(() => {
          controller.signal.throwIfAborted()
          return load(url, controller.signal, background)
        }).then(() => finish(false), () => finish(true))
      }
    }
  }

  function preload(urls: Iterable<string | undefined>, level: Priority = 'target', onProgress?: (progress: Progress) => void) {
    const unique = new Set([...urls].filter((url): url is string => Boolean(url)))
    const progress = { loaded: 0, total: unique.size, errors: 0 }
    const pending = new Map<string, Request>()
    let resolve!: (progress: Progress) => void
    const done = new Promise<Progress>(finish => { resolve = finish })
    const report = () => onProgress?.({ ...progress })

    for (const url of unique) {
      if (cached.has(url)) { progress.loaded++; continue }
      const job = jobs.get(url) ?? { requests: new Set<Request>() }
      jobs.set(url, job)
      const request: Request = {
        priority: level,
        complete(failed) {
          if (!pending.delete(url)) return
          progress.loaded++
          if (failed) progress.errors++
          report()
          if (!pending.size) resolve({ ...progress })
        },
      }
      pending.set(url, request)
      job.requests.add(request)
    }
    report()
    if (!pending.size) resolve({ ...progress })
    pump()
    return {
      progress,
      done,
      cancel() {
        for (const [url, request] of pending) {
          const job = jobs.get(url)
          if (!job) continue
          job.requests.delete(request)
          if (!job.controller && !job.requests.size) jobs.delete(url)
        }
        pending.clear()
        resolve({ ...progress })
        pump()
      },
      background() {
        for (const request of pending.values()) request.priority = 'background'
        pump()
      },
    }
  }

  return { preload, pauseBackground(value: boolean) { paused = value; pump() } }
}
