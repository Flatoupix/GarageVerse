# Mode Versus · spécification v0.1

Statut : **à valider avant toute implémentation**. Décisions du 17 novembre 2026 : joueurs **entre amis**, courses **en direct**, mises en **crédits réels**, serveur **Supabase dédié** à GarageVerse.

## 1. Expérience recherchée

Défier un ami sur une vraie course de cinq secteurs, avec ses propres voitures préparées, en misant des crédits. Plus tard, échanger des cartes avec lui. Le versus réutilise tout ce que le joueur connaît déjà : écurie de trois voitures sous un plafond de coût, consignes (attaque, normal, gestion), nitro, surchauffe, météo et incidents.

| Moment | Ce que le joueur doit ressentir |
| --- | --- |
| Invitation | « Viens te mesurer à mon garage » : un lien ou un QR code suffit. |
| Mise | Une tension mesurée : on risque des crédits, jamais tout son garage. |
| Course | Le duel habituel, mais face à une vraie personne qui choisit en même temps que toi. |
| Arrivée | Le pot va au vainqueur, une revanche se propose en un geste. |

## 2. Périmètre par étapes

| Étape | Contenu | Serveur |
| --- | --- | --- |
| **V1 · Duel en direct** | Invitation par lien ou QR code, écurie sous plafond, mise en crédits, course en direct, versement du pot, revanche | Supabase : comptes anonymes, salles, résolution des secteurs, mises bloquées |
| **V2 · Amis et palmarès** | Liste d'amis par code, historique des duels, bilan victoires et défaites contre chaque ami | Tables d'amis et d'historique |
| **V3 · Échange de cartes** | Toutes les cartes et des crédits, proposition, contre-proposition, validation simultanée | Échange tenu par le serveur |

La V1 seule est un jeu complet. V2 et V3 viennent ensuite.

## 3. Déroulement d'un duel (V1)

1. **Invitation.** A ouvre *Course › Versus*, choisit le **plafond de l'écurie** (9, 15 ou 22, comme les ligues) et la **mise** (paliers 50, 100, 250, 500 ₡, au plus 25 % de ses crédits). Le jeu crée une salle et affiche un lien et un QR code. La salle expire au bout de 10 minutes.
2. **Acceptation.** B ouvre le lien, voit le plafond et la mise, choisit son écurie et accepte. La mise est retirée des deux côtés à ce moment (§ 5).
3. **Briefing.** Les deux joueurs voient le circuit, la météo de chaque secteur et les trois voitures adverses, comme pour un rival.
4. **Secteurs.** Pour chacun des cinq secteurs, chaque joueur choisit sa voiture, sa consigne et la nitro en **20 secondes**. Les choix restent cachés jusqu'à ce que les deux soient reçus. Le serveur résout alors le secteur et envoie le même résultat aux deux.
5. **Arrivée.** Le vainqueur reçoit le pot, moins la commission (§ 5). En cas d'égalité parfaite, chacun récupère sa mise. Un bouton « Revanche » recrée une salle avec les mêmes réglages.

**Absences.** Un joueur qui ne choisit pas dans le temps imparti voit l'IA du jeu (`aiChoice`) jouer à sa place pour ce secteur. Après deux secteurs sans réponse ou une déconnexion de plus de 60 secondes, il **abandonne** : l'autre gagne le pot.

## 4. Course équitable : le serveur résout, les clients affichent

- La salle tire une **graine** au démarrage. Toute la course (météo, chance, incidents) en découle, comme le défi du jour aujourd'hui (`dailyRng`).
- Le serveur garde les choix cachés tant que les deux ne sont pas arrivés. Personne ne peut répondre au coup de l'autre.
- Le serveur résout chaque secteur avec **le même code de règles que le jeu** (`src/game/rules.ts` et `src/game/data.ts`, importés par la fonction Supabase).
- À ajouter dans `rules.ts` : `playVersusRound(duel, choiceA, choiceB, rng)`. C'est `playRound` sans l'appel à l'IA, et elle doit consommer le hasard dans le même ordre (chance du joueur A, puis du joueur B). `playRound` s'appuiera sur elle pour que les deux modes ne divergent jamais.
- Les écuries envoyées (voitures, stage, ateliers, pièces) sont **revérifiées par le serveur** : plafond de coût, pièces compatibles, potentiel respecté (`installCheck`, `constraintCheck`).

## 5. Mises en crédits réels

