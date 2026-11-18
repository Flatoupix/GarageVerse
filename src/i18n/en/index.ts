// Dictionnaire anglais : une phrase française (clé) vers sa traduction. Un fichier par zone du jeu pour que les ajouts ne se
// télescopent pas ; une même clé présente dans deux fichiers doit avoir la même traduction (vérifié par i18n.check.cjs).
import { aide } from './aide'
import { commun } from './commun'
import { composants } from './composants'
import { donnees } from './donnees'
import { jeu } from './jeu'
import { notes } from './notes'
import { serveur } from './serveur'
import { timing } from './timing'
import { vuesAccueil } from './vues-accueil'
import { vuesCourse } from './vues-course'
import { vuesGarage } from './vues-garage'

export type Dict = Record<string, string>
export const en: Dict = { ...aide, ...commun, ...composants, ...donnees, ...jeu, ...notes, ...serveur, ...timing, ...vuesAccueil, ...vuesCourse, ...vuesGarage }
