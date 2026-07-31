# Plan - authentification Microsoft Entra V1 par jalons

Date : 2026-07-31

Statut : brouillon

## Contexte

L'authentification Microsoft Entra concentre plusieurs risques indépendants :
configuration du tenant, consentement `User.Read`, URI de callback, échange du
code, lecture du profil et cookies entre Microsoft, Vite et Express. Le plan
commence donc par une tranche verticale minimale consacrée au seul
gestionnaire. La migration des rôles et des routes métier ne commence qu'après
validation humaine de cette première tranche.

Sources à relire avant exécution :

* Spec : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* README de feature : `backend/src/features/students/README.md`
* README de feature : `backend/src/features/companies/README.md`
* README de feature : `backend/src/features/offers/README.md`
* README de feature : `backend/src/features/applications/README.md`
* Déploiement : `docs/deployment.md`
* Review précédente : -

## Objectif

Valider d'abord, de bout en bout et sans toucher aux autorisations métier, que
`gregory.seront@vinci.be` peut se connecter avec Microsoft et voir le rôle
`Gestionnaire` calculé par le backend. Étendre ensuite cette fondation aux
étudiants, lecteurs, routes protégées et incarnations temporaires.

Le plan doit permettre de vérifier :

* dès le premier jalon, que le tenant, le secret, le callback, `User.Read`, le
  profil et le cookie fonctionnent réellement ;
* que le premier jalon reste isolé de l'ancien sélecteur et des données métier ;
* qu'aucune phase suivante ne commence avant acceptation du scénario pilote ;
* qu'à la fin, un étudiant dépend d'un import préalable et qu'un lecteur reçoit
  uniquement des droits de lecture ;
* que seul le gestionnaire peut incarner un étudiant ou une entreprise ;
* que les anciens headers ne constituent plus une preuve d'identité.

## Périmètre

Inclus :

* Jalon 1 : connexion réelle du seul gestionnaire, page minimale de résultat et
  déconnexion locale, sans intégration aux écrans métier.
* Jalon 2 : sessions persistantes et identité Entra dans SQLite.
* Jalon 3 : rôles étudiant/lecteur et liaison obligatoire à l'import.
* Jalon 4 : remplacement des headers, protection CSRF et sécurisation des
  routes métier.
* Jalon 5 : incarnations étudiant/entreprise réservées au gestionnaire.
* Intégration frontend finale, déploiement, documentation et tests.

Exclus :

* Création automatique d'une fiche `students`.
* Authentification réelle des entreprises.
* Gestion dynamique de plusieurs gestionnaires.
* Groupes, rôles applicatifs ou synchronisation d'annuaire Entra.
* Permissions Graph autres que `User.Read`.
* Déconnexion Microsoft globale.

## Impacts prévus

* Backend : feature `auth`, client Entra, sessions Express/SQLite, contexte
  d'autorisation et CSRF.
* Frontend : pages pilote, puis remplacement du contexte de rôle et ajout des
  incarnations gestionnaire.
* Données : évolution de `users`, ajout de `sessions` et normalisation des
  emails étudiants.
* Documentation : review du pilote, architecture, données, features,
  déploiement et review finale.
* Tests : fournisseur Entra simulé, sessions Supertest et scénarios frontend.

## Décisions propres à ce plan

### Décisions du jalon pilote

* Le pilote est une tranche verticale réelle mais locale : il utilise le tenant
  Entra, le secret, `User.Read` et le callback localhost.
* Il expose uniquement `GET /api/auth/login`, `GET /api/auth/callback`,
  `GET /api/auth/me` et `POST /api/auth/logout`.
* Le backend reconnaît uniquement l'adresse exacte
  `gregory.seront@vinci.be`. Tout autre compte reçoit un écran « pilote réservé
  au gestionnaire » et aucun rôle métier.
* Le frontend pilote utilise les routes finales `/login` et `/auth-check`, mais
  n'enveloppe pas encore l'application métier dans un garde d'authentification.
* L'ancien `RoleProvider`, `/select-role`, `x-role` et `x-entity-id` restent
  temporairement en place uniquement pour l'application métier existante.
* La session du pilote utilise le `MemoryStore` d'`express-session` uniquement
  en développement local. Le serveur refuse d'activer ce pilote avec
  `NODE_ENV=production`.
