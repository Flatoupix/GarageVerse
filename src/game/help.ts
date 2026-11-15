import { ref, type Directive } from 'vue'
import { OVERHEAT } from './rules'
import { NIGHT_CAP, nightReward } from './endless'

// Aide rapide : chaque terme du jeu a une explication courte, ouverte d'un toucher ou depuis le lexique.
export interface HelpEntry { term: string; text: string }

export const glossary = {
  legendaryPack: { term: 'Sachet légendaire', text: 'Un sachet doré avec le ruban « Édition légendaire » contient au moins une carte Légendaire. Tes cinq cartes sont tirées dès l’achat ou l’utilisation du ticket : tu retrouves le même lot après un rechargement. La boutique montre toujours la couverture normale.' },
  offline: { term: 'Mode hors ligne', text: 'Après une première visite connectée, le jeu garde sa page et ses ressources sur ton appareil. Relance-le sans réseau ; les images déjà chargées restent disponibles. Une nouvelle version arrive au prochain lancement connecté.' },
  exportSave: { term: 'Export de sauvegarde', text: 'Télécharge un fichier JSON daté contenant ta partie. Garde-le pour retrouver ton garage sur un autre navigateur ou appareil.' },
  importSave: { term: 'Import de sauvegarde', text: 'Choisis un fichier GarageVerse exporté. Après ta confirmation, il remplace toute ta partie actuelle. Exporte-la d’abord si tu veux la garder.' },
  endless: { term: 'Nuit sans fin', text: 'Enchaîne les courses contre trois voitures générées, de plus en plus fortes. La première défaite ou un abandon termine ta nuit. Tu peux aussi rentrer entre deux manches.' },
  nightRound: { term: 'Manche', text: 'Une course en cinq secteurs de ta Nuit sans fin. Gagne-la pour accéder à la suivante ; une égalité termine aussi la nuit.' },
  nightRecord: { term: 'Record de nuit', text: 'Ton meilleur nombre de manches gagnées pendant une seule nuit. Il est conservé dès que tu le bats.' },
  nightCap: { term: 'Plafond de la nuit', text: `Tu engages trois voitures différentes pour un coût total maximal de ${NIGHT_CAP}, sans limite de Stage ni de pièces.` },
  nightGains: { term: 'Gains accumulés', text: `Les crédits gagnés pendant ta nuit : ${nightReward(1)} pour la première manche, puis ${nightReward(2) - nightReward(1)} de plus par manche. Tu les encaisses une seule fois en rentrant, à la défaite ou à l’abandon.` },
  series: { term: 'Série', text: 'Réunis toutes les voitures d’un ensemble nommé pour compléter ta série. Une voiture peut compter dans plusieurs séries.' },
  seriesReward: { term: 'Récompense de série', text: 'Récupère les crédits et parfois un ticket de booster au garage quand tu possèdes toutes les voitures de la série. Tu ne peux recevoir cette récompense qu’une fois, même après une vente.' },
  acc: { term: 'Accélération', text: 'Compte sur les secteurs de Départ : plus elle est haute, plus ta voiture marque de points au démarrage.' },
  man: { term: 'Maniabilité', text: 'Compte dans les Virages : une voiture agile y marque plus de points.' },
  vit: { term: 'Vitesse', text: 'Compte en Ligne droite : la vitesse de pointe fait le score.' },
  end: { term: 'Endurance', text: 'Compte sur les secteurs d’Endurance. Elle fixe aussi combien de secteurs la voiture peut courir avant de surchauffer : 1 secteur, plus 1 à 4, 8 et 12 d’Endurance (certaines capacités et pièces en ajoutent). Elle départage aussi les égalités.' },
  depart: { term: 'Départ', text: 'Secteur où seule l’Accélération compte. « +2 au Départ » sur une carte veut dire : 2 points de plus sur ces secteurs.' },
  virage: { term: 'Virages', text: 'Secteur où seule la Maniabilité compte. « +2 en Virage » : 2 points de plus sur ces secteurs.' },
  ligne: { term: 'Ligne droite', text: 'Secteur où seule la Vitesse compte. « +2 en Ligne droite » : 2 points de plus sur ces secteurs.' },
  endurance: { term: 'Endurance (secteur)', text: 'Secteur où seule l’Endurance compte.' },
  sec: { term: 'Sec', text: 'Route sèche : aucun bonus ni malus de terrain.' },
  pluie: { term: 'Pluie', text: 'Les quatre roues motrices gagnent 1 point, les propulsions en perdent 1. Les incidents sont plus fréquents.' },
  terre: { term: 'Terre', text: 'Les 4x4 et voitures de rallye gagnent 1 point ; supercars et hypercars en perdent 2. Les incidents sont plus fréquents.' },
  ville: { term: 'Ville', text: 'Les citadines gagnent 1 point ; hypercars et muscle cars en perdent 1.' },
  nuit: { term: 'Nuit', text: 'Les voitures de films, séries et jeux (éditions culturelles) gagnent 1 point.' },
  inconnu: { term: 'Inconnu', text: 'La météo de ce secteur se révèle quand la course y arrive.' },
  forme: { term: 'Forme du jour (fourchette de score)', text: 'Le score d’une voiture varie un peu à chaque secteur : c’est la part de chance. La fourchette affichée sous chaque voiture, par exemple « 3-5 », te montre ce qu’elle peut marquer.' },
  parfait: { term: 'Secteur parfait', text: 'Une fois sur seize environ, une voiture signe un secteur parfait : son score monte d’environ 50 %.' },
  victoireParfaite: { term: 'Victoire parfaite', text: 'Gagne tous les secteurs : tu doubles les crédits et tu reçois un ticket du booster de la ligue du rival, en plus du ticket de première victoire éventuel. Une étoile garde la trace de ton exploit. Pour le défi du jour, tu doubles les crédits de ta première victoire du jour.' },
  incident: { term: 'Incident', text: 'Faux départ, tête-à-queue, aspiration ratée, crevaison ou aquaplaning : environ une fois sur vingt-quatre, la voiture perd environ 40 % de son score. Plus fréquent sous la pluie, sur la terre et en surchauffe.' },
  nitro: { term: 'Nitro', text: 'À cocher avant d’engager une voiture : +2 points sur ce secteur (davantage avec certaines pièces). Tu as 2 charges par course, plus celles qu’apportent certaines voitures et pièces.' },
  consigne: { term: 'Consigne de pilotage', text: 'À choisir avec la voiture. Attaque : +2 points, mais la voiture brûle deux secteurs d’endurance et risque deux fois plus l’incident ; il lui faut au moins deux secteurs restants. Gestion : −2 points, aucun secteur brûlé et moitié moins de risque. Normal : un secteur brûlé, sans bonus.' },
  surchauffe: { term: 'Surchauffe', text: `Chaque voiture peut courir un nombre limité de secteurs (affiché sous elle). Au-delà, elle surchauffe : −${OVERHEAT} points.` },
  secteurs: { term: 'Secteurs restants', text: 'Nombre de secteurs que la voiture peut encore courir sans surchauffer. Il dépend de son Endurance.' },
  capacite: { term: 'Capacité ou pièce', text: 'Bonus d’une capacité de la carte (encadré en bas de carte) ou d’une pièce montée, par exemple « +2 au Départ ».' },
  retour: { term: 'Retour en force', text: 'Capacité qui ajoute des points quand tu es mené au score.' },
  outsider: { term: 'Outsider', text: 'Capacité qui ajoute des points face à une voiture qui coûte au moins 4 de plus.' },
  aura: { term: 'Aura', text: 'Capacité qui ajoute des points pour chaque autre voiture de la même famille dans ton écurie.' },
  egalite: { term: 'Égalité', text: 'À score égal, la voiture la plus endurante gagne le secteur.' },
  cout: { term: 'Coût', text: 'Valeur de la voiture. Le total des trois voitures engagées ne doit pas dépasser le plafond de la ligue.' },
  plafond: { term: 'Plafond de coût', text: 'Somme maximale des coûts des trois voitures que tu engages dans une course de cette ligue.' },
  rarete: { term: 'Rareté', text: 'Courante, Rare, Épique ou Légendaire : les plus rares sont plus fortes et plus difficiles à tirer.' },
  stage: { term: 'Stage', text: 'Niveau de préparation d’une voiture (0 à 3). Chaque Stage augmente la place disponible pour monter des pièces ; au Stage 2, sa meilleure statistique gagne aussi 1 point.' },
  atelier: { term: 'Atelier', text: 'Dépense des crédits pour monter d’un niveau un groupe de statistiques d’une voiture (2 niveaux par groupe) ou utilise l’amélioration automatique qui prépare les meilleurs niveaux et pièces disponibles. Au niveau 2, tu peux y monter une pièce de ta collection.' },
  piece: { term: 'Pièce', text: 'Carte Mécanique à monter sur une voiture : elle ajoute un bonus, parfois seulement sur un secteur ou une météo.' },
  vente: { term: 'Vente', text: 'Vends une voiture entière depuis sa fiche : elle quitte ta collection et ses pièces redeviennent libres. Tu reçois deux fois son prix de recyclage selon sa rareté, plus 10 crédits par Stage, la moitié des crédits dépensés à l’atelier (arrondie à l’entier inférieur) et le prix de recyclage de chaque doublon. Retire-la d’abord de tes écuries, y compris celle du défi du jour. Tu ne peux pas la vendre pendant une course qui l’engage, ni garder moins de trois voitures.' },
  edition: { term: 'Édition', text: 'Style d’illustration d’une carte (Pixel 16 bits, Synthwave, Classic…). Depuis la fiche d’une voiture possédée, tu peux basculer librement entre tes éditions ou payer en crédits pour débloquer un autre style existant. Elles ne changent pas les statistiques.' },
  ecurie: { term: 'Écurie', text: 'Les trois voitures que tu engages en course. À chaque secteur, tu choisis en secret laquelle court.' },
} satisfies Record<string, HelpEntry>
export type HelpKey = keyof typeof glossary

