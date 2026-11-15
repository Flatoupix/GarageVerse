import { ref } from 'vue'

export const offlineReady = ref(false)

export function registerOffline() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const update = () => { offlineReady.value = Boolean(navigator.serviceWorker.controller) }
  update()
  navigator.serviceWorker.addEventListener('controllerchange', update)
  void navigator.serviceWorker.register('./sw.js').then(update).catch(() => { /* Le jeu reste jouable sans cache. */ })
}