| Règle | Valeur proposée | Pourquoi |
| --- | --- | --- |
| Paliers | 50, 100, 250, 500 ₡ | Simple à choisir au doigt |
| Plafond | 25 % des crédits du joueur, et la mise est la même des deux côtés | Un joueur riche ne peut pas ruiner un nouveau |
| Commission | 10 % du pot, retirée du jeu | Absorbe une partie des crédits accumulés (voir l'audit de l'économie) |
| Égalité | Chacun récupère sa mise | Pas de perte sans défaite |
| Abandon | Le pot entier va à l'adversaire, sans commission | Décourage les départs en cours |

**Garde des mises.** Les crédits vivent dans la sauvegarde locale de chaque joueur. Pour que la mise soit réelle :

1. à l'acceptation, chaque jeu retire la mise de sa sauvegarde et l'enregistre comme *mise en cours* (identifiant de salle) ;
2. le serveur note les deux mises et le résultat ;
3. à l'arrivée, chaque jeu demande au serveur le règlement de la salle et l'applique **une seule fois** (identifiant de salle mémorisé dans la sauvegarde) ;
4. une mise en cours dont la salle a expiré sans course est remboursée au chargement suivant.

**Limite assumée (entre amis).** La sauvegarde reste modifiable par son propriétaire (export JSON, raccourci de debug). Le serveur garantit le déroulement et le règlement, pas l'honnêteté du solde de départ. Pour le versus, le raccourci « 14 appuis = +1 000 crédits » sera **désactivé** dès qu'un compte versus existe. Un serveur qui tient lui-même les crédits ne serait nécessaire que pour jouer avec des inconnus.

## 6. Serveur Supabase dédié

Détail technique (configuration, schéma SQL, fonctions, sécurité, déploiement) : [`docs/supabase.md`](supabase.md).

**Projet.** Un nouveau projet Supabase « garageverse », séparé de celui de Crazy Popping Catz. Comptes **anonymes** (Supabase Auth anonyme) : aucun e-mail demandé, le compte est lié à l'appareil, avec un pseudo et un code ami à 6 caractères.

**Tables (V1).**

| Table | Contenu |
| --- | --- |
| `players` | id (auth), pseudo, code ami, création |
| `rooms` | id, hôte, invité, plafond, mise, graine, état (`open`, `ready`, `racing`, `done`, `expired`), vainqueur, expiration |
| `lineups` | salle, joueur, écurie envoyée (voitures et préparation), validée par le serveur |
| `moves` | salle, secteur, joueur, choix (voiture, consigne, nitro), reçu à |
| `rounds` | salle, secteur, résultat publié (scores, lignes, vainqueur) |
| `settlements` | salle, joueur, montant versé, réclamé à |

**Sécurité.** Row Level Security partout. Un joueur ne lit que ses salles et ne voit jamais le coup adverse d'un secteur non résolu. Toutes les écritures sensibles (créer, rejoindre, jouer, régler) passent par des **Edge Functions** : `create-room`, `join-room`, `submit-move`, `claim-settlement`. Le temps réel passe par **Supabase Realtime** (abonnement à `rounds` et à l'état de la salle).

**Configuration côté jeu.** L'URL du projet et la clé publique (`anon`) sont des valeurs publiques, dans `src/game/versus.ts`. La clé `service_role` reste uniquement dans les secrets des Edge Functions, jamais dans le dépôt.

**Hors ligne.** Le versus demande une connexion. Sans réseau, son entrée affiche « Connexion nécessaire » et le reste du jeu fonctionne comme avant.

## 7. Échange de cartes (V3)

Décisions du 17 novembre 2026 : livré en **V3**, **toutes les cartes** échangeables (dernier exemplaire compris), **crédits** possibles dans l'offre, **aucun garde-fou d'équilibre** entre amis.

**Déroulement.**
1. **Proposition.** A compose son offre : des cartes de son garage et, s'il le veut, des crédits. Il choisit ce qu'il demande parmi les cartes que B rend visibles pour l'échange (vitrine d'échange, gérée par B).
2. **Réponse.** B voit les deux côtés en cartes complètes (édition affichée, stage, ateliers, rareté) et le montant de crédits. Il accepte, refuse ou contre-propose. Une offre expire au bout de 24 heures. Une contre-proposition remplace l'offre précédente.
3. **Validation simultanée.** À l'acceptation, les cartes et crédits des deux côtés passent **en transit** : retirés des écuries (rivaux, défi du jour, Nuit sans fin), ni vendables ni jouables. Le serveur enregistre l'échange accepté, puis chaque jeu reçoit ce que l'autre donne, **une seule fois** (identifiant d'échange mémorisé dans la sauvegarde, comme le règlement d'une mise). Si l'un des deux jeux ne confirme pas dans les 24 heures, tout revient à sa place.

