# Review — authentification Microsoft Entra, jalons 2 à 7 (cible complète)

Date : 2026-07-31

## Documents liés

* Spec : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Plan : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review pilote (jalon 1) : `docs/reviews/2026-07-31-authentification-microsoft-entra-pilot.md`
* README de feature : `backend/src/features/auth/README.md`
* Architecture : `docs/architecture.md`
* Modèle de données : `docs/data-model.md`
* Carte des features : `docs/features.md`
* Déploiement : `docs/deployment.md`

## Objectif

Implémenter le reste du plan (tâches 005 à 012, jalons 2 à 7) après
validation du pilote gestionnaire (jalon 1, tâche 004) : sessions SQLite,
rôles étudiant/lecteur avec liaison au référentiel, remplacement des headers
`x-role`/`x-entity-id` par la session serveur, CSRF, incarnations
temporaires gestionnaire, intégration frontend finale, préparation du
déploiement VPS et documentation.

Contexte : l'utilisateur a confirmé en conversation, le 2026-07-31, que la
tâche 004 (connexion réelle avec `gregory.seront@vinci.be` contre le tenant
Entra) était validée, et a explicitement demandé d'implémenter tout le reste
du plan sans interruption, en prenant les décisions nécessaires et en les
documentant.

## Travail réalisé

### Jalon 2 — fondations de production (tâche 005)

* `backend/src/db/schema.sql` : `users` étendue avec `entra_tenant_id`,
  `entra_object_id`, `display_name`, `updated_at` ; table `sessions`
  (`sid`, `session` JSON, `expires_at`).
* `backend/src/db/db.migrate.ts` : migrations de colonnes existantes,
  création des index uniques `idx_users_entra_identity` (partiel, tid+oid
  non nuls) et `idx_users_email_nocase` **après** l'ajout des colonnes (une
  base existante n'a pas encore ces colonnes quand `schema.sql` s'exécute).
* `backend/src/features/auth/session.store.ts` : `SqliteSessionStore`
  (implémente `express-session.Store`), résout `getDb()` à chaque appel
  plutôt que de mémoriser une connexion, pour rester compatible avec
  `setDb()` dans les tests. Nettoyage opportuniste des sessions expirées à
  chaque `set()`.
* `backend/src/app.ts` : store SQLite branché sur `express-session`, cookie
  8h `rolling: true`, `Secure`/`trust proxy` dès que
  `isProductionLikeEnvironment()` (production **ou** staging) ; suppression
  du garde `assertPilotEnvironmentAllowed()`.
* `backend/src/features/auth/auth.queries.ts` (nouveau) :
  `upsertIdentity()` (par tid+oid), `findStudentIdByEmail()`.

### Jalon 3 — étudiants et lecteurs (tâche 006)

* `backend/src/features/auth/auth.service.ts` : `classifyBaseRole()`
  (gestionnaire exact → domaine `student.vinci.be` exact → lecteur),
  `linkStudentEntity()` (UPN puis `mail` en repli, jamais de création).
  Recalculé à chaque `handleAuthCallback()`.
* `backend/src/db/db.migrate.ts` : `normalizeStudentEmails()` — détecte les
  doublons de casse dans `students.email` avant de créer l'index unique
  insensible à la casse ; supprime les doublons non référencés (garde la
  fiche la plus ancienne), journalise un avertissement pour toute fiche
  encore référencée par une candidature/offre plutôt que de faire planter le
  démarrage.

### Jalon 4 — frontière de sécurité métier (tâche 007)

* `backend/src/middlewares/auth-context.middleware.ts` : `req.auth`
  reconstruit exclusivement depuis `req.session` (`authenticated`,
  `baseRole`, `role` effectif, `entityId` effectif) ; les headers
  `x-role`/`x-entity-id` ne sont plus lus.
* `backend/src/middlewares/authorization.middleware.ts` : `requireRole()`
  distingue désormais `401` (pas de session) et `403` (session
  insuffisante) ; idem pour `requireReadOnly()`.
