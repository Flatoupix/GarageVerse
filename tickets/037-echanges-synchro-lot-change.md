# T-037 · Échanges : « Le lot a changé », voitures d'écurie bloquées, pas d'actualisation

- **Type :** Bug / fonctionnalité réseau
- **Priorité :** P1
- **Statut :** À corriger ; diagnostic reproduit hors serveur le 19 novembre 2026
- **Signalement :** retour du joueur du 19 novembre 2026 : « la synchro ne marche pas pour les échanges », avec un message d'erreur
- **Tickets liés :** [T-008 · Échanges de cartes](008-echanges-de-cartes.md), [T-038 · ergonomie des sélections](038-ux-selection-voitures-course-echanges.md)
- **Fichiers à examiner :** [`src/game/trade.ts`](../src/game/trade.ts), [`src/game/trade-client.ts`](../src/game/trade-client.ts), [`src/views/FriendsView.vue`](../src/views/FriendsView.vue), [`src/App.vue`](../src/App.vue), [`src/game/trade.check.cjs`](../src/game/trade.check.cjs), [`src/game/trade-client.check.cjs`](../src/game/trade-client.check.cjs), [`supabase/functions/_shared/trades.ts`](../supabase/functions/_shared/trades.ts), [`docs/echanges.md`](../docs/echanges.md)

## Constat

Le serveur est déployé (migrations `20261118030000_echanges_amis.sql`, `20261118040000_echanges.sql` et les six fonctions, en ligne depuis la v0.15.0). Les défauts viennent du client.

### 1. « Le lot a changé depuis la proposition. »

- `set-showcase` enregistre une **photo figée** de chaque voiture de la vitrine (`gv_showcase.snapshot`). `propose-trade` reprend cette photo comme lot du destinataire, et le lot du proposeur est photographié au moment de l'envoi.
- `transitTrade` (`trade.ts`) compare la voiture actuelle à cette photo : exemplaires, niveau, améliorations, éditions et édition affichée, hors pièces et favori. **Au moindre écart, il refuse.**
- Un doublon tiré dans un booster (`copies + 1`), une amélioration, un passage de niveau ou un changement d'édition suffisent. En jouant normalement, l'acceptation échoue donc très souvent.
- **Reproduction :** voiture photographiée, puis `copies += 1`. `transitTrade(save, id, offre, photo)` renvoie alors « Le lot a changé depuis la proposition. »
- **Cas aggravant, côté proposeur :** si son lot a changé avant l'acceptation, `apply()` échoue à l'état `accepted`. Le garage ne passe jamais en transit et ne réclame jamais : l'échange reste « En transit » jusqu'à son expiration, et l'erreur s'affiche à chaque reprise (`resumeTrades` dans `App.vue`).
- `receiveTrade` livre la **photo du serveur**, pas la voiture réelle du donneur. Toute correction doit garder les deux garages cohérents : rien de créé, rien de perdu.

### 2. Voitures d'écurie impossibles à échanger

- `validateTradeShowcase` refuse toute voiture présente dans `lineup`, `nightLineup` ou `dailyLineup`, avec le message « Cette voiture est engagée et ne peut pas être échangée ».
- Ces écuries sont **préremplies**. Avec le garage de départ (`clio`, `twingo`, `panda`, tous dans les deux écuries), **aucune voiture n'est échangeable**, ni pour la vitrine ni pour une offre.
- `transitTrade` retire déjà la voiture des trois écuries au départ : le blocage n'est utile que pour une **course en cours** (`duel`, `night` actif, mise Versus).

### 3. Pas d'actualisation automatique

- `FriendsView` recharge les données seulement en changeant d'onglet, au retour dans l'application ou avec « Actualiser ».
- Une demande d'ami, une offre ou une acceptation n'apparaît donc pas chez l'autre joueur tant qu'il reste sur l'écran.

## Correctifs attendus

1. **Tolérer les doublons :** si la voiture actuelle a **au moins** autant d'exemplaires que la photo, et sinon les mêmes valeurs, l'échange passe.
   - Le donneur cède le nombre d'exemplaires annoncé et **garde le surplus**. Il conserve alors sa carte, avec ses améliorations et ses pièces montées.
   - Le receveur obtient exactement le lot annoncé.
   - Vérifier les pièces montées, le favori, l'édition affichée et les écuries dans ce cas partiel.
2. **Vitrine à jour automatiquement :** quand une voiture exposée change (doublon, amélioration, niveau, édition), la vitrine est republiée sans action du joueur, lors de la prochaine synchronisation en ligne. Une voiture qui ne peut plus être échangée est retirée de la vitrine.
3. **Autres écarts** (amélioration, niveau, édition) sur une offre déjà envoyée :
   - pas d'erreur cryptique répétée ;
   - l'offre est **annulée proprement** avec un message clair, par exemple « Ta voiture a changé depuis l'offre : l'échange est annulé, tu peux en proposer un nouveau » ;
   - côté proposeur après acceptation, le lot est rendu sans attendre l'expiration, si le serveur le permet ; sinon, documenter le délai.
4. **Voitures d'écurie échangeables :** seule une voiture engagée dans une course en cours (duel, Nuit sans fin active, mise Versus) reste bloquée. Au départ du lot, l'écurie qui la contenait est complétée ou signalée « à compléter », sans bloquer le joueur.
5. **Actualisation automatique :**
   - toutes les 30 secondes tant que l'écran Échanges est visible et en ligne, sans requête quand l'onglet est caché ;
   - au retour dans l'application (déjà en place) ;
   - un indicateur discret sur le bouton Échanges de l'accueil et du garage quand une offre ou une demande attend une réponse.

## Contraintes

- Ne pas modifier `rules.ts` ni `data.ts`.
- Les migrations et les fonctions Supabase ne changent que si c'est indispensable (par exemple pour un retour anticipé). Toute nouvelle migration est **additive**, relue par le propriétaire et fusionnée vers `master` seulement avec son accord.
- Les anciennes sauvegardes contenant des échanges en cours (`ouverte`, `transit`, `recue`, `quarantaine`) restent lisibles.

## Critères de validation

- [ ] Garage de départ : au moins une voiture peut être mise en vitrine ou proposée, quitte à la retirer de l'écurie.
- [ ] Vitrine publiée, puis doublon tiré dans un booster : l'ami peut toujours demander la voiture et l'échange aboutit. Le donneur garde le surplus, le receveur obtient le lot annoncé.
- [ ] Proposeur qui tire un doublon de la voiture offerte avant l'acceptation : l'échange aboutit sans rester bloqué « En transit ».
- [ ] Voiture améliorée après l'offre : message clair, offre annulée, aucune voiture ni aucun crédit perdus, et pas d'erreur à chaque ouverture.
- [ ] Deux navigateurs sur l'écran Échanges : une offre envoyée apparaît chez l'autre en 30 secondes au plus, sans toucher « Actualiser ».
- [ ] Les vérifications `trade.check.cjs` et `trade-client.check.cjs` couvrent ces cas. vue-tsc, i18n, `src/game/*.check.cjs` et le build passent.