**Ce qui suit la carte.** Tous les exemplaires échangés de la voiture, son stage, ses niveaux d'atelier, son 3ᵉ emplacement et ses éditions débloquées passent au nouveau propriétaire. Les **pièces montées retournent au stock** de l'ancien propriétaire. L'édition affichée reste celle choisie avant l'échange. Une voiture reçue en doublon d'une voiture déjà possédée ajoute ses exemplaires, et garde le meilleur stage, les meilleurs ateliers et l'union des éditions.

**Ce qui est permis.**
- Toutes les cartes, y compris le dernier exemplaire d'une voiture et les évolutions.
- Des crédits d'un côté, des deux côtés ou seuls contre des cartes (achat entre amis).
- Aucun plafond quotidien et aucune limite d'écart de rareté : entre amis, le jeu fait confiance aux joueurs.

**Ce qui reste interdit** (règles du jeu, pas d'équilibrage) :
- une voiture engagée dans une course en cours, une mise ou une course versus en attente ;
- un échange qui laisserait l'un des garages sous **trois voitures**, la règle de la vente ;
- des crédits au-delà du solde du joueur au moment de l'acceptation.

**Séries et collection.** Les récompenses de série déjà récupérées restent acquises. Une série complétée grâce à une carte reçue peut être récupérée normalement, une seule fois par joueur.

**Serveur.** Tables `trades` (offre, état, expiration) et `trade_items` (côté, voiture ou crédits, préparation transmise), fonctions `propose-trade`, `answer-trade` et `claim-trade`, avec la même RLS que les salles : chacun ne voit que ses échanges.

**Limite assumée.** Comme pour les mises, les garages vivent dans les sauvegardes locales. Le serveur garantit l'échange, pas l'honnêteté du garage d'origine.

## 8. Interface

- Nouvel onglet **Versus** dans l'écran Course, sous les rivaux. Il contient : créer un défi, rejoindre par code, mise en cours éventuelle.
- Salle d'attente avec lien, QR code et compte à rebours d'expiration.
- Pendant la course : l'écran de duel actuel, avec le pseudo de l'adversaire à la place du rival et un minuteur de 20 secondes par secteur.
- Fin de duel : pot gagné ou perdu, commission, bouton Revanche.
- Notes de version du joueur à chaque publication, comme d'habitude.

## 9. Découpage pour l'orchestrateur

| Tâche | Contenu | Chemins |
| --- | --- | --- |
| `versus-moteur` | `playVersusRound`, `playRound` qui s'appuie dessus, tests de déterminisme (même graine et mêmes choix, même course) | `src/game/` |
| `versus-serveur` | Migrations SQL, RLS, Edge Functions, résolution partagée avec `rules.ts` | `supabase/` (nouveau) |
| `versus-client` | `versus.ts` (connexion, salles, Realtime), mises en cours et règlements dans la sauvegarde | `src/game/` |
| `versus-interface` | Onglet Versus, salle d'attente, course à minuteur, arrivée et revanche | `src/views/`, `src/components/` |
| `echange` (V3) | Vitrine d'échange, offre et contre-offre, transit, réception unique, fusion des doublons | `src/game/`, `src/views/`, `supabase/` |

## 10. Prérequis côté propriétaire du compte

Je ne peux pas créer le projet Supabase à ta place. Il faut :

1. créer le projet « garageverse » sur https://supabase.com (offre gratuite suffisante pour des duels entre amis) ;
2. activer **Anonymous sign-ins** (Authentication › Providers) ;
3. me transmettre l'**URL du projet** et la **clé anon**, qui sont publiques ;
4. pour le déploiement des fonctions, ajouter en secret GitHub un **jeton d'accès Supabase** (`SUPABASE_ACCESS_TOKEN`) et la **référence du projet**. Je prépare l'action GitHub qui déploie les migrations et les fonctions.

## 11. Questions encore ouvertes

- Mise minimale et maximale absolues, en plus des 25 % ?
- Faut-il des **ligues versus** par plafond (9, 15, 22) ou un plafond choisi librement à chaque défi ?
- Revanche : mise identique imposée, ou nouvelle mise ?
- Faut-il un **mode sans mise** (pour la gloire) à côté, pour tester ou jouer avec un ami qui a peu de crédits ?
