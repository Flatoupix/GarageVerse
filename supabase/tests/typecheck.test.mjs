// Modules serveur purs (versus.ts et la copie des règles) : typage strict et syntaxe TypeScript effaçable seulement
// (ni enum ni namespace, erasableSyntaxOnly), pour que Node 22 et Deno les exécutent sans étape de build.
// Les points d'entrée Deno (index.ts, _shared/http.ts) restent hors de ce contrôle : ils importent des modules npm: et jsr:.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const config = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tsconfig.json')

export async function run(_db, { assert }) {
  const { config: json, error } = ts.readConfigFile(config, ts.sys.readFile)
  assert.equal(error, undefined, 'supabase/tsconfig.json illisible')
  const parsed = ts.parseJsonConfigFileContent(json, ts.sys, path.dirname(config))
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  const errors = ts.getPreEmitDiagnostics(program).map(d => {
    const where = d.file ? `${path.relative(path.dirname(config), d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1} ` : ''
    return where + ts.flattenDiagnosticMessageText(d.messageText, '\n')
  })
  assert.deepEqual(errors, [], 'typage des modules supabase/functions/_shared')
}