* Le jalon pilote ne doit pas être déployé sur le VPS. Il est validé en local
  via l'URI `http://localhost:5173/api/auth/callback`.
* Aucun access token ou refresh token n'est stocké dans la session, SQLite, le
  frontend ou les logs. Le cache MSAL est vidé après la lecture de `/me`.

### Décisions de la cible après validation du pilote

* `users` représente l'identité technique et conserve le couple Entra immuable
  `tid` + `oid`. `students` reste la source métier issue de l'import.
* Le rôle de base est recalculé à chaque connexion : gestionnaire exact,
  domaine exact `student.vinci.be`, puis lecteur.
* Le `userPrincipalName` sert à classifier le rôle. La liaison étudiante essaie
  d'abord ce champ puis `mail` uniquement pour une correspondance étudiante
  unique et non ambiguë.
* Une session étudiante sans fiche importée affiche le blocage prévu et ne peut
  appeler aucune route métier.
* `req.auth.role` contient le rôle effectif ; `req.auth.baseRole` conserve le
  rôle Microsoft et protège les incarnations.
* La session cible expire après huit heures, renouvelle son échéance et est
  persistée dans SQLite avec `express-session` et un store explicite
  `better-sqlite3`.
* Les mutations authentifiées par cookie utilisent un jeton CSRF lié à la
  session.
* Les incarnations sont stockées uniquement dans la session et ne modifient
  jamais `users` ou `students`.
* Les secrets de production sont chargés par systemd depuis
  `/etc/gnu-gesta/backend.env`, jamais depuis Git.

Ne pas faire dans ce plan :

* Protéger ou réécrire les routes métier pendant le jalon pilote.
* Déployer le `MemoryStore` sur le VPS.
* Ajouter une route de contournement d'authentification en production.
* Conserver les headers de rôle après la migration générale.
* Stocker un secret ou un jeton Microsoft dans Git, SQLite, le frontend ou les
  logs.
* Créer automatiquement un étudiant ou transformer un étudiant absent en
  lecteur.

## Structure cible

```text
backend/
  .env.example
  scripts/
    auth-config-check.ts
  src/
    features/
      auth/
        README.md
        auth.config.ts
        auth.types.ts
        entra.client.ts
        auth.queries.ts
        auth.service.ts
        auth.routes.ts
        session.store.ts
    middlewares/
      auth-context.middleware.ts
      authorization.middleware.ts
      csrf.middleware.ts
    types/
      express-session.d.ts
  tests/
    auth-pilot.test.ts
    auth-roles.test.ts
    auth-impersonation.test.ts
    session-store.test.ts
    helpers/
      authenticated-agent.ts

frontend/src/
  context/
    auth-context.tsx
  features/
    auth/
      auth.api.ts
      auth.types.ts
  pages/
    login.page.tsx
    auth-check.page.tsx
    account-not-linked.page.tsx
    impersonation-select.page.tsx
```

Les fichiers du pilote portent leurs responsabilités définitives afin d'être
étendus après validation plutôt que réécrits.

## Tasks list

## Jalon 1 - pilote gestionnaire minimal

### 001. Configurer le pilote local et ses dépendances

**Files:**

* Read: `backend/package.json`
* Read: `backend/src/server.ts`
* Read: `frontend/vite.config.ts`
* Modify: `backend/package.json`
* Modify: `backend/package-lock.json`
* Modify: `backend/src/server.ts`
* Create: `backend/.env.example`
* Create: `backend/src/features/auth/auth.config.ts`
* Create: `backend/scripts/auth-config-check.ts`
* Create: `backend/tests/auth-config.test.ts`

**Travail :**

* [ ] Ajouter dans Entra l'URI Web locale
      `http://localhost:5173/api/auth/callback` sans supprimer l'URI de
      production.
* [ ] Créer un secret client de test, conserver sa valeur uniquement dans
      `backend/.env` ignoré par Git et noter son expiration hors du dépôt.
* [ ] Ajouter `@azure/msal-node`, `express-session` et `dotenv`, ainsi que les
      types TypeScript nécessaires.
* [ ] Valider `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`,
      `ENTRA_REDIRECT_URI`, `APP_BASE_URL`, `SESSION_SECRET` et
      `GESTA_MANAGER_EMAIL`.
