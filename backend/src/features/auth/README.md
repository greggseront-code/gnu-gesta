# Auth - Backend

> Etat actuel : jalon 1 (pilote gestionnaire uniquement). Cette feature sera
> etendue par les jalons suivants du plan lie ci-dessous ; ce README sera mis
> a jour a chaque jalon plutot que recree.

## Endpoints

* `GET /api/auth/login` : redirige vers Microsoft Entra (state, nonce, PKCE).
* `GET /api/auth/callback` : retour Microsoft Entra, etablit ou rejette la
  session pilote.
* `GET /api/auth/me` : identite de la session pilote courante.
* `POST /api/auth/logout` : deconnexion locale (session GNG uniquement).

## Modèle de domaine

* `PilotSessionUser` : soit `{ kind: 'gestionnaire', displayName, email }`,
  soit `{ kind: 'pilot_not_manager', displayName, email }`. Aucune autre
  forme n'existe encore : les rôles `etudiant`, `lecteur` et les
  incarnations arrivent au jalon 3 et au jalon 5.
* `PendingAuthState` (`state`, `nonce`, `codeVerifier`) : temporaire, stocké
  dans la session Express le temps de l'aller-retour Microsoft, effacé après
  le callback (succès ou échec).

## Règles métier

* Seule l'adresse exacte `GESTA_MANAGER_EMAIL` (normalisée en minuscules,
  comparée au `userPrincipalName`) obtient `kind: 'gestionnaire'`. Tout autre
  compte authentifié du tenant reçoit `kind: 'pilot_not_manager'` : la
  session existe mais aucun rôle métier n'est accordé.
* Un jeton d'un autre tenant que `ENTRA_TENANT_ID` est rejeté avant tout appel
  Graph.
* Le cache MSAL (`ConfidentialClientApplication.getTokenCache()`) est purgé
  pour le compte concerné juste après l'appel Graph `/me`, que le callback
  réussisse ou échoue (`try`/`finally` dans `auth.service.ts`). Aucun jeton
  Microsoft n'est conservé au-delà de cet appel, ni dans la session, ni dans
  les logs.
* L'identifiant de session est régénéré après une connexion réussie.
* Seule la permission déléguée `User.Read` est demandée (scopes `openid`,
  `profile`, `email`, `User.Read`).

## Accès données

* Aucune table SQL n'est utilisée par le pilote. `users`/`sessions` arrivent
  au jalon 2 (voir le plan).
* Session : `express-session` avec `MemoryStore` (par défaut, explicite dans
  `app.ts`). Volontairement non persistant et non éligible à la production
  tant que le store SQLite du jalon 2 n'existe pas — voir
  `assertPilotEnvironmentAllowed()` dans `auth.config.ts`, qui refuse de
  démarrer avec `NODE_ENV=production`.

Voir aussi : `docs/data-model.md`.

## Permissions

* Toutes les routes `/api/auth/*` sont publiques au sens transport (pas de
  `x-role` requis) : l'authentification elle-même est le mécanisme d'accès.
* Le pilote ne protège aucune route métier existante (`companies`,
  `students`, `offers`, `applications`) : celles-ci restent gouvernées par
  `x-role`/`x-entity-id` jusqu'au jalon 4.

## Configuration

Voir `backend/.env.example` pour la liste complète des variables et
`npm run auth:config:check` pour valider la configuration locale sans
afficher de valeur sensible.

En l'absence de `backend/.env` valide (hors `NODE_ENV=test`), seules les
routes `/api/auth/*` échouent (`500 auth_not_configured`) ; le reste de
l'application démarre normalement.

Sur le VPS, `assertPilotEnvironmentAllowed()` refuse `NODE_ENV=production`
tant que le store SQLite du jalon 2 n'existe pas. Pour tester ce pilote sur
le VPS existant (données fictives, pas encore de vrais utilisateurs), voir
`docs/specs/2026-07-31-deploy-node-env-configurable.md` : `NODE_ENV` peut
être basculé de façon persistante sur `staging` via `deploy.sh staging`.

## Tests back

Fichiers de tests :

* `backend/tests/auth-config.test.ts`
* `backend/tests/auth-pilot.test.ts`

Scénarios importants :

* Configuration complète acceptée, variable manquante ou invalide rejetée
  (sans fuite de valeur).
* Flux complet login → callback → `/me` pour le compte gestionnaire exact.
* Rejet : `state` invalide, callback sans connexion préalable, erreur Entra
  explicite, jeton d'un autre tenant.
* Authentification réussie mais sans rôle pour un compte non gestionnaire du
  même tenant.
* Déconnexion : la session ne redonne plus accès à `/me`.
* Non-régression : une route métier existante (`GET /api/companies`) n'est
  pas affectée par la session pilote.
* Purge du cache MSAL après le callback, succès comme rejet de tenant.

Un faux fournisseur (`EntraAuthProvider`) est injecté via
`setEntraProvider()` dans les tests : aucun appel réseau réel vers Microsoft
n'a lieu dans la suite automatisée.

## Documents liés

* Spec : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Plan : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review pilote : `docs/reviews/2026-07-31-authentification-microsoft-entra-pilot.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
