import { progression, vehicleById } from './data'
import { scrapCar, type Save } from './save'

export interface RecycleReceipt { id: string; credits: number; expires: number; used: boolean; car: Save['cars'][string] }
export function recycle(save: Save, id: string, now = Date.now()): RecycleReceipt | undefined {
  const car = save.cars[id]
  if (scrapCar(save, id)) return
  return { id, car, credits: progression.scrap[vehicleById.get(id)!.rarity], expires: now + 6000, used: false }
}
export function undoRecycle(save: Save, receipt: RecycleReceipt, id: string, now = Date.now()): string | undefined {
  if (receipt.used || now >= receipt.expires || receipt.id !== id || save.cars[id] !== receipt.car) return 'Annulation expirée'
  // Les crédits gagnés ont pu être dépensés entre-temps : on refuse plutôt que de passer en négatif.
  if (save.credits < receipt.credits) return `Il te manque ${receipt.credits - save.credits} crédits pour annuler`
  // Reprend seulement le gain du recyclage, sans écraser les autres actions.
  save.cars[id].copies++
  save.credits -= receipt.credits
  receipt.used = true
}
