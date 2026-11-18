<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { answerFriend, loadFriends, registerFriends, requestFriend, type FriendAction, type Friendship } from '../game/friends'

const props = defineProps<{ online: boolean }>()
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
const canChange = computed(() => props.online && !!profile.value && !busy.value)

async function refresh() {
  const data = await loadFriends()
  profile.value = data.profile
  list.value = data.list
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

watch(() => props.online, online => { if (online) void run() }, { immediate: true })
</script>

<template>
  <main class="friends-view">
    <button type="button" class="button quiet" @click="emit('back')">{{ t('← Garage') }}</button>
    <div class="page-heading"><h1 tabindex="-1">{{ t('Échanges') }}</h1></div>

    <div class="tabs friend-tabs" role="tablist" :aria-label="t('Échanges')">
      <button id="friends-tab" type="button" role="tab" aria-selected="true" aria-pressed="true" aria-controls="friends-panel">{{ t('Amis') }}</button>
    </div>
    <div id="friends-panel" role="tabpanel" aria-labelledby="friends-tab" :aria-busy="busy">
      <p v-if="!online" role="status">{{ t('Connexion nécessaire') }}</p>
      <p v-else-if="error" role="alert">{{ error }}</p>
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
              <button type="button" class="button ghost" :disabled="!canChange" @click="removing = friend.id">{{ t('Retirer') }}</button>
            </template>
          </li>
        </ul>
      </section>
      <button type="button" class="button ghost" :disabled="!online || busy" @click="run()">{{ t('Actualiser') }}</button>
    </div>
  </main>
</template>

<style scoped>
.friends-view { max-width: 720px; margin-inline: auto; animation: none; }
.friend-tabs { grid-template-columns: minmax(0, 1fr); }
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