* [ ] Utiliser pour le pilote `APP_BASE_URL=http://localhost:5173` et
      l'adresse gestionnaire `gregory.seront@vinci.be`.
* [ ] Ajouter `npm run auth:config:check` sans jamais afficher les valeurs
      sensibles.
* [ ] Refuser explicitement l'activation du pilote avec `NODE_ENV=production`
      tant que le store SQLite n'est pas en place.

**Verification:**

* Run: `cd backend && npm test -- --run tests/auth-config.test.ts`
* Run: `cd backend && npm run auth:config:check`
* Run: `cd backend && npm run build`
* Expected: configuration valide acceptée, secret absent refusé, aucune valeur
  sensible dans les sorties.

**Human observables:**

* Les deux URI, locale et production, sont visibles dans Entra.
* Le backend local démarre avec `.env` et refuse une configuration incomplète.

### 002. Implémenter le backend minimal de connexion gestionnaire

**Files:**

* Read: `backend/src/app.ts`
* Modify: `backend/src/app.ts`
* Create: `backend/src/features/auth/auth.types.ts`
* Create: `backend/src/features/auth/entra.client.ts`
* Create: `backend/src/features/auth/auth.service.ts`
* Create: `backend/src/features/auth/auth.routes.ts`
* Create: `backend/src/types/express-session.d.ts`
* Create: `backend/tests/auth-pilot.test.ts`

**Travail :**

* [ ] Définir une interface injectable pour générer l'URL Microsoft, échanger
      le code et lire Graph `/me` sans réseau dans les tests.
* [ ] Utiliser l'autorité spécifique au tenant et les scopes `openid`,
      `profile`, `email` et `User.Read`.
* [ ] Monter une session locale `HttpOnly`, `SameSite=Lax`, non `Secure` sur
      localhost, avec le `MemoryStore` explicitement limité au pilote.
* [ ] Implémenter `/login` avec `state`, `nonce` et PKCE conservés dans la
      session temporaire.
* [ ] Implémenter `/callback` : validation du retour, échange du code, appel
      Graph `/me`, vérification du tenant et comparaison exacte du
      `userPrincipalName` gestionnaire.
* [ ] Régénérer l'identifiant de session après connexion et vider de la session
      et du cache MSAL le code verifier, le nonce et les jetons Microsoft.
* [ ] Implémenter `/me` avec seulement le nom, l'adresse et le rôle
      `gestionnaire`, ou le statut `pilot_not_manager`.
* [ ] Implémenter la déconnexion locale par `POST`, destruction de session et
      suppression du cookie.
* [ ] Ne monter aucun garde global et ne modifier aucune route métier.
* [ ] Tester avec un faux fournisseur Entra les retours valides, tenant/audience
      invalides, `state` invalide, compte non gestionnaire et logout.

**Verification:**

* Run: `cd backend && npm test -- --run tests/auth-pilot.test.ts`
* Run: `cd backend && npm run build`
* Expected: le flux simulé établit uniquement une session gestionnaire et les
  routes métier existantes restent inchangées.

**Human observables:**

* `GET /api/auth/me` retourne `401` avant connexion.
* Après callback valide, il retourne le nom, l'adresse et
  `role: "gestionnaire"` sans jeton Microsoft.

### 003. Ajouter le frontend pilote « connexion puis rôle »

**Files:**

* Read: `frontend/src/app/app.tsx`
* Read: `frontend/src/context/role-context.tsx`
* Modify: `frontend/src/app/app.tsx`
* Modify: `frontend/src/lib/api-client.ts`
* Create: `frontend/src/features/auth/auth.types.ts`
* Create: `frontend/src/features/auth/auth.api.ts`
* Create: `frontend/src/context/auth-context.tsx`
* Create: `frontend/src/pages/login.page.tsx`
* Create: `frontend/src/pages/auth-check.page.tsx`
* Create: `frontend/src/pages/auth-check.test.tsx`

**Travail :**

* [ ] Ajouter `/login` avec un unique bouton « Se connecter avec Microsoft »
      qui navigue vers `/api/auth/login`.
* [ ] Ajouter `/auth-check` comme destination du callback avec les états
      chargement, erreur, compte non gestionnaire et connexion réussie.
* [ ] Afficher uniquement, en cas de succès, le nom, l'adresse et
      « Rôle : Gestionnaire » renvoyés par `/api/auth/me`.
