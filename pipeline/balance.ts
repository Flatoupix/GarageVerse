// Simulation d'équilibrage : node pipeline/balance.mjs (compile ce fichier avec esbuild puis l'exécute).
// Fait courir des écuries tirées au hasard l'une contre l'autre avec l'IA des deux côtés.
import { writeFileSync } from 'node:fs'
import { leagues, parts, progression, rivals, specials, vehicles, type Rival, type StatKey } from '../src/game/data'
import { aiChoice, compatibility, createRace, partUnlockLevel, playRound, potential, rivalLineup, statsOf, upgradeForFamily, type Prep } from '../src/game/rules'

let seed = 20261114
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32)
const playable = vehicles

// Préparation gloutonne : meilleures pièces par point de potentiel, une par famille.
function prepared(id: string, stage: number): Prep {
  const v = vehicles.find(x => x.id === id)!
  const prep: Prep = { stage, parts: [] }
  const budget = potential(v, stage)
  const gain = (pid: string) => {
    const p = parts.find(x => x.id === pid)!
    const statGain = Object.values(p.stats ?? {}).reduce((n, x) => n + x, 0)
    const effectGain = (p.effects ?? []).reduce((n, e) => n + (e.type === 'boost' ? e.value * 0.4 : e.value * 1.2), 0)
    return (statGain + effectGain) / p.cost
  }
  for (const p of [...parts].filter(p => !compatibility(p, v)).sort((a, b) => gain(b.id) - gain(a.id))) {
    const used = prep.parts.reduce((n, x) => n + parts.find(y => y.id === x)!.cost, 0)
    if (used + p.cost > budget || prep.parts.some(x => parts.find(y => y.id === x)!.family === p.family)) continue
    if (gain(p.id) > 0) {
      prep.parts.push(p.id)
      const key = upgradeForFamily(p.family)
      if (key) (prep.upgrades ??= {})[key] = partUnlockLevel
    }
  }
  return prep
}

function randomLineup(cap: number, stage: number, forced?: string) {
  for (let tries = 0; tries < 500; tries++) {
    const ids = new Set<string>(forced ? [forced] : [])
    while (ids.size < 3) ids.add(playable[Math.floor(rng() * playable.length)].id)
    const list = [...ids]
    if (list.reduce((n, id) => n + vehicles.find(v => v.id === id)!.cost, 0) <= cap) return list.map(id => ({ id, prep: prepared(id, stage) }))
  }
}

function race(circuit: Rival['circuit'], a: { id: string; prep: Prep }[], b: { id: string; prep: Prep }[], rivalId = 'sim') {
  const duel = createRace(rivalId, circuit, a, b, rng)
  while (!duel.winner) playRound(duel, aiChoice(duel, 'player', rng), rng)
  return duel
}

// 0. Cohérence des données : arrête la simulation si une règle de contenu est violée.
const problems: string[] = []
const numbers = vehicles.map(v => v.number)
if (new Set(numbers).size !== numbers.length) problems.push('numéros de collection dupliqués')
for (const v of vehicles) {
  if (Object.values(v.stats).some(x => x < 1 || x > 10)) problems.push(`${v.id} : score hors de 1..10`)
  if (v.evolvesFrom && !vehicles.some(x => x.id === v.evolvesFrom)) problems.push(`${v.id} : évolution d'une base inconnue`)
  if (v.culture?.base && !vehicles.some(x => x.id === v.culture!.base)) problems.push(`${v.id} : carte de base inconnue`)
}
for (const r of rivals) {
  const cap = leagues.find(l => l.id === r.league)!.cap
  const cost = r.lineup.reduce((n, e) => n + vehicles.find(v => v.id === e.id)!.cost, 0)
  if (cost > cap) problems.push(`${r.id} : écurie ${cost} au-dessus du plafond ${cap}`)
  for (const e of r.lineup) {
    const v = vehicles.find(x => x.id === e.id)!
    const fitted = e.parts.map(id => parts.find(p => p.id === id)!)
    for (const p of fitted) if (compatibility(p, v)) problems.push(`${r.id} : ${p.id} incompatible avec ${v.id}`)
    if (new Set(fitted.map(p => p.family)).size !== fitted.length) problems.push(`${r.id} : deux pièces de même famille sur ${v.id}`)
    const used = fitted.reduce((n, p) => n + p.cost, 0)
    if (used > potential(v, e.stage)) problems.push(`${r.id} : ${v.id} préparée ${used} pour un potentiel ${potential(v, e.stage)}`)
  }
}
// Les paliers des spéciales suivent les mêmes règles de contenu, avec le plafond propre à chaque palier.
for (const s of specials) for (const r of s.tiers) {
  const cost = r.lineup.reduce((n, e) => n + vehicles.find(v => v.id === e.id)!.cost, 0)
  if (cost > (r.cap ?? 0)) problems.push(`${r.id} : écurie ${cost} au-dessus du plafond ${r.cap}`)
  const dominant = r.circuit.sectors.filter(x => x === s.sector).length
  if (dominant < 3) problems.push(`${r.id} : seulement ${dominant} secteur(s) ${s.sector}`)
  for (const e of r.lineup) {
    const v = vehicles.find(x => x.id === e.id)!
    const fitted = e.parts.map(id => parts.find(p => p.id === id)!)
    for (const p of fitted) if (compatibility(p, v)) problems.push(`${r.id} : ${p.id} incompatible avec ${v.id}`)
    if (new Set(fitted.map(p => p.family)).size !== fitted.length) problems.push(`${r.id} : deux pièces de même famille sur ${v.id}`)
    if (fitted.reduce((n, p) => n + p.cost, 0) > potential(v, e.stage)) problems.push(`${r.id} : ${v.id} dépasse son potentiel`)
  }
}
if (problems.length) { console.error(`Données incohérentes :\n- ${problems.join('\n- ')}`); process.exit(1) }
console.log(`Données cohérentes : ${vehicles.length} voitures, ${parts.length} pièces, ${rivals.length} rivaux.`)

