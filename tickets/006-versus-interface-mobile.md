# T-006 · Versus V1 : interface de duel entre amis

- **Priorité :** P1
- **Statut :** Implémenté et testé localement. Validation sur Supabase hébergé et deux téléphones physiques en attente.
- **Sources :** [docs/versus.md](../docs/versus.md) §3 et §8

**À faire**
- Ajouter une entrée « Versus » à l'écran Course, sous les rivaux.
- Proposer créer un défi, rejoindre par code, choisir un plafond/mise et reprendre une salle en cours.
- Ajouter une salle d'attente avec lien, QR code, expiration et acceptation de l'invité.
- Réutiliser l'écran de duel : pseudo adversaire, cinq secteurs, choix cachés, minuteur de 20 secondes.
- Afficher verdict, pot/commission, égalité et bouton Revanche.

**Critères de validation**
- [ ] Parcours complet à deux téléphones, sans éléments de contrôle surnuméraires.
- [ ] Interface claire à 320/390 px, accessible au clavier et au toucher.
- [ ] Pas de fuite visuelle des choix adverses avant leur révélation.
- [ ] État sans réseau explicite, autres modes utilisables.
