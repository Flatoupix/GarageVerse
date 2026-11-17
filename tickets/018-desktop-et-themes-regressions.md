# T-018 · Polir le desktop et corriger les derniers défauts des thèmes

- **Priorité :** P2
- **Statut :** Reliquat UX
- **Sources :** [docs/passation.md](../docs/passation.md) « Desktop » et « Pièges connus » ; [docs/meta.md](../docs/meta.md) §7

**Existant.** Le responsive desktop a déjà été travaillé : barre d'onglets en haut à partir de 1024 px, préparation de course en deux colonnes et cartes centrées. Les filtres anguleux, les réglages en onglets, les thèmes repliables et l'aide déplacée existent.

**À faire**
- Vérifier les principales vues sur 320, 390, 768, 1024, 1440 et 1920 px ; conserver les huit thèmes.
- Corriger le défaut connu « Console 16 bits » sur téléphone : le curseur ▶ de l'onglet actif accompagne un trait qui barre le libellé.
- Évaluer les espaces vides, le confort de lecture et le recouvrement des actions fixes sans réécrire le responsive existant.
- Retirer le CSS de scène obsolète après preuve qu'il n'est plus référencé (voir T-023).

**Critères de validation**
- [ ] Captures comparatives mobile/desktop revues par un humain.
- [ ] Pas de débordement, de texte masqué ni de perte de fonctionnalités.
- [ ] Identité des huit thèmes conservée.
