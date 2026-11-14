import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const directory = process.argv[2]
const evidence = JSON.parse(await readFile(join(directory, 'browser.json'), 'utf8'))
const available: string[] = evidence.screenshots.filter((file: unknown) => typeof file === 'string' && /^\d+-(?:sachet|carte|garage|legendaire|echec)\.png$/.test(file))
const stdin = createInterface({ input: process.stdin })
for await (const line of stdin) {
  let request
  try { request = JSON.parse(line) } catch { continue }
  if (request.id === undefined) continue
  let result
  if (request.method === 'initialize') {
    result = { protocolVersion: request.params?.protocolVersion ?? '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'garageverse-evidence', version: '1.0.0' } }
  } else if (request.method === 'tools/list') {
    result = { tools: [{
      name: 'inspect_capture', description: 'Return the actual PNG from the automated mobile browser run. Available captures: ' + available.join(', '),
      inputSchema: { type: 'object', properties: { file: { type: 'string', enum: available } }, required: ['file'] },
    }] }
  } else if (request.method === 'tools/call' && request.params?.name === 'inspect_capture' && available.includes(request.params.arguments?.file)) {
    const file: string = request.params.arguments.file
    const data = await readFile(join(directory, file))
    result = { content: [{ type: 'image', mimeType: 'image/png', data: data.toString('base64') }] }
    console.error('[capture-inspected] ' + file)
    await import('node:fs/promises').then(fs => fs.appendFile(join(directory, 'inspected.ndjson'), JSON.stringify(file) + '\n', { mode: 0o600 }))
  } else if (request.method === 'ping') {
    result = {}
  } else {
    console.log(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Méthode ou capture indisponible' } }))
    continue
  }
  console.log(JSON.stringify({ jsonrpc: '2.0', id: request.id, result }))
}
