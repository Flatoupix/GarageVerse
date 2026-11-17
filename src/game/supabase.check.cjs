// Vérification hors réseau : node src/game/supabase.check.cjs
// Applique toutes les migrations de supabase/migrations/ dans un Postgres en mémoire (PGlite), après un faux environnement
// Supabase (supabase/tests/supabase-stubs.sql), puis lance chaque supabase/tests/*.test.mjs, qui exporte `run(db, helpers)`.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..', '..')
const migrations = path.join(root, 'supabase/migrations')
const tests = path.join(root, 'supabase/tests')

;(async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const fresh = async () => {
    const db = new PGlite()
    await db.exec(fs.readFileSync(path.join(tests, 'supabase-stubs.sql'), 'utf8'))
    const files = fs.existsSync(migrations) ? fs.readdirSync(migrations).filter(f => f.endsWith('.sql')).sort() : []
    for (const file of files) {
      try { await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8')) } catch (error) { throw new Error(`Migration ${file} : ${error.message}`) }
    }
    return { db, files }
  }
  // Exécute une fonction sous un rôle donné (anon, authenticated avec un utilisateur, service_role), puis revient au propriétaire.
  const as = async (db, role, userId, fn) => {
    await db.exec(`set role ${role}`)
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ''])
    try { return await fn() } finally { await db.exec('reset role'); await db.query(`select set_config('request.jwt.claim.sub', '', false)`) }
  }
  const user = async (db, id) => { await db.query('insert into auth.users (id) values ($1)', [id]); return id }

  const { files } = await fresh()
  const suites = fs.readdirSync(tests).filter(f => f.endsWith('.test.mjs')).sort()
  for (const suite of suites) {
    const { db } = await fresh()
    const mod = await import(path.join(tests, suite))
    await mod.run(db, { assert, as: (role, id, fn) => as(db, role, id, fn), user: id => user(db, id) })
  }
  console.log(`Supabase hors ligne : ${files.length} migration(s) appliquée(s), ${suites.length} suite(s) de tests : OK`)
})().catch(error => { console.error(error); process.exit(1) })
