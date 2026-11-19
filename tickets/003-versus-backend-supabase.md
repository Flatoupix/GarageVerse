# T-003 · Versus V1 : Supabase, salles et règles de sécurité

- **Priorité :** P1
- **Statut :** Implémenté (migrations `20261118000000_versus_v1.sql` à `20261118020000_versus_secret_seed.sql`, fonctions `create-room`, `join-room`, `submit-move`, `resolve-due`, `claim-settlement`, client `src/game/versus.ts`) ; **mode en pause depuis la v0.13.1** (`VERSUS_OPEN = false` dans `src/game/features.ts`) ; validation sur deux téléphones avant réouverture
- **Sources :** [docs/versus.md](../docs/versus.md) §6, §9 et §10

**Pré-requis utilisateur.** Créer un projet Supabase « garageverse » distinct, activer les connexions anonymes, communiquer l'URL et la clé publique anon ; placer le jeton d'accès Supabase et la référence projet dans les secrets GitHub pour le déploiement.

**À faire**
- Créer les migrations pour `players`, `rooms`, `lineups`, `moves`, `rounds` et `settlements`.
- Mettre en place Auth anonyme, pseudo, code ami à six caractères et RLS sur toutes les tables.
- Créer les Edge Functions `create-room`, `join-room`, `submit-move`, `claim-settlement`.
- Conserver les décisions cachées jusqu'à la résolution serveur ; abonner les participants aux secteurs et à l'état des salles via Realtime.
- Garantir que la clé `service_role` ne figure jamais dans le dépôt ou le client.

**Critères de validation**
- [ ] Les non-participants ne peuvent lire ou modifier une salle.
- [ ] Impossible de consulter un coup adverse non résolu.
- [ ] Les Edge Functions valident écuries et transitions d'état.
- [ ] Tests des salles expirées et de la résolution concurrente.
