# T-023 · Terminer les retours audio et animations à vérifier

- **Priorité :** P3
- **Statut :** Finitions identifiées
- **Sources :** [docs/audit-audio.md](../docs/audit-audio.md) ; [docs/passation.md](../docs/passation.md) « À voir plus tard » ; [docs/meta.md](../docs/meta.md) §5–7

**Existant.** La musique, les bruitages Suno et de nombreux sprites/ambiances sont déjà intégrés. Les décors de conditions sont présents dans `src/assets/pixel/anim/`.

**À faire**
- Réexaminer les effets encore synthétisés : `upgrade` (prise Suno abandonnée), `tap` et `tick` ; ne pas regénérer les sons déjà satisfaisants.
- Tester **sur téléphone physique** la déchirure du booster légendaire, l'impact sonore, le halo et les effets dorés.
- Vérifier synchronisation et lecture en mouvement réduit, vibrations, interruption/reprise et mode muet.
- Identifier puis nettoyer le CSS de scène devenu inutile seulement après vérification des références.

**Critères de validation**
- [ ] Résultats des essais audio/haptique et captures consignés.
- [ ] Respect des préférences musique/bruitages/mouvement réduit.
- [ ] Aucun asset utile supprimé par erreur.
