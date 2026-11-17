#!/usr/bin/env node
// Pipeline d'illustrations GarageVerse.
//   node pipeline/art.mjs [--kind cars,parts,rivals,packs,ui] [--only id1,id2] [--force] [--jobs 4] [--engine auto|codex|agy] [--dry-run]
//   node pipeline/art.mjs --review [--kind cars] [--only …]   (revue artistique par Antigravity)
//   node pipeline/art.mjs --redo                                (régénère ce que la revue a refusé)
// Codex (ou Antigravity en relais) génère chaque image, cwebp la recadre et la convertit dans src/assets/<kind>/<id>.webp.
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const roster = JSON.parse(await readFile(join(root, 'src/data/roster.json'), 'utf8'))
const garage = JSON.parse(await readFile(join(root, 'src/data/garage.json'), 'utf8'))
const logFile = join(root, 'pipeline/art-log.json')
const reviewFile = join(root, 'pipeline/art-review.json')
const log = existsSync(logFile) ? JSON.parse(await readFile(logFile, 'utf8')) : {}
const reviews = existsSync(reviewFile) ? JSON.parse(await readFile(reviewFile, 'utf8')) : {}

const args = process.argv.slice(2)
const flag = name => args.includes(`--${name}`)
const option = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const kinds = (option('kind') ?? 'cars,parts,rivals,packs,ui').split(',')
const only = option('only')?.split(',')
const parallel = Number(option('jobs') ?? 4)
// --set pixel produit le jeu d'illustrations pixel art dans src/assets/pixel/<kind>/<id>.webp, en basse définition.
const set = option('set') ?? 'main'
const anim = set === 'anim'
// --set anim produit les calques des légendaires animées : décor qui boucle et voiture détourée, en pixel art.
const pixel = set === 'pixel' || anim

const NO_TEXT = 'Strictly no text, no letters, no numbers, no logos, no brand badges, no readable license plates, no watermark, no card frame or border.'
const STYLE = 'Style: premium 1980s synthwave / outrun poster illustration, clean crisp shapes, glossy reflections and chrome highlights, ' +
  'palette of hot magenta, electric cyan, deep violet and sunset orange, subtle film grain. Cohesive with a retro trading-card game.'
// Légendaires (cartes avec un champ anim) : image fixe spectaculaire, volontairement stylisée et irréaliste.
const LEGEND_STYLE = 'Style: over-the-top stylized synthwave outrun poster, a bold graphic illustration and NOT photorealistic: ' +
  'cel-shaded comic and anime key-art look, thick clean outlines, flat saturated colour planes with glowing neon rim light, ' +
  'exaggerated low-angle perspective and a dramatic oversized car, a gigantic striped sun, chrome reflections, laser-grid ground, ' +
  'light streaks and energy bursts, a heroic poster composition. Palette of hot magenta, electric cyan, deep violet and sunset orange. ' +
  'Looks like a legendary trading-card hero shot, instantly striking, never like a photograph or a 3D render.'
// --set edition [--only id,id] [--styles solarpunk,abandonnee] : éditions artistiques supplémentaires, une image par voiture et par style,
// dans src/assets/cars/<id>-<style>.webp. Ce jeu ne touche pas aux autres illustrations.
const EDITION_LOOKS = {
  solarpunk: 'Scene: a bright optimistic solarpunk future, a sunlit green city of terraced gardens, trees growing from white curved buildings, ' +
    'wind turbines and solar panels, clear blue sky, warm golden light, lush plants and flowers beside the road. ' +
    'Style: vibrant hand-illustrated digital painting with soft gouache-like colour, art-nouveau curves, hopeful and joyful mood, not photorealistic.',
  abandonnee: 'Scene: an abandoned barn find, the same car left for decades in a collapsed wooden barn, covered in dust and light rust, flat tyres, ' +
    'ivy and weeds growing through it, shafts of golden light through the broken roof, floating dust. ' +
    'Style: moody cinematic illustrated painting, muted earthy palette with the faded paint still recognisable, melancholic and nostalgic, not photorealistic.',
}
// Abandonnée : chaque voiture raconte comment on l'a retrouvée, selon son genre (succession, villa, saisie, planque…).
// Le style reste commun ; seuls le lieu, les objets et la lumière changent d'une histoire à l'autre.
const ABANDON_STYLE = 'The car is abandoned but intact and complete, a sleeping time capsule that could be restored: body straight and undamaged, ' +
  'all windows, lights, panels and wheels in place, no dents, no rust holes, no missing parts, no broken glass. Only a layer of dust, ' +
  'a few cobwebs and slightly faded paint show the passing years. ' +
  'Style: moody cinematic illustrated painting, a melancholic and nostalgic mood, rich storytelling details in the surroundings, not photorealistic.'