// Sections du lexique ouvert par le bouton « ? ».
export const glossarySections: { title: string; keys: HelpKey[] }[] = [
  { title: 'Sauvegarde et connexion', keys: ['offline', 'exportSave', 'importSave'] },
  { title: 'Les quatre statistiques', keys: ['acc', 'man', 'vit', 'end'] },
  { title: 'Les secteurs', keys: ['depart', 'virage', 'ligne', 'endurance'] },
  { title: 'Météo et terrain', keys: ['sec', 'pluie', 'terre', 'ville', 'nuit', 'inconnu'] },
  { title: 'En course', keys: ['ecurie', 'secteurs', 'surchauffe', 'consigne', 'nitro', 'forme', 'parfait', 'incident', 'egalite', 'victoireParfaite'] },
  { title: 'Nuit sans fin', keys: ['endless', 'nightRound', 'nightRecord', 'nightCap', 'nightGains'] },
  { title: 'Capacités', keys: ['capacite', 'retour', 'outsider', 'aura'] },
  { title: 'Boosters', keys: ['legendaryPack'] },
  { title: 'Garage', keys: ['cout', 'plafond', 'rarete', 'stage', 'atelier', 'piece', 'edition', 'vente', 'series', 'seriesReward'] },
]

// Retrouve l'explication d'une ligne du détail de score (« Pluie · intégrale », « Faux départ »…).
export function helpForLine(label: string): HelpKey | undefined {
  const exact: Record<string, HelpKey> = {
    Accélération: 'acc', Maniabilité: 'man', Vitesse: 'vit', Endurance: 'end', Nitro: 'nitro', Surchauffe: 'surchauffe', Attaque: 'consigne', Gestion: 'consigne',
    'Forme du jour': 'forme', 'Secteur parfait': 'parfait', 'Capacité ou pièce': 'capacite', 'Retour en force': 'retour', Outsider: 'outsider',
    'Faux départ': 'incident', 'Tête-à-queue': 'incident', 'Aspiration ratée': 'incident', Crevaison: 'incident', Aquaplaning: 'incident',
  }
  if (exact[label]) return exact[label]
  if (label.startsWith('Aura')) return 'aura'
  const condition = label.split(' · ')[0].toLowerCase()
  return condition in glossary ? condition as HelpKey : undefined
}

