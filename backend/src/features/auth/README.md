# Auth - Backend

> État : cible complète (jalons 1 à 5 du plan). Authentification Microsoft
> Entra, sessions SQLite, rôles gestionnaire/étudiant/lecteur, incarnations
> temporaires gestionnaire, CSRF. `entreprise` n'existe qu'en tant que rôle
> effectif d'incarnation : aucune authentification réelle des entreprises
> n'est implémentée (hors périmètre, voir spec).

## Endpoints

* `GET /api/auth/login` : redirige vers Microsoft Entra (state, nonce, PKCE).
* `GET /api/auth/callback` : retour Microsoft Entra, établit la session ou
  redirige vers `/auth-check?error=...`.
* `GET /api/auth/dev-fixtures` : liste les fixtures de test, uniquement en
  `AUTH_MODE=dev`, en développement et depuis une adresse loopback.
* `POST /api/auth/dev-login` : `{ fixture }` — régénère une session Express et
  établit une identité allowlistée (`manager`, `reader`, deux étudiants ou
  entreprise). Un compte faux n'est jamais ajouté à `users`.
* `GET /api/auth/me` : identité de la session courante — `name`, `email`,
  `baseRole`, `role` (effectif), `entityId` (effectif), `status`,
  `impersonation`, `csrfToken`, `authMode`. `401` sans session.
* `POST /api/auth/logout` : déconnexion locale (session GNG uniquement, pas
  de déconnexion Microsoft globale). Protégé par CSRF.
* `POST /api/auth/impersonation` : `{ kind: 'student' | 'company', entityId }`
  — active un mode temporaire. Réservé à `baseRole === 'gestionnaire'`, `403`
  sinon. `404` si l'entité n'existe pas. Protégé par CSRF.
* `DELETE /api/auth/impersonation` : quitte le mode actif, restaure le rôle
  de base. Protégé par CSRF.

## Modèle de domaine

* `SessionUser` (`auth.types.ts`) : `tid`, `oid` (identité Microsoft
  immuable), `email` (`userPrincipalName` vérifié), `displayName`,
  `baseRole` (`gestionnaire` | `etudiant` | `lecteur`), `entityId` (fiche
  `students` liée, ou `null`), `status` (`ok` | `student_not_imported`).
  Stocké dans `req.session.user`.
* `ImpersonationState` : `{ kind: 'student' | 'company', entityId }`, stocké
  dans `req.session.impersonation`, absent hors incarnation.
* `PendingAuthState` : `state`/`nonce`/`codeVerifier` temporaires, effacés
  après le callback (succès ou échec).