* [ ] Ajouter une action « Se déconnecter » puis retour à `/login`.
* [ ] Utiliser un `AuthProvider` limité aux routes pilote mais conçu pour être
      étendu lors de l'intégration finale.
* [ ] Conserver temporairement `RoleProvider`, `/select-role` et toute la
      navigation métier existante sans interaction avec la session pilote.
* [ ] Ne pas ajouter encore de redirection automatique depuis les pages métier
      vers `/login`.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/auth-check.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: les états anonyme, erreur, non-gestionnaire, gestionnaire et logout
  sont rendus sans dépendre de l'ancien rôle local.

**Human observables:**

* `/login` ne montre aucun sélecteur de rôle.
* `/auth-check` affiche après connexion réelle « Rôle : Gestionnaire ».
* L'application existante continue à fonctionner séparément via
  `/select-role` pendant le pilote.

### 004. Valider le pilote réel et décider la poursuite

**Files:**

* Read: `backend/.env.example`
* Read: `backend/src/features/auth/auth.config.ts`
* Read: `backend/src/features/auth/auth.routes.ts`
* Create: `docs/reviews/2026-07-31-authentification-microsoft-entra-pilot.md`

**Travail :**

* [ ] Démarrer backend et frontend localement avec le secret uniquement dans
      `backend/.env`.
* [ ] Ouvrir une fenêtre privée sur `http://localhost:5173/login`.
* [ ] Se connecter réellement avec `gregory.seront@vinci.be`, y compris le MFA
      éventuel.
* [ ] Confirmer le retour vers `/auth-check`, l'identité et le rôle
      `Gestionnaire`.
* [ ] Rafraîchir la page et confirmer que la session pilote reste active tant
      que le backend n'a pas redémarré.
* [ ] Se déconnecter de GNG et vérifier que les autres applications Microsoft
      ne sont pas déconnectées.
* [ ] Inspecter cookies, réseau et logs : aucun secret, access token ou refresh
      token ne doit être visible côté frontend ou dans les logs.
* [ ] Tester volontairement une URI ou un `state` invalide dans la suite
      automatisée, pas contre le tenant réel.
* [ ] Documenter dans la review les claims réellement reçus, sans leur valeur
      sensible, les messages de consentement et tout écart UPN/mail.
* [ ] Obtenir une validation humaine explicite du scénario avant de cocher le
      jalon et de commencer la tâche 005.

**Verification:**

* Run: `cd backend && npm test -- --run tests/auth-config.test.ts tests/auth-pilot.test.ts`
* Run: `cd frontend && npm test -- --run src/pages/auth-check.test.tsx`
* Run: `cd backend && npm run build`
* Run: `cd frontend && npm run build`
* Expected: automatisation verte et scénario Microsoft réel validé par le
  gestionnaire.

**Human observables:**

* Résultat minimal attendu : « Gregory Seront — gregory.seront@vinci.be —
  Rôle : Gestionnaire ».
* Point d'arrêt obligatoire : aucune tâche 005+ n'est entamée sans accord.

## Jalon 2 - fondations de production

### 005. Persister les sessions et les identités dans SQLite

**Files:**

* Read: `backend/src/db/schema.sql`
* Read: `backend/src/db/db.migrate.ts`
* Read: `backend/src/db/seeds/seed.sql`
* Read: `backend/src/db/seeds/demo.sql`
* Modify: `backend/src/db/schema.sql`
* Modify: `backend/src/db/db.migrate.ts`
* Modify: `backend/src/db/seeds/seed.sql`
* Modify: `backend/src/db/seeds/demo.sql`
* Modify: `backend/src/app.ts`
* Create: `backend/src/features/auth/auth.queries.ts`
* Create: `backend/src/features/auth/session.store.ts`
* Create: `backend/tests/session-store.test.ts`
* Modify: `backend/tests/db.test.ts`

**Travail :**

* [ ] Étendre `users` avec `entra_tenant_id`, `entra_object_id`, nom affiché et
      date de mise à jour.
* [ ] Ajouter l'unicité du couple non nul `tid` + `oid` et un index email
      insensible à la casse.
* [ ] Ajouter `sessions` avec identifiant, JSON et échéance ; implémenter le
      store `get`, `set`, `touch`, `destroy` et nettoyage des expirations.