const circuits = rivals.map(r => r.circuit)
const report: Record<string, unknown> = {}

// 1. Taux de victoire par voiture, à coût d'écurie égal (Ligue Chrome, Stage 2, pièces optimisées).
const perCar: Record<string, { wins: number; games: number; used: number }> = {}
for (const v of playable) {
  const cap = 15
  if (v.cost > cap - 2) continue
  const stat = perCar[v.id] = { wins: 0, games: 0, used: 0 }
  for (let i = 0; i < 160; i++) {
    const a = randomLineup(cap, 2, v.id), b = randomLineup(cap, 2)
    if (!a || !b) continue
    const duel = race(circuits[i % circuits.length], a, b)
    stat.games++
    if (duel.winner === 'player') stat.wins++
    stat.used += duel.rounds.filter(r => r.player.car === 0).length
  }
}
const carRates = Object.entries(perCar).map(([id, s]) => {
  const v = vehicles.find(x => x.id === id)!
  return { id, name: `${v.name} ${v.version}`, cost: v.cost, rarity: v.rarity, winRate: +(s.wins / s.games).toFixed(3), sectorsRun: +(s.used / s.games).toFixed(2) }
}).sort((a, b) => b.winRate - a.winRate)
report.carWinRates = carRates

// 2. Chaque rival contre des écuries aléatoires de sa ligue (Stage 1, pièces optimisées).
report.rivals = rivals.map(r => {
  const cap = leagues.find(l => l.id === r.league)!.cap
  let wins = 0, games = 0
  for (let i = 0; i < 300; i++) {
    const a = randomLineup(cap, 1)
    if (!a) continue
    games++
    if (race(r.circuit, a, rivalLineup(r), r.id).winner === 'player') wins++
  }
  return { id: r.id, league: r.league, playerWinRate: +(wins / games).toFixed(3) }
})

// 3. Écurie de départ contre la ligue Néon, de l'origine à la préparation avancée.
const starter = progression.start.vehicles
const beginner: Record<string, Prep> = {
  clio: { stage: 0, parts: [], upgrades: { vit: 1 } },
  twingo: { stage: 0, parts: [], upgrades: { man: 1 } },
  panda: { stage: 0, parts: [], upgrades: { acc: 1 } },
}
const starterResults = Object.fromEntries(rivals.filter(r => r.league === 'neon').map(rival => {
  const rates = Object.fromEntries([['starterNoPrep', 0], ['starterBeginner', 1], ['starterPrepared', 2]].map(([label, level]) => {
    const lineup = starter.map(id => ({ id, prep: level === 0 ? { stage: 0, parts: [] } : level === 1 ? beginner[id] : prepared(id, 2) }))
    let wins = 0
    for (let i = 0; i < 1500; i++) if (race(rival.circuit, lineup, rivalLineup(rival), rival.id).winner === 'player') wins++
    return [label, +(wins / 1500).toFixed(3)]
  }))
  return [rival.id, rates]
}))
report.starterByRival = starterResults
Object.assign(report, starterResults[rivals[0].id])
for (const [id, rates] of Object.entries(starterResults)) {
  console.log(`Garage d'origine contre ${id} : ${Math.round(rates.starterNoPrep * 100)} % de victoires.`)
}

