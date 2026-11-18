import { ref } from 'vue'

export const offlineReady = ref(false)

export function registerOffline() {
  // itch.io runs HTML5 games in a cross-origin iframe. Skip service-worker
  // registration there: storage and worker support vary across embedded browsers.
  if (!import.meta.env.PROD || import.meta.env.MODE === 'itch' || !('serviceWorker' in navigator)) return
  const update = () => { offlineReady.value = Boolean(navigator.serviceWorker.controller) }
  update()
  navigator.serviceWorker.addEventListener('controllerchange', update)
  void navigator.serviceWorker.register('./sw.js').then(update).catch(() => { /* Le jeu reste jouable sans cache. */ })
}
