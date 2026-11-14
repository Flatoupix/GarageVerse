import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

const [build, directory, chrome] = process.argv.slice(2)
const types: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
  '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
}
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const file = resolve(build, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(build + sep) || !(await stat(file)).isFile()) throw new Error()
    response.setHeader('content-type', types[extname(file)] ?? 'application/octet-stream')
    response.end(await readFile(file))
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise<void>((done, fail) => server.once('error', fail).listen(0, '127.0.0.1', done))
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Aperçu local indisponible')
const url = `http://127.0.0.1:${address.port}/`
const browser = await chromium.launch({ executablePath: chrome, timeout: 20_000 })
const checks: Array<{ name: string; status: 'pass' | 'fail'; detail?: string }> = []
const screenshots: string[] = []
let width = 0
try {
  for (width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 320 ? 640 : 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
    await page.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort())
    await page.routeWebSocket('**/*', route => route.close())
    page.setDefaultTimeout(4_000)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.name))
    const button = (name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' })
    const capture = async (name: string) => {
      const file = `${width}-${name}.png`
      await page.locator('.card-art img').evaluateAll(images => Promise.all(
        images.map(image => (image as HTMLImageElement).decode()),
      ))
      await page.screenshot({ path: resolve(directory, file), animations: 'disabled' })
      screenshots.push(file)
    }
    const swipe = async (part: number) => {
      const box = await page.getByTestId('tear-zone').boundingBox()
      assert.ok(box, 'Zone tactile absente')
      const client = await page.context().newCDPSession(page)
      const x = box.x + 13, y = box.y + box.height * .48
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      for (let n = 1; n <= 8; n++) {
        await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + box.width * part * n / 8, y }] })
      }
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await client.detach()
    }
    try {
      await page.goto(url)
      await button('Ouvrir un booster').tap()
      await capture('sachet')
      await swipe(.12)
      await page.getByTestId('tear-zone').waitFor()
      await swipe(.80)
      await page.locator('.card-stack').waitFor()
      for (let slot = 0; slot < 5; slot++) {
        await button('Retourner la carte').tap()
        if (slot === 0) {
          await page.reload()
          await page.locator('.flip-front').waitFor()
          await capture('carte')
        }
        await button(slot === 4 ? 'Voir le récapitulatif' : 'Carte suivante').tap()
      }
      assert.equal(await page.locator('.recap-grid .card-tile').count(), 5)
      await button('Ajouter au garage').tap()
      await capture('garage')
      const progress = page.getByRole('progressbar', { name: 'Éditions découvertes' })
      assert.equal(await progress.getAttribute('value'), '5')
      await page.getByRole('checkbox', { name: 'Afficher les éditions manquantes' }).check()
      assert.equal(await page.locator('.missing-card').count(), 1)
      await page.locator('[data-edition="venom-classic"]').tap()
      const dialog = page.getByRole('dialog', { name: 'Détail de la carte' })
      await dialog.getByRole('button', { name: 'Pixel Art', exact: true }).tap()
      assert.equal(await dialog.locator('[data-edition="venom-pixel"]').count(), 1)
      await dialog.getByRole('button', { name: 'Fermer la carte' }).tap()
      await button('Ouvrir un autre booster').tap()
      await button('Ouvrir le sachet').tap()
      for (let slot = 0; slot < 5; slot++) {
        await button('Retourner la carte').tap()
        if (slot < 4) await button('Carte suivante').tap()
      }
      assert.equal(await page.locator('.drift-scene').count(), 1)
      await capture('legendaire')
      await button('Réglages').tap()
      await page.getByRole('checkbox', { name: 'Mouvement réduit' }).check()
      await button('Fermer les réglages').tap()
      assert.equal(await page.locator('.drift-scene').count(), 0)
      await button('Voir le récapitulatif').tap()
      await button('Ajouter au garage').tap()
      await page.reload()
      await button(/^Garage 10$/).tap()
      assert.equal(await page.locator('.garage-grid .card-tile').count(), 6)
      assert.equal(await progress.getAttribute('value'), '6')
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Débordement horizontal')
      assert.deepEqual(errors, [])
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await button('Ouvrir un booster').tap()
      await button('Ouvrir le sachet').tap()
      await button('Tout révéler').tap()
      assert.equal(await page.locator('.recap-grid .card-tile').count(), 5)
      checks.push({ name: `Parcours tactile et collection à ${width}px`, status: 'pass' })
    } catch (error) {
      const detail = error instanceof Error ? error.message.split('\n')[0] : 'Erreur du navigateur'
      checks.push({ name: `Parcours tactile et collection à ${width}px`, status: 'fail', detail })
      try { await capture('echec') } catch {}
    } finally {
      await page.close()
    }
  }
} finally {
  await browser.close()
  server.close()
}
console.log(JSON.stringify({ checks, screenshots, environment: 'Chrome · tactile émulé à 320 et 390 px · macOS' }))
