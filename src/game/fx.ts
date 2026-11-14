import type { Directive } from 'vue'
import type { Rarity } from './data'
import { reducedMotion } from './store'

// Couche d'effets : un canevas plein écran dessine particules, flashs et textes flottants.
// Tout est décoratif : en mouvement réduit, chaque fonction ne fait rien.
type Kind = 'spark' | 'confetti' | 'streak' | 'ring' | 'text'
interface Particle { kind: Kind; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; rot: number; spin: number; text?: string }
export type Target = Element | string | { x: number; y: number } | null | undefined

export const palettes = {
  cyan: ['#5a6988', '#ead4aa'],
  pink: ['#0099db', '#2ce8f5'],
  sun: ['#b55088', '#68386c', '#ead4aa'],
  gold: ['#feae34', '#f77622', '#ead4aa'],
  fire: ['#feae34', '#f77622', '#e43b44', '#ead4aa'],
}
export const rarityPalette: Record<Rarity, string[]> = { Courante: palettes.cyan, Rare: palettes.pink, Épique: palettes.sun, Légendaire: palettes.gold }

let canvas: HTMLCanvasElement | undefined
let ctx: CanvasRenderingContext2D | null = null
let width = 0, height = 0, raf = 0, last = 0
let flashColor = '#ead4aa', flashAlpha = 0
const particles: Particle[] = []
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]

export function mountFx(el: HTMLCanvasElement) {
  canvas = el
  ctx = el.getContext('2d')
  // En couche supérieure (popover), le canevas peut passer devant une fiche ouverte en dialogue modal.
  try { if ('showPopover' in el) { el.setAttribute('popover', 'manual'); el.showPopover() } } catch { el.removeAttribute('popover') }
  resize()
  window.addEventListener('resize', resize)
}

function resize() {
  if (!canvas || !ctx) return
  const ratio = Math.min(2, window.devicePixelRatio || 1)
  width = window.innerWidth
  height = window.innerHeight
  canvas.width = width * ratio
  canvas.height = height * ratio
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
}

function start() {
  if (!canvas || !ctx || reducedMotion.value) return false
  try {
    if (document.querySelector('dialog[open]') && canvas.hasAttribute('popover')) { canvas.hidePopover(); canvas.showPopover() }
  } catch { /* le canevas reste sous le dialogue */ }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
  return true
}

function frame(now: number) {
  if (!ctx) return
  if (reducedMotion.value) {
    particles.length = 0; flashAlpha = 0; raf = 0
    ctx.clearRect(0, 0, width, height)
    return
  }
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  ctx.clearRect(0, 0, width, height)
  if (flashAlpha > 0.01) {
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = flashAlpha
    ctx.fillStyle = flashColor
    ctx.fillRect(0, 0, width, height)
    flashAlpha *= Math.exp(-dt * 7)
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life -= dt
    if (p.life <= 0 || p.y > height + 40) { particles.splice(i, 1); continue }
    const t = p.life / p.max
    p.x += p.vx * dt
    p.y += p.vy * dt
    ctx.globalAlpha = Math.min(1, t * 1.6)
    const x = Math.round(p.x), y = Math.round(p.y), size = Math.max(2, Math.round(p.size))
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = p.color
    if (p.kind === 'spark') {
      p.vx *= 1 - dt * 2.4; p.vy = p.vy * (1 - dt * 2.4) + 520 * dt
      ctx.fillRect(x, y, size, size)
    } else if (p.kind === 'streak') {
      ctx.globalAlpha = t * 0.45
      ctx.fillRect(x, y, Math.min(48, Math.round(Math.abs(p.vx) * 0.02)), 2)
    } else if (p.kind === 'confetti') {
      p.vy += 620 * dt; p.vx *= 1 - dt * 0.9
      ctx.fillRect(x, y, size, size)
    } else if (p.kind === 'ring') {
      p.size += p.spin * dt
      const radius = Math.round(p.size)
      ctx.globalAlpha = t
      ctx.strokeStyle = p.color; ctx.lineWidth = 2
      ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2)
    } else {
      ctx.font = `400 ${Math.round(p.size)}px "Press Start 2P", monospace`
      ctx.textAlign = 'center'
      ctx.fillText(p.text!, x, y)
    }
  }
  ctx.globalAlpha = 1
  if (particles.length || flashAlpha > 0.01) raf = requestAnimationFrame(frame)
  else { raf = 0; flashAlpha = 0; ctx.clearRect(0, 0, width, height) }
}

export function point(target: Target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return { x: width / 2, y: height * 0.4 }
  if (!(el instanceof Element)) return el
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

export function sparks(target: Target, colors = palettes.cyan, count = 26, power = 1) {
  if (!start()) return
  const { x, y } = point(target)
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2), speed = rand(140, 620) * power, life = rand(0.35, 0.85)
    particles.push({ kind: 'spark', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life, max: life, size: rand(1.5, 3.4), color: pick(colors), rot: 0, spin: 0 })
  }
}

