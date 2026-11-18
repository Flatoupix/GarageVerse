// Nom, version et titre d'œuvre des voitures ne servent qu'à l'affichage (les identifiants sont à part) : traduits une fois au démarrage,
// la langue étant fixée au chargement. Module du client seulement : data.ts est recopié tel quel pour le serveur (Deno).
import { vehicles } from '../game/data'
import { locale, tq } from './index'

if (locale !== 'fr') {
  for (const v of vehicles) {
    v.name = tq('nom', v.name)
    v.version = tq('version', v.version)
    if (v.culture) v.culture = { ...v.culture, work: tq('oeuvre', v.culture.work) }
  }
}