// Bulle ouverte : une seule à la fois, placée sous l'élément touché.
export const openHelp = ref<{ key: HelpKey; x: number; y: number; above: boolean; from: HTMLElement } | null>(null)
export const glossaryOpen = ref(false)

function show(el: HTMLElement) {
  const key = el.dataset.help as HelpKey | undefined
  if (!key || !(key in glossary)) return
  const box = el.getBoundingClientRect()
  // Dans la moitié basse de l'écran, la bulle s'ouvre au-dessus du mot pour laisser visibles les commandes du bas.
  const above = box.top > innerHeight / 2
  openHelp.value = openHelp.value?.key === key ? null : { key, x: box.left + box.width / 2, y: above ? box.top : box.bottom, above, from: el }
}

// v-help="'acc'" : l'élément devient touchable (souligné en pointillé) et ouvre la bulle correspondante.
export const vHelp: Directive<HTMLElement, HelpKey | undefined> = {
  mounted(el, { value }) {
    if (!value) return
    el.dataset.help = value
    el.classList.add('has-help')
    el.tabIndex = 0
    el.setAttribute('role', 'button')
    // Dans une étiquette de case à cocher, le toucher explique sans cocher.
    el.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); show(el) })
    el.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(el) } })
  },
  updated(el, { value }) { if (value) el.dataset.help = value },
}
