import type { Dict } from './index'

// Libellés partagés par plusieurs zones et entrées « contexte|phrase » (voir `tc` et `tq` dans ../index.ts).
export const commun: Dict = {
  'Chargement du garage…': 'Loading the garage…',
  'Chargement des images…': 'Loading images…',
  'Passer': 'Skip',
  'Mise à jour disponible': 'Update available',
  'Mettre à jour': 'Update',
  'Plus tard': 'Later',
  'Termine d’abord ta course.': 'Finish your race first.',
  'Termine d’abord ton booster.': 'Finish opening your booster first.',
  'Attends la fin de la synchronisation des échanges.': 'Wait for trades to finish syncing.',
  // Raretés : valeurs de logique restées françaises, affichées par t(rareté).
  'Courante': 'Common',
  'Rare': 'Rare',
  'Épique': 'Epic',
  'Légendaire': 'Legendary',
  // Le bouton qui défait un recyclage : « Undo » plutôt que « Cancel ».
  'retour|Annuler': 'Undo',
  'Forme du jour': 'Daily form',
  // « Série » : collection de voitures (« Set ») ou séries télé (tag, aura).
  'tag|Série': 'TV Series',
  // Noms de voitures descriptifs.
  'nom|DeLorean temporelle': 'Time Machine DeLorean',
  'nom|Skyline de Brian': 'Brian’s Skyline',
  'nom|Lotus Esprit de James Bond': 'James Bond’s Lotus Esprit',
  'nom|Taxi de Korben Dallas': 'Korben Dallas’s Taxi',
  'nom|Fiat 500 de 1957': '1957 Fiat 500',
  'nom|Dodge Charger de Dom': 'Dom’s Dodge Charger',
  // Versions affichées à côté du nom.
  'version|Série': 'Stock',
  'version|Série 1': 'Series 1',
  'version|Retour vers le futur': 'Back to the Future',
  'version|Film de 1989': '1989 film',
  'version|L\'espion qui m\'aimait': 'The Spy Who Loved Me',
  'version|Le Cinquième Élément': 'The Fifth Element',
  'version|60 secondes chrono': 'Gone in 60 Seconds',
  'version|K2000': 'Knight Rider',
  'version|2 roues motrices': '2WD',
  'version|2.0 essence': '2.0 gas',
  'version|1.2 éthanol': '1.2 ethanol',
  'version|Coccinelle nº 53': 'Beetle No. 53',
  'version|Piste': 'Track',
  'version|Route': 'Road',
  'version|250 six-cylindres': '250 six-cylinder',
  'version|GT24 · 24 Heures': 'GT24 · 24 Hours',
  // Titres d'œuvres (fiche voiture).
  'oeuvre|Retour vers le futur': 'Back to the Future',
  'oeuvre|K2000': 'Knight Rider',
  'oeuvre|Un amour de Coccinelle': 'The Love Bug',
  'oeuvre|L\'espion qui m\'aimait': 'The Spy Who Loved Me',
  'oeuvre|Le Cinquième Élément': 'The Fifth Element',
  'oeuvre|60 secondes chrono': 'Gone in 60 Seconds',
}
