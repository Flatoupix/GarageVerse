<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { t, tp } from '../i18n'
import { answerFriend, loadFriends, registerFriends, requestFriend, type FriendAction, type Friendship } from '../game/friends'

import GvButton from '../components/GvButton.vue'
import TradeCard from '../components/TradeCard.vue'
import { TRADE_CREDIT_LIMIT, TRADE_OPEN_LIMIT, transitTrade, validateTradeOffer, validateTradeShowcase, type TradeGoods } from '../game/trade'
import { answerTrade, counterTrade, goodsOf, listFriendShowcase, listShowcase, listTrades, proposeTrade, publishShowcase, syncTrades, type Side, type Trade } from '../game/trade-client'
import { vehicleById } from '../game/data'
import { exchangeAlerts, save } from '../game/store'

const props = defineProps<{ online: boolean; from?: 'home' | 'garage' }>()
const emit = defineEmits<{ back: [] }>()
const profile = ref<Awaited<ReturnType<typeof loadFriends>>['profile']>(null)
const list = ref<Friendship[]>([])
const busy = ref(false)
const error = ref('')
const status = ref('')
const nickname = ref('')
const code = ref('')
const removing = ref<string>()
const received = computed(() => list.value.filter(friend => friend.state === 'pending' && !friend.outgoing))
const sent = computed(() => list.value.filter(friend => friend.state === 'pending' && friend.outgoing))
const friends = computed(() => list.value.filter(friend => friend.state === 'accepted'))
const friendProblem = computed(() => error.value || (!busy.value && !profile.value ? t('Connexion nécessaire') : ''))
const canChange = computed(() => props.online && !!profile.value && !busy.value)

async function refresh() {
  const data = await loadFriends()
  profile.value = data.profile
  list.value = data.list
  exchangeAlerts.friends = received.value.length
  if (!list.value.some(friend => friend.id === removing.value)) removing.value = undefined
}

async function run(action: () => Promise<void> = refresh) {
  if (!props.online || busy.value) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    await action()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : t('Serveur indisponible. Réessaie dès que la connexion revient.')
  } finally {
    busy.value = false
  }
}

async function copy() {
  if (!profile.value) return
  status.value = ''
  try {
    await navigator.clipboard.writeText(profile.value.friend_code)
    status.value = t('Code ami copié.')
  } catch {
    status.value = t('Sélectionne ton code ami pour le copier.')
  }
}

function send() {
  void run(async () => {
    await requestFriend(code.value)
    code.value = ''
    await refresh()
  })
}

function answer(id: string, action: FriendAction) {
  void run(async () => {
    await answerFriend(id, action)
    removing.value = undefined
    await refresh()
  })
}

const tabs = [
  { id: 'friends', label: t('Amis') },
  { id: 'showcase', label: t('Vitrine') },
  { id: 'offers', label: t('Offres') },
  { id: 'history', label: t('Historique') },
] as const
const tab = ref<typeof tabs[number]['id']>('friends')
const tradeBusy = ref(false)
const tradeError = ref('')
const tradeStatus = ref('')
const showcase = ref<string[]>([])
const showcaseReady = ref(false)
const offers = ref<Awaited<ReturnType<typeof syncTrades>>>({ received: [], sent: [], history: [], notices: [] })
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval>
let poll: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now() }, 1000)
  poll = setInterval(refreshQuietly, 30_000)
  document.addEventListener('visibilitychange', refreshVisible)
})
onUnmounted(() => {
  clearInterval(timer)
  clearInterval(poll)
  document.removeEventListener('visibilitychange', refreshVisible)
})
// Toutes les 30 s, seulement à l'écran : un brouillon d'offre ou une vitrine en cours de modification ne sont jamais rechargés.
function refreshQuietly() {
  if (document.visibilityState !== 'visible' || !props.online || draft.value || busy.value || tradeBusy.value) return
  if (tab.value === 'friends') void run()
  else if (tab.value === 'offers' || tab.value === 'history') void runTrade(refreshTrades)
}
function refreshVisible() {
  if (document.visibilityState === 'visible' && (tab.value === 'offers' || tab.value === 'history') && !draft.value) {
    void runTrade(refreshTrades)
  }
}

