<script setup lang="ts">
import { VERSUS_OPEN } from '../game/features'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import { refreshVersusSave, save } from '../game/store'
import { prepOf } from '../game/save'
import { vehicleById, sectorLabels, conditionLabels } from '../game/data'
import { carSprite, trackBackdrop } from '../game/art'
import SectorRun from '../components/SectorRun.vue'
import { canAttack, checkVersusLineup, rebuildVersus, stakeCheck, VERSUS_CAPS, VERSUS_STAKES, type Stance } from '../game/rules'
import { dismiss, engage, identify, move, preview, resolve, snapshot, subscribe, type Snapshot } from '../game/versus'
import type { Invitation } from '../game/versus-wallet'
import { t } from '../i18n'
import { ruleText } from '../game/rules-text'

// Message déjà traduit : l'erreur des échanges avec le serveur, elle, est traduite à l'affichage.
class Notice extends Error {}

const emit = defineEmits<{ back: [] }>()
const nickname = ref(''), code = ref(new URLSearchParams(location.search).get('versus') ?? '')
const cap = ref(9), stake = ref(0), ids = ref([...save.lineup])
const invitation = ref<Invitation | null>(null)
const state = ref<Snapshot | null>(null), busy = ref(false), error = ref(''), online = ref(navigator.onLine)
const car = ref(0), stance = ref<Stance>('normal'), nitro = ref(false)
const clock = ref(Date.now())
let offset = 0, nextSync = 0, mounted = true, subscribed = '', unsubscribe: (() => void) | undefined
let timer: ReturnType<typeof setInterval>
const room = computed(() => state.value?.room)
const active = computed(() => save.versus?.active)
watch(() => active.value?.room, id => {
  if (id !== state.value?.room.id) {
    state.value = null
    unsubscribe?.()
    subscribed = ''
    nextSync = 0
  }
})
const terminal = computed(() => ['done', 'expired'].includes(room.value?.state ?? ''))
const remaining = computed(() => Math.max(0, Math.ceil((Date.parse(room.value?.sector_deadline || room.value?.expires_at || '') - clock.value) / 1000)))
const lineup = computed(() => ids.value.map(id => ({ id, prep: prepOf(save, id) })))
const problem = computed(() => checkVersusLineup(lineup.value, invitation.value?.cap ?? cap.value) || stakeCheck(invitation.value?.stake ?? stake.value, save.credits))
const side = computed(() => room.value?.host === save.versus?.id ? 'player' : 'rival')
const opponent = computed(() => side.value === 'player' ? room.value?.guest : room.value?.host)
const duel = computed(() => {
  const s = state.value
  if (!s?.room.guest || !s.room.circuit || !s.room.conditions) return null
  // Course reconstruite à partir des secteurs publiés par le serveur : la graine reste secrète jusqu'à l'arrivée.
  return rebuildVersus({ circuit: s.room.circuit, conditions: s.room.conditions, a: s.lineups[s.room.host], b: s.lineups[s.room.guest], rounds: s.rounds })
})
const last = computed(() => state.value?.rounds.at(-1))
const link = computed(() => {
  if (!room.value || room.value.state !== 'open') return ''
  const url = new URL(location.href)
  url.searchParams.set('versus', room.value.code)
  return url.href
})
const qr = ref('')
watch(link, async value => {
  qr.value = ''
  if (value) {
    const image = await QRCode.toDataURL(value, { width: 180 }).catch(() => '')
    if (link.value === value) qr.value = image
  }
})
watch(() => room.value?.sector, () => { stance.value = 'normal'; nitro.value = false })
function name(id: string) { return vehicleById.get(id)?.name ?? id }
async function sync() {
  if (!active.value) return
  let s = await snapshot()
  if (!mounted || s.room.id !== active.value?.room) return
  offset = Date.parse(s.now) - Date.now()
  clock.value = Date.now() + offset
  const deadline = s.room.state === 'open' ? s.room.expires_at : s.room.sector_deadline
  if (deadline && Date.parse(deadline) <= Date.parse(s.now)) {
    await resolve(s.room.id)
    s = await snapshot()
    if (!mounted) return
  }
  state.value = s
  if (subscribed !== s.room.id) {
    unsubscribe?.()
    subscribed = s.room.id
    unsubscribe = subscribe(s.room.id, () => { nextSync = 0 })
  }
}
async function run(action: () => Promise<void>) {
  if (busy.value || !mounted || !online.value) return
  busy.value = true
  error.value = ''
  nextSync = Date.now() + 5000
  try {
    await navigator.locks.request('garageverse-versus-wallet', async () => {
      if (!mounted) return
      refreshVersusSave()
      await action()
    })
  }
  catch (e) { error.value = e instanceof Notice ? e.message : t(e instanceof Error ? e.message : 'Serveur indisponible.'); nextSync = Date.now() + 5000 }
  finally { busy.value = false }
}
async function connect() { await identify(nickname.value.trim()); await sync() }
async function inspectCode() {
  invitation.value = await preview(code.value.trim().toUpperCase())
}
async function start(rematch?: string) {
  const invite = invitation.value
  const terms = rematch ? room.value! : invite
  if (rematch && state.value && save.versus) ids.value = state.value.lineups[save.versus.id].map(entry => entry.id)
  const limit = terms?.cap ?? cap.value, wager = terms?.stake ?? stake.value
  if (ids.value.some(id => !save.cars[id])) throw new Notice(t('Une voiture de cette écurie a été vendue. Crée un nouveau défi.'))
  const invalid = checkVersusLineup(lineup.value, limit) || stakeCheck(wager, save.credits)
  if (invalid) throw new Notice(ruleText(invalid))
  if (rematch) dismiss()
  engage({ id: invite?.id ?? crypto.randomUUID(), cap: limit, stake: wager, credits: save.credits,
    lineup: lineup.value, ...(invite ? { code: code.value.trim().toUpperCase() } : {}), ...(rematch ? { rematch_of: rematch } : {}) })
  state.value = null
  invitation.value = null
  await sync()
}
async function finish() { dismiss(); state.value = null; code.value = ''; unsubscribe?.(); subscribed = '' }
function tick() {
  online.value = navigator.onLine
  clock.value = Date.now() + offset
  if (room.value && remaining.value === 0 && !terminal.value && !error.value) nextSync = 0
  if (!document.hidden && active.value && !terminal.value && Date.now() >= nextSync) void run(connect)
}
function wake() { nextSync = 0; tick() }
onMounted(() => {
  if (save.versus) void run(connect)
  timer = setInterval(tick, 500)
  document.addEventListener('visibilitychange', wake)
  window.addEventListener('online', wake)
  window.addEventListener('offline', wake)
})
onUnmounted(() => {
  mounted = false; clearInterval(timer); unsubscribe?.()
  document.removeEventListener('visibilitychange', wake)
  window.removeEventListener('online', wake)
  window.removeEventListener('offline', wake)
})
</script>