* `req.auth` (`middlewares/auth-context.middleware.ts`) : vue calculée pour
  les routes métier — `authenticated`, `baseRole`, `role` (effectif, tient
  compte d'une incarnation active), `entityId` (effectif).

## Règles métier

* Rôle de base, dans cet ordre : adresse exacte `GESTA_MANAGER_EMAIL`
  (normalisée, comparée à `userPrincipalName`) → `gestionnaire` ; domaine
  exact `student.vinci.be` (partie après le dernier `@`) → `etudiant` ; tout
  autre compte du tenant → `lecteur`. Recalculé à **chaque** connexion
  (`auth.service.classifyBaseRole`). `mail` n'élève jamais seul au rôle
  gestionnaire ou étudiant.
* Liaison étudiante (`auth.service.linkStudentEntity`) : recherche
  `students.email` égal à `userPrincipalName` (insensible à la casse), puis
  à `mail` uniquement s'il diffère du UPN. Ne crée jamais de fiche. Absence
  de correspondance → `status: 'student_not_imported'`, `entityId: null`,
  `role` effectif `null` (bloqué sur toutes les routes métier, mais
  authentifié : `401` ne s'applique pas, `403` si une route est appelée).
* Un jeton d'un autre tenant que `ENTRA_TENANT_ID` est rejeté avant tout
  appel Graph. Le cache MSAL est purgé après `getMe()`, succès ou échec
  (`try`/`finally`). Aucun jeton Microsoft n'est conservé au-delà de cet
  appel, ni dans la session, ni dans les logs, ni dans `users`.
  `upsertIdentity()` ne persiste que l'identité (tid/oid/email/nom/rôle),
  jamais de jeton.
* L'identifiant de session est régénéré après une connexion réussie, ce qui
  efface aussi toute incarnation précédente. Un nouveau jeton CSRF est
  généré à chaque connexion.
* Incarnations : réservées à `baseRole === 'gestionnaire'` ; un seul mode
  actif à la fois (un second appel remplace le précédent) ; l'entité ciblée
  doit exister (`students`/`companies`) ; stockées uniquement dans la
  session, ne modifient jamais `users` ni `students`/`companies` ; effacées
  au logout et à toute nouvelle connexion.
* Seule la permission déléguée `User.Read` est demandée (scopes `openid`,
  `profile`, `email`, `User.Read`).

## Accès données

* `users` : `auth.queries.upsertIdentity()` crée/actualise par
  `(entra_tenant_id, entra_object_id)`. `role`/`entity_id` y sont un
  instantané du dernier login (audit), jamais relus pour autoriser une
  requête.
* `students` : `auth.queries.findStudentIdByEmail()` (lecture seule,
  `COLLATE NOCASE`).
* `companies`/`students` : vérification d'existence lors d'une incarnation
  (`students.queries.findStudentById`, `companies.queries.findCompanyById`).
* Session : `express-session` avec `session.store.ts`
  (`SqliteSessionStore`, table `sessions`), 8h renouvelable
  (`rolling: true`), `HttpOnly`, `SameSite=Lax`, `Secure` en
  production/staging (`trust proxy` activé, voir `app.ts`).

Voir aussi : `docs/data-model.md`.

## Permissions

* `GET/POST /api/auth/login`, `/callback`, `/me` : publiques au sens
  transport (l'authentification elle-même est le mécanisme d'accès).
* `POST /api/auth/logout` : nécessite une session (sinon la déconnexion est
  un no-op côté serveur) et un jeton CSRF valide.
* `POST /DELETE /api/auth/impersonation` : `baseRole === 'gestionnaire'`
  uniquement, jeton CSRF valide.
* Toutes les routes métier (`companies`, `students`, `offers`,
  `applications`) exigent une session : `401` sans session, `403` avec
  session insuffisante (rôle manquant ou `student_not_imported`). Voir les
  README de ces features pour le détail par route.
* CSRF (`middlewares/csrf.middleware.ts`) : toute requête `POST`/`PATCH`/
  `PUT`/`DELETE` avec une session active doit porter l'en-tête
  `x-csrf-token` égal à `req.session.csrfToken`. Une requête anonyme
  traverse sans vérification CSRF pour laisser `requireRole()` répondre
  `401` (pas de `403` CSRF trompeur).

## Configuration

Voir `backend/.env.example` pour la liste complète des variables et
`npm run auth:config:check` pour valider la configuration locale sans
afficher de valeur sensible (aussi exécuté en `ExecStartPre` du service
systemd — voir `docs/deployment.md`).

Le mode `AUTH_MODE=dev` est refusé hors de `NODE_ENV=development`, exige une
configuration locale valide (`APP_BASE_URL`, `SESSION_SECRET`,
`GESTA_MANAGER_EMAIL`, `HOST`) et ne sert qu'à créer des sessions de test
normales. Le frontend Vite est lié à `127.0.0.1` et affiche un bandeau visible
`AUTH DEV — local uniquement`. Le VPS et la production restent en mode Entra.

En l'absence de configuration valide (hors `NODE_ENV=test`) :

* En développement, seules les routes `/api/auth/*` échouent
  (`500 auth_not_configured`) ; le reste de l'application démarre
  normalement (`loadAuthConfigOrNull()`).
* En `production`/`staging`, le démarrage du serveur échoue immédiatement
  (`loadAuthConfig()`, voir `isProductionLikeEnvironment()` dans
  `auth.config.ts`) : pas de démarrage silencieux avec une configuration
  Entra absente ou invalide.

## Tests back

Fichiers de tests :

* `backend/tests/auth-config.test.ts` — validation de configuration.
* `backend/tests/auth-pilot.test.ts` — flux login → callback → `/me` →
  logout, erreurs OAuth (`state`, tenant, `pendingAuth`), purge du cache
  MSAL.
* `backend/tests/auth-roles.test.ts` — classification du rôle de base,
  liaison étudiante (casse, repli sur `mail`, domaines trompeurs),
  recalcul à chaque connexion.
* `backend/tests/auth-impersonation.test.ts` — activation/sortie des deux
  modes, exclusivité, entité inexistante, refus lecteur/étudiant réel, CSRF,
  effacement à la reconnexion.
* `backend/tests/session-store.test.ts` — store SQLite (get/set/destroy,
  expiration, persistance entre instances).
* `backend/tests/helpers/authenticated-agent.ts` — établit une vraie session
  Supertest (login + callback avec un faux fournisseur Entra) pour les
  tests des autres features ; `loginAsEntreprise()` passe par une
  incarnation gestionnaire puisqu'aucun compte entreprise réel n'existe.

Un faux fournisseur (`EntraAuthProvider`) est injecté via
`setEntraProvider()` : aucun appel réseau réel vers Microsoft n'a lieu dans
la suite automatisée.

## Documents liés

* Spec : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Plan : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review pilote (jalon 1) : `docs/reviews/2026-07-31-authentification-microsoft-entra-pilot.md`
* Review cible (jalons 2-7) : `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* Déploiement / secrets : `docs/deployment.md`
* Points d'attention avant mise en production réelle : `docs/production-readiness.md`