* [ ] Remplacer le `MemoryStore` par ce store dans tous les environnements et
      supprimer le garde « pilote non production ».
* [ ] Configurer une session de huit heures, renouvelable, `HttpOnly`,
      `SameSite=Lax` et `Secure` en production avec `trust proxy`.
* [ ] Créer/actualiser `users` par `tid` + `oid` sans persister de jeton
      Microsoft.
* [ ] Retirer les faux utilisateurs des futurs seeds et rendre le déclenchement
      du seed indépendant de la présence d'identités Entra.
* [ ] Adapter les tests et le healthcheck au nombre de tables.

**Verification:**

* Run: `cd backend && npm test -- --run tests/db.test.ts tests/session-store.test.ts tests/auth-pilot.test.ts`
* Expected: migration idempotente, sessions conservées après recréation de
  l'application et identités Entra uniques.

**Human observables:**

* Redémarrer le backend ne déconnecte plus une session non expirée.

## Jalon 3 - étudiants et lecteurs

### 006. Étendre l'attribution des rôles et imposer l'import étudiant

**Files:**

* Read: `backend/src/features/students/students.queries.ts`
* Modify: `backend/src/features/auth/auth.types.ts`
* Modify: `backend/src/features/auth/auth.service.ts`
* Modify: `backend/src/features/auth/auth.queries.ts`
* Modify: `backend/src/features/students/students.queries.ts`
* Modify: `backend/src/db/schema.sql`
* Modify: `backend/src/db/db.migrate.ts`
* Modify: `backend/tests/students-import.test.ts`
* Create: `backend/tests/auth-roles.test.ts`

**Travail :**

* [ ] Généraliser l'ordre gestionnaire exact, domaine étudiant exact, puis
      lecteur.
* [ ] Normaliser les emails étudiants et garantir leur unicité insensible à la
      casse après détection des doublons existants.
* [ ] Lier l'étudiant par `userPrincipalName`, puis par `mail` seulement si la
      correspondance autorisée est unique et non ambiguë.
* [ ] Ne jamais créer de ligne `students` pendant une connexion.
* [ ] Retourner `student_not_imported` avec `entityId=null` lorsqu'aucune fiche
      ne correspond.
* [ ] Recalculer rôle et liaison à chaque connexion afin qu'un import ultérieur
      débloque le compte.
* [ ] Étendre `/api/auth/me` avec statut, rôle de base, rôle effectif et
      `entityId` sans encore protéger les routes métier.

**Verification:**

* Run: `cd backend && npm test -- --run tests/auth-roles.test.ts tests/students-import.test.ts`
* Expected: gestionnaire, étudiant connu/inconnu, lecteur, domaines trompeurs,
  différences de casse et collision ambiguë sont couverts.

**Human observables:**

* Un étudiant importé obtient automatiquement son `entityId`.
* Un étudiant absent reste authentifié mais reçoit le statut bloqué prévu.

## Jalon 4 - frontière de sécurité métier

### 007. Protéger les mutations par CSRF et remplacer les headers de rôle

**Files:**

* Modify: `backend/src/middlewares/auth-context.middleware.ts`
* Modify: `backend/src/middlewares/authorization.middleware.ts`
* Create: `backend/src/middlewares/csrf.middleware.ts`
* Modify: `backend/src/app.ts`
* Modify: `backend/src/features/students/students.routes.ts`
* Modify: `backend/src/features/companies/companies.routes.ts`
* Modify: `backend/src/features/offers/offers.routes.ts`
* Modify: `backend/src/features/applications/applications.routes.ts`
* Create: `backend/tests/helpers/authenticated-agent.ts`
* Modify: `backend/tests/access-control.test.ts`
* Modify: `backend/tests/companies.test.ts`
* Modify: `backend/tests/offers.test.ts`
* Modify: `backend/tests/applications.test.ts`
* Modify: `backend/tests/students-import.test.ts`

**Travail :**

* [ ] Construire `req.auth` exclusivement depuis la session avec identité,
      `baseRole`, rôle effectif, `entityId` et statut du compte.
* [ ] Bloquer toutes les routes métier pour `student_not_imported`.
* [ ] Retourner `401` sans session et `403` avec session insuffisante.
* [ ] Générer un jeton CSRF dans la session, l'exposer par `/api/auth/me` et le
      valider sur `POST`, `PATCH`, `PUT` et `DELETE`.
