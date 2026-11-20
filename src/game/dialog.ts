import { ANDROID_BUILD } from './platform'

const dialogOrder = new WeakMap<HTMLDialogElement, number>()
let lastOrder = 0

export function showGameDialog(dialog?: HTMLDialogElement | null) {
  if (!dialog || dialog.open) return
  dialog.showModal()
  if (ANDROID_BUILD) dialogOrder.set(dialog, ++lastOrder)
}

export function closeTopGameDialog() {
  // L'ordre du DOM peut différer de l'ordre d'ouverture dans la couche modale.
  let top: HTMLDialogElement | undefined
  let topOrder = 0
  for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog[open]')) {
    const order = dialogOrder.get(dialog) ?? 0
    if (order <= topOrder) continue
    top = dialog
    topOrder = order
  }
  top?.close()
  return Boolean(top)
}