const ABANDON_STORIES = {
  succession: { cars: ['p205gl', 'golf11', 'simcals', 'e30316', 'e190', 'escort14', 'lancer16', 'impreza16', 'delta16', 'celica18', 'volvo240', 'espace',
      'mx5na', 'mx5nb', 'fiesta', 'uno', 'corsa', 'p106xn', 'saxo11', 'ax10', 'ax', 'swift', 'golf1', 'beetle', 'fiat500', 'mini850', 'mini65',
      'a1101100', 'camaro250', 'p911sc', 'simca', 'fiesta11', 'swift10'],
    scene: "the late grandfather's car, found by his family when clearing out his house before the estate auction: a cramped suburban garage, " +
      'a faded dust sheet half pulled off the car, an old workbench with jam jars of screws and hanging tools, a flat cap and a folded tartan blanket ' +
      'on the seat, faded family photos pinned to the wall, a blank cardboard auction lot tag hanging from the mirror, soft grey daylight from a small window.' },
  villa: { cars: ['f40', 'mf1', 'venom', 'countach', 'testarossa', 'cgt', 'zonda', 'agera', 'veyron', 'nsx', 'ruf', 'esprit', 'dmc'],
    scene: 'left behind in the open garage of a derelict luxury 1980s Riviera villa after its owner vanished: cracked marble floor, shattered floor-to-ceiling ' +
      'glass walls, dry palm fronds and bougainvillea creeping in, an empty swimming pool with stagnant green water visible outside, ' +
      'sun-bleached pastel walls, warm late-afternoon Mediterranean light.' },
  // Voitures qui jurent avec leur lieu d'abandon : chacune a son propre décor.
  decalee: { cars: ['tesla', 'gt500', 'demon', 'h1', 'mustangeco', 'challsxt', 'm3e46', 'evo2', 'p930', 'c4'], scenes: {
    tesla: 'absurdly left inside the great hall of an abandoned medieval castle: stone walls, a huge cold fireplace, faded tapestries, dusty suits of armour, light through tall gothic windows.',
    gt500: 'absurdly parked at the bottom of an empty, drained indoor swimming pool of an abandoned 1970s municipal baths: cracked blue tiles, a rusty diving board above, skylight beams.',
    demon: 'absurdly parked in the middle of the ballroom of an abandoned grand hotel: a dusty crystal chandelier overhead, peeling gilded mouldings, stacked chairs, a grand piano under a sheet.',
    h1: 'absurdly left among the rides of an abandoned amusement park: a faded carousel with wooden horses behind it, a stalled Ferris wheel, overgrown paths, an empty candy-floss stand.',
    mustangeco: 'absurdly parked in the central atrium of an abandoned shopping mall: dry fountain, escalators frozen in place, empty shop windows without signs, potted palms gone wild, skylight light.',
    challsxt: 'absurdly left inside the top station of an abandoned mountain ski lift: a rusty cable wheel, stacked old wooden skis, snow drifting in through a broken door, peaks outside.',
    m3e46: 'absurdly parked between tall bookshelves in the reading room of an abandoned old library: scattered books, green banker lamps, a spiral staircase, dusty light from high windows.',
    evo2: 'absurdly parked on the concourse of an abandoned 1900s railway station: iron and glass roof, an old station clock, wooden benches, an empty platform with a stopped steam-era carriage.',
    p930: 'absurdly left inside the great glasshouse of an abandoned botanical garden: wrought-iron frame, giant tropical palms and ferns, broken glass panes letting in sunbeams and humid haze.',
    c4: 'absurdly parked on the wooden floor of an abandoned 1980s roller disco: a dusty mirror ball, neon tubes switched off, scattered roller skates, a DJ booth, coloured light through grimy windows.',
  } },
  planque: { cars: ['cosworth', 'impreza', 'evo8', 'r5gt', 'golf2', 'p205', 'supra', 's15', 'rx7', 'r32', 'r34', 'ek9', 'civiceg', 'scirocco14',
      'abarth', 'saxo', 'p106'],
    scene: 'a getaway car hidden after a heist and sealed for decades in a rented lock-up garage under a brick railway arch: a rusty roll-up door half open ' +
      'onto a rainy night street, a dusty canvas duffel bag on the floor, piles of yellowed newspapers, a road map pinned to the brick wall, ' +
      'a single bare bulb, puddles reflecting orange streetlight.' },
  ferme: { cars: ['deuch', 'r4l', 'mehari', 'combi', 'transit', 'hilux', 'panda', 'niva', 'defender', 'kangoo', 'p504', 'duster'],
    scene: 'retired on a family farm and forgotten there: parked in an open-sided hay shed beside bales of straw, an old tractor wheel, ' +
      'milk churns and a rusty wheelbarrow, a couple of chickens around the wheels, fields and a hedge behind, bright overcast countryside daylight.' },
  foret: { cars: ['stratos', 'delta', 'a110', 'quattro', 'celica', 'wrangler', 'explorer', 'jpjeep'],
    scene: 'parked decades ago at the end of a forest track and forgotten there: fallen leaves and pine needles on the roof and bonnet, ' +
      'ferns and tall grass around the wheels, a few ivy tendrils on the bumper, misty pine and birch woods, cool green light filtering through the canopy.' },
  circuit: { cars: ['scirocco', 'elise', 'elise111s', 'elise190', 'm3e30', 'camaro', 'ae86'],
    scene: 'left in the pit garage of a race circuit that closed long ago: peeling paint on the garage walls, stacks of old slick racing tyres, ' +
      'a faded chequered pattern on the floor, weeds pushing through the cracked tarmac of the empty pit lane outside, a torn grandstand roof in the distance, pale morning light.' },
  desert: { cars: ['c4zr1', 'firebird', 'mustang67', 'charger', 'charger318', 'interceptor'],
    scene: 'rusting beside an abandoned gas station on a forgotten desert highway: a little sand drifted against the tyres, tumbleweeds, a sun-bleached pump island ' +
      'and an empty signpost without text, cracked asphalt, harsh golden-hour sun and long shadows.' },
  plateau: { cars: ['bttf', 'kitt', 'brian', 'herbie', 'bond', 'taxi', 'ecto1', 'batmobile', 'eleanor', 'domcharger', '1000tipla'],
    scene: 'forgotten in the back of a closed-down film studio prop warehouse after the shooting ended: dusty stage spotlights on stands, rolled canvas backdrops, ' +
      'wooden flight cases, a director\'s chair with a torn seat, a beam of light from a high window across the dust.' },
  parking: { cars: ['clio', 'twingo', 'smart', 'twizy', 'p206', 'golf4', 'micra', 'logan', 'multipla', 'fiat500b', 'r5five', 'uno45'],
    scene: 'abandoned for years on the lowest level of a closed underground car park: water puddles on the concrete, numbered pillars without readable numbers, ' +
      'a single flickering neon tube, a broken parking barrier, a fine layer of dust and dead leaves blown in, cold blue-grey light.' },
}
const abandonStory = id => {
  const story = Object.values(ABANDON_STORIES).find(story => story.cars.includes(id))
  return story && { scene: story.scenes?.[id] ?? story.scene }
}
// --set cardback [--only cardback-a,cardback-b] : propositions de dos de carte, src/assets/ui/cardback-<lettre>.webp (portrait, sans texte).
const CARDBACK_BASE = 'Back of a collectible car trading card, portrait 2:3, full-bleed artwork filling the whole image with perfect left-right mirror symmetry, ' +
  'no frame, no border and no card edge, a calm empty round area at the exact centre where a monogram will be added later, rich detail near the edges.'