* [ ] Supprimer sans période de compatibilité la confiance accordée à
      `x-role` et `x-entity-id`.
* [ ] Protéger les anciennes listes publiques : entreprises pour les rôles qui
      utilisent le répertoire, étudiants uniquement pour les besoins métier
      autorisés et le gestionnaire.
* [ ] Migrer tous les tests vers des agents Supertest possédant une vraie
      session de test créée avec un faux fournisseur Entra.
* [ ] Vérifier la matrice complète des permissions et la distinction
      `401`/`403`.

**Verification:**

* Run: `cd backend && npm test -- --run tests/access-control.test.ts tests/companies.test.ts tests/offers.test.ts tests/applications.test.ts tests/students-import.test.ts`
* Expected: toutes les autorisations utilisent la session et les mutations
  sans CSRF sont refusées.

**Human observables:**

* Modifier les headers ou `localStorage` ne change plus aucun droit métier.

## Jalon 5 - incarnations réservées au gestionnaire

### 008. Ajouter les incarnations étudiant et entreprise côté backend

**Files:**

* Modify: `backend/src/features/auth/auth.types.ts`
* Modify: `backend/src/features/auth/auth.service.ts`
* Modify: `backend/src/features/auth/auth.routes.ts`
* Create: `backend/tests/auth-impersonation.test.ts`

**Travail :**

* [ ] Ajouter `POST /api/auth/impersonation` avec
      `{ kind: "student" | "company", entityId }` validé par Zod.
* [ ] Ajouter `DELETE /api/auth/impersonation` pour restaurer le rôle de base.
* [ ] Autoriser ces opérations uniquement lorsque `baseRole=gestionnaire`,
      même si un rôle effectif temporaire est actif.
* [ ] Vérifier l'existence de l'entité et n'autoriser qu'un mode à la fois.
* [ ] Stocker rôle effectif et `entityId` dans la session uniquement.
* [ ] Nettoyer l'incarnation lors du logout et d'une nouvelle connexion.
* [ ] Refuser lecteur, étudiant réel, entité inexistante et requête sans CSRF.

**Verification:**

* Run: `cd backend && npm test -- --run tests/auth-impersonation.test.ts tests/access-control.test.ts`
* Expected: les deux modes appliquent les droits de l'entité, la sortie
  restaure gestionnaire et les autres rôles reçoivent `403`.

**Human observables:**

* L'identité de base gestionnaire reste disponible pendant chaque incarnation.

## Jalon 6 - intégration frontend finale

### 009. Basculer l'application métier vers le contexte authentifié

**Files:**

* Modify: `frontend/src/context/auth-context.tsx`
* Modify: `frontend/src/features/auth/auth.api.ts`
* Modify: `frontend/src/features/auth/auth.types.ts`
* Modify: `frontend/src/pages/login.page.tsx`
* Modify: `frontend/src/pages/auth-check.page.tsx`
* Create: `frontend/src/pages/account-not-linked.page.tsx`
* Modify: `frontend/src/lib/api-client.ts`
* Modify: `frontend/src/lib/api-client.test.ts`
* Modify: `frontend/src/app/app.tsx`
* Modify: `frontend/src/components/app-layout.tsx`
* Delete: `frontend/src/context/role-context.tsx`
* Delete: `frontend/src/pages/role-select.page.tsx`
* Create: `frontend/src/context/auth-context.test.tsx`

**Travail :**

* [ ] Étendre l'`AuthProvider` pilote aux états anonyme, authentifié, étudiant
      non lié et incarnation.
* [ ] Faire de `/login` l'entrée réelle de toute l'application et convertir
      `/auth-check` en destination transitoire avant l'accueil.
* [ ] Charger `/api/auth/me` avant les gardes de routes sans flash d'interface.
* [ ] Construire toute la navigation depuis le rôle effectif backend.
* [ ] Ajouter la page étudiant non lié avec message, logout et nouvelle
      vérification après import.
* [ ] Envoyer cookies et jeton CSRF avec `apiFetch`, gérer globalement `401` et
      supprimer les headers de rôle.
