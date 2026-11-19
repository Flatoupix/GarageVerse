import type { Directive } from 'vue'
import { rarities, rarityClass, type Rarity } from './data'
import { reducedMotion } from './store'
import { theme, type Theme } from './theme'

// Couche d'effets : un canevas plein écran dessine particules, flashs et textes flottants.
// Tout est décoratif : en mouvement réduit, chaque fonction ne fait rien.
type Kind = 'spark' | 'confetti' | 'streak' | 'ring' | 'text'
interface Particle { kind: Kind; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; rot: number; spin: number; text?: string }
export type Target = Element | string | { x: number; y: number } | null | undefined

// Couleurs des effets propres à chaque thème.
type Palettes = Record<'cyan' | 'pink' | 'sun' | 'gold' | 'fire', string[]>
type Tones = Record<'light' | 'gold' | 'rose' | 'cyan', string>
const themed: Record<Theme, { palettes: Palettes; tone: Tones }> = {
  neon: {
    palettes: { cyan: ['#2de2ff', '#8ff3ff', '#ffffff'], pink: ['rgb(255 95 210)', '#ff9be0', '#ffffff'], sun: ['#ffb347', '#ff7a3d', '#ffd27a'],
      gold: ['#ffd27a', 'rgb(255 95 210)', '#8ff3ff', '#8b5cff', '#ffffff'], fire: ['#ffb347', '#ff5e3a', '#ff2a8a', '#ffffff'] },
    tone: { light: '#ffffff', gold: '#ffd27a', rose: 'rgb(255 95 210)', cyan: '#2de2ff' },
  },
  pixel: {
    palettes: { cyan: ['#5a6988', '#ead4aa'], pink: ['#0099db', '#2ce8f5'], sun: ['#b55088', '#68386c', '#ead4aa'],
      gold: ['#feae34', '#f77622', '#ead4aa'], fire: ['#feae34', '#f77622', '#e43b44', '#ead4aa'] },
    tone: { light: '#ead4aa', gold: '#feae34', rose: '#b55088', cyan: '#2ce8f5' },
  },
  sobre: {
    palettes: { cyan: ['#c9cad0', '#ffffff'], pink: ['#7cc4ff', '#ffffff'], sun: ['#c58bff', '#ffffff'],
      gold: ['#ffb547', '#ffd58a', '#ffffff'], fire: ['#ffb547', '#ff7a45', '#ffffff'] },
    tone: { light: '#ffffff', gold: '#ffb547', rose: '#c58bff', cyan: '#7cc4ff' },
  },
  sport: {
    palettes: { cyan: ['#121212', '#9a9a9a'], pink: ['#1d5fd1', '#ffffff'], sun: ['#f2b01e', '#121212'],
      gold: ['#e63322', '#f2b01e', '#1d5fd1', '#ffffff'], fire: ['#e63322', '#f2b01e', '#121212'] },
    tone: { light: '#ffffff', gold: '#f2b01e', rose: '#e63322', cyan: '#1d5fd1' },
  },
  arcade: {
    palettes: { cyan: ['#ffffff', '#33bbff'], pink: ['#33bbff', '#ffffff'], sun: ['#ff3b3b', '#ffe100'],
      gold: ['#ffe100', '#ff7a00', '#ff3b3b', '#33ff66'], fire: ['#ffe100', '#ff7a00', '#ff3b3b'] },
    tone: { light: '#ffffff', gold: '#ffe100', rose: '#ff3b3b', cyan: '#33bbff' },
  },
  console: {
    palettes: { cyan: ['#c8d0ff', '#ffffff'], pink: ['#7cd0ff', '#ffffff'], sun: ['#ff8ad8', '#ffffff'],
      gold: ['#ffd84a', '#ff9a3c', '#ffffff'], fire: ['#ffd84a', '#ff9a3c', '#ff5a6a'] },
    tone: { light: '#ffffff', gold: '#ffd84a', rose: '#ff8ad8', cyan: '#7cd0ff' },
  },
  dos: {
    palettes: { cyan: ['#ffffff', '#c0c0c0'], pink: ['#55ffff', '#ffffff'], sun: ['#ff55ff', '#ffffff'],
      gold: ['#ffff55', '#55ff55', '#55ffff', '#ffffff'], fire: ['#ffff55', '#ff5555', '#ffffff'] },
    tone: { light: '#ffffff', gold: '#ffff55', rose: '#ff5555', cyan: '#55ffff' },
  },
  carnet: {
    palettes: { cyan: ['#6d6252', '#2b2420'], pink: ['#2a5aa8', '#6d8fd0'], sun: ['#c0392b', '#2b2420'],
      gold: ['#c0392b', '#2a5aa8', '#e2b33c', '#2b2420'], fire: ['#c0392b', '#e2b33c', '#2b2420'] },
    tone: { light: '#fffaf0', gold: '#e2b33c', rose: '#c0392b', cyan: '#2a5aa8' },
  },
}
// Thèmes à particules carrées et mouvements par paliers.
const blocky = new Set<Theme>(['pixel', 'arcade', 'console', 'dos'])
export const palettes: Palettes = { cyan: [], pink: [], sun: [], gold: [], fire: [] }
export const tone: Tones = { ...themed.neon.tone }
export const rarityPalette: Record<Rarity, string[]> = { Courante: [], Rare: [], Épique: [], Légendaire: [] }
let font = 'Orbitron, sans-serif'