const CARDBACKS = {
  a: 'Art-deco chrome and gold crest: radiating sunburst rays on deep violet, fine gold line pattern, a polished chrome medallion shaped like a steering wheel with stylised wings at the centre. Premium, elegant, collectible.',
  b: 'Black carbon-fibre weave with two bold symmetrical diagonal racing stripes in hot magenta and electric cyan, brushed-metal corner plates with rivets, a round blank brushed-metal badge plate at the centre. Sporty and modern.',
  c: 'A symmetrical neon one-point-perspective highway vanishing toward a huge striped sunset sun, glowing laser-grid floor, mirrored mountains and palm silhouettes, a glowing ring at the centre of the sun. Synthwave outrun poster style.',
  d: 'A seamless repeating pattern of tiny pistons, wheels, lightning bolts and stars in magenta and cyan outline on deep midnight violet, framed by an ornate wide circular medallion at the centre. Playful retro trading-card style.',
}
// Styles alternatifs : une carte peut sortir du synthwave (champ look du roster) avec son propre décor (champ setting).
// Décor de course par condition de piste (clés de `conditions` dans garage.json).
// Couvertures de boosters : une scène par collection, et une variante légendaire annoncée quand le sachet en contient une.
const PACK_LOOKS = {
  neon: 'a low red Japanese sports coupe in three-quarter front view sweeping through a coastal highway curve at golden-hour sunset, motion streaks on the road, palm trees and the sea behind, warm magenta and orange sky',
  night: 'a dark tuned street car drifting sideways through a rain-soaked city intersection at night, tyre smoke lit by violet and blue neon reflections, wet asphalt mirror, glowing headlights',
  overdrive: 'a silver hypercar launching straight at the viewer on a high-banked speed bowl, heat haze, sparks under the splitter, a packed grandstand and stadium lights, red and gold palette',
}
const PACK_LEGEND = ', reimagined as the rare LEGENDARY edition: the same car now gleaming in gold and chrome, a radiant golden aura and light rays bursting from behind it, floating sparkles and embers, an ornate gold filigree frame around the whole artwork, treasure-like, awe-inspiring'
const TRACKS = {
  sec: 'a sunny country road with plane trees, vineyards, a stone village on a hill and a clear blue sky',
  pluie: 'a country road under heavy dark rain clouds, falling rain, wet shiny asphalt with puddles, dripping trees and misty hills',
  nuit: 'a city ring road at night with glowing neon signs without text, street lamps and a lit skyline under a violet sky',
  terre: 'a gravel rally stage through a pine forest with rocks, hay bales, dust and wooden fences',
  ville: 'a European city boulevard in daytime with stone apartment buildings, café awnings, plane trees and parked scooters',
}
const LOOKS = {
  poster: 'Style: hand-painted 1970s-80s movie poster illustration, visible gouache brushwork, dramatic rim lighting, rich warm palette, cinematic composition.',
  rally: 'Style: gritty 1980s rally photograph on Kodachrome film, natural daylight, dust and mud spray, slight motion blur, authentic film grain.',
  comic: 'Style: European ligne claire comic book panel, clean even ink outlines, flat bright colors, simple shading, playful and readable.',
  anime: 'Style: 1990s Japanese anime cel illustration, hand-painted background, crisp cel shading, soft dusk gradients, nostalgic mood.',
  magazine: 'Style: glossy 1990s car magazine studio photograph, softbox lighting, seamless colored backdrop, sharp reflections, photorealistic.',
  watercolor: 'Style: vintage travel sketchbook illustration, loose watercolor washes and ink lines on textured paper, warm sunny palette.',
  pulp: 'Style: retro-futuristic pulp sci-fi illustration, airbrushed gradients, dramatic lighting, bold saturated colors, 1970s paperback cover feel.',
}
const PIXEL_STYLE = 'Style: authentic 16-bit era pixel art, like a 1990s Super Nintendo, Mega Drive or arcade racing game: clearly visible square pixels on a coarse grid, ' +
  'limited 32-color palette, hard edges, careful ordered dithering, no anti-aliasing, no smooth gradients, no blur, no painterly texture. ' +
  'Warm and varied retro palette with natural daylight or dusk colors, not neon, not synthwave, no magenta-and-cyan grid.'