* [ ] Afficher nom, adresse, rôle et déconnexion locale dans le layout.
* [ ] Supprimer l'ancien contexte, le sélecteur et la clé `gesta_role` du
      stockage local.

**Verification:**

* Run: `cd frontend && npm test -- --run src/lib/api-client.test.ts src/context/auth-context.test.tsx src/pages/auth-check.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: restauration de session, rôles, CSRF, `401`, étudiant bloqué et
  navigation fonctionnent sans rôle local.

**Human observables:**

* Une fenêtre privée arrive sur `/login` et chaque utilisateur rejoint
  directement son espace après Microsoft.

### 010. Ajouter l'interface d'incarnation gestionnaire

**Files:**

* Modify: `frontend/src/components/app-layout.tsx`
* Modify: `frontend/src/features/auth/auth.api.ts`
* Modify: `frontend/src/features/auth/auth.types.ts`
* Create: `frontend/src/pages/impersonation-select.page.tsx`
* Create: `frontend/src/pages/impersonation-select.test.tsx`
* Modify: `frontend/src/app/app.tsx`

**Travail :**

* [ ] Afficher « Voir comme un étudiant » et « Voir comme une entreprise »
      uniquement pour `baseRole=gestionnaire` sans mode actif.
* [ ] Rechercher et sélectionner une fiche existante via les API protégées.
* [ ] Activer le mode, recharger `/api/auth/me` et afficher le parcours du rôle
      effectif.
* [ ] Afficher un bandeau permanent avec l'entité incarnée et une action
      « Quitter le mode temporaire » toujours accessible.
* [ ] Restaurer l'accueil gestionnaire après sortie.
* [ ] Tester aussi l'absence des commandes pour lecteur et étudiant réel.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/impersonation-select.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: sélection des deux types, bandeau, sortie et visibilité par rôle
  sont couverts.

**Human observables:**

* Le gestionnaire voit exactement le parcours choisi et revient en un clic à
  son espace.

## Jalon 7 - production et documentation

### 011. Préparer les secrets et le déploiement du VPS

**Files:**

* Read: `deploy/nginx/gng.seront.be.conf`
* Modify: `deploy/systemd/gnu-gesta-backend.service`
* Modify: `deploy/deploy.sh`
* Modify: `docs/deployment.md`
* Modify: `backend/.env.example`

**Travail :**

* [ ] Charger `/etc/gnu-gesta/backend.env` via systemd avec permissions `600`.
* [ ] Ajouter `npm run auth:config:check` dans `ExecStartPre` sans afficher les
      valeurs.
* [ ] Renseigner l'URI de production déjà enregistrée et un secret destiné au
      VPS, sans copier le `.env` local.
* [ ] Vérifier `trust proxy`, `Secure` et les headers `X-Forwarded-*` du proxy.
* [ ] Documenter création, expiration et rotation du secret client.
* [ ] Faire échouer le démarrage si la configuration est absente ou invalide.
* [ ] Ne déployer qu'après remplacement du `MemoryStore`, protection des routes
      et validation des tests complets.

**Verification:**

* Run: `sudo systemd-analyze verify /etc/systemd/system/gnu-gesta-backend.service`
* Run: `sudo nginx -t`
* Run: `curl -fsS https://gng.seront.be/api/health`
* Expected: service actif avec store SQLite et secrets hors dépôt.

**Human observables:**

* La connexion production revient sur
  `https://gng.seront.be/api/auth/callback` avec un cookie sécurisé.

### 012. Mettre à jour le contexte et vérifier la cible complète

**Files:**

* Modify: `docs/architecture.md`
* Modify: `docs/features.md`
* Modify: `docs/data-model.md`
* Create: `backend/src/features/auth/README.md`
* Modify: `backend/src/features/students/README.md`
* Modify: `backend/src/features/companies/README.md`
* Modify: `backend/src/features/offers/README.md`
* Modify: `backend/src/features/applications/README.md`
* Create: `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md`

**Travail :**

* [ ] Documenter la frontière de session et retirer la question ouverte sur
      l'authentification dans l'architecture.
* [ ] Documenter `users`, `sessions`, l'import préalable et les routes devenues
      protégées.
* [ ] Mettre à jour les permissions des README et supprimer les mentions des
      listes publiques de l'ancien sélecteur.
* [ ] Documenter localement la feature auth, sa configuration, ses invariants
      et ses tests sans recopier la spec.
