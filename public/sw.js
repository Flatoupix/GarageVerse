const CACHE_NAME = 'garageverse-v2'
const ROOT = new URL('./', self.location.href)
const PAGE_URL = new URL('./index.html', ROOT)
const PAGE = PAGE_URL.href

async function remember(request) {
  const response = await fetch(request)
  if (response.ok && response.type !== 'opaque') {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(request, response.clone())
  }
  return response
}

// Prépare aussi les ressources de la première page, chargée avant la prise de contrôle.
// Fichiers versionnés par Vite (nom avec empreinte) : jamais modifiés, donc inutile de les retélécharger.
const hashed = url => /[-.][\w-]{8,}\.[\w]+$/.test(new URL(url).pathname)

async function prepare(url, seen = new Set()) {
  if (seen.has(url) || new URL(url).origin !== ROOT.origin) return
  seen.add(url)
  const cached = hashed(url) ? await (await caches.open(CACHE_NAME)).match(url) : undefined
  const response = cached ? cached.clone() : await remember(url)
  const type = response.headers.get('content-type') || ''
  if (!/html|javascript|css/.test(type)) return
  const source = await response.text()
  const links = /(?:src|href)=["']([^"']+)["']|(?:from\s*|import\s*)["']([^"']+)["']|url\(["']?([^\s)'" ]+)|["']((?:\.\/|\.\.\/)?assets\/[^"']+)["']|new URL\(["']([^"']+)["']/g
  const children = []
  for (const match of source.matchAll(links)) {
    const path = match[1] || match[2] || match[3] || match[4] || match[5]
    const child = new URL(path, match[4] ? ROOT : url)
    if (child.origin === ROOT.origin && !child.hash) children.push(prepare(child.href, seen))
  }
  await Promise.all(children)
}

self.addEventListener('install', event => {
  event.waitUntil(prepare(PAGE))
  // Le worker attend un nouveau lancement ou une demande du joueur.
})
self.addEventListener('message', event => {
  if (event.data === 'garageverse:apply-update') event.waitUntil(self.skipWaiting())
})
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE_NAME) await caches.delete(key)
    await self.clients.claim()
  })())
})
self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== ROOT.origin) return
  if (url.pathname === PAGE_URL.pathname && url.searchParams.has('gv-update')) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    if (request.mode === 'navigate') {
      // En ligne, chaque ouverture complète le cache avec les fichiers de la version publiée.
      try { const page = await remember(request); event.waitUntil(prepare(PAGE).catch(() => {})); return page } catch {
        return await cache.match(request) || await cache.match(PAGE) || Response.error()
      }
    }
    if (hashed(request.url)) {
      const cached = await cache.match(request)
      if (cached) return cached
    }
    try { return await remember(request) } catch { return await cache.match(request) || Response.error() }
  })())
})