const PIXEL_SCENES = {
  sunset: 'a coastal road at sunset with palm trees and a calm sea',
  city: 'a city street at dusk with shop fronts, street lamps and parked scooters',
  highway: 'an open desert highway with mesas and cacti under a clear sky',
  mountain: 'a winding mountain road with pine trees, guardrails and rocky peaks',
  track: 'a race circuit with red-and-white curbs, a grandstand and pit garages on a sunny afternoon',
  retro: 'a futuristic city of the 1980s imagination under a starry night sky',
}
// Le décor propre aux cartes 51 à 100 décrit parfois son style d'origine : on n'en garde que le lieu.
const placeOnly = text => text.split(/,\s*(?:drawn|illustrated|painted|rendered|photographed|captured|shot|in the style)\b/i)[0]
const SCENES = {
  sunset: 'a striped synthwave sunset over a glowing magenta and cyan perspective grid floor, palm tree silhouettes',
  city: 'a rain-wet neon city street at night, magenta and cyan glowing signs without readable text, reflections on the asphalt',
  highway: 'an endless desert highway at dusk with purple mountains, a giant striped sun and light trails',
  mountain: 'a twisting mountain pass at twilight, gravel and asphalt, violet peaks and a neon horizon line',
  track: 'a night race circuit with neon striped curbs, floodlights and motion light trails',
  retro: 'a chrome retro-futuristic landscape with laser grid floor, starfield and a glowing horizon',
}

