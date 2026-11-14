import { boosterOrder, boosters, editions, type BoosterId, type EditionId } from './catalog'

export interface Opening {
  editions: EditionId[]
  revealed: number
  view: 'back' | 'face' | 'recap'
  collected: boolean
}

interface Save {
  version: 1
  active: BoosterId | null
  openings: Partial<Record<BoosterId, Opening>>
  preferences: { sound: boolean; reducedMotion: boolean; vibration: boolean }
}

export interface OwnedCopy {
  id: string
  editionId: EditionId
}

export const SAVE_KEY = 'garageverse:v1'

export function emptySave(): Save {
  return {
    version: 1, active: null, openings: {},
    preferences: { sound: true, reducedMotion: false, vibration: true },
  }
}

export function readSave(raw: string | null): Save {
  const save = emptySave()
  if (!raw) return save

  try {
    const input = JSON.parse(raw) as Partial<Save> | null
    if (input?.version !== 1) return save
    save.active = boosterOrder.find(id => id === input.active) ?? null

    for (const id of boosterOrder) {
      const opening = input.openings?.[id]
      if (!opening || !Array.isArray(opening.editions) || opening.editions.length !== 5 ||
          !opening.editions.every(edition => Object.hasOwn(editions, edition))) continue

      const collected = opening.collected === true
      const revealed = Number.isInteger(opening.revealed) ? Math.max(0, Math.min(5, opening.revealed)) : 0
      const view = collected || (revealed === 5 && opening.view === 'recap')
        ? 'recap'
        : revealed && (opening.view === 'face' || revealed === 5) ? 'face' : 'back'
      save.openings[id] = { editions: opening.editions, revealed: collected ? 5 : revealed, view, collected }
    }

    save.preferences = {
      sound: input.preferences?.sound !== false,
      reducedMotion: input.preferences?.reducedMotion === true,
      vibration: input.preferences?.vibration !== false,
    }
  } catch {
    return save
  }

  return save
}

export function tear(save: Save, id: BoosterId) {
  save.openings[id] ??= { editions: [...boosters[id].editions], revealed: 0, view: 'back', collected: false }
}

export function collect(save: Save, id: BoosterId) {
  const opening = save.openings[id]
  if (!opening || opening.revealed !== opening.editions.length) return
  opening.collected = true
  save.active = null
}

export function ownedCopies(save: Save): OwnedCopy[] {
  return boosterOrder.flatMap(id => {
    const opening = save.openings[id]
    return opening?.collected
      ? opening.editions.map((editionId, slot) => ({ id: `${id}:${slot}`, editionId }))
      : []
  })
}
