# T-036 · Refonte de l'identité sonore : meilleures musiques et bruitages

- **Type :** Direction artistique / audio / expérience de jeu
- **Priorité :** P2
- **Statut :** À concevoir, produire et valider par écoutes comparatives ; aucun remplacement des sons existants sans validation
- **Demande :** retour du joueur du 19 novembre 2026 : « Travailler de meilleures musiques et bruitages ».
- **Tickets et sources liés :** [T-023 · Finitions audio et animations](023-finitions-audio-animations.md) ; [audit sonore existant](../docs/audit-audio.md) ; [moteur audio](../src/audio.ts), [effets et synthèse de secours](../src/feedback.ts), [pipeline de montage](../pipeline/audio.mjs), [assets](../src/assets/audio/).

## 1. Intention

**Élever la qualité musicale et le sound design de GarageVerse pour donner au jeu une véritable signature sonore**, identifiable, cohérente et agréable après de longues sessions.

La musique doit donner envie de rester dans le garage, d'ouvrir un booster supplémentaire et de relancer une course. Les bruitages doivent **faire sentir les interactions** : le sachet qui se déchire, le claquement d'une carte, la montée en régime du moteur, le rapport qui passe au bon moment, le virage maîtrisé, la rareté découverte.

Ne pas confondre **volume, quantité d'effets et qualité** : privilégier le caractère, la précision, la musicalité et le confort d'écoute. Les silences et les effets courts sont aussi importants que les moments spectaculaires.

**Ce ticket est distinct de T-023** : T-023 termine les vérifications et quelques sons résiduels ; T-036 vise **une refonte artistique et qualitative de l'ensemble**, incluant les compositions, les variations et le mixage.

## 2. État existant à préserver comme base de comparaison

L'audit `docs/audit-audio.md` recense déjà :
- Deux boucles instrumentales **Radio Néon** (garage/accueil/boutique) et **Plein phare** (courses), issues de prises Suno, montées en MP3.
- Des sons montés pour la déchirure, la révélation légendaire, la nitro, le drift et plusieurs interactions/récompenses : `flip`, `collect`, `legend`, `win`, `lose`, `slam`, `rare`, `epic`, `rev`, `whoosh`, `error`, `coin` et d'autres.
- `upgrade`, `tap`, `tick`, `gearShift` et `misfire` disposent actuellement de synthèses Web Audio dans `src/feedback.ts` (avec secours synthétisé pour la plupart des autres effets).
- `src/audio.ts` ne définit que deux pistes musicales (`garage` et `race`), sépare musique et effets, réalise des transitions et abaisse la musique lors de certains événements importants (`duckMusic`).

**Ne pas tout regénérer à l'aveugle.** Faire une écoute critique des assets actuels, relever précisément ce qui fonctionne et ce qui paraît répétitif, artificiel, agressif, pauvre, décalé ou sans personnalité. Les nouvelles prises doivent être comparées aux sons déjà présents.

## 3. Direction musicale à explorer

Élaborer une **mini-bible audio** propre à GarageVerse : instrumentation, tempo, textures, ambiance, motif identifiable, règles de variation, longueur utile des boucles et intensité attendue par écran.

Pistes à proposer, écouter et arbitrer (non imposées) :

| Situation | Intention musicale |
| --- | --- |
| Accueil, garage, collection | Ambiance rétro automobile premium / synthwave chaleureuse, groove discret qui supporte la consultation longue |
| Atelier et améliorations | Variante plus mécanique, électronique et précise, sans changer brutalement d'univers sonore |
| Boutique et ouverture de boosters | Tension légère, anticipation et accents de révélation ; laisser respirer le silence avant les cartes rares |
| Courses classiques | Énergie arcade/outrun, rythme immédiatement présent, boucles moins fatigantes |
| Boss, finale, niveaux avancés | Montée en intensité clairement ressentie, éventuellement arrangement ou motif spécifique |
| Nuit sans fin et pilotage manuel | Musique de conduite qui soutient l'anticipation sans gêner le rythme des passages de vitesses et des virages |
| Victoire, défaite, découverte légendaire | Signatures musicales très courtes et reconnaissables, sans couvrir le contenu essentiel |

- Étudier **plusieurs variations / boucles complémentaires** plutôt qu'une seule boucle pour toutes les situations. Éviter les transitions incessantes lors de chaque changement d'onglet.
- Les thèmes visuels peuvent inspirer des variations futures, mais **ne pas rendre obligatoire une bande-son différente pour chaque thème** dans ce premier ticket.
- Les compositions devraient partager une **identité mélodique ou rythmique** reconnaissable, même avec des intensités différentes.
- Privilégier des boucles **musicalement raccordées** et suffisamment longues pour éviter une répétition perceptible à chaque dizaine de secondes.
- Vérifier que la musique soutient le gameplay **sans concurrencer les signaux de timing** des mini-jeux.

## 4. Sound design / bruitages prioritaires

Revoir le ressenti et la cohérence des événements suivants :