// Le canevas lit les mêmes teintes que les cartes et calcule deux reflets plus clairs.
function rarityColors(color: string) {
  const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
  return [color, ...[0.35, 0.7].map(light => `rgb(${rgb.map(channel => Math.round(channel + (255 - channel) * light)).join(' ')})`)]
}
export function themeFx(id: Theme) {
  for (const key of Object.keys(palettes) as (keyof Palettes)[]) palettes[key].splice(0, Infinity, ...themed[id].palettes[key])
  Object.assign(tone, themed[id].tone)
  const styles = getComputedStyle(document.documentElement)
  font = styles.getPropertyValue('--display').trim() || 'sans-serif'
  for (const rarity of rarities) {
    const color = styles.getPropertyValue(`--rarity-${rarityClass[rarity]}`).trim()
    if (color) rarityPalette[rarity] = rarityColors(color)
  }
}
themeFx('neon')

let canvas: HTMLCanvasElement | undefined
let ctx: CanvasRenderingContext2D | null = null
let width = 0, height = 0, raf = 0, last = 0
let flashColor = '#ffffff', flashAlpha = 0
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
  el.style.visibility = 'hidden'
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

// Hors animation, le canevas est masqué : certains navigateurs mobiles (Brave sur Android, au-dessus d'une fiche ouverte)
// gardaient affichée la dernière image dessinée même après l'effacement, comme un « −80 » figé sous le porte-monnaie.
function rest() {
  raf = 0; flashAlpha = 0
  ctx?.clearRect(0, 0, width, height)
  if (canvas) canvas.style.visibility = 'hidden'
}

function start() {
  if (!canvas || !ctx || reducedMotion.value) return false
  canvas.style.visibility = ''
  try {
    if (document.querySelector('dialog[open]') && canvas.hasAttribute('popover')) { canvas.hidePopover(); canvas.showPopover() }
  } catch { /* le canevas reste sous le dialogue */ }
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) }
  return true
}

// Rendu lisse (thèmes non pixel) : traînées lumineuses, confettis qui tournent, anneaux ronds.
function drawSmooth(ctx: CanvasRenderingContext2D, p: Particle, t: number, dt: number) {
  const glow = theme.value === 'neon' ? 'lighter' : 'source-over'
  if (p.kind === 'spark') {
    p.vx *= 1 - dt * 2.4; p.vy = p.vy * (1 - dt * 2.4) + 520 * dt
    ctx.globalCompositeOperation = glow
    ctx.strokeStyle = p.color; ctx.lineWidth = p.size * (0.4 + t); ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045); ctx.stroke()
  } else if (p.kind === 'streak') {
    ctx.globalCompositeOperation = glow
    ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round'
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.09, p.y); ctx.stroke()
  } else if (p.kind === 'confetti') {
    p.vy += 620 * dt; p.vx *= 1 - dt * 0.9; p.rot += p.spin * dt
    ctx.globalCompositeOperation = 'source-over'
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2.3))
    ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6); ctx.restore()
  } else if (p.kind === 'ring') {
    p.size += p.spin * dt
    ctx.globalCompositeOperation = glow
    ctx.globalAlpha = t
    ctx.strokeStyle = p.color; ctx.lineWidth = 1 + 5 * t
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.stroke()
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.font = `700 ${p.size}px ${font}`
    ctx.textAlign = 'center'
    if (theme.value === 'neon') { ctx.shadowColor = p.color; ctx.shadowBlur = 12 }
    ctx.fillStyle = p.color; ctx.fillText(p.text!, p.x, p.y)
    ctx.shadowBlur = 0
  }
}

function frame(now: number) {
  if (!ctx) return
  if (reducedMotion.value) {
    particles.length = 0
    rest()
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
    if (!blocky.has(theme.value)) { drawSmooth(ctx, p, t, dt); continue }
    const x = Math.round(p.x), y = Math.round(p.y), size = Math.max(2, Math.round(p.size))
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = p.color
    if (p.kind === 'spark') {
      p.vx *= 1 - dt * 2.4; p.vy = p.vy * (1 - dt * 2.4) + 520 * dt
      ctx.fillRect(x, y, size, size)
    } else if (p.kind === 'streak') {
      ctx.globalAlpha = t * 0.45
      const w = Math.min(48, Math.round(Math.abs(p.vx) * 0.02))
      ctx.fillRect(p.vx > 0 ? x - w : x, y, w, 2)
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
      ctx.font = `400 ${Math.round(p.size)}px ${font}`
      ctx.textAlign = 'center'
      ctx.fillText(p.text!, x, y)
    }
  }
  ctx.globalAlpha = 1
  if (particles.length || flashAlpha > 0.01) raf = requestAnimationFrame(frame)
  else rest()
}