function jobs() {
  const list = []
  if (set === 'edition') {
    const styles = (option('styles') ?? Object.keys(EDITION_LOOKS)).toString().split(',')
    for (const v of roster.vehicles.filter(v => !only || only.includes(v.id))) {
      const subject = v.culture
        ? `the iconic screen-accurate vehicle "${v.name}" from ${v.culture.work} (${v.year}): ${v.paint}`
        : `a ${v.year} ${v.name} ${v.version}, faithful real-world body shape and proportions, ${v.paint} paint`
      for (const style of styles) {
        const story = style === 'abandonnee' && abandonStory(v.id)
        list.push({ kind: 'cars', id: `${v.id}-${style}`, size: [640, 960], prompt:
          `Collectible car card illustration, portrait 2:3. Subject: ${subject}. Three-quarter front view, the whole car visible, ` +
          `centered in the lower two thirds, slight low camera angle, wheels on the ground. ` +
          `${story ? `Scene: ${story.scene} ${ABANDON_STYLE}` : EDITION_LOOKS[style]} ${NO_TEXT}` })
      }
    }
    return list
  }
  if (set === 'cardback') {
    return Object.entries(CARDBACKS).map(([key, look]) => ({ kind: 'ui', id: `cardback-${key}`, size: [640, 960], prompt: `${CARDBACK_BASE} ${look} ${NO_TEXT}` }))
      .filter(job => !only || only.includes(job.id))
  }
  if (kinds.includes('cars')) for (const v of roster.vehicles) {
    const subject = v.culture
      ? `the iconic screen-accurate vehicle "${v.name}" from ${v.culture.work} (${v.year}): ${v.paint}`
      : `a ${v.year} ${v.name} ${v.version}, faithful real-world body shape and proportions, ${v.paint} paint`
    const alt = v.look && v.look !== 'synthwave' && LOOKS[v.look]
    const textRule = v.allowText ?? NO_TEXT
    if (pixel) {
      list.push({ kind: 'cars', id: v.id, size: [160, 240], prompt:
        `Pixel art collectible car card illustration, portrait 2:3. Subject: ${subject}. Three-quarter front view, the whole car visible and large, ` +
        `centered in the lower two thirds, wheels on the ground unless it flies. Scene: ${v.setting ? placeOnly(v.setting) : PIXEL_SCENES[v.scene]}. ${PIXEL_STYLE} ${textRule}` })
      continue
    }
    list.push({ kind: 'cars', id: v.id, size: [640, 960], prompt:
      `Collectible car card illustration, portrait 2:3. Subject: ${subject}. Three-quarter front view, the whole car visible, ` +
      `centered in the lower two thirds, slight low camera angle, wheels on the ground unless it flies. ` +
      (alt ? `Scene: ${v.setting}. ${alt} ${textRule}` : `Scene: ${SCENES[v.scene]}. ${v.anim ? LEGEND_STYLE : STYLE} ${textRule}`) })
  }
  if (anim) {
    // Décors de course, un par condition : `--set anim --kind tracks`.
    if (kinds.includes('tracks')) for (const [id, setting] of Object.entries(TRACKS)) list.push({ kind: 'anim', id: `track-${id}-bg`, size: [240, 120], post: 'strip', prompt:
      `Pixel art side-scrolling game background, wide landscape 2:1, seen from the side like a 1990s racing game level. ` +
      `Scene: ${setting}. A flat road runs horizontally across the bottom fifth of the image, from edge to edge. ` +
      `No vehicles, no people in the foreground. ${PIXEL_STYLE} ${NO_TEXT}` })
    // Voitures détourées de la mini-course, pour toutes les cartes qui n'ont pas de scène animée : `--set anim --kind sprites`.
    if (kinds.includes('sprites')) for (const v of roster.vehicles.filter(v => !v.anim)) list.push({ kind: 'anim', id: `${v.id}-car`, size: [128, 64], post: 'key', prompt:
      `Pixel art game sprite, wide 2:1. Subject: ${v.culture ? `the iconic screen-accurate vehicle "${v.name}" from ${v.culture.work} (${v.year}): ${v.paint}`
        : `a ${v.year} ${v.name} ${v.version}, faithful real-world body shape and proportions, ${v.paint} paint`}, seen in exact side profile facing right, as if driving to the right. ` +
      `The whole car fills about 92% of the image width, wheels touching the bottom edge. ` +
      `Background: one flat uniform pure magenta color #FF00FF everywhere around the car, no shadow, no ground, no scenery, no magenta on the car itself. ${PIXEL_STYLE} ${NO_TEXT}` })
    for (const v of roster.vehicles.filter(v => v.anim)) {
      const subject = v.culture
        ? `the iconic screen-accurate vehicle "${v.name}" from ${v.culture.work} (${v.year}): ${v.paint}`
        : `a ${v.year} ${v.name} ${v.version}, faithful real-world body shape and proportions, ${v.paint} paint`
      list.push({ kind: 'anim', id: `${v.id}-bg`, size: [240, 120], post: 'strip', prompt:
        `Pixel art side-scrolling game background, wide landscape 2:1, seen from the side like a 1990s racing game level. ` +
        `Scene: ${v.anim.setting}. A flat road runs horizontally across the bottom fifth of the image, from edge to edge. ` +
        `No vehicles, no people in the foreground. ${PIXEL_STYLE} ${NO_TEXT}` })
      list.push({ kind: 'anim', id: `${v.id}-car`, size: [128, 64], post: 'key', prompt:
        `Pixel art game sprite, wide 2:1. Subject: ${subject}, seen in exact side profile facing right, as if driving to the right. ` +
        `The whole car fills about 92% of the image width, wheels touching the bottom edge. ` +
        `Background: one flat uniform pure magenta color #FF00FF everywhere around the car, no shadow, no ground, no scenery, no magenta on the car itself. ${PIXEL_STYLE} ${NO_TEXT}` })
      if (v.anim.fx.includes('trex')) list.push({ kind: 'anim', id: `${v.id}-trex`, size: [96, 96], post: 'key', prompt:
        `Pixel art game sprite, square. Subject: a huge running Tyrannosaurus rex seen in side profile facing right, mouth open, roaring, in full stride. ` +
        `Background: one flat uniform pure magenta color #FF00FF everywhere around it, no shadow, no ground. ${PIXEL_STYLE} ${NO_TEXT}` })
    }
    return list.filter(j => !only || only.some(id => j.id === id || j.id.startsWith(id + '-')))
  }
  if (pixel) {
    if (kinds.includes('parts')) for (const p of garage.parts) list.push({ kind: 'parts', id: p.id, size: [128, 128], prompt:
      `Pixel art item icon for a retro racing game, square 1:1. Subject: ${p.art}, a single large object centered, like an inventory item. ` +
      `Background: plain dark slate blue with a subtle checker floor. ${PIXEL_STYLE} ${NO_TEXT}` })
    if (kinds.includes('rivals')) for (const r of garage.rivals) list.push({ kind: 'rivals', id: r.id, size: [128, 128], prompt:
      `Pixel art character portrait for a racing rival, square 1:1, head and shoulders, like a 1990s arcade character select screen. ` +
      `Subject: ${r.art.replace(/,?\s*synthwave portrait/i, '')}. Fictional person. Background: a simple garage or pit lane backdrop. ${PIXEL_STYLE} ${NO_TEXT}` })
    if (kinds.includes('packs')) {
      for (const b of garage.boosters) for (const legend of [false, true]) list.push({ kind: 'packs', id: legend ? `${b.id}-legend` : b.id, size: [150, 225], prompt:
        `Pixel art key art printed on the front of a premium trading-card booster pack, portrait 2:3, fills the whole image edge to edge. ` +
        `Design: ${PACK_LOOKS[b.id]}${legend ? PACK_LEGEND : ''}. Bold dynamic composition with strong perspective and depth, the car large and close in the lower half. ` +
        `Leave the top 25% calmer and darker for a title overlay. ${PIXEL_STYLE} ${NO_TEXT}` })
    }
    if (kinds.includes('ui')) list.push({ kind: 'ui', id: 'hero', size: [225, 338], prompt:
      `Pixel art title screen background for a retro mobile racing game, portrait 2:3. A cosy roadside garage at dusk with its door open, ` +
      `tools on the walls, a covered car inside, a petrol pump and a road heading to the hills. Keep the top third mostly sky for a title. ${PIXEL_STYLE} ${NO_TEXT}` })
    return list.filter(j => !only || only.includes(j.id))
  }
  if (kinds.includes('parts')) for (const p of garage.parts) list.push({ kind: 'parts', id: p.id, size: [512, 512], prompt:
    `Mechanic part card illustration, square 1:1. Subject: ${p.art}, single hero object, centered, studio product shot. ` +
    `Background: dark violet void with a glowing magenta and cyan perspective grid floor and neon rim light. ${STYLE} ${NO_TEXT}` })
  if (kinds.includes('rivals')) for (const r of garage.rivals) list.push({ kind: 'rivals', id: r.id, size: [512, 512], prompt:
    `Character portrait for a racing rival, square 1:1, head and shoulders. Subject: ${r.art}. Fictional person. ` +
    `Background: neon city bokeh and a synthwave sunset. ${STYLE} ${NO_TEXT}` })
  if (kinds.includes('packs')) {
    for (const b of garage.boosters) for (const legend of [false, true]) list.push({ kind: 'packs', id: legend ? `${b.id}-legend` : b.id, size: [600, 900], prompt:
      `Front key art printed on a premium foil trading-card booster pack, portrait 2:3, fills the whole image edge to edge. ` +
      `Design: ${PACK_LOOKS[b.id]}${legend ? PACK_LEGEND : ''}. Bold dynamic composition with strong perspective and depth, the car large and close in the lower half. ` +
      `Leave the top 25% calmer and darker for a title overlay. ${STYLE} ${NO_TEXT}` })
  }
  if (kinds.includes('ui')) list.push({ kind: 'ui', id: 'hero', size: [900, 1350], prompt:
    `Mobile game home screen background, portrait 2:3. An open neon-lit garage at night facing a synthwave sunset, ` +
    `a sports car silhouette under a cover inside, a perspective grid driveway. Keep the top third mostly sky for a title. ${STYLE} ${NO_TEXT}` })
  return list.filter(j => !only || only.includes(j.id))
}