// 4. Cas d'essai de la bible : Clio préparée contre Venom d'origine sur chaque type de secteur.
report.clioVsVenom = (['depart', 'virage', 'ligne', 'endurance'] as const).map(sector => {
  const clio = statsOf(vehicles.find(v => v.id === 'clio')!, prepared('clio', 3))
  const venom = statsOf(vehicles.find(v => v.id === 'venom')!, { stage: 0, parts: [] })
  const key = { depart: 'acc', virage: 'man', ligne: 'vit', endurance: 'end' }[sector] as keyof typeof clio
  return { sector, clio: clio[key], venom: venom[key] }
})
report.clioPrep = prepared('clio', 3)

// 5. Spéciales : chaque palier contre trois profils de joueur. « Départ » = écurie d'origine sans préparation ; « prêt » = écurie
// aléatoire sous le plafond du palier, préparée au stage attendu à ce stade ; « spécialiste » = la meilleure sur 60 tirages pour la
// statistique du secteur de la spéciale. On attend une difficulté croissante, et un spécialiste meilleur que le généraliste.
const sectorStat = { depart: 'acc', virage: 'man', ligne: 'vit', endurance: 'end' } as const
const readyStage = [1, 1, 2, 3, 3]
const SPECIAL_GAMES = 200
function specialistLineup(cap: number, stage: number, key: StatKey) {
  let best: ReturnType<typeof randomLineup>, bestScore = -1
  for (let i = 0; i < 60; i++) {
    const lineup = randomLineup(cap, stage)
    if (!lineup) continue
    const score = lineup.reduce((n, e) => n + statsOf(vehicles.find(v => v.id === e.id)!, e.prep)[key], 0)
    if (score > bestScore) { best = lineup; bestScore = score }
  }
  return best
}
const starterLineup = starter.map(id => ({ id, prep: { stage: 0, parts: [] } as Prep }))
report.specials = specials.map(s => ({
  id: s.id,
  sector: s.sector,
  tiers: s.tiers.map((r, i) => {
    const key = sectorStat[s.sector] as StatKey
    let starterWins = 0, readyWins = 0, specialistWins = 0, games = 0
    for (let n = 0; n < SPECIAL_GAMES; n++) {
      if (race(r.circuit, starterLineup, rivalLineup(r), r.id).winner === 'player') starterWins++
      const general = randomLineup(r.cap!, readyStage[i]), specialist = specialistLineup(r.cap!, readyStage[i], key)
      if (!general || !specialist) continue
      games++
      if (race(r.circuit, general, rivalLineup(r), r.id).winner === 'player') readyWins++
      if (race(r.circuit, specialist, rivalLineup(r), r.id).winner === 'player') specialistWins++
    }
    return { id: r.id, tier: r.title, cap: r.cap, reward: r.reward, starter: +(starterWins / SPECIAL_GAMES).toFixed(3),
      ready: +(readyWins / games).toFixed(3), specialist: +(specialistWins / games).toFixed(3) }
  }),
}))

writeFileSync(new URL('./balance-report.json', import.meta.url), JSON.stringify(report, null, 2))
const top = carRates.slice(0, 6).map(c => `${c.name} ${Math.round(c.winRate * 100)}%`).join(', ')
const bottom = carRates.slice(-6).map(c => `${c.name} ${Math.round(c.winRate * 100)}%`).join(', ')
console.log(`Meilleures voitures : ${top}\nPlus faibles : ${bottom}`)
console.log('Rivaux (victoires joueur) :', (report.rivals as { id: string; playerWinRate: number }[]).map(r => `${r.id} ${Math.round(r.playerWinRate * 100)}%`).join(', '))
console.log(`Départ contre Lola : ${Math.round((report.starterNoPrep as number) * 100)}% sans préparation, ` +
  `${Math.round((report.starterBeginner as number) * 100)}% en débutant, ${Math.round((report.starterPrepared as number) * 100)}% préparé`)
console.log('Clio Stage 3 contre Venom d’origine :', JSON.stringify(report.clioVsVenom))
type SpecialRow = { id: string; tiers: { tier: string; starter: number; ready: number; specialist: number }[] }
for (const s of report.specials as SpecialRow[]) {
  console.log(`Spéciale ${s.id} (départ / prêt / spécialiste) : ` +
    s.tiers.map(t => `${t.tier} ${Math.round(t.starter * 100)}/${Math.round(t.ready * 100)}/${Math.round(t.specialist * 100)}`).join(' · '))
}
