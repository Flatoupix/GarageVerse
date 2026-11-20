import assert from 'node:assert/strict'
import type { Scenarios, ScenarioContext } from './engine/browser.ts'

// Parcours Chrome de GarageVerse, joués par le moteur après l'ouverture de la page à 320, 390 et 1280 px.
// Les étapes `flow` d'une tâche s'enchaînent ensuite, puis le moteur vérifie la console et le débordement.

// Déchire le sachet d'un booster par un glissé tactile sur la zone prévue.
async function swipe({ page }: ScenarioContext, part: number) {
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

// Une voiture déjà possédée tirée dans une autre édition demande d'abord quelle apparence garder : le tirage est aléatoire.
async function keepAppearance({ button }: ScenarioContext, next: string | RegExp) {
  const keep = button('Garder l’apparence actuelle')
  await button(next).or(keep).first().waitFor()
  if (await keep.isVisible()) await keep.tap()
}

// Version Neon Drive : boutique, ouverture, garage, fiche, course jusqu'à l'arrivée, rechargements.
async function neon(context: ScenarioContext) {
  const { page, capture, button, tab } = context
  const credits = () => page.locator('.credits').getAttribute('aria-label')
  await capture('accueil')
  await tab('Boosters')
  // Bouton principal (prix ou ticket) : la carte a aussi les boutons d'achat groupé ×5 et ×10 depuis la v0.12.0.
  await page.locator('.shop-item').first().locator('button.primary').tap()
  await capture('sachet')
  await swipe(context, .12)
  await page.getByTestId('tear-zone').waitFor()
  await swipe(context, .80)
  await page.locator('.card-stack').waitFor()
  for (let slot = 0; slot < 5; slot++) {
    await button(/^Retourner la carte$/).tap()
    if (slot === 0) {
      await page.reload()
      await page.locator('.flip-front').waitFor()
      await capture('carte')
    }
    await keepAppearance(context, slot === 4 ? /^Voir le récapitulatif/ : /^Carte suivante/)
    await button(slot === 4 ? /^Voir le récapitulatif/ : /^Carte suivante/).tap()
  }
  assert.equal(await page.locator('.recap-grid .card-tile').count(), 5)
  await capture('recap')
  await page.reload()
  await tab('Garage')
  const owned = await page.locator('.garage-grid .card-tile').count()
  assert.ok(owned >= 3, 'Garage de départ incomplet')
  await capture('garage')
  await page.locator('.garage-grid .card-tile').first().tap()
  await page.locator('dialog[open]').waitFor()
  await capture('fiche')
  await page.locator('.sheet-modal .close-modal').tap()
  await tab('Course')
  await page.locator('.rival-row').first().tap()
  await button(/^Lancer la course/).tap()
  await capture('course')
  for (let sector = 0; sector < 5; sector++) {
    await page.locator('.engage .button.primary').tap()
    await page.locator('.round-result .verdict').waitFor()
    if (sector === 0) await capture('duel')
    if (sector === 2) { await page.reload(); await page.locator('.engage .button.primary').waitFor(); continue }
    await page.locator('.round-result .button.primary').tap()
  }
  await page.locator('.race-end').waitFor()
  await capture('arrivee')
  const balance = await credits()
  await page.reload()
  assert.equal(await credits(), balance, 'Crédits perdus au rechargement')
}

// Scénario de l'ancien prototype : ouverture tactile, collection, éditions et mouvement réduit.
async function booster(context: ScenarioContext) {
  const { page, capture, button } = context
  await button('Ouvrir un booster').tap()
  await capture('sachet')
  await swipe(context, .12)
  await page.getByTestId('tear-zone').waitFor()
  await swipe(context, .80)
  await page.locator('.card-stack').waitFor()
  for (let slot = 0; slot < 5; slot++) {
    await button('Retourner la carte').tap()
    if (slot === 0) {
      await page.reload()
      await page.locator('.flip-front').waitFor()
      await capture('carte')
    }
    await keepAppearance(context, slot === 4 ? 'Voir le récapitulatif' : 'Carte suivante')
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
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await button('Ouvrir un booster').tap()
  await button('Ouvrir le sachet').tap()
  await button('Tout révéler').tap()
  assert.equal(await page.locator('.recap-grid .card-tile').count(), 5)
}

const scenarios: Scenarios = {
  labels: { neon: 'Parcours complet Neon Drive', booster: 'Parcours tactile et collection' },
  run: { neon, booster },
}
export default scenarios