* `backend/src/middlewares/csrf.middleware.ts` (nouveau) : valide
  `x-csrf-token` sur `POST`/`PATCH`/`PUT`/`DELETE` quand une session existe ;
  laisse passer une requête anonyme pour que `requireRole()` réponde `401`
  plutôt qu'un `403` CSRF trompeur.
* `GET /api/students` et `GET /api/companies` protégées (voir "Décisions
  prises" ci-dessous pour la matrice réellement retenue).
* `backend/tests/helpers/authenticated-agent.ts` (nouveau) : établit une
  vraie session via login + callback avec un faux fournisseur Entra
  (`loginAsGestionnaire`, `loginAsLecteur`, `loginAsEtudiant`) ;
  `loginAsEntreprise()` passe par une incarnation gestionnaire (aucun compte
  Microsoft entreprise n'existe).
* Tous les tests métier existants (`access-control`, `companies`, `offers`,
  `applications`, `students-import`) migrés des headers `x-role`/
  `x-entity-id` vers cet agent authentifié.

### Jalon 5 — incarnations (tâche 008)

* `POST /DELETE /api/auth/impersonation` (`auth.routes.ts`),
  `assertCanImpersonate()` (`auth.service.ts`) : réservé à
  `baseRole=gestionnaire`, vérifie l'existence de l'entité
  (`students`/`companies`), stocke `{ kind, entityId }` uniquement dans
  `req.session.impersonation`. Effacé à la régénération de session
  (nouvelle connexion) et à la destruction de session (logout).
* `backend/tests/auth-impersonation.test.ts` (nouveau, 10 tests).

### Jalon 6 — intégration frontend finale (tâches 009, 010)

* `frontend/src/context/auth-context.tsx` réécrit : expose `user`, `role`
  (effectif), `entityId`, `baseRole`, `status`, `logout`, `refresh`.
* `frontend/src/lib/api-client.ts` : `credentials: 'include'`, jeton CSRF
  automatique sur les mutations, handler global de `401`.
* `/login` devient l'entrée réelle de l'application ; `/auth-check` une
  destination transitoire (redirige vers `/` ou `/account-not-linked`) ;
  nouvelle page `/account-not-linked` (message, revérification, logout).
* `frontend/src/pages/impersonation-select.page.tsx` (nouveau) : reprend le
  parcours de recherche de l'ancien `role-select.page.tsx`, mais active une
  incarnation backend au lieu de choisir un rôle local.
* `frontend/src/components/app-layout.tsx` : identité/rôle affichés,
  déconnexion, lien « Voir comme… » (gestionnaire, hors incarnation),
  bandeau permanent + sortie pendant une incarnation.
* Toutes les pages consommant l'ancien `useRole()` basculées sur `useAuth()`
  (même forme `{ role, entityId }`, changement d'import uniquement).
* Suppression de `frontend/src/context/role-context.tsx` et
  `frontend/src/pages/role-select.page.tsx`.

### Jalon 7 — production et documentation (tâches 011, 012)

* `deploy/systemd/gnu-gesta-backend.service` : `EnvironmentFile=-/etc/gnu-gesta/backend.env`,
  `ExecStartPre=.../tsx scripts/auth-config-check.ts`. Vérifié avec
  `systemd-analyze verify` (exit 0).
* `docs/deployment.md` : nouvelle section "Secrets authentification
  Microsoft Entra" (création, permissions, rotation du secret client) ;
  section "Environnement runtime" mise à jour (le garde bloquant
  `NODE_ENV=production` a disparu avec le jalon 2).
* `backend/.env.example` mis à jour (renvoie vers `/etc/gnu-gesta/backend.env`
  en production).
* `docs/architecture.md`, `docs/data-model.md`, `docs/features.md` : section
  Auth ajoutée, question ouverte sur la stratégie d'authentification retirée,
  tables `users`/`sessions` documentées.
* README des features `auth`, `students`, `companies`, `offers` mis à jour
  (permissions, invariants).
* `backend/src/db/seeds/seed.sql` et `demo.sql` : suppression des faux
  utilisateurs `users` (les identités viennent désormais d'Entra) ;
  `runSeed()` déclenché sur `students` vide plutôt que `users` vide.

## Écarts par rapport à la spec ou au plan

* **Matrice de permissions `GET /api/students` / `GET /api/companies`
  élargie** (écart le plus significatif). Discuté en conversation avant le
  début de l'implémentation : la première réponse de l'utilisateur excluait
  `lecteur` des deux listes et `entreprise` de `companies`. En codant la
  tâche 007, j'ai constaté que plusieurs pages déjà existantes en
  dépendaient pour ces rôles précis (`admin-applications.page.tsx` et
  `admin-offers.page.tsx` pour `lecteur`, `company-dashboard.page.tsx` pour
  `entreprise`/`students`, `home.page.tsx` pour tous les rôles) : les
  restreindre aurait cassé ces écrans (Promise.all rejeté sur un 403). J'ai
  élargi les deux routes à « toute session authentifiée » — `gestionnaire`,
  `lecteur`, `etudiant`, `entreprise` pour `companies` ; `gestionnaire`,
  `lecteur`, `entreprise` (pas `etudiant`) pour `students`. Le changement de
  fond demandé (fermer l'accès anonyme) reste appliqué ; seule la
  granularité par rôle interne a été revue. Voir "Décisions prises".
* **`users.role`/`entity_id`** : conservés comme instantané du dernier login
  (colonnes déjà existantes, contrainte `NOT NULL` sur `role` à respecter),
  jamais relus pour autoriser une requête. Le plan ne précisait pas ce choix
  explicitement ; l'alternative (les rendre nullable/les supprimer) aurait
  été une migration plus large sans bénéfice pour cette version.
  Voir "Décisions prises".
* **`updated_at` sur `users`** : ajouté sans `NOT NULL` (contrairement à la
  définition `CREATE TABLE` pour une base neuve). SQLite refuse
  `ALTER TABLE ADD COLUMN ... NOT NULL DEFAULT (datetime('now'))` (défaut
  non constant) sur une base existante. Découvert en testant la migration
  contre `backend/data/gesta.db` (voir "Tests et vérifications").
* **Tâche 004 (plan)** : les cases à cocher de validation manuelle ont été
  cochées sur confirmation explicite de l'utilisateur en conversation, mais
  aucun détail des claims Microsoft réels (forme de `userPrincipalName`
  observée pour un compte étudiant, etc.) n'a pu être documenté par l'agent,
  qui n'a pas d'accès direct au tenant. Voir "Incertitudes".
* Aucun autre écart identifié : la structure de fichiers suit celle définie
  dans le plan.

## Fichiers impactés

Voir le détail par jalon dans "Travail réalisé". Résumé par zone :

* Backend auth : `auth.config.ts`, `auth.types.ts`, `auth.queries.ts`
  (nouveau), `auth.service.ts`, `auth.routes.ts`, `entra.client.ts`,
  `session.store.ts` (nouveau).
* Middlewares : `auth-context.middleware.ts`, `authorization.middleware.ts`,
  `csrf.middleware.ts` (nouveau).
* DB : `schema.sql`, `db.migrate.ts`, `seeds/seed.sql`, `seeds/demo.sql`.
* Routes métier : `students.routes.ts`, `companies.routes.ts`,
  `offers.routes.ts`.
* Tests backend : `auth-pilot`, `auth-roles` (nouveau), `auth-impersonation`
  (nouveau), `session-store` (nouveau), `db`, `access-control`, `companies`,
  `offers`, `applications`, `students-import`, `helpers/authenticated-agent.ts`
  (nouveau).
* Frontend : `context/auth-context.tsx`, `lib/api-client.ts`,
  `features/auth/*`, `pages/login.page.tsx`, `pages/auth-check.page.tsx`,
  `pages/account-not-linked.page.tsx` (nouveau),
  `pages/impersonation-select.page.tsx` (nouveau), `components/app-layout.tsx`,
  `app/app.tsx`, toutes les pages consommant le rôle courant, suppression de
  `context/role-context.tsx` et `pages/role-select.page.tsx`.
* Déploiement : `deploy/systemd/gnu-gesta-backend.service`,
  `backend/.env.example`, `docs/deployment.md`.
* Documentation : `docs/architecture.md`, `docs/data-model.md`,
  `docs/features.md`, README des features `auth`/`students`/`companies`/`offers`,
  ce document, `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
  (cases à cocher mises à jour).

## Décisions prises

* **Ordre d'implémentation réorganisé** : l'incarnation backend (tâche 008)
  a été codée avant le grand nettoyage CSRF/headers/migration des tests
  (tâche 007), pas après comme numéroté dans le plan. Raison : les tests
  métier migrés vers de vraies sessions (tâche 007) ont besoin d'un moyen
  d'obtenir une session « entreprise » — qui n'existe qu'en incarnation
  gestionnaire. Faire 008 avant évite un aller-retour ou un contournement
  temporaire dans les tests.
* **Matrice `GET /api/students`/`GET /api/companies` élargie** à toute
  session authentifiée plutôt que la matrice étroite initialement discutée
  (voir "Écarts"). Cohérent avec `docs/architecture.md` ("les lecteurs sont
  en lecture seule", pas "en lecture restreinte") et avec l'usage réel du
  code existant.
* **Session store maison plutôt qu'un paquet npm tiers** : `SqliteSessionStore`
  implémente directement l'interface `express-session.Store` avec
  `better-sqlite3` (déjà une dépendance), conforme aux principes
  d'architecture du projet ("pas d'ORM", dépendances minimales) plutôt que
  d'ajouter un paquet de store tiers.
* **CSRF — double vérification simple** : jeton aléatoire généré à la
  connexion, stocké en session, exposé par `/api/auth/me`, comparé à
  l'en-tête `x-csrf-token` sur les mutations. Pas de synchronizer token per
  requête ni de bibliothèque dédiée (`csurf` est déprécié) : suffisant pour
  une session cookie `SameSite=Lax` sur un seul VPS.
* **`users.role`/`entity_id` conservés comme audit, pas comme source de
  vérité** (voir "Écarts"). Alternative envisagée : les rendre nullable ou
  les supprimer ; écartée pour limiter le risque de migration sans bénéfice
  fonctionnel actuel.
* **Doublons d'emails étudiants (jalon 3)** : suppression automatique des
  doublons non référencés (garde la fiche la plus ancienne) plutôt qu'un
  blocage de la migration — décision explicite de l'utilisateur en
  conversation, les données de test actuelles étant destinées à être
  remplacées avant la mise en production réelle.
* **`isProductionLikeEnvironment()` traite `staging` comme `production`**
  pour `Secure`/`trust proxy`/configuration Entra obligatoire, car les deux
  partagent le même domaine HTTPS (`gng.seront.be`) selon
  `docs/deployment.md` — pas seulement `NODE_ENV=production` littéralement.
* **Seeds** : suppression des lignes `users` factices (`admin@ecole.*`,
  `lecteur@ecole.*`) de `seed.sql` et `demo.sql`, déclenchement du seed basé
  sur `students` vide plutôt que `users` vide — cohérent avec le fait que
  `users` se peuple désormais uniquement via une connexion Entra réelle.

## Tests et vérifications

Tests automatisés exécutés :

* `cd backend && npm test` → 12 fichiers, **124 tests**, tous verts.
* `cd backend && npm run build` → succès (`tsc`).
* `cd frontend && npm test` → 5 fichiers, **21 tests**, tous verts.
* `cd frontend && npm run build` → succès (`tsc` puis `vite build`).
* `sudo systemd-analyze verify deploy/systemd/gnu-gesta-backend.service` →
  exit 0.

Vérifications manuelles effectuées :

* Migration testée contre la base persistée réelle du dépôt
  (`backend/data/gesta.db`, données de démonstration existantes) : a révélé
  et corrigé le bug `updated_at NOT NULL DEFAULT (datetime('now'))` sur
  `ALTER TABLE` (voir "Écarts"). Après correction, migration idempotente
  confirmée (10 tables, `PRAGMA table_info` conforme).
* Relecture manuelle de `req.auth`/`req.session` sur chaque route métier
  modifiée pour confirmer l'absence de tout chemin encore basé sur
  `x-role`/`x-entity-id` (`grep` sur le frontend et le backend : aucune
  occurrence restante hors historique Git).

Non testé ou à vérifier (nécessite le tenant Entra réel, hors de portée de
l'agent) :

* Connexion réelle d'un compte étudiant `@student.vinci.be` et d'un compte
  lecteur quelconque du tenant — seul le compte gestionnaire a été validé
  manuellement (tâche 004, confirmée par l'utilisateur).
* Forme réelle de `userPrincipalName`/`mail` pour un compte étudiant du
  tenant (nécessaire pour confirmer que `linkStudentEntity()` fonctionne
  contre de vraies données, au-delà des scénarios simulés).
* Déploiement effectif sur le VPS (création de
  `/etc/gnu-gesta/backend.env`, secret client de production, `deploy.sh`) :
  volontairement non déclenché par l'agent (infrastructure partagée réelle,
  action à déclencher explicitement par l'utilisateur).
* Test manuel de bout en bout dans un navigateur (login → incarnation →
  sortie → logout) : seule la suite automatisée (Vitest + Supertest + jsdom)
  a été exécutée.

## Risques et limites

* La matrice de permissions élargie (voir "Décisions prises") donne à
  `lecteur` et `entreprise` (en incarnation) un accès en lecture à
  `students`/`companies` plus large que la première intention exprimée par
  l'utilisateur. À revalider explicitement si une restriction plus stricte
  est réellement souhaitée — dans ce cas, les pages qui en dépendent
  (`admin-applications`, `admin-offers`, `home`, `company-dashboard`)
  devront être adaptées en même temps (ne plus appeler ces endpoints, ou
  tolérer un échec partiel).
* `users.role`/`entity_id` peuvent diverger de la réalité entre deux
  connexions (ex: rôle recalculé différemment après un changement de
  domaine étudiant) : acceptable puisque ce ne sont que des colonnes
  d'audit, mais à garder en tête si un futur écran d'administration les
  affiche telles quelles.
* Le upsert d'import étudiant (`ON CONFLICT(email)`) ne gère pas un
  ré-import avec une casse d'email différente de celle déjà en base (voir
  commentaire dans `students.queries.ts`) : accepté en V1, un import réel
  réutilise la casse de l'annuaire source.
* Aucune vérification humaine réelle des rôles étudiant/lecteur et des
  incarnations contre le tenant Entra n'a eu lieu depuis cette session de
  travail.

## Travail restant

* Valider manuellement, contre le tenant Entra réel : un compte étudiant
  `@student.vinci.be` importé, un compte étudiant non importé, un compte
  lecteur quelconque, et les deux modes d'incarnation depuis le compte
  gestionnaire.
* Créer `/etc/gnu-gesta/backend.env` sur le VPS (permissions `600`) avec les
  vraies valeurs de production, en particulier un secret client Entra dédié
  à la production (voir `docs/deployment.md`).
* Déclencher le déploiement (`deploy/deploy-prod.sh`) une fois les
  vérifications manuelles ci-dessus faites — action explicitement réservée
  à l'utilisateur.
* Décider si la matrice de permissions `students`/`companies` doit être
  resserrée par rapport à ce qui a été implémenté (voir "Risques et
  limites").

## Incertitudes

* Correspondance réelle `userPrincipalName`/`mail` pour un compte étudiant
  du tenant : toujours à confirmer (déjà noté comme incertitude dans la
  spec et la review du pilote).
* Le comportement de `normalizeStudentEmails()` (suppression automatique des
  doublons de casse non référencés) n'a été exercé que sur des données de
  test synthétiques ; son comportement sur les données réelles du VPS
  (actuellement fictives, seront remplacées) n'a pas été observé.
