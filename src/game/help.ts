import { ref, watch, type Directive } from 'vue'
import { t } from '../i18n'
import { OVERHEAT } from './rules'
import { NIGHT_CAP, nightReward } from './endless'

// Aide rapide : chaque terme du jeu a une explication courte, ouverte d'un toucher ou depuis le lexique.
export interface HelpEntry { term: string; text: string }

export const glossary = {
  special: { term: t('Spéciale'), text: t('Affronte cinq adversaires sur un circuit dominé par un même type de secteur. Adapte tes voitures à chaque spéciale.') },
  specialTier: { term: t('Palier'), text: t('Bronze, Argent, Or, Platine puis Légende : gagne pour ouvrir le suivant. Une victoire rejouée rapporte 20 % des crédits, sans doublement parfait. Ta première victoire en Légende donne aussi un ticket Overdrive.') },
  specialUnlock: { term: t('Déblocage des spéciales'), text: t('Bats chaque rival de la Ligue Néon au moins une fois pour ouvrir les quatre spéciales.') },
  nouveau: { term: t('Nouveau'), text: t('Une voiture reçue porte ce badge jusqu’à ta première ouverture de sa fiche.') },
  recycle: { term: t('Annulation du recyclage'), text: t('Confirme le recyclage d’un doublon, puis tu peux l’annuler pendant six secondes. Changer de voiture ou recharger ferme cette possibilité.') },
  disabled: { term: t('Bouton grisé'), text: t('Cette action est indisponible. Lis la condition indiquée pour savoir ce qu’il te manque.') },
  touchHelp: { term: t('Aide tactile'), text: t('Active « Aide en touchant les mots soulignés » dans les Réglages pour ouvrir une explication au toucher. Le lexique reste accessible dans les Réglages, onglet Aide.') },
  legendaryPack: { term: t('Sachet légendaire'), text: t('Un sachet doré avec le ruban « Édition légendaire » contient au moins une carte Légendaire. Tes cinq cartes sont tirées dès l’achat ou l’utilisation du ticket : tu retrouves le même lot après un rechargement. La boutique montre toujours la couverture normale.') },
  offline: { term: t('Mode hors ligne'), text: t('Après une première visite connectée, le jeu garde sa page et ses ressources sur ton appareil. Relance-le sans réseau ; les images déjà chargées restent disponibles. Une nouvelle version arrive au prochain lancement connecté.') },
  exportSave: { term: t('Export de sauvegarde'), text: t('Télécharge un fichier JSON daté contenant ta partie. Garde-le pour retrouver ton garage sur un autre navigateur ou appareil.') },
  importSave: { term: t('Import de sauvegarde'), text: t('Choisis un fichier GarageVerse exporté. Après ta confirmation, il remplace toute ta partie actuelle. Exporte-la d’abord si tu veux la garder.') },
  endless: { term: t('Nuit sans fin'), text: t('Enchaîne les courses contre trois voitures générées, de plus en plus fortes. La première défaite ou un abandon termine ta nuit. Tu peux aussi rentrer entre deux manches.') },
  nightRound: { term: t('Manche'), text: t('Une course en cinq secteurs de ta Nuit sans fin. Gagne-la pour accéder à la suivante ; une égalité termine aussi la nuit.') },
  nightRecord: { term: t('Record de nuit'), text: t('Ton meilleur nombre de manches gagnées pendant une seule nuit. Il est conservé dès que tu le bats.') },
  nightCap: { term: t('Plafond de la nuit'), text: t('Tu engages trois voitures différentes pour un coût total maximal de {cap}, sans limite de Stage ni de pièces.', { cap: NIGHT_CAP }) },
  nightGains: { term: t('Gains accumulés'), text: t('Les crédits gagnés pendant ta nuit : {first} pour la première manche, puis {step} de plus par manche. Tu les encaisses une seule fois en rentrant, à la défaite ou à l’abandon.', { first: nightReward(1), step: nightReward(2) - nightReward(1) }) },
  series: { term: t('Série'), text: t('Réunis toutes les voitures d’un ensemble nommé pour compléter ta série. Une voiture peut compter dans plusieurs séries.') },
  seriesReward: { term: t('Récompense de série'), text: t('Récupère les crédits et parfois un ticket de booster au garage quand tu possèdes toutes les voitures de la série. Tu ne peux recevoir cette récompense qu’une fois, même après une vente.') },
  acc: { term: t('Accélération'), text: t('Compte sur les secteurs de Départ : plus elle est haute, plus ta voiture marque de points au démarrage.') },
  man: { term: t('Maniabilité'), text: t('Compte dans les Virages : une voiture agile y marque plus de points.') },
  vit: { term: t('Vitesse'), text: t('Compte en Ligne droite : la vitesse de pointe fait le score.') },
  end: { term: t('Endurance'), text: t('Compte sur les secteurs d’Endurance. Elle fixe aussi combien de secteurs la voiture peut courir avant de surchauffer : 1 secteur, plus 1 à 4, 8 et 12 d’Endurance (certaines capacités et pièces en ajoutent). Elle départage aussi les égalités.') },
  depart: { term: t('Départ'), text: t('Secteur où seule l’Accélération compte. « +2 au Départ » sur une carte veut dire : 2 points de plus sur ces secteurs.') },
  virage: { term: t('Virages'), text: t('Secteur où seule la Maniabilité compte. « +2 en Virage » : 2 points de plus sur ces secteurs.') },
  ligne: { term: t('Ligne droite'), text: t('Secteur où seule la Vitesse compte. « +2 en Ligne droite » : 2 points de plus sur ces secteurs.') },
  endurance: { term: t('Endurance (secteur)'), text: t('Secteur où seule l’Endurance compte.') },
  sec: { term: t('Sec'), text: t('Route sèche : aucun bonus ni malus de terrain.') },
  pluie: { term: t('Pluie'), text: t('Les quatre roues motrices gagnent 1 point, les propulsions en perdent 1. Les incidents sont plus fréquents.') },
  terre: { term: t('Terre'), text: t('Les 4x4 et voitures de rallye gagnent 1 point ; supercars et hypercars en perdent 2. Les incidents sont plus fréquents.') },
  ville: { term: t('Ville'), text: t('Les citadines gagnent 1 point ; hypercars et muscle cars en perdent 1.') },
  nuit: { term: t('Nuit'), text: t('Les voitures de films, séries et jeux (éditions culturelles) gagnent 1 point.') },
  inconnu: { term: t('Inconnu'), text: t('La météo de ce secteur se révèle quand la course y arrive.') },
  forme: { term: t('Forme du jour (fourchette de score)'), text: t('Le score d’une voiture varie un peu à chaque secteur : c’est la part de chance. La fourchette affichée sous chaque voiture, par exemple « 3-5 », te montre ce qu’elle peut marquer.') },
  parfait: { term: t('Secteur parfait'), text: t('Une fois sur seize environ, une voiture signe un secteur parfait : son score monte d’environ 50 %.') },
  victoireParfaite: { term: t('Victoire parfaite'), text: t('Gagne tous les secteurs : tu doubles les crédits et tu reçois un ticket du booster de la ligue du rival, en plus du ticket de première victoire éventuel. Une étoile garde la trace de ton exploit. Pour le défi du jour, tu doubles les crédits de ta première victoire du jour.') },
  incident: { term: t('Incident'), text: t('Faux départ, tête-à-queue, aspiration ratée, crevaison ou aquaplaning : environ une fois sur vingt-quatre, la voiture perd environ 40 % de son score. Plus fréquent sous la pluie, sur la terre et en surchauffe.') },
  nitro: { term: t('Nitro'), text: t('À cocher avant d’engager une voiture : +2 points sur ce secteur (davantage avec certaines pièces). Tu as 2 charges par course, plus celles qu’apportent certaines voitures et pièces.') },
  consigne: { term: t('Consigne de pilotage'), text: t('À choisir avec la voiture. Attaque : +2 points, mais la voiture brûle deux secteurs d’endurance et risque deux fois plus l’incident ; il lui faut au moins deux secteurs restants. Gestion : −2 points, aucun secteur brûlé et moitié moins de risque. Normal : un secteur brûlé, sans bonus.') },
  surchauffe: { term: t('Surchauffe'), text: t('Chaque voiture peut courir un nombre limité de secteurs (affiché sous elle). Au-delà, elle surchauffe : −{heat} points.', { heat: OVERHEAT }) },
  secteurs: { term: t('Secteurs restants'), text: t('Nombre de secteurs que la voiture peut encore courir sans surchauffer. Il dépend de son Endurance.') },
  capacite: { term: t('Capacité ou pièce'), text: t('Bonus d’une capacité de la carte (encadré en bas de carte) ou d’une pièce montée, par exemple « +2 au Départ ».') },
  retour: { term: t('Retour en force'), text: t('Capacité qui ajoute des points quand tu es mené au score.') },
  outsider: { term: t('Outsider'), text: t('Capacité qui ajoute des points face à une voiture qui coûte au moins 4 de plus.') },
  aura: { term: t('Aura'), text: t('Capacité qui ajoute des points pour chaque autre voiture de la même famille dans ton écurie.') },
  egalite: { term: t('Égalité'), text: t('À score égal, la voiture la plus endurante gagne le secteur.') },
  cout: { term: t('Coût'), text: t('Valeur de la voiture. Le total des trois voitures engagées ne doit pas dépasser le plafond de la ligue.') },
  plafond: { term: t('Plafond de coût'), text: t('Somme maximale des coûts des trois voitures que tu engages dans une course de cette ligue.') },
  rarete: { term: t('Rareté'), text: t('Courante, Rare, Épique ou Légendaire : les plus rares sont plus fortes et plus difficiles à tirer.') },
  stage: { term: t('Stage'), text: t('Niveau de préparation d’une voiture (0 à 3). Chaque Stage augmente la place disponible pour monter des pièces ; au Stage 2, sa meilleure statistique gagne aussi 1 point.') },
  atelier: { term: t('Atelier'), text: t('Dépense des crédits pour monter d’un niveau un groupe de statistiques d’une voiture (2 niveaux par groupe) ou utilise l’amélioration automatique qui prépare les meilleurs niveaux et pièces disponibles. Au niveau 2, tu peux y monter une pièce de ta collection.') },
  piece: { term: t('Pièce'), text: t('Carte Mécanique à monter sur une voiture : elle ajoute un bonus, parfois seulement sur un secteur ou une météo.') },
  vente: { term: t('Vente'), text: t('Vends une voiture entière depuis sa fiche : elle quitte ta collection et ses pièces redeviennent libres. Tu reçois deux fois son prix de recyclage selon sa rareté, plus 10 crédits par Stage, la moitié des crédits dépensés à l’atelier (arrondie à l’entier inférieur) et le prix de recyclage de chaque doublon. Retire-la d’abord de tes écuries, y compris celle du défi du jour. Tu ne peux pas la vendre pendant une course qui l’engage, ni garder moins de trois voitures.') },
  edition: { term: t('Édition'), text: t('Style d’illustration d’une carte (Pixel 16 bits, Synthwave, Classic…). Depuis la fiche d’une voiture possédée, tu peux basculer librement entre tes éditions ou payer en crédits pour débloquer un autre style existant. Elles ne changent pas les statistiques.') },
  garageChips: { term: t('Puces de tri et de filtre'), text: t('Touche une rareté pour filtrer tes voitures ou Toutes pour les retrouver. Les puces Collection, Rareté, Puissance, Nom et Doublons changent le tri. Autres tris garde les critères détaillés. Tes choix restent mémorisés.') },
  rarityColors: { term: t('Couleurs de rareté'), text: t('Le cadre et l’étiquette indiquent la rareté : gris bleu pour Courante, bleu pour Rare, rose pour Épique et or pour Légendaire. Tu peux aussi lire son nom sur chaque carte.') },
  ecurie: { term: t('Écurie'), text: t('Les trois voitures que tu engages en course. À chaque secteur, tu choisis en secret laquelle court.') },
} satisfies Record<string, HelpEntry>
export type HelpKey = keyof typeof glossary

