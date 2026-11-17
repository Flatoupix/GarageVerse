// Copie des règles du jeu pour les fonctions serveur : node supabase/sync-rules.mjs
// Recopie src/game/rules.ts, src/game/data.ts et src/data/{roster,garage}.json dans supabase/functions/_shared/game/ (docs/supabase.md § 5).
// Seuls les imports changent : chemins relatifs dans le dossier de copie, extension .ts, `with { type: 'json' }` pour les JSON,
// pour que Deno et Node 22 chargent les fichiers tels quels. La copie est commitée et ne s'édite jamais à la main :
// supabase/tests/sync-rules.test.mjs échoue si elle diffère de ce que ce script produit.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
export const target = path.join(root, 'supabase/functions/_shared/game')
export const sources = ['src/game/rules.ts', 'src/game/data.ts', 'src/data/roster.json', 'src/data/garage.json']
const copied = new Map(sources.map(source => [path.join(root, source), path.basename(source)]))

// Réécrit `from '…'` (imports et exports) vers le fichier copié. Un import vers un fichier non copié est une erreur.
function adapt(source, text) {
  return text.replace(/(\bfrom\s+)'(\.{1,2}\/[^']+)'/g, (_, from, spec) => {
    const resolved = path.resolve(path.dirname(source), spec)
    const file = copied.get(resolved) ?? copied.get(`${resolved}.ts`)
    if (!file) throw new Error(`${path.relative(root, source)} importe ${spec}, qui n'est pas copié dans ${path.relative(root, target)}`)
    return file.endsWith('.json') ? `${from}'./${file}' with { type: 'json' }` : `${from}'./${file}'`
  })
}

// Contenu attendu de chaque fichier de la copie, à partir des sources actuelles.
export function render() {
  const out = new Map()
  for (const [source, file] of copied) {
    const text = fs.readFileSync(source, 'utf8')
    out.set(file, file.endsWith('.ts') ? adapt(source, text) : text)
  }
  return out
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  fs.mkdirSync(target, { recursive: true })
  for (const [file, text] of render()) fs.writeFileSync(path.join(target, file), text)
  console.log(`Règles copiées dans ${path.relative(root, target)} : ${[...copied.values()].join(', ')}`)
}