* [ ] Créer la review finale avec écarts au plan, migrations, résultats du
      pilote, vérifications et risques restants.
* [ ] Tester manuellement gestionnaire, étudiant importé, étudiant non importé,
      lecteur et les deux incarnations.
* [ ] Vérifier cookies, réseau, base et logs : aucun secret ou jeton Microsoft
      n'est exposé ou persisté.

**Verification:**

* Run: `cd backend && npm test`
* Run: `cd backend && npm run build`
* Run: `cd frontend && npm test`
* Run: `cd frontend && npm run build`
* Run: `git diff --check`
* Expected: toutes les suites et builds passent ; documentation et review sont
  cohérentes avec la structure réelle.

**Human observables:**

* Chaque profil arrive dans son espace ; l'étudiant absent reste bloqué ; seul
  le gestionnaire voit les incarnations.

## Notes de migration

* Le pilote n'altère ni `users`, ni `students`, ni les autorisations métier.
  Sa session mémoire disparaît au redémarrage, ce qui est accepté localement.
* Le passage au jalon 2 invalide les sessions pilote et introduit la session
  SQLite définitive.
* Les anciennes valeurs `gesta_role` ne sont jamais converties en identité
  authentifiée et sont supprimées lors du jalon frontend final.
* Les headers `x-role` et `x-entity-id` restent seulement jusqu'au jalon 4,
  puis perdent toute influence sans période de compatibilité.
* Les lignes `users` historiques sans `tid`/`oid` restent inertes. Elles ne
  prouvent aucune identité et pourront être nettoyées séparément.
* La migration email détecte les doublons de casse avant création des index et
  ne fusionne aucune fiche silencieusement.

## Points d'attention

* Le jalon 1 valide uniquement la chaîne Microsoft et le gestionnaire. Il ne
  prouve encore ni la persistance production, ni la liaison étudiant, ni la
  sécurité des routes métier.
* Le `MemoryStore` du pilote est volontairement temporaire. Le garde
  `NODE_ENV=production` et l'interdiction de déploiement sont obligatoires.
* La politique du tenant peut bloquer `User.Read` malgré l'absence de
  consentement administrateur requis par la permission elle-même.
* `userPrincipalName` et `mail` peuvent différer ; leurs formes réelles doivent
  être relevées dans la review pilote sans publier leurs valeurs sensibles.
* Le cookie `Secure` exige `trust proxy` en production mais doit rester
  utilisable en HTTP uniquement sur localhost pendant le pilote.
* La protection CSRF devient obligatoire au moment où la session par cookie
  protège les écritures métier, pas pendant le pilote isolé en lecture.
* Les tests utilisent un fournisseur injecté. Aucun bypass HTTP de test ne doit
  exister dans le serveur de production.
* Le secret client expire et sa rotation reste une opération manuelle.
* Le rôle de base reste disponible pendant une incarnation tandis que les
  features métier consomment le rôle effectif.

## Vérification finale

* [ ] Le pilote gestionnaire a été accepté avant la migration métier.
* [ ] Les tests automatisés pertinents passent à chaque jalon.
* [ ] Les builds backend et frontend passent.
* [ ] Le store mémoire a disparu avant tout déploiement.
* [ ] Les quatre profils et les deux incarnations ont été vérifiés.
* [ ] Les documents liés et les deux reviews sont à jour.
* [ ] Aucun secret, token ou `.env` n'est présent dans Git ou les logs.
* [ ] Les écarts par rapport au plan sont documentés.

## Self-review

* Couverture de la spec : tous les comportements restent couverts après le
  jalon pilote ; l'import préalable et les incarnations ne sont pas modifiés.
* Cohérence architecture : le pilote crée les fichiers définitifs mais reste
  isolé ; la session serveur devient la frontière de sécurité uniquement au
  jalon 4.
* Réduction du risque : le premier résultat observable valide tenant, callback,
  Graph, claims et cookie avant toute migration de données ou d'autorisation.
* Risques restants après le pilote : sessions SQLite, UPN/mail étudiants, CSRF,
  migration des tests et déploiement sécurisé.
* Travail restant : valider ce plan, exécuter les tâches 001 à 004, obtenir le
  go/no-go humain, puis seulement poursuivre avec 005 à 012.
