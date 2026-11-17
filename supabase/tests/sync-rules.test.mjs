// Copie des règles (supabase/sync-rules.mjs) : supabase/functions/_shared/game/ doit être exactement ce que le script produit
// à partir des sources actuelles, et ne contenir que des fichiers copiés. Lancé par node src/game/supabase.check.cjs.
import fs from 'node:fs'
import path from 'node:path'
import { render, target } from '../sync-rules.mjs'

export async function run(_db, { assert }) {
  const expected = render()
  const present = fs.readdirSync(target).sort()
  assert.deepEqual(present, [...expected.keys()].sort(), `${target} : fichiers inattendus ou manquants, relancer node supabase/sync-rules.mjs`)
  for (const [file, text] of expected) {
    assert.ok(fs.readFileSync(path.join(target, file), 'utf8') === text, `_shared/game/${file} diffère de sa source : relancer node supabase/sync-rules.mjs`)
  }
  // La copie se charge sous Node sans étape de build, comme sous Deno.
  const rules = await import(path.join(target, 'rules.ts'))
  for (const name of ['replayVersus', 'autoChoice', 'checkVersusLineup', 'stakeCheck']) assert.equal(typeof rules[name], 'function', name)
}