1. **Boosters / TCG :** prise en main, déchirure du sachet, claquement du retournement, apparition d'une carte, son de rareté distinct pour Commune/Rare/Épique/Légendaire, révélation groupée T-033. Une légendaire doit être mémorable sans explosion sonore disproportionnée.
2. **Conduite :** contact/démarrage, moteur qui monte dans les tours, passage de rapport réussi/parfait/raté, rétrogradage éventuel, mauvaise direction, dérapage, aspiration et freinage. Synchroniser les attaques sonores au geste réel, notamment en **pilotage manuel T-026/T-027**.
3. **Course et tension :** nitro, dépassement ou poussée visuelle, verdict de secteur, victoire, défaite et victoire parfaite. Définir les priorités pour ne pas superposer cinq sons à un même instant.
4. **Atelier / collection :** montage d'une pièce, amélioration de Stage, évolution d'une voiture, équipement, acquisition d'une nouvelle carte, crédits et confirmation/refus.
5. **Interface :** touches et navigation discrètes, sans clic incessant ; distinguer les confirmations utiles des interactions neutres.

Pour chaque effet, préciser son rôle, sa durée cible, la dynamique souhaitée, son intensité relative, son moment de déclenchement et la version actuelle ou candidate à comparer.

## 5. Production et intégration

- **Phase A · audit d'écoute** : inventorier les sons réellement utilisés et déclencheurs, produire une grille de notation (identité, plaisir, lisibilité, qualité technique, fatigue à répétition), et garder des exemples de l'ancienne version.
- **Phase B · directions et prototypes** : préparer plusieurs démos courtes pour les morceaux et effets les plus structurants ; faire valider la direction avant une production complète. Les outils de composition, génération ou montage sont ouverts, mais ne pas supposer qu'un générateur assure toujours un rendu final exploitable.
- **Phase C · montage et mix** : nettoyer débuts et fins, supprimer silences et artefacts, équilibrer les niveaux perçus, gérer les pics, filtrer les basses agressives, vérifier les boucles et les raccords ; comparer les nouveaux sons à volume égal.
- **Phase D · intégration sélective** : remplacer les assets seulement après validation, conserver autant que possible les noms de cues et les déclencheurs, étendre la sélection musicale sans dupliquer la logique du lecteur et préserver la synthèse de secours.
- **Phase E · playtest** : tester au casque, sur haut-parleurs de téléphone et sur ordinateur, avec musique et effets séparément, puis ensemble.

### Contraintes de qualité et de sécurité

- Respecter les préférences existantes **Musique / Bruitages**, le mode silencieux, la visibilité de l'onglet, la reprise audio après interaction et le chargement différé.
- Pendant le **pilotage manuel**, les sons de timing doivent rester parfaitement identifiables. Réduire momentanément le fond musical plutôt que simplement monter tous les effets.
- Conserver une consommation mémoire et un poids de téléchargement compatibles avec une **PWA mobile-first** : privilégier formats/compression adaptés, chargement conditionnel et cache raisonnable.
- Respecter le mouvement réduit, ne pas rendre un son indispensable pour comprendre l'action, éviter tout pic sonore désagréable et rendre les couches audio compatibles avec l'accessibilité.
- Vérifier **la provenance, les licences, les conditions d'utilisation et les droits de diffusion** des compositions, effets et éventuels outils génératifs avant publication ; consigner les sources.
- Conserver une option de retour aux assets précédents pendant la phase de test ; pas de remplacement massif sans écoute comparative.

## 6. Critères d'acceptation

- [ ] Une **bible audio courte** décrit l'identité sonore visée et une hiérarchie claire des sons.
- [ ] Un **inventaire d'écoute** couvre toutes les pistes et les principaux effets déjà présents, avec leurs faiblesses et les éléments à préserver.
- [ ] Au moins **deux directions sonores** sont comparées avant validation de la direction principale.
- [ ] Les morceaux principaux (garage, course) font l'objet de versions candidates **jugées meilleures en écoute A/B**, sans imposer un remplacement si aucune ne convainc.
- [ ] Les interactions clés (booster, raretés, moteur/passage de vitesse, virage, victoire, atelier) disposent de sons cohérents, précis et distincts.
- [ ] Les **loops musicaux sont propres**, les transitions entre écrans ne claquent pas et le mix musique / bruitages reste équilibré.
- [ ] Sur une séquence de plusieurs ouvertures de boosters et de plusieurs courses, les sons restent agréables et lisibles, sans fatigue inutile.
- [ ] Les retours du **pilotage manuel** restent audibles et synchronisés malgré la musique.
- [ ] Testé sur **smartphone réel**, casque et haut-parleur, avec musique seule, effets seuls, deux activés et tous désactivés.
- [ ] Aucun problème de reprise d'onglet, de performances, de téléchargement ou de régression des préférences audio.
- [ ] Les droits et la provenance de chaque nouvel asset livré sont documentés ; les anciens fichiers utiles sont conservés tant que la validation n'est pas terminée.

**Livrable :** un ensemble de démos audios comparables, une direction artistique sonore approuvée, puis les musiques et effets retenus intégrés et validés sur mobile. **La validation artistique précède la généralisation.**