<template>
  <section class="versus">
    <button class="button quiet" @click="emit('back')">← {{ t('Accueil') }}</button>
    <h1>Versus</h1>
    <p role="status" v-if="!online">{{ t('Connexion nécessaire') }}</p>
    <p role="alert" v-if="error">{{ error }}</p>
    <template v-if="!VERSUS_OPEN && !active">
      <p>{{ t('Le mode Versus revient bientôt. Tes crédits et ton garage ne sont pas touchés.') }}</p>
    </template>
    <template v-else-if="!save.versus">
      <form @submit.prevent="run(connect)">
        <label>{{ t('Ton pseudo') }} <input v-model="nickname" required minlength="2" maxlength="20" autocomplete="nickname"></label>
        <button class="button primary" :disabled="busy || !online">{{ t('Entrer dans Versus') }}</button>
      </form>
    </template>
    <template v-else-if="!active">
      <p>{{ save.versus.nickname }} · {{ t('Code ami') }} <strong>{{ save.versus.friend_code }}</strong></p>
      <form @submit.prevent="run(inspectCode)">
        <label>{{ t('Code d’invitation') }} <input v-model="code" required maxlength="8" autocapitalize="characters" @input="invitation = null"></label>
        <button class="button" :disabled="busy || !online">{{ t('Voir le défi') }}</button>
      </form>
      <h2>{{ invitation ? t('Rejoindre le défi') : t('Créer un défi') }}</h2>
      <p v-if="invitation">{{ t('Plafond {cap} · Mise {stake} ₡', { cap: invitation.cap, stake: invitation.stake }) }} <button class="button quiet" @click="invitation = null">{{ t('Annuler') }}</button></p>
      <div v-else class="controls">
        <label>{{ t('Plafond') }} <select v-model.number="cap"><option v-for="n in VERSUS_CAPS" :key="n">{{ n }}</option></select></label>
        <label>{{ t('Mise') }} <select v-model.number="stake"><option v-for="n in VERSUS_STAKES" :value="n" :key="n">{{ n }} ₡</option></select></label>
      </div>
      <fieldset><legend>{{ t('Ton écurie') }}</legend>
        <label v-for="i in 3" :key="i">{{ t('Voiture {n}', { n: i }) }} <select v-model="ids[i-1]"><option v-for="id in Object.keys(save.cars)" :key="id" :value="id">{{ t('{name} · coût {cost}', { name: name(id), cost: vehicleById.get(id)?.cost ?? 0 }) }}</option></select></label>
      </fieldset>
      <p v-if="problem">{{ ruleText(problem) }}</p>
      <button class="button primary" :disabled="busy || !online || !!problem" @click="run(() => start())">{{ invitation ? t('Accepter le défi') : t('Créer la salle') }}</button>
    </template>
    <template v-else-if="room && state">
      <p v-if="!error && online">{{ t('Salle synchronisée') }}</p>
      <template v-if="room.state === 'open'">
        <h2>{{ t('Invite ton adversaire') }}</h2>
        <p>{{ t('Code') }} <strong>{{ room.code }}</strong> · {{ t('Mise {stake} ₡', { stake: room.stake }) }} · {{ t('Expire dans {min} min {sec} s', { min: Math.floor(remaining / 60), sec: remaining % 60 }) }}</p>
        <img v-if="qr" :src="qr" width="180" height="180" :alt="t('QR code d’invitation')">
        <label>{{ t('Lien d’invitation') }} <input readonly :value="link" @focus="($event.target as HTMLInputElement).select()"></label>
      </template>
      <template v-if="duel && opponent">
        <h2>{{ t('{circuit} · contre {name}', { circuit: room.circuit ? t(room.circuit.name) : t('Circuit'), name: state.players[opponent] }) }}</h2>
        <p>{{ state.lineups[opponent].map(e => name(e.id)).join(' · ') }}</p>
        <p>{{ duel.sectors.map((s,i) => t(sectorLabels[s]) + ' (' + t(conditionLabels[duel!.conditions[i]]) + ')').join(' · ') }}</p>
        <template v-if="room.state === 'racing'">
          <h3>{{ t('Secteur {n}/5 · {sector}', { n: room.sector + 1, sector: t(sectorLabels[duel.sectors[room.sector]]) }) }}</h3>
          <p>{{ remaining }} s · {{ t(conditionLabels[duel.conditions[room.sector]]) }}</p>
          <p v-if="state.played" role="status">{{ t('Choix enregistré · en attente de l’adversaire') }}</p>
          <form v-else @submit.prevent="run(async () => { await move(room!.id, room!.sector, { car, stance, nitro }); await sync() })">
            <label>{{ t('Voiture') }} <select v-model.number="car" @change="stance = 'normal'"><option v-for="(r,i) in duel[side].lineup" :key="r.id" :value="i">{{ name(r.id) }}</option></select></label>
            <label>{{ t('Consigne') }} <select v-model="stance"><option value="normal">{{ t('normal') }}</option><option value="attaque" :disabled="!canAttack(duel[side], car)">{{ t('attaque') }}</option><option value="gestion">{{ t('gestion') }}</option></select></label>
            <label><input type="checkbox" v-model="nitro" :disabled="!duel[side].nitro"> {{ t('Nitro ({n})', { n: duel[side].nitro }) }}</label>
            <button class="button primary" :disabled="busy || !online || !remaining">{{ t('Valider mon choix') }}</button>
          </form>
        </template>
        <template v-if="last">
          <SectorRun :round="last" :running="false" :step="99" :arts="{}" :sprites="{ player: carSprite(state.lineups[room.host][last.player.car].id), rival: carSprite(state.lineups[room.guest!][last.rival.car].id) }" :backdrop="trackBackdrop(last.condition)" />
          <p>{{ t('Secteur {n} · {a} – {b} · {result}', { n: state.rounds.length, a: last[side].score, b: last[side === 'player' ? 'rival' : 'player'].score, result: last.winner === 'tie' ? t('Égalité') : last.winner === side ? t('Gagné') : t('Perdu') }) }}</p>
        </template>
      </template>
      <template v-if="terminal">
        <h2>{{ room.state === 'expired' ? t('Invitation expirée') : !room.winner ? t('Égalité') : room.winner === save.versus.id ? t('Victoire !') : t('Défaite') }}</h2>
        <p>{{ t('Mise {stake} ₡ · Montant versé {payout} ₡', { stake: room.stake, payout: active.payout ?? 0 }) }}</p>
        <p v-if="room.guest">{{ t('Pot {pot} ₡ · Commission {fee} ₡', { pot: room.stake * 2, fee: room.winner && state.rounds.length === 5 && !Object.values(room.missed).some(n => n >= 2) ? room.stake * 2 * .1 : 0 }) }}</p>
        <button v-if="VERSUS_OPEN && room.state === 'done'" class="button primary" :disabled="busy || !online" @click="run(() => start(room!.id))">{{ t('Revanche') }}</button>
        <button class="button quiet" @click="run(finish)">{{ t('Retour aux défis') }}</button>
      </template>
    </template>
    <button v-else class="button" :disabled="busy || !online" @click="run(connect)">{{ t('Reprendre la salle') }}</button>
  </section>
</template>

<style scoped>
.versus { display: grid; gap: .85rem; max-width: 40rem; margin: auto; min-width: 0 }
.versus form, .versus fieldset { display: grid; gap: .65rem; min-width: 0 }
.versus h1, .versus h2, .versus p { margin: 0 }
.versus label { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap }
.versus select, .versus input:not([type=checkbox]) { max-width: 100%; min-width: 0; padding: .6rem; font: inherit }
.controls { display: flex; flex-wrap: wrap; gap: 1rem }
</style>
