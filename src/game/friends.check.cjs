// Le module client reste testable hors réseau en remplaçant la connexion Supabase et la sauvegarde.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const save = { preferences: {} }
const navigator = { onLine: true }
const profile = { nickname: 'Pilote', friend_code: 'ABC123' }
const actions = []
let session = { user: { id: 'joueur' } }
let rpcError = null
const db = {
  auth: {
    initialize: async () => {},
    stopAutoRefresh: async () => {},
    getSession: async () => ({ data: { session } }),
    signInAnonymously: async () => { actions.push('session'); return {} },
  },
  from(table) {
    actions.push(table)
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile }) }) }) }
  },
  async rpc(name) {
    actions.push(name)
    return { data: [], error: rpcError }
  },
  functions: {
    async invoke(name, { body }) {
      actions.push([name, { ...body }])
      return { data: { ok: true } }
    },
  },
}

const mocks = { '../i18n': { t: text => text }, './store': { save }, './features': { VERSUS_OPEN: false }, './versus': { db } }
let connections = 0
const exportsObject = {}
const fetch = () => assert.fail('fetch inattendu')
const source = fs.readFileSync(path.join(__dirname, 'friends.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } })
vm.runInNewContext(code.outputText, {
  exports: exportsObject, navigator, fetch,
  require(name) {
    if (name === './versus') connections++
    assert.ok(Object.hasOwn(mocks, name), name)
    return mocks[name]
  },
})
const { loadFriends, registerFriends, requestFriend, answerFriend } = exportsObject

async function run() {
  const connection = /Connexion nécessaire/
  for (const enabled of [undefined, false]) {
    save.preferences.friendsEnabled = enabled
    await assert.rejects(loadFriends(), connection)
    await assert.rejects(registerFriends('Pilote'), connection)
    await assert.rejects(requestFriend('ABC123'), connection)
    await assert.rejects(answerFriend('id', 'remove'), connection)
  }
  assert.equal(connections, 0)
  assert.deepEqual(actions, [])
  save.preferences.friendsEnabled = true
  navigator.onLine = false
  await assert.rejects(loadFriends(), connection)
  assert.equal(connections, 0)
  navigator.onLine = true
  const original = JSON.stringify(save)
  session = null
  assert.equal((await loadFriends()).profile, null)
  await assert.rejects(requestFriend('ABC123'), connection)
  await registerFriends('Pilote')
  session = { user: { id: 'joueur' } }
  assert.equal((await loadFriends()).profile, profile)
  rpcError = { code: 'PGRST202' }
  await assert.rejects(loadFriends(), /Serveur indisponible/)
  await requestFriend('ABC123')
  await answerFriend('id', 'remove')
  assert.deepEqual(actions, [
    'session', ['register', { nickname: 'Pilote' }],
    'gv_players', 'gv_friends', 'gv_players', 'gv_friends',
    ['request-friend', { code: 'ABC123' }], ['answer-friend', { id: 'id', action: 'remove' }],
  ])
  assert.equal(JSON.stringify(save), original)
  console.log('Amis · réseau conditionnel, profil anonyme et sauvegarde : OK')
}

run().catch(error => { console.error(error); process.exitCode = 1 })
