# T-005 · Versus V1 : client réseau, compte et reprise

- **Priorité :** P1
- **Statut :** Implémenté et testé localement. Validation sur Supabase hébergé et deux téléphones physiques en attente.
- **Sources :** [docs/versus.md](../docs/versus.md) §3, §6 et §9

**À faire**
- Ajouter `src/game/versus.ts` : identité anonyme, création/rejoindre une salle, abonnement Realtime et envoi de choix.
- Reprendre une session si l'application passe en arrière-plan ou recharge.
- Afficher l'état de connexion, synchroniser le compte à rebours et traiter automatiquement les délais de jeu.
- Conserver intégralement le jeu solo hors ligne ; afficher « Connexion nécessaire » uniquement dans Versus.
- Persister dans la sauvegarde les mises et règlements en attente (voir T-004).

**Critères de validation**
- [ ] Deux clients connectés reçoivent la même résolution et le même état de salle.
- [ ] Une reconnexion retrouve le duel sans double engagement.
- [ ] Une perte réseau ne casse pas garage, boosters ni courses solo.
- [ ] Les délais et abandons suivent les décisions de T-001.
