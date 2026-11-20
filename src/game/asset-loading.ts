import { audioAssets, preloadAudio } from '../audio'
import { imageAssets } from './art'
import { ANDROID_BUILD } from './platform'
import { createPreloader, decodeImage } from './preload'

// Espace les départs de fond pour laisser passer le rendu et les interactions.
export const assets = createPreloader((url, signal, background) =>
  audioAssets.has(url) ? preloadAudio(url, signal) : decodeImage(url, signal, background), 6, 120)

export function startBackgroundLoading() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  const syncVisibility = () => assets.pauseBackground(document.hidden)
  document.addEventListener('visibilitychange', syncVisibility)
  syncVisibility()
  if (!ANDROID_BUILD && !connection?.saveData) assets.preload(imageAssets, 'background')
}

export function waitForImages(urls: Iterable<string | undefined>, signal?: AbortSignal) {
  const request = assets.preload(urls)
  return new Promise<void>(resolve => {
    let timer: ReturnType<typeof setTimeout> | undefined = setTimeout(finish, 1500)
    function finish() {
      if (timer === undefined) return
      clearTimeout(timer)
      timer = undefined
      signal?.removeEventListener('abort', finish)
      request.background()
      resolve()
    }
    if (signal?.aborted) finish()
    else signal?.addEventListener('abort', finish, { once: true })
    void request.done.then(finish)
  })
}
