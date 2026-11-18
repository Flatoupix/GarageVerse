import { audioAssets, preloadAudio } from '../audio'
import { imageAssets } from './art'
import { createPreloader, decodeImage } from './preload'

export const assets = createPreloader(async (url, signal, background) => {
  // Laisse le rendu et les interactions passer entre les demandes de fond.
  if (background) {
    await new Promise<void>(resolve => setTimeout(resolve, 120))
    signal.throwIfAborted()
  }
  return audioAssets.has(url) ? preloadAudio(url, signal) : decodeImage(url, signal, background)
})

export function startBackgroundLoading() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  if (!connection?.saveData) assets.preload(imageAssets, 'background')
  const syncVisibility = () => assets.pauseBackground(document.hidden)
  document.addEventListener('visibilitychange', syncVisibility)
  syncVisibility()
}

export function waitForImages(urls: Iterable<string | undefined>) {
  const request = assets.preload(urls)
  return new Promise<void>(resolve => {
    const timer = setTimeout(resolve, 1500)
    void request.done.then(() => { clearTimeout(timer); resolve() })
  })
}
