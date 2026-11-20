import { computed, ref } from 'vue'
import { deployedEntryName, differentEntry, entryScriptName, shouldOfferUpdate, UPDATE_DISMISSED_KEY } from './update'
import { ANDROID_BUILD } from './platform'

export const offlineReady = ref(false)
const published = ref<string | null>(null)
const waitingVersion = ref<string | null>(null)
const dismissed = ref<string | null>(null)
const candidate = computed(() => published.value ?? waitingVersion.value)
export const updateAvailable = computed(() => shouldOfferUpdate(candidate.value, dismissed.value))

let registration: ServiceWorkerRegistration | undefined

export function dismissUpdate() {
  if (!candidate.value) return
  dismissed.value = candidate.value
  try { localStorage.setItem(UPDATE_DISMISSED_KEY, candidate.value) } catch { /* Masqué pour cette session. */ }
}

export function waitingWorker() {
  return registration?.waiting
}

export function registerOffline() {
  if (ANDROID_BUILD || !import.meta.env.PROD) return
  try { dismissed.value = localStorage.getItem(UPDATE_DISMISSED_KEY) } catch { /* Stockage facultatif. */ }

  const current = entryScriptName(document.querySelector('script[type=module][src]')?.getAttribute('src'))
  let checking = false
  let checkAgain = false
  let checkedIndex = false
  const refreshWaiting = () => {
    // Un changement du worker seul peut garder le même fichier d’entrée.
    waitingVersion.value = checkedIndex && registration?.waiting && current ? `worker:${current}` : null
  }
  async function check() {
    if (!navigator.onLine || document.visibilityState !== 'visible') return
    if (checking) {
      checkAgain = true
      return
    }
    checking = true
    try {
      const url = new URL('./index.html', document.baseURI)
      url.searchParams.set('gv-update', Date.now().toString())
      await Promise.all([
        registration?.update().catch(() => {}),
        fetch(url, { cache: 'no-store' }).then(async response => {
          if (response.ok) published.value = differentEntry(current, deployedEntryName(await response.text()))
        }).catch(() => {}).finally(() => {
          checkedIndex = true
          refreshWaiting()
        }),
      ])
      refreshWaiting()
    } finally {
      checking = false
      if (checkAgain) {
        checkAgain = false
        void check()
      }
    }
  }

  if (import.meta.env.MODE !== 'itch' && 'serviceWorker' in navigator) {
    const update = () => {
      offlineReady.value = Boolean(navigator.serviceWorker.controller)
      refreshWaiting()
    }
    update()
    navigator.serviceWorker.addEventListener('controllerchange', update)
    void navigator.serviceWorker.register('./sw.js').then(registered => {
      registration = registered
      function watchInstallation() {
        const worker = registered.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) refreshWaiting()
        })
      }
      registered.addEventListener('updatefound', watchInstallation)
      watchInstallation()
      update()
      if (navigator.onLine && document.visibilityState === 'visible') void registered.update().catch(() => {})
    }).catch(() => { /* Le jeu reste jouable sans cache. */ })
  }

  document.addEventListener('visibilitychange', check)
  window.addEventListener('online', check)
  window.setInterval(check, 30 * 60 * 1000)
  void check()
}
