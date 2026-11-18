<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import changelogFr from '../../CHANGELOG.md?raw'
import changelogEn from '../../CHANGELOG.en.md?raw'
import { locale, t } from '../i18n'
import { firstLaunch } from '../game/store'
import { formatDate, markVersionSeen, parseChangelog, readSeenVersion, releasesToShow, type Release } from '../game/releases'

// Notes de version : ouvertes au lancement après une mise à jour, et à la demande depuis les Réglages.
// `ready` passe à vrai à la fin du splash : une fenêtre modale passerait sinon au-dessus de lui.
const props = defineProps<{ ready: boolean }>()
const appVersion = __APP_VERSION__
const releases = parseChangelog(locale === 'en' ? changelogEn : changelogFr)
const dialog = ref<HTMLDialogElement>()
const shown = ref<Release[]>([])
const update = ref(false)

function open(list: Release[], isUpdate: boolean) {
  shown.value = list
  update.value = isUpdate
  if (!dialog.value?.open) dialog.value?.showModal()
  dialog.value?.querySelector('.release-content')?.scrollTo(0, 0)
}
// Depuis les Réglages : toutes les versions publiées, la plus récente en tête.
function openAll() { open(releasesToShow(releases, appVersion, '0.0.0', releases.length), false) }
defineExpose({ openAll })

function showPending() {
  const seen = readSeenVersion()
  if (seen === appVersion) return
  // Le nouveau joueur commence par le tutoriel : sa version est simplement notée comme vue.
  const pending = firstLaunch ? [] : releasesToShow(releases, appVersion, seen)
  if (pending.length) open(pending, true)
  else markVersionSeen(appVersion)
}
onMounted(() => {
  if (props.ready) showPending()
  else { const stop = watch(() => props.ready, ready => { if (ready) { stop(); showPending() } }) }
})
</script>

<template>
  <dialog ref="dialog" class="modal release-modal" aria-labelledby="release-title" @close="markVersionSeen(appVersion)">
    <form method="dialog"><button class="close-modal" :aria-label="t('Fermer les notes de version')">×</button></form>
    <span class="eyebrow"><span></span> {{ update ? t('Mise à jour') : t('Notes de version') }}</span>
    <h2 id="release-title">{{ update ? t('Nouveautés de la version {version}', { version: appVersion }) : t('Notes de version') }}</h2>
    <div class="release-content">
      <article v-for="release in shown" :key="release.version" class="release">
        <h3>{{ t('Version {version}', { version: release.version }) }}<small v-if="release.date"> · {{ formatDate(release.date) }}</small></h3>
        <section v-for="section in release.sections" :key="section.title">
          <h4>{{ section.title === 'Nouveautés' ? t('Nouveautés') : section.title }}</h4>
          <ul>
            <li v-for="(item, i) in section.items" :key="i"><template v-for="(part, j) in item" :key="j"><b v-if="part.bold">{{ part.text }}</b><i v-else-if="part.italic">{{ part.text }}</i><template v-else>{{ part.text }}</template></template></li>
          </ul>
        </section>
      </article>
    </div>
    <form method="dialog" class="release-actions"><button class="button primary">{{ update ? t('C’est parti') : t('Fermer') }}</button></form>
  </dialog>
</template>
