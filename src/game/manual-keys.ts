import { watchEffect } from 'vue'
import { glossaryOpen, openHelp } from './help'

export function useManualKeys(active: () => boolean, press: (key: string) => void) {
  watchEffect(onCleanup => {
    if (!active()) return
    function keydown(event: KeyboardEvent) {
      const space = event.code === 'Space' || event.key === ' '
      if (!space && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (document.hidden || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const target = event.target
      if (target instanceof Element && (target.closest('input, textarea, select')
        || (target instanceof HTMLElement && target.isContentEditable))) return
      if (openHelp.value || glossaryOpen.value || document.querySelector('dialog[open], [aria-modal="true"], .mechanic-guide')) return
      event.preventDefault()
      if (!event.repeat) press(space ? ' ' : event.key)
    }
    document.addEventListener('keydown', keydown)
    onCleanup(() => document.removeEventListener('keydown', keydown))
  }, { flush: 'sync' })
}