// Sections du lexique dans les Réglages, onglet Aide.
export const glossarySections: { title: string; keys: HelpKey[] }[] = [
  { title: t('Repères du garage'), keys: ['garageChips', 'rarityColors', 'nouveau', 'recycle', 'disabled', 'touchHelp'] },
  { title: t('Sauvegarde et connexion'), keys: ['offline', 'exportSave', 'importSave'] },
  { title: t('Les quatre statistiques'), keys: ['acc', 'man', 'vit', 'end'] },
  { title: t('Les secteurs'), keys: ['depart', 'virage', 'ligne', 'endurance'] },
  { title: t('Météo et terrain'), keys: ['sec', 'pluie', 'terre', 'ville', 'nuit', 'inconnu'] },
  { title: t('En course'), keys: ['ecurie', 'secteurs', 'surchauffe', 'consigne', 'nitro', 'forme', 'parfait', 'incident', 'egalite', 'victoireParfaite'] },
  { title: t('Spéciales'), keys: ['special', 'specialTier', 'specialUnlock'] },
  { title: t('Nuit sans fin'), keys: ['endless', 'nightRound', 'nightRecord', 'nightCap', 'nightGains'] },
  { title: t('Capacités'), keys: ['capacite', 'retour', 'outsider', 'aura'] },
  { title: t('Boosters'), keys: ['legendaryPack'] },
  { title: t('Garage'), keys: ['cout', 'plafond', 'rarete', 'stage', 'atelier', 'piece', 'edition', 'vente', 'series', 'seriesReward'] },
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

// Préférence partagée sans dépendance circulaire avec le store.
export const touchHelpEnabled = ref(false)
const cleanup = new WeakMap<HTMLElement, () => void>()
export const vHelp: Directive<HTMLElement, HelpKey | undefined> = {
  mounted(el, { value }) {
    if (!value) return
    el.dataset.help = value
    const click = (event: Event) => { event.preventDefault(); event.stopPropagation(); show(el) }
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') click(event) }
    const stop = watch(touchHelpEnabled, enabled => {
      el.classList.toggle('has-help', enabled)
      if (enabled) {
        el.tabIndex = 0
        el.setAttribute('role', 'button')
        el.addEventListener('click', click)
        el.addEventListener('keydown', keydown)
      } else {
        el.removeAttribute('tabindex')
        el.removeAttribute('role')
        el.removeEventListener('click', click)
        el.removeEventListener('keydown', keydown)
        if (openHelp.value?.from === el) openHelp.value = null
      }
    }, { immediate: true })
    cleanup.set(el, () => { stop(); el.removeEventListener('click', click); el.removeEventListener('keydown', keydown) })
  },
  updated(el, { value }) { if (value) el.dataset.help = value },
  unmounted(el) { cleanup.get(el)?.(); cleanup.delete(el); if (openHelp.value?.from === el) openHelp.value = null },
}