function run(command, commandArgs, options = {}) {
  return new Promise(resolvePromise => {
    const child = spawn(command, commandArgs, { ...options, stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = '', stderr = ''
    child.stdout.on('data', d => { stdout += d })
    child.stderr.on('data', d => { stderr += d })
    child.on('error', error => resolvePromise({ code: -1, stdout, stderr: String(error) }))
    child.on('close', code => resolvePromise({ code, stdout, stderr }))
    if (options.input) child.stdin.end(options.input); else child.stdin.end()
  })
}

const target = job => join(root, 'src/assets', ...(pixel ? ['pixel'] : []), job.kind, `${job.id}${pixel ? '.px' : ''}.webp`)
// Calques animés : décor dupliqué en miroir pour boucler sans raccord, voiture détourée du fond magenta.
const key = job => (pixel ? 'pixel/' : '') + `${job.kind}/${job.id}`

// Moteurs d'image : Codex enregistre ./out.png dans un dossier isolé ; Antigravity dépose l'image dans son
// dossier « brain », retrouvée grâce au nom imposé. En mode auto, une limite d'usage Codex bascule sur agy.
let engine = option('engine') ?? 'auto'
const exhausted = new Set()
const agyBrain = join(homedir(), '.gemini/antigravity-cli/brain')

async function withCodex(job, prompt, work) {
  const instruction = 'Use your built-in image generation tool to create exactly one image from the brief below, ' +
    'then save that image as ./out.png in the current working directory. Do not create any other file and do not edit code. ' +
    `Reply only with "done".\n\nBrief: ${prompt}`
  const result = await run('codex', ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '--ephemeral', '-C', work, '-'],
    { cwd: work, input: instruction })
  const tokens = Number((result.stdout + result.stderr).match(/tokens used\s*\n?\s*([\d\s ]+)/)?.[1]?.replace(/\D/g, '')) || undefined
  const limited = /usage limit|rate limit/i.test(result.stderr + result.stdout)
  return { file: existsSync(join(work, 'out.png')) ? join(work, 'out.png') : undefined, tokens, limited,
    detail: result.stderr.split('\n').filter(Boolean).slice(-2).join(' | ') }
}

async function findAgyImage(name, since) {
  const found = []
  for (const conversation of await readdir(agyBrain).catch(() => [])) {
    for (const file of await readdir(join(agyBrain, conversation)).catch(() => [])) {
      // Nom exact suivi d'un éventuel suffixe numérique : « gv_packs_neon » ne doit pas capter « gv_packs_neon_legend ».
      if (!new RegExp(`^${name}(_\\d+)?\\.(png|jpe?g|webp)$`, 'i').test(file)) continue
      const path = join(agyBrain, conversation, file)
      if ((await stat(path)).mtimeMs >= since) found.push(path)
    }
  }
  return found.sort().at(-1)
}

async function withAgy(job, prompt, started) {
  const name = `gv_${job.kind}_${job.id.replace(/\W/g, '_')}`
  const [rw, rh] = job.size
  const ratio = rw === rh ? 'square 1:1' : rw > rh ? `landscape ${rw / rh}:1` : 'portrait 2:3'
  const instruction = `Use your image generation tool to create exactly one ${ratio} image named "${name}" from the brief below. ` +
    `Wait until the image is generated, do not create or edit any other file, then reply only with "done".\n\nBrief: ${prompt}`
  const result = await run('agy', ['--sandbox', '--mode', 'accept-edits', '--disable-slash-commands', '--print-timeout', '420s', '-p', instruction],
    { cwd: tmpdir() })
  for (let wait = 0; wait < 36; wait++) {
    const file = await findAgyImage(name, started)
    if (file) return { file }
    await new Promise(r => setTimeout(r, 5000))
  }
  const detail = (result.stderr || result.stdout).split('\n').filter(Boolean).slice(-2).join(' | ') || 'image introuvable'
  return { detail, limited: /RESOURCE_EXHAUSTED|quota|429/i.test(detail) }
}

async function size(file) {
  const out = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file])
  return [Number(out.stdout.match(/pixelWidth: (\d+)/)?.[1]), Number(out.stdout.match(/pixelHeight: (\d+)/)?.[1])]
}

