<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { save } from '../game/store'
import { discover, discovery, nextTutorial, skipTutorial } from '../game/tutorial'

const steps = [
  ['.home .hero', 'Collectionne des voitures et bats les rivaux secteur par secteur. Ton premier booster t’attend dans Boosters.'],
  ['.shop, .sealed-stage, .home .hero', 'Va dans Boosters. Ouvre ton premier booster, déchire le paquet et récupère tes cinq cartes.'],
  ['.garage, dialog[open] .car-stats', 'Ouvre une fiche au garage. ACC : accélération. VIT : vitesse. MAN : maniabilité. END : endurance, pour courir plus de secteurs.'],
  ['.cap-meter, .rival-list', 'Défie Lola Minitel. Choisis trois voitures : leur coût total doit respecter le plafond de l’écurie.'],
  ['.engage-brief', 'Lis la statistique du secteur et sa météo. Choisis une voiture adaptée au terrain.'],
  ['.engage-cars[role="radiogroup"]', 'Sous tes voitures, la fourchette estime ton score. La forme du jour peut changer le résultat.'],
  ['.engage-rivals', 'Observe les voitures adverses. Touche-les pour consulter leurs statistiques et anticiper le choix du rival.'],
  ['.engage-cars[role="radiogroup"]', 'Surveille les secteurs restants de chaque voiture. À zéro, elle surchauffe : son score perd trois points.'],
  ['.nitro-toggle', 'Active la nitro pour gagner des points sur ce secteur. Tes charges sont limitées pour toute la course.'],
  ['.round-result, .race-end', 'Compare les scores et leurs bonus. Chaque secteur gagné rapporte un point. Remporte le plus de secteurs pour battre ton rival.'],
  ['dialog[open] .workshop-intro, .garage', 'Au garage, ouvre une fiche puis l’atelier. Dépense des crédits pour améliorer une statistique de ta voiture.'],
  ['.topbar', 'Besoin d’un rappel ? Le bouton « ? » ouvre le lexique. Touche les mots soulignés pour une aide rapide.'],
] as const
const extras = {
  nitro: ['.nitro-toggle', 'La nitro ajoute des points à ton score. Garde tes charges pour les secteurs serrés.'],
  heat: ['.engage-cars[role="radiogroup"]', 'Cette voiture surchauffe : elle perd trois points. Alterne tes voitures pour préserver leurs secteurs disponibles.'],
  daily: ['.daily-panel, .daily-race', 'Le défi du jour impose une écurie spéciale. Gagne pour recevoir ses crédits, une fois par jour.'],
  perfect: ['.race-end', 'Tu as gagné tous les secteurs ! Cette victoire parfaite double tes crédits et peut offrir un ticket bonus.'],
} as const
const entry = computed(() => save.tutorial.status === 'active' ? steps[save.tutorial.step] : discovery.value ? extras[discovery.value] : null)
const host = ref<HTMLElement | null>(null)
let target: HTMLElement | null = null
let observer: MutationObserver
let frame = 0
function refresh() {
  const modal = document.querySelector('dialog[open]')
  if (save.tutorial.status !== 'active') {
    if (document.querySelector('.perfect-banner')) discover('perfect')
    else if (document.querySelector('.engage-car.hot')) discover('heat')
    else if (document.querySelector('.nitro-toggle')) discover('nitro')
    else if (document.querySelector('.daily-race')) discover('daily')
  }
  const found = entry.value ? [...document.querySelectorAll<HTMLElement>(entry.value[0])].find(el => el.getClientRects().length && (!modal || modal.contains(el))) ?? null : null
  if (found === target) return
  target?.removeAttribute('data-mechanic')
  host.value?.remove()
  target = found
  host.value = found ? document.createElement('div') : null
  if (found && host.value) {
    found.setAttribute('data-mechanic', '')
    found.before(host.value)
  }
}
function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(refresh) }
watch(entry, schedule)
onMounted(() => {
  observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  schedule()
})
onUnmounted(() => { observer.disconnect(); cancelAnimationFrame(frame); target?.removeAttribute('data-mechanic'); host.value?.remove() })
function understood() {
  if (save.tutorial.status === 'active') nextTutorial()
  else discovery.value = null
}
</script>

<template>
  <Teleport v-if="host && entry" :to="host">
    <aside class="mechanic-guide" role="status" :aria-label="`Le mécano${save.tutorial.status === 'active' ? ` ${save.tutorial.step + 1}/${steps.length}` : ''}`">
      <strong>Le mécano <span v-if="save.tutorial.status === 'active'">{{ save.tutorial.step + 1 }}/{{ steps.length }}</span></strong>
      <p>{{ entry[1] }}</p>
      <div class="mechanic-actions">
        <button type="button" @click="understood">Compris</button>
        <button v-if="save.tutorial.status === 'active'" type="button" @click="skipTutorial">Passer le tutoriel</button>
      </div>
    </aside>
  </Teleport>
</template>
