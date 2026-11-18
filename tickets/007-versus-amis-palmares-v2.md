# T-007 · Versus V2 : amis par code et palmarès

> **Mise à jour du 18 novembre 2026.** Les échanges de cartes sont dissociés du Versus et livrés avant lui ([T-008](008-echanges-de-cartes.md), [docs/echanges.md](../docs/echanges.md)). La **liste d'amis par code** passe dans ce chantier ; ce ticket garde l'historique des duels et le palmarès, qui réutiliseront cette liste.

- **Priorité :** P2
- **Statut :** Planifié pour V2
- **Sources :** [docs/versus.md](../docs/versus.md) §2

**Objectif.** Après la V1 stabilisée, faciliter les défis récurrents entre amis.

**À faire**
- Ajouter une liste d'amis par code ami.
- Conserver l'historique des duels et les statistiques victoires/défaites contre chaque ami.
- Définir et protéger les nouvelles tables d'amis et d'historique par RLS.
- Prévoir l'invitation d'un ami depuis son profil ou l'historique.

**Critères de validation**
- [ ] Un utilisateur peut trouver et défier un ami par son code.
- [ ] Les résultats ne sont pas comptés deux fois.
- [ ] Les autres joueurs ne consultent pas des données privées.
- [ ] V1 inchangée si aucun ami n'est enregistré.

**Dépendance.** V1 complète (T-001 à T-006).