const sides: Side[] = ['proposer', 'recipient']
const historyLabels = { done: t('Terminé'), returned: t('Rendu'), expired: t('Expiré') }
const history = computed(() => offers.value.history
  .filter(trade => trade.state === 'done' || trade.state === 'returned' || trade.state === 'expired')
  .slice().sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 50))
const sections = computed(() => tab.value === 'history'
  ? [{ label: t('Historique'), trades: history.value }]
  : [{ label: t('Offres reçues'), trades: offers.value.received }, { label: t('Offres envoyées'), trades: offers.value.sent }])
const remaining = (trade: Trade) => Math.max(0, Date.parse(trade.expires_at) - now.value)
function timeLeft(trade: Trade) {
  const minutes = Math.ceil(remaining(trade) / 60_000)
  return minutes >= 60
    ? t('Temps restant : {hours} h {minutes} min', { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
    : tp('Il reste {n} minute', 'Il reste {n} minutes', minutes)
}
const canAnswer = (trade: Trade) => props.online && !tradeBusy.value && trade.state === 'open' && remaining(trade) > 0
const carName = (id: string) => vehicleById.get(id)?.name ?? t('Carte indisponible')
const hasParts = (cars: readonly string[]) => cars.some(id => save.cars[id]?.parts.length)
const acceptanceProblems = computed(() => Object.fromEntries(offers.value.received
  .filter(trade => trade.state === 'open')
  .map(trade => {
    const goods = goodsOf(trade, 'recipient')
    const problem = transitTrade(JSON.parse(JSON.stringify(save)), trade.id, asSelection(goods), goods)
    return [trade.id, problem === t('Le lot a changé depuis la proposition.')
      ? t('Ta voiture a changé depuis l’offre (niveau, amélioration ou style) : refuse l’offre ou fais une contre-proposition.') : problem]
  })))

interface Draft {
  friend?: Friendship
  previous?: Trade
  owner?: string
  sent?: Trade[]
  cars: TradeGoods['cars']
  give: { cars: string[]; credits: number }
  want: { cars: string[]; credits: number }
}
const draft = ref<Draft>()
const draftReady = computed(() => !!draft.value?.owner && !!draft.value.sent)
const requestedCars = computed(() => {
  const current = draft.value
  if (!current) return {}
  const prior = current.previous ? goodsOf(current.previous, 'proposer').cars : {}
  return { ...Object.fromEntries(current.want.cars.filter(id => Object.hasOwn(prior, id)).map(id => [id, prior[id]])), ...current.cars }
})
const draftProblems = computed(() => {
  const current = draft.value
  if (!current) return []
  const { give, want, previous } = current
  const problems = [
    ...give.cars.map(id => validateTradeShowcase(save, [id])),
    validateTradeOffer(save, give),
  ]
  if (!Number.isSafeInteger(want.credits) || want.credits < 0 || want.credits > TRADE_CREDIT_LIMIT) problems.push(t('Offre d’échange invalide'))
  if (!give.cars.length && !want.cars.length && !give.credits && !want.credits) problems.push(t('Ajoute une voiture ou des crédits à l’offre.'))
  if (draftReady.value && want.cars.some(id => !Object.hasOwn(current.cars, id))) problems.push(t('Cette voiture ne figure plus dans la vitrine de ton ami.'))
  if (current.sent && current.sent.filter(trade => trade.state === 'open' && remaining(trade) > 0).length >= TRADE_OPEN_LIMIT) {
    problems.push(t('Tu as déjà dix offres d’échange ouvertes'))
  }
  if (previous && !remaining(previous)) problems.push(t('Expiré'))
  return [...new Set(problems.filter(Boolean))]
})

async function runTrade(action: () => Promise<void>) {
  if (!props.online || tradeBusy.value || save.preferences.friendsEnabled !== true) return
  tradeBusy.value = true
  tradeError.value = ''
  tradeStatus.value = ''
  try {
    await action()
  } catch (cause) {
    tradeError.value = cause instanceof Error ? cause.message : t('Serveur indisponible. Réessaie dès que la connexion revient.')
  } finally {
    tradeBusy.value = false
  }
}
function showOffers(next: typeof offers.value) {
  offers.value = next
  if (next.notices.length) tradeStatus.value = next.notices.join(' ')
}
async function refreshTrades() { showOffers(await syncTrades()) }
async function refreshTab() {
  if (tab.value === 'friends') { await run(); return }
  await runTrade(async () => {
    if (tab.value === 'showcase') {
      showcaseReady.value = false
      showcase.value = Object.keys(await listShowcase()).filter(id => !validateTradeShowcase(save, [id]))
      showcaseReady.value = true
    } else await refreshTrades()
  })
}
function selectTab(next: typeof tab.value) {
  if (next === tab.value) return
  draft.value = undefined
  tradeError.value = ''
  tradeStatus.value = ''
  tab.value = next
}
function moveTab(event: KeyboardEvent) {
  const index = tabs.findIndex(item => item.id === tab.value)
  const direction = event.key === 'ArrowRight' ? 1 : -1
  const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs[(index + direction + tabs.length) % tabs.length]
  selectTab(next.id)
  document.getElementById(`exchange-tab-${next.id}`)?.focus()
}
function setCredits(side: 'give' | 'want', event: Event) {
  const input = event.target as HTMLInputElement
  if (draft.value) draft.value[side].credits = input.validity.badInput ? NaN : input.value === '' ? 0 : input.valueAsNumber
}
function saveShowcase() {
  void runTrade(async () => {
    await publishShowcase(showcase.value)
    tradeStatus.value = t('Vitrine enregistrée.')
  })
}
function asSelection(goods?: TradeGoods) {
  return { cars: Object.keys(goods?.cars ?? {}), credits: goods?.credits ?? 0 }
}
function startDraft(friend?: Friendship, previous?: Trade) {
  draft.value = {
    friend, previous, cars: {},
    give: asSelection(previous && goodsOf(previous, 'recipient')),
    want: asSelection(previous && goodsOf(previous, 'proposer')),
  }
  refreshDraft()
}
function refreshDraft() {
  const current = draft.value
  if (!current) return
  void runTrade(async () => {
    current.sent = undefined
    if (current.previous) {
      current.cars = await listShowcase(current.previous.proposer)
      current.owner = current.previous.proposer
    } else if (current.friend) {
      const result = await listFriendShowcase(current.friend.id)
      current.cars = result.cars
      current.owner = result.owner
    }
    current.sent = (await listTrades()).sent
  })
}
function closeDraft() {
  draft.value = undefined
  tradeError.value = ''
  tradeStatus.value = ''
}
function sendTrade() {
  const current = draft.value
  if (!current?.owner || !draftReady.value || draftProblems.value.length) return
  const { owner, previous, give, want } = current
  void runTrade(async () => {
    showOffers(previous ? await counterTrade(previous.id, give, want) : await proposeTrade(owner, give, want))
    if (draft.value === current) {
      closeDraft()
      tab.value = 'offers'
    }
  })
}
function answerOffer(trade: Trade, action: 'accept' | 'refuse' | 'cancel') {
  if (!canAnswer(trade)) return
  void runTrade(async () => { showOffers(await answerTrade(trade.id, action)) })
}

let refreshPending = false
watch([tab, () => props.online], () => { refreshPending = true })
watch([tab, () => props.online, tradeBusy], () => {
  if (!refreshPending || tradeBusy.value || !props.online) return
  refreshPending = false
  if (draft.value) refreshDraft()
  else if (tab.value !== 'friends') void refreshTab()
  else tradeError.value = ''
})

watch(() => props.online, online => { if (online) void run() }, { immediate: true })
</script>

<template>
  <main class="friends-view">
    <GvButton @click="emit('back')">{{ props.from === 'home' ? t('← Accueil') : t('← Garage') }}</GvButton>
    <div class="page-heading"><h1 tabindex="-1">{{ t('Échanges') }}</h1></div>

    <div class="tabs friend-tabs" role="tablist" :aria-label="t('Échanges')"
      @keydown.left.prevent="moveTab" @keydown.right.prevent="moveTab" @keydown.home.prevent="moveTab" @keydown.end.prevent="moveTab">
      <GvButton v-for="item in tabs" :id="`exchange-tab-${item.id}`" :key="item.id" variant="tab" role="tab"
        :active="tab === item.id" :aria-selected="tab === item.id" aria-controls="exchange-panel"
        :tabindex="tab === item.id ? 0 : -1" @click="selectTab(item.id)">{{ item.label }}</GvButton>
    </div>
    <div id="exchange-panel" role="tabpanel" :aria-labelledby="`exchange-tab-${tab}`" :aria-busy="tradeBusy || (tab === 'friends' && busy)">
      <template v-if="!online">
        <p role="status">{{ t('Connexion nécessaire') }}</p>
      </template>
      <template v-else-if="tradeError && (tab !== 'friends' || draft)">
        <p role="alert">{{ tradeError }}</p>
        <GvButton @click="draft ? refreshDraft() : refreshTab()">{{ t('Réessayer') }}</GvButton>
      </template>
      <template v-else-if="friendProblem && tab === 'friends' && !draft">
        <p :role="error ? 'alert' : 'status'">{{ friendProblem }}</p>
        <GvButton @click="run()">{{ t('Réessayer') }}</GvButton>
      </template>
      <p v-if="tradeBusy" role="status">{{ t('Synchronisation…') }}</p>
      <p v-if="tradeStatus" role="status">{{ tradeStatus }}</p>

      <section v-if="draft" class="friend-panel">
        <h2>{{ draft.previous ? t('Contre-proposer') : t('Proposer un échange') }}</h2>
        <p v-if="draft.friend">{{ draft.friend.nickname }}</p>
        <div class="trade-sides">
          <section>
            <h3>{{ t('Tu donnes') }}</h3>
            <label>{{ t('Crédits') }} <input :value="draft.give.credits || ''" @change="setCredits('give', $event)" type="number" min="0" :max="TRADE_CREDIT_LIMIT" step="1" :disabled="tradeBusy"></label>
            <p>{{ t('Ton solde : {n} crédits', { n: save.credits }) }}</p>
            <div class="trade-cards">
              <div v-for="(car, id) in save.cars" :key="id" class="trade-choice">
                <TradeCard :id="id" :snapshot="car" compact />
                <label class="trade-check"><input v-model="draft.give.cars" type="checkbox" :value="id"
                  :disabled="tradeBusy || (!!validateTradeShowcase(save, [id]) && !draft.give.cars.includes(id))"> {{ t('Donner {name}', { name: carName(id) }) }}</label>
                <small v-if="validateTradeShowcase(save, [id])">{{ validateTradeShowcase(save, [id]) }}</small>
              </div>
              <div v-for="id in draft.give.cars.filter(id => !Object.hasOwn(save.cars, id))" :key="id" class="trade-choice">
                <TradeCard :id="id" :snapshot="draft.previous && goodsOf(draft.previous, 'recipient').cars[id]" compact />
                <label class="trade-check"><input v-model="draft.give.cars" type="checkbox" :value="id" :disabled="tradeBusy"> {{ t('Retirer {name} du lot', { name: carName(id) }) }}</label>
              </div>
            </div>
          </section>
          <section>
            <h3>{{ t('Tu demandes') }}</h3>
            <label>{{ t('Crédits') }} <input :value="draft.want.credits || ''" @change="setCredits('want', $event)" type="number" min="0" :max="TRADE_CREDIT_LIMIT" step="1" :disabled="tradeBusy"></label>
            <p v-if="draftReady && !Object.keys(draft.cars).length">{{ t('La vitrine est vide.') }}</p>
            <div class="trade-cards">
              <div v-for="(car, id) in requestedCars" :key="id" class="trade-choice">
                <TradeCard :id="id" :snapshot="car" compact />
                <label class="trade-check"><input v-model="draft.want.cars" type="checkbox" :value="id" :disabled="tradeBusy"> {{ t('Demander {name}', { name: carName(id) }) }}</label>
                <small v-if="draftReady && !Object.hasOwn(draft.cars, id)">{{ t('Cette voiture ne figure plus dans la vitrine de ton ami.') }}</small>
              </div>
            </div>
          </section>
        </div>
        <p v-if="hasParts(draft.give.cars)">{{ t('Les pièces montées sur tes voitures offertes retournent à ton stock si l’échange aboutit.') }}</p>
        <p v-if="draft.want.cars.some(id => requestedCars[id]?.parts.length)">{{ t('Les pièces montées sur les voitures demandées retournent au stock de ton ami si l’échange aboutit.') }}</p>
        <p v-for="problem in draftProblems" :key="problem">{{ problem }}</p>
        <div class="friend-actions">
          <GvButton variant="primary" :disabled="!online || tradeBusy || !draftReady || !!draftProblems.length" @click="sendTrade">{{ t('Envoyer l’offre') }}</GvButton>
          <GvButton :disabled="tradeBusy" @click="closeDraft">{{ t('Annuler') }}</GvButton>
        </div>
      </section>

      <section v-else-if="tab === 'showcase'" class="friend-panel">
        <h2>{{ t('Ta vitrine') }}</h2>
        <p>{{ t('Choisis les voitures que tes amis peuvent voir.') }}</p>
        <p v-if="!Object.keys(save.cars).length">{{ t('Tu n’as aucune voiture à exposer.') }}</p>
        <div class="trade-cards">
          <div v-for="(car, id) in save.cars" :key="id" class="trade-choice">
            <TradeCard :id="id" :snapshot="car" compact />
            <label class="trade-check"><input v-model="showcase" type="checkbox" :value="id"
              :disabled="!online || tradeBusy || !showcaseReady || (!!validateTradeShowcase(save, [id]) && !showcase.includes(id))"> {{ t('Afficher {name} dans ta vitrine', { name: carName(id) }) }}</label>
            <small v-if="validateTradeShowcase(save, [id])">{{ validateTradeShowcase(save, [id]) }}</small>
          </div>
        </div>
        <GvButton variant="primary" :disabled="!online || tradeBusy || !showcaseReady || !!validateTradeShowcase(save, showcase)" @click="saveShowcase">{{ t('Enregistrer la vitrine') }}</GvButton>
      </section>

      <template v-else-if="tab !== 'friends'">
        <section v-for="section in sections" :key="section.label" class="friend-panel">
          <h2>{{ section.label }}</h2>
          <p v-if="!section.trades.length && !tradeBusy">{{ tab === 'history' ? t('Aucun échange dans l’historique.') : t('Aucune offre.') }}</p>
          <article v-for="trade in section.trades" :key="trade.id" class="trade-offer">
            <p v-if="trade.state === 'done' || trade.state === 'returned' || trade.state === 'expired'"><strong>{{ historyLabels[trade.state] }}</strong></p>
            <p v-else><strong>{{ trade.state === 'accepted' ? t('En transit') : t('Offre ouverte') }}</strong> · {{ remaining(trade) ? timeLeft(trade) : t('Échéance atteinte') }}</p>
            <div class="trade-sides">
              <section v-for="side in sides" :key="side">
                <h3 v-if="tab === 'history'">{{ side === 'proposer' ? t('Lot du proposeur') : t('Lot du destinataire') }}</h3>
                <h3 v-else>{{ (side === 'recipient') === offers.received.includes(trade) ? t('Tu donnes') : t('Tu reçois') }}</h3>
                <p>{{ tp('{n} crédit', '{n} crédits', goodsOf(trade, side).credits) }}</p>
                <div class="trade-cards">
                  <TradeCard v-for="(car, id) in goodsOf(trade, side).cars" :id="id" :key="id" :snapshot="car" />
                </div>
              </section>
            </div>
            <template v-if="trade.state === 'open' && tab === 'offers'">
              <template v-if="offers.received.includes(trade)">
                <p v-if="hasParts(Object.keys(goodsOf(trade, 'recipient').cars))">{{ t('Les pièces montées sur tes voitures offertes retournent à ton stock si l’échange aboutit.') }}</p>
                <p v-if="Object.values(goodsOf(trade, 'proposer').cars).some(car => car.parts.length)">{{ t('Les pièces montées sur les voitures demandées retournent au stock de ton ami si l’échange aboutit.') }}</p>
                <p v-if="acceptanceProblems[trade.id]">{{ acceptanceProblems[trade.id] }}</p>
                <div class="friend-actions">
                  <GvButton variant="primary" :disabled="!canAnswer(trade) || !!acceptanceProblems[trade.id]" @click="answerOffer(trade, 'accept')">{{ t('Accepter') }}</GvButton>
                  <GvButton :disabled="!canAnswer(trade)" @click="answerOffer(trade, 'refuse')">{{ t('Refuser') }}</GvButton>
                  <GvButton :disabled="!canAnswer(trade)" @click="startDraft(undefined, trade)">{{ t('Contre-proposer') }}</GvButton>
                </div>
              </template>
              <GvButton v-else :disabled="!canAnswer(trade)" @click="answerOffer(trade, 'cancel')">{{ t('Annuler') }}</GvButton>
            </template>
          </article>
        </section>
        <GvButton v-if="online && !tradeError" :disabled="tradeBusy" @click="refreshTab()">{{ t('Actualiser') }}</GvButton>
      </template>

      <template v-else>
        <p v-if="busy" role="status">{{ t('Synchronisation…') }}</p>
        <p v-if="status" role="status">{{ status }}</p>

        <section class="friend-panel">
          <h2>{{ t('Ton code ami') }}</h2>
          <div v-if="profile" class="friend-row">
            <input class="friend-code" :value="profile.friend_code" :aria-label="t('Ton code ami')" readonly @focus="($event.target as HTMLInputElement).select()">
            <button type="button" class="button ghost" @click="copy">{{ t('Copier') }}</button>
          </div>
          <form v-else @submit.prevent="run(async () => { await registerFriends(nickname); await refresh() })">
            <label>{{ t('Ton pseudo') }} <input v-model="nickname" required minlength="2" maxlength="20" autocomplete="nickname"></label>
            <button class="button primary" :disabled="!online || busy">{{ t('Obtenir ton code ami') }}</button>
          </form>
          <form @submit.prevent="send">
            <label>{{ t('Code ami') }} <input v-model.trim="code" class="friend-code-entry" required minlength="6" maxlength="6" autocapitalize="characters" autocomplete="off" spellcheck="false" :disabled="!canChange"></label>
            <button class="button primary" :disabled="!canChange">{{ t('Envoyer la demande') }}</button>
          </form>
        </section>

        <section class="friend-panel">
          <h2>{{ t('Demandes reçues') }}</h2>
          <p v-if="!received.length">{{ t('Aucune demande reçue.') }}</p>
          <ul v-else>
            <li v-for="friend in received" :key="friend.id" class="friend-row">
              <strong>{{ friend.nickname }}</strong>
              <div class="friend-actions">
                <button type="button" class="button primary" :disabled="!canChange" @click="answer(friend.id, 'accept')">{{ t('Accepter') }}</button>
                <button type="button" class="button ghost" :disabled="!canChange" @click="answer(friend.id, 'refuse')">{{ t('Refuser') }}</button>
              </div>
            </li>
          </ul>
        </section>

        <section class="friend-panel">
          <h2>{{ t('Demandes envoyées') }}</h2>
          <p v-if="!sent.length">{{ t('Aucune demande envoyée.') }}</p>
          <ul v-else><li v-for="friend in sent" :key="friend.id" class="friend-row"><strong>{{ friend.nickname }}</strong></li></ul>
        </section>

        <section class="friend-panel">
          <h2>{{ t('Ta liste d’amis') }}</h2>
          <p v-if="!friends.length">{{ t('Tu n’as pas encore d’amis dans ta liste.') }}</p>
          <ul v-else>
            <li v-for="friend in friends" :key="friend.id" class="friend-row">
              <template v-if="removing === friend.id">
                <span>{{ t('Retirer {name} de ta liste d’amis ?', { name: friend.nickname }) }}</span>
                <div class="friend-actions">
                  <button type="button" class="button primary" :disabled="!canChange" @click="answer(friend.id, 'remove')">{{ t('Confirmer le retrait') }}</button>
                  <button type="button" class="button ghost" @click="removing = undefined">{{ t('Annuler') }}</button>
                </div>
              </template>
              <template v-else>
                <strong>{{ friend.nickname }}</strong>
                <div class="friend-actions">
                  <GvButton variant="primary" :disabled="!canChange || tradeBusy" @click="startDraft(friend)">{{ t('Proposer un échange') }}</GvButton>
                  <button type="button" class="button ghost" :disabled="!canChange" @click="removing = friend.id">{{ t('Retirer') }}</button>
                </div>
              </template>
            </li>
          </ul>
        </section>
        <button v-if="online && !friendProblem" type="button" class="button ghost" :disabled="busy" @click="run()">{{ t('Actualiser') }}</button>
      </template>
    </div>
  </main>
</template>

<style scoped>
.friends-view { max-width: 720px; margin-inline: auto; animation: none; }
.friend-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.friend-tabs .gv-button { min-width: 0; padding-inline: 4px; white-space: normal; overflow-wrap: anywhere; }
.friend-tabs [aria-selected="true"] :deep(.gv-button-content) { text-decoration: underline; text-underline-offset: .2em; }
.trade-sides, .trade-cards { display: grid; gap: 12px; }
.trade-sides { grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); }
.trade-sides section, .trade-choice { min-width: 0; overflow-wrap: anywhere; }
.trade-sides h3 { margin-block: 6px; }
.trade-cards { grid-template-columns: repeat(auto-fill, min(100%, 220px)); margin-block: 8px; }
.trade-offer { display: grid; gap: 8px; border-top: 1px solid var(--line); padding-top: 12px; }
.friend-panel input[type="checkbox"] { width: auto; }
.trade-choice { display: grid; align-content: start; gap: 4px; }
.friend-panel .trade-check { display: flex; align-items: start; }
.friend-panel .gv-button { min-width: 0; max-width: 100%; white-space: normal; }
.friend-panel { display: grid; gap: 10px; margin-block: 12px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; }
.friend-panel h2, .friend-panel p { margin: 0; }
.friend-panel ul { display: grid; gap: 8px; padding: 0; margin: 0; list-style: none; }
.friend-panel form, .friend-row, .friend-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
.friend-panel label { display: grid; gap: 4px; min-width: 0; flex: 1 1 160px; }
.friend-panel input { min-width: 0; width: 100%; }
.friend-code-entry { text-transform: uppercase; }
.friend-panel .friend-code { width: 8ch; text-align: center; }
.friend-row { align-items: center; justify-content: space-between; overflow-wrap: anywhere; }
.friend-row .friend-code { margin-inline-end: auto; }
.friend-panel .button { max-width: 100%; white-space: normal; }
</style>
