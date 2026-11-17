# T-010 · Explorer deck et évolution tactique pendant le duel

- **Priorité :** P3
- **Statut :** À arbitrer (distinct des évolutions d'atelier existantes)
- **Sources :** [README.md](../README.md) §3–4 ; [docs/meta.md](../docs/meta.md) §3–5

**Existant.** Les évolutions s'obtiennent déjà au Stage 3 dans l'atelier et peuvent sortir de boosters selon leur fiche. Il ne s'agit **pas** de réimplémenter cette progression.

**Questions de conception**
- Comparer un deck autour d'une voiture et ses pièces à un deck multi-voitures.
- Étudier l'utilisation d'une évolution possédée *en cours de duel*, conditionnée par la voiture de base, un emplacement ou un coût.
- Définir éligibilité, tour/secteur d'activation, coût, statistiques temporaires et résultat après duel.
- Tester le parcours `Elise S1 → 111S → Sport 190` comme cas de référence.

**Critères de validation**
- [ ] Règles de deck et d'évolution en course explicitées avant code.
- [ ] Un mauvais départ conserve une possibilité de rebond.
- [ ] Une carte commune peut contribuer à une stratégie gagnante.
- [ ] Aucune confusion entre déblocage permanent et activation tactique.