export function ring(target: Target, color = '#2ce8f5', speed = 520) {
  if (!start()) return
  const { x, y } = point(target)
  particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 12, color, rot: 0, spin: speed })
}

// Pluie de confettis depuis le haut, plus deux canons latéraux.
export function confetti(colors = palettes.gold, count = 90) {
  if (!start()) return
  for (let i = 0; i < count; i++) {
    const side = i % 3
    const life = rand(1.6, 2.8)
    particles.push({
      kind: 'confetti', life, max: life, size: rand(6, 12), color: pick(colors), rot: rand(0, 6), spin: rand(-9, 9),
      x: side === 0 ? rand(0, width) : side === 1 ? -10 : width + 10,
      y: side === 0 ? rand(-60, -10) : height * rand(0.45, 0.75),
      vx: side === 0 ? rand(-60, 60) : (side === 1 ? 1 : -1) * rand(180, 520),
      vy: side === 0 ? rand(40, 260) : rand(-760, -380),
    })
  }
}

// Lignes de vitesse horizontales (nitro, départ de course).
export function streaks(colors = palettes.fire, count = 34, direction = 1) {
  if (!start()) return
  for (let i = 0; i < count; i++) {
    const life = rand(0.3, 0.7)
    particles.push({ kind: 'streak', x: direction > 0 ? rand(-width * 0.6, width * 0.3) : rand(width * 0.7, width * 1.6), y: rand(0, height),
      vx: direction * rand(1400, 2800), vy: 0, life, max: life, size: rand(1, 3.5), color: pick(colors), rot: 0, spin: 0 })
  }
}

export function floatText(target: Target, text: string, color = '#feae34', size = 22) {
  if (!start()) return
  const { x, y } = point(target)
  particles.push({ kind: 'text', x, y, vx: 0, vy: -46, life: 1.1, max: 1.1, size, color, rot: 0, spin: 0, text })
}

export function flash(color = '#ead4aa', strength = 0.5) {
  if (!start()) return
  flashColor = color
  flashAlpha = Math.max(flashAlpha, strength)
}

// Secousse de la vue courante (ou de la fiche ouverte), niveau 1 à 3.
export function shake(level: 1 | 2 | 3 = 1) {
  if (reducedMotion.value) return
  const el = document.querySelector('dialog[open] .sheet') ?? document.querySelector('main')
  const d = [0, 4, 8, 14][level]
  el?.animate({
    translate: ['0 0', `${d}px ${-d * 0.6}px`, `${-d}px ${d * 0.5}px`, `${d * 0.6}px ${d * 0.3}px`, `${-d * 0.3}px ${-d * 0.2}px`, '0 0'],
  }, { duration: 170 + level * 90, easing: 'steps(6, end)' })
}

export function pop(target: Target, scale = 1.14, duration = 320) {
  if (reducedMotion.value) return
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el instanceof Element) el.animate({ scale: ['1', String(scale), '0.97', '1'] }, { duration, easing: 'steps(6, end)' })
}

// Fait défiler une valeur numérique vers sa cible ; retourne de quoi l'annuler.
export function tween(from: number, to: number, ms: number, step: (value: number) => void, done?: () => void) {
  if (reducedMotion.value || from === to) { step(to); done?.(); return () => {} }
  const begin = performance.now()
  let id = requestAnimationFrame(function tick(now) {
    const t = Math.min(1, (now - begin) / ms)
    step(Math.round(from + (to - from) * (1 - (1 - t) ** 3)))
    if (t < 1) id = requestAnimationFrame(tick)
    else done?.()
  })
  return () => cancelAnimationFrame(id)
}

// v-tilt : la carte s'incline sous le doigt et un reflet suit le pointeur.
export const vTilt: Directive<HTMLElement> = {
  mounted(el) {
    el.classList.add('tilt')
    const move = (event: PointerEvent) => {
      if (reducedMotion.value) return
      const box = el.getBoundingClientRect()
      const px = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), py = Math.min(1, Math.max(0, (event.clientY - box.top) / box.height))
      el.classList.add('tilting')
      el.style.setProperty('--ry', `${(px - 0.5) * 22}deg`)
      el.style.setProperty('--rx', `${(0.5 - py) * 18}deg`)
      el.style.setProperty('--gx', `${px * 100}%`)
      el.style.setProperty('--gy', `${py * 100}%`)
    }
    const rest = () => { el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg') }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', move)
    for (const name of ['pointerleave', 'pointerup', 'pointercancel'] as const) el.addEventListener(name, rest)
  },
}