// Recadre au centre au ratio cible, puis redimensionne en WebP.
async function convert(file, job) {
  const [w, h] = await size(file)
  const [tw, th] = job.size
  let cw = w, ch = Math.round(w * th / tw)
  if (ch > h) { ch = h; cw = Math.round(h * tw / th) }
  const out = target(job)
  await mkdir(dirname(out), { recursive: true })
  if (pixel) {
    // Réduction par moyenne de zone vers la grille de pixels cible, puis WebP sans perte : l'interface agrandit sans lissage.
    const small = file.replace(/\.\w+$/, '-small.png')
    const scaled = await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf',
      `crop=${cw}:${ch}:${Math.floor((w - cw) / 2)}:${Math.floor((h - ch) / 2)},scale=${tw}:${th}:flags=area`, small])
    if (scaled.code !== 0) return scaled
    if (job.post === 'strip') {
      const strip = file.replace(/\.\w+$/, '-strip.png')
      const made = await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', small, '-filter_complex', '[0]split[a][b];[b]hflip[c];[a][c]hstack', strip])
      if (made.code !== 0) return made
      return run('cwebp', ['-quiet', '-lossless', strip, '-o', out])
    }
    if (job.post === 'key') {
      const keyed = file.replace(/\.\w+$/, '-key.png')
      const made = await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-vf',
        `crop=${cw}:${ch}:${Math.floor((w - cw) / 2)}:${Math.floor((h - ch) / 2)},colorkey=0xFF00FF:0.32:0.08,scale=${tw}:${th}:flags=area,format=rgba,` +
        "geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gte(alpha(X,Y),120),255,0)'", keyed])
      if (made.code !== 0) return made
      return run('cwebp', ['-quiet', '-lossless', '-exact', keyed, '-o', out])
    }
    return run('cwebp', ['-quiet', '-lossless', small, '-o', out])
  }
  return run('cwebp', ['-quiet', '-q', '82', '-crop', String(Math.floor((w - cw) / 2)), String(Math.floor((h - ch) / 2)), String(cw), String(ch),
    '-resize', String(tw), String(th), file, '-o', out])
}

