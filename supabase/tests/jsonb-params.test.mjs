// Paramètres JSON des fonctions Edge : postgres.js ré-encode une chaîne passée à un paramètre typé jsonb (« $1::jsonb »),
// et la base reçoit alors une chaîne JSON au lieu d'un objet. Ces paramètres s'écrivent « $1::text::jsonb ». Lancé par node src/game/supabase.check.cjs.
import fs from 'node:fs'
import path from 'node:path'

const shared = new URL('../functions/_shared/', import.meta.url).pathname

export async function run(_db, { assert }) {
  for (const file of fs.readdirSync(shared).filter(name => name.endsWith('.ts'))) {
    const text = fs.readFileSync(path.join(shared, file), 'utf8')
    assert.deepEqual(text.match(/\$\d+::jsonb/g) ?? [], [], `_shared/${file} : écrire $n::text::jsonb pour un paramètre JSON`)
  }
}