export function point(target: Target) {
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (!el) return { x: width / 2, y: height * 0.4 }
  if (!(el instanceof Element)) return el
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

export function sparks(target: Target, colors = palettes.cyan, count = 26, power = 1, duration?: number) {
  if (!start()) return
  const { x, y } = point(target)
  const burst: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2), speed = rand(140, 620) * power, life = duration ? rand(duration * 0.55, duration) : rand(0.35, 0.85)
    burst.push({ kind: 'spark', x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 80, life, max: life, size: rand(1.5, 3.4), color: pick(colors), rot: 0, spin: 0 })
  }
  particles.push(...burst)
  return () => {
    for (const particle of burst) particle.life = 0
  }
}

export function ring(target: Target, color = tone.cyan, speed = 520, life = 0.5) {
  if (!start()) return
  const { x, y } = point(target)
  particles.push({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size: 12, color, rot: 0, spin: speed })
}

// Pluie de confettis et canons latéraux, ou salve courte depuis une cible.
export function confetti(colors = palettes.gold, count = 90, burst?: { target: Target; duration: number }) {
  if (!start()) return
  const origin = burst ? point(burst.target) : undefined
  for (let i = 0; i < count; i++) {
    const side = i % 3
    const life = burst ? rand(burst.duration * 0.7, burst.duration) : rand(1.6, 2.8)
    particles.push({
      kind: 'confetti', life, max: life, size: burst ? rand(3, 6) : rand(6, 12), color: pick(colors), rot: rand(0, 6), spin: rand(-9, 9),
      x: origin ? origin.x : side === 0 ? rand(0, width) : side === 1 ? -10 : width + 10,
      y: origin ? origin.y : side === 0 ? rand(-60, -10) : height * rand(0.45, 0.75),
      vx: origin ? rand(-260, 260) : side === 0 ? rand(-60, 60) : (side === 1 ? 1 : -1) * rand(180, 520),
      vy: origin ? rand(-200, -75) : side === 0 ? rand(40, 260) : rand(-760, -380),
    })
  }
}

// Lignes de vitesse horizontales (nitro, départ de course).
export function streaks(colors = palettes.fire, count = 34, direction = 1, duration?: number) {
  if (!start()) return
  for (let i = 0; i < count; i++) {
    const life = duration ? rand(duration * 0.65, duration) : rand(0.3, 0.7)
    particles.push({ kind: 'streak', x: direction > 0 ? rand(-width * 0.6, width * 0.3) : rand(width * 0.7, width * 1.6), y: rand(0, height),
      vx: direction * rand(1400, 2800), vy: 0, life, max: life, size: rand(1, 3.5), color: pick(colors), rot: 0, spin: 0 })
  }
}

export function floatText(target: Target, text: string, color = tone.gold, size = 22, life = 1.1) {
  if (!start()) return
  const { x, y } = point(target)
  particles.push({ kind: 'text', x, y, vx: 0, vy: -46, life, max: life, size, color, rot: 0, spin: 0, text })
}

export function flash(color = tone.light, strength = 0.5) {
  if (!start()) return
  flashColor = color
  flashAlpha = Math.max(flashAlpha, strength)
}

// Secousse de la scène ciblée ou de la vue courante, niveau 1 à 3.
export function shake(level: 1 | 2 | 3 = 1, target?: string | HTMLElement) {
  if (reducedMotion.value) return
  const el = typeof target === 'string' ? document.querySelector(target) : target ?? document.querySelector('dialog[open] .sheet') ?? document.querySelector('main')
  const d = [0, 4, 8, 14][level]
  if (!(el instanceof HTMLElement)) return
  // La secousse déplace l'élément par left/top et non par translate : un déplacement transformé ferait de l'élément
  // le repère des barres d'action fixes de la course, qui sauteraient alors sur le côté pendant l'animation.
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
  const steps: [number, number][] = [[0, 0], [d, -d * 0.6], [-d, d * 0.5], [d * 0.6, d * 0.3], [-d * 0.3, -d * 0.2], [0, 0]]
  el.animate(steps.map(([x, y]) => ({ left: `${x}px`, top: `${y}px` })),
    { duration: 170 + level * 90, easing: blocky.has(theme.value) ? 'steps(6, end)' : 'ease-out' })
}

export function pop(target: Target, scale = 1.14, duration = 320) {
  if (reducedMotion.value) return
  const el = typeof target === 'string' ? document.querySelector(target) : target
  if (el instanceof Element) el.animate({ scale: ['1', String(scale), '0.97', '1'] }, { duration, easing: blocky.has(theme.value) ? 'steps(6, end)' : 'cubic-bezier(.2,.9,.3,1.3)' })
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