async function generate(job) {
  const fix = reviews[`${key(job)}`]
  const prompt = job.prompt + (fix && !fix.ok && fix.fix ? ` Important correction from art review: ${fix.fix}` : '')
  const work = await mkdtemp(join(tmpdir(), `gv-${job.id}-`))
  const started = Date.now()
  let used = engine === 'agy' ? 'agy' : 'codex'
  let made = used === 'codex' ? await withCodex(job, prompt, work) : await withAgy(job, prompt, started)
  if (!made.file && made.limited) exhausted.add(used)
  if (!made.file && used === 'codex' && made.limited && engine === 'auto' && !exhausted.has('agy')) {
    if (engine !== 'agy') console.log('· Limite d’usage Codex atteinte : bascule sur Antigravity pour la suite.')
    engine = 'agy'
    used = 'agy'
    made = await withAgy(job, prompt, started)
    if (!made.file && made.limited) exhausted.add('agy')
  }
  let status = 'failed', detail = made.detail
  if (made.file) {
    const webp = await convert(made.file, job)
    status = webp.code === 0 ? 'ok' : 'convert-failed'
    if (webp.code !== 0) detail = webp.stderr
  }
  await rm(work, { recursive: true, force: true })
  log[`${key(job)}`] = { status, engine: used, seconds: Math.round((Date.now() - started) / 1000), tokens: made.tokens,
    prompt: createHash('sha1').update(prompt).digest('hex').slice(0, 10), at: new Date().toISOString(), ...(status === 'ok' ? {} : { detail }) }
  await writeFile(logFile, JSON.stringify(log, null, 2))
  console.log(`${status === 'ok' ? '✓' : '✗'} ${key(job)} [${used}] ${log[`${key(job)}`].seconds}s${status === 'ok' ? '' : ` ${detail}`}`)
}

async function review(list) {
  const present = list.filter(job => existsSync(target(job)))
  for (let i = 0; i < present.length; i += 8) {
    const batch = present.slice(i, i + 8)
    const lines = batch.map(job => {
      const v = roster.vehicles.find(x => x.id === job.id)
      const expected = job.kind === 'cars' ? `${v.year} ${v.name} ${v.version}${v.culture ? ` (${v.culture.work})` : ''}, ${v.paint}`
        : job.kind === 'parts' ? garage.parts.find(p => p.id === job.id).art : job.id
      return `- key "${key(job)}", file ${target(job)}: expected ${expected}`
    }).join('\n')
    const prompt = (pixel
      ? 'You are the art director of a retro car trading-card game whose cards are 16-bit pixel art (low resolution files shown enlarged): judge each image as pixel art, the subject must be recognisable and faithful. Open and look at each image file listed below. '
      : 'You are the art director of a retro car trading-card game. Most cards are synthwave, some use a deliberate alternative style (poster, rally photo, comic, anime, magazine, watercolor, pulp): judge each against its own intended style. Open and look at each image file listed below. ') +
      'For each one judge: (1) is the subject recognisably the expected vehicle or object (body shape, proportions, key design cues)? ' +
      '(2) is it free of readable text, logos and watermarks? (3) does it fit a cohesive synthwave palette and read well as a small card? ' +
      'Answer ONLY with a JSON object mapping each key to {"ok": boolean, "score": 1-10, "issue": "short French note", "fix": "short English instruction for regenerating, empty if ok"}. ' +
      `Mark ok=false only for a wrong or badly deformed subject, visible text/logo, or clearly off-style image.\n${lines}`
    const settings = { permissions: { deny: ['command(*)', 'unsandboxed(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)'] } }
    const result = await run('agy', ['--sandbox', '--mode', 'plan', '--disable-slash-commands', '--settings', JSON.stringify(settings),
      '--add-dir', join(root, 'src/assets'), '--print-timeout', '600s', '-p', prompt], { cwd: root })
    const json = result.stdout.match(/\{[\s\S]*\}/)?.[0]
    try {
      Object.assign(reviews, JSON.parse(json))
      await writeFile(reviewFile, JSON.stringify(reviews, null, 2))
      for (const job of batch) {
        const r = reviews[`${key(job)}`]
        console.log(`${r?.ok ? '✓' : '✗'} ${key(job)} ${r?.score ?? '?'}/10 ${r?.issue ?? 'pas de verdict'}`)
      }
    } catch {
      console.log(`✗ revue illisible pour ${batch.map(j => j.id).join(', ')}: ${result.stderr.slice(-300) || result.stdout.slice(-300)}`)
    }
  }
}

let list = jobs()
if (flag('review')) {
  await review(list)
} else {
  if (flag('redo')) list = list.filter(job => reviews[`${key(job)}`]?.ok === false)
  else if (!flag('force')) list = list.filter(job => !existsSync(target(job)))
  console.log(`${list.length} image(s) à générer (moteur ${engine}), ${parallel} en parallèle.`)
  if (flag('dry-run')) { for (const job of list) console.log(`· ${key(job)}`); process.exit(0) }
  const queue = [...list]
  await Promise.all(Array.from({ length: Math.min(parallel, queue.length) }, async () => {
    while (queue.length) {
      const stuck = engine === 'auto' || engine === 'agy' ? exhausted.has('agy') && exhausted.has('codex') : exhausted.has(engine)
      if (stuck) { console.log('· Quotas épuisés : arrêt. Relance la même commande plus tard pour reprendre.'); queue.length = 0; break }
      await generate(queue.shift())
    }
  }))
  const failed = list.filter(job => log[`${key(job)}`]?.status !== 'ok')
  console.log(`Terminé : ${list.length - failed.length} ok, ${failed.length} en échec.`)
  if (failed.length) process.exitCode = 1
}
