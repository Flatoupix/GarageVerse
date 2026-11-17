# T-021 · Étudier le démontage d'une voiture à l'atelier

- **Priorité :** P3
- **Statut :** Mis de côté : accord requis
- **Sources :** [docs/passation.md](../docs/passation.md) « À voir plus tard » ; [docs/meta.md](../docs/meta.md) §4

**Attention au vocabulaire.** « Tout démonter » qui retire les **pièces montées** est déjà livré. Ce ticket concerne le **démontage de la voiture elle-même** pour récupérer des ressources : mécanique distincte, explicitement mise en attente.

**À faire avant tout code**
- Définir quelles ressources un démontage rapporterait, en évitant les « kits d'amélioration » rejetés.
- Étudier son intérêt par rapport à la vente de véhicule et au recyclage des doublons.
- Définir prérequis, sécurité contre les pertes involontaires, traitements des éditions, pièces et sauvegardes.
- Valider le concept avec le joueur.

**Critères de validation**
- [ ] Pas de bouton supplémentaire ni de logique de destruction avant accord.
- [ ] Mécanique chiffrée et distincte de la vente / retrait de pièces.
