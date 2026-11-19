const entryName = /^index-[\w-]+\.js$/
export const UPDATE_DISMISSED_KEY = 'garageverse:update-dismissed'

export function entryScriptName(src: string | null | undefined) {
  const name = src?.split(/[?#]/, 1)[0]?.split('/').pop()
  return name && entryName.test(name) ? name : null
}

export function deployedEntryName(html: string) {
  const scripts = html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script(?=\s|>)((?:"[^"]*"|'[^']*'|[^'">])*)>[\s\S]*?<\/script\s*>/gi)
  for (const [, tag] of scripts) {
    const attributes = new Map<string, string>()
    for (const [, name, double, single, bare] of tag.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/g)) {
      attributes.set(name.toLowerCase(), double ?? single ?? bare ?? '')
    }
    if (attributes.get('type')?.toLowerCase() === 'module' && attributes.has('src')) {
      return entryScriptName(attributes.get('src'))
    }
  }
  return null
}

export function differentEntry(current: string | null, deployed: string | null) {
  return current && deployed && entryName.test(current) && entryName.test(deployed) && current !== deployed ? deployed : null
}

export function shouldOfferUpdate(version: string | null, dismissed: string | null) {
  return Boolean(version && version !== dismissed)
}
