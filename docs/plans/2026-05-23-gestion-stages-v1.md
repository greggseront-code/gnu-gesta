# Gestion Des Stages V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 internship management application with a React frontend, an Express backend, SQLite storage, explicit SQL, and the validated workflows for students, companies, offers, and applications.

**Architecture:** The project is split into `frontend/` and `backend/`. The backend is organized by features with explicit SQL, request validation, and service boundaries. Each backend feature is immediately followed by its frontend counterpart so the full vertical slice is testable before moving on.

**Tech Stack:** React, Vite, TypeScript, Node.js, Express, SQLite, explicit SQL, Zod, React Router, Multer

---

## File Structure

### Root
- Create: `.gitignore`
- Create: `README.md`

### Backend
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/src/db/db.connection.ts`
- Create: `backend/src/db/db.migrate.ts`
- Create: `backend/src/db/schema.sql`
- Create: `backend/src/db/seeds/seed.sql`
- Create: `backend/src/features/companies/`
- Create: `backend/src/features/offers/`
- Create: `backend/src/features/applications/`
- Create: `backend/src/features/students/`
- Create: `backend/src/middlewares/`

### Frontend
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/app.tsx`
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/components/app-layout.tsx`
- Create: `frontend/src/components/status-badge.tsx`
- Create: `frontend/src/pages/home.page.tsx`
- Create: `frontend/src/pages/companies.page.tsx`
- Create: `frontend/src/pages/admin-company-form.page.tsx`
- Create: `frontend/src/pages/admin-company-detail.page.tsx`
- Create: `frontend/src/pages/offers.page.tsx`
- Create: `frontend/src/pages/offer-details.page.tsx`
- Create: `frontend/src/pages/submit-offer.page.tsx`
- Create: `frontend/src/pages/student-proposal.page.tsx`
- Create: `frontend/src/pages/admin-offers.page.tsx`
- Create: `frontend/src/pages/students-import.page.tsx`
- Create: `frontend/src/pages/students.page.tsx`
- Create: `frontend/src/pages/company-dashboard.page.tsx`
- Create: `frontend/src/features/companies/companies.api.ts`
- Create: `frontend/src/features/companies/companies.types.ts`
- Create: `frontend/src/features/offers/offers.api.ts`
- Create: `frontend/src/features/offers/offers.types.ts`
- Create: `frontend/src/features/offers/offer-card.tsx`
- Create: `frontend/src/features/offers/offer-form.tsx`
- Create: `frontend/src/context/role-context.tsx`
- Create: `frontend/src/features/applications/applications.api.ts`
- Create: `frontend/src/features/students/students.api.ts`
- Create: `frontend/src/features/students/students.types.ts`
- Create: `frontend/src/pages/role-select.page.tsx`
- Create: `frontend/src/pages/student-applications.page.tsx`

---

### Task 1: Scaffold The Workspace ✅

**Files:**
- Create: `.gitignore`, `README.md`
- Create: `backend/package.json`, `backend/tsconfig.json`, `backend/vitest.config.ts`
- Create: `backend/src/app.ts`, `backend/src/server.ts`
- Create: `frontend/package.json`, `frontend/tsconfig.json`, `frontend/vite.config.ts`, `frontend/index.html`
- Create: `frontend/src/main.tsx`, `frontend/src/app/app.tsx`, `frontend/src/styles/global.css`

- [x] Define root ignore rules and minimal developer README.
- [x] Initialize backend with TypeScript, Express, and Vitest.
- [x] Initialize frontend with React, Vite, and TypeScript.
- [x] Add a minimal backend health endpoint at `GET /api/health`.
- [x] Add a minimal frontend bootstrap that renders without errors.
- [x] Verify backend tests pass and frontend build succeeds.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test`
- Run: `cd frontend && npm run build`

**Human observables:**
- `cd backend && npm run dev` démarre sur le port 3000
- `curl http://localhost:3000/api/health` retourne `{"ok":true}`
- `cd frontend && npm run dev` démarre Vite sur le port 5173
- `http://localhost:5173` affiche le titre de l'app sans erreur console

---

### Task 2: Create The SQLite Foundation ✅

**Files:**
- Create: `backend/src/db/schema.sql`
- Create: `backend/src/db/db.connection.ts`
- Create: `backend/src/db/db.migrate.ts`
- Create: `backend/src/db/seeds/seed.sql`
- Modify: `backend/src/server.ts`

- [x] Define the SQLite schema: tables `users`, `students`, `companies`, `company_contacts`, `offers`, `offer_contacts`, `applications`, `offer_status_history`. La contrainte CHECK sur `offers.status` inclut les cinq valeurs : `soumise`, `validee_et_visible`, `prise`, `non_disponible`, `refusee`.
- [x] Centralize the DB connection with `getDb()` (file-based) and `createTestDb()` (in-memory) and `setDb()` (for test injection).
- [x] Run migrations at startup so the schema is always present.
- [x] Call `getDb()` eagerly in `server.ts` so the file is created on boot.
- [x] Verify tests can create and reset an in-memory database.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test`
- Expected: db tests verify all 8 tables exist and foreign keys are enforced

**Human observables:**
- `backend/data/gesta.db` est créé dès le démarrage du serveur
- `curl http://localhost:3000/api/health` retourne `{"ok":true,"tables":8}`

---

### Task 3: Companies And Contacts — Backend ✅

**Files:**
- Create: `backend/src/features/companies/companies.types.ts`
- Create: `backend/src/features/companies/companies.schemas.ts`
- Create: `backend/src/features/companies/companies.queries.ts`
- Create: `backend/src/features/companies/companies.service.ts`
- Create: `backend/src/features/companies/companies.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/companies.test.ts`

- [x] Implement company creation with required `general_email` and at least one contact.
- [x] Persist contacts with their roles as a JSON array in the `roles` column. Les trois rôles valides sont exactement : `maitre_de_stage`, `responsable_administratif`, `encadrant_technique`. Le schéma Zod utilise un `z.enum([...])` avec ces trois valeurs — aucune autre valeur n'est acceptée. Un contact peut avoir plusieurs rôles simultanément (`z.array(ContactRoleSchema).min(1)`).
- [x] Add `GET /api/companies` (full list) and `GET /api/companies?search=` (filtered by name).
- [x] Return `probable_duplicates` on creation. Algorithme V1 : extraire le premier mot du nom de la nouvelle entreprise ayant plus de 3 caractères, puis chercher en base via `LOWER(name) LIKE '%<mot>%'` (insensible à la casse). Exemple : "Acme Corp" → mot-clé "acme" → trouve "Acme Corporation" et "Acme SA". Cette approche couvre les cas courants (variantes de suffixe légal) sans dépendance externe. Limite documentée : ne détecte pas les fautes de frappe (pas de distance de Levenshtein en V1).
- [x] Validate all payloads with Zod; return HTTP 400 on failure.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/companies.test.ts`
- Expected: 7 tests pass (creation, contacts, listing, search, validation, duplicates)

**Human observables:**
- `POST /api/companies` avec body valide retourne 201 avec un `id`
- `POST /api/companies` sans contact retourne 400 avec message lisible
- `POST /api/companies` avec un rôle invalide (ex. `"stagiaire"`) retourne 400
- `GET /api/companies?search=acme` filtre par nom

---

### Task 4: Companies — Frontend + Contact Management

**Files:**
- Create: `frontend/src/lib/api-client.ts`
- Create: `frontend/src/features/companies/companies.types.ts`
- Create: `frontend/src/features/companies/companies.api.ts`
- Create: `frontend/src/components/app-layout.tsx`
- Create: `frontend/src/pages/home.page.tsx`
- Create: `frontend/src/pages/companies.page.tsx`
- Create: `frontend/src/pages/admin-company-form.page.tsx`
- Create: `frontend/src/pages/admin-company-detail.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `backend/src/features/companies/companies.queries.ts`
- Modify: `backend/src/features/companies/companies.service.ts`
- Modify: `backend/src/features/companies/companies.routes.ts`
- Modify: `backend/tests/companies.test.ts`

**Backend — extension des endpoints companies (TDD) :**

- [x] Écrire `api-client.ts` : un wrapper `apiFetch<T>(path, options?)` qui préfixe `/api`, pose le header `Content-Type: application/json`, et lève une erreur si la réponse n'est pas ok.
- [x] Écrire `companies.types.ts` avec l'interface `Company` calquée sur la réponse backend.
- [x] Écrire `companies.api.ts` avec `listCompanies(search?)` qui appelle `GET /api/companies`, et `createCompany(input)` qui appelle `POST /api/companies`.
- [x] Écrire `AppLayout` : nav avec `<NavLink>` vers Accueil, Entreprises et Offres, et un `<Outlet />` pour les pages.
- [x] Écrire `HomePage` : page d'accueil avec liens vers `/companies` et `/offers`.
- [x] Écrire `CompaniesPage` : liste les entreprises avec un champ de recherche qui refait l'appel API à chaque frappe, et un lien "Ajouter une entreprise" vers `/admin/companies/new`.
- [x] Configurer `app.tsx` avec `BrowserRouter`, routes `/` (AppLayout) > `/` (HomePage), `/companies` (CompaniesPage), et un fallback 404.
- [x] Run: `cd frontend && npm run build` — pas d'erreur TypeScript.
- [x] Ajouter dans `backend/tests/companies.test.ts` les tests pour : `GET /api/companies/:id` retourne l'entreprise avec ses contacts ; `POST /api/companies/:id/contacts` ajoute un contact et le retourne ; `POST /api/companies/:id/contacts` sans email retourne 400.
- [x] Run: `cd backend && npm test -- --run tests/companies.test.ts` — confirmer que les nouveaux tests échouent.
- [x] Implémenter `findCompanyById(db, id)` dans `companies.queries.ts` : retourne l'entreprise avec ses contacts (`findContactsByCompanyId`).
- [x] Implémenter `insertContact` dans `companies.queries.ts` est déjà présent — l'exposer dans `companies.service.ts` comme `addContactToCompany(companyId, contact)`.
- [x] Ajouter dans `companies.routes.ts` : `GET /api/companies/:id` (retourne entreprise + contacts), `POST /api/companies/:id/contacts` (ajoute un contact, valide avec `ContactInputSchema`), et `PATCH /api/companies/:id` (modifie nom, adresse, email général — réservé à `gestionnaire` et `entreprise` propriétaire).
- [x] Run: `cd backend && npm test -- --run tests/companies.test.ts` — tous les tests passent.
- [x] Run: `cd backend && npm test` — aucune régression.

**Frontend :**

- [x] Écrire `AdminCompanyFormPage` : formulaire de création d'une entreprise avec son premier contact (nom, email général, adresse optionnelle ; prénom, nom, email, téléphone optionnel, rôles du contact). Si la réponse contient des `probable_duplicates`, les afficher avec un avertissement. En cas de succès, rediriger vers `/admin/companies/:id`.
- [x] Ajouter dans `companies.api.ts` : `getCompany(id)`, `addContact(companyId, contact)`, `updateCompany(id, fields)`, `listCompaniesWithDuplicateRisk()`.
- [x] Ajouter dans `companies.types.ts` : `ContactRole`, `CONTACT_ROLE_LABELS`, `CompanyContact`, `CompanyWithContacts`.
- [x] Écrire `AdminCompanyDetailPage` : affiche le nom, email général, adresse de l'entreprise ; liste ses contacts avec leurs rôles ; formulaire inline pour ajouter un nouveau contact. Succès rafraîchit la liste. Avertissement si `probable_duplicates`.
- [x] Ajouter dans le backend `GET /api/companies?duplicate_risk=true`.
- [x] Ajouter les routes `/admin/companies/new` et `/admin/companies/:id` dans `app.tsx`.
- [x] Ajouter le lien "+ Entreprise" dans `AppLayout` et le lien vers la fiche depuis `CompaniesPage`.
- [x] Run: `cd frontend && npm run build` — pas d'erreur TypeScript.
- [ ] Démarrer les deux serveurs et vérifier dans le navigateur.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/companies.test.ts`
- Run: `cd frontend && npm run build`
- Run: `cd backend && npm run dev` + `cd frontend && npm run dev`

**Human observables:**
- `http://localhost:5173/companies` liste les entreprises avec un lien "Ajouter" et un lien vers le détail de chacune
- `http://localhost:5173/admin/companies/new` : formulaire de création avec premier contact ; doublon signalé si nom similaire
- `http://localhost:5173/admin/companies/:id` : fiche entreprise avec liste de contacts et formulaire d'ajout de contact
- Ajouter un contact rafraîchit la liste immédiatement
- `POST /api/companies/:id/contacts` sans email retourne 400

---

### Task 4c: Access Control And Role Enforcement

La V1 utilise un sélecteur de rôle côté frontend, mais la cohérence avec la spec impose aussi un contrôle d'accès côté backend. Cette tâche ajoute une authentification V1 minimale par en-têtes HTTP pour simuler l'identité active sans introduire de vrai SSO.

**Files:**
- Create: `backend/src/middlewares/auth-context.middleware.ts`
- Create: `backend/src/middlewares/authorization.middleware.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/src/features/companies/companies.routes.ts`
- Modify: `frontend/src/lib/api-client.ts`

Task 4c crée uniquement le middleware et protège les routes companies (déjà existantes). La protection des routes offers, applications et students est ajoutée au fur et à mesure dans les Tasks 7, 9, 5 respectivement, en utilisant les helpers définis ici.

- [x] Écrire `auth-context.middleware.ts` : lit `x-role` (`gestionnaire`, `lecteur`, `etudiant`, `entreprise`) et `x-entity-id` depuis les headers et les expose sur `req.auth`. En l'absence de header, le backend se comporte comme non authentifié (accès refusé sur les routes protégées).
- [x] Écrire `authorization.middleware.ts` avec les helpers `requireRole(...)`, `requireAnyRole(...)`, `requireEntityOwnership(entityField)`, `requireReadOnly()`.
- [x] Brancher `auth-context.middleware.ts` globalement dans `app.ts` avant les routes.
- [x] Protéger les routes companies selon la matrice suivante :
  - `GET /api/companies` (liste) : public sans auth — nécessaire pour la page de sélection de rôle et le référentiel étudiant
  - `GET /api/companies/:id` (fiche détail) : `gestionnaire`, `lecteur`, `etudiant` (accès libre) ; `entreprise` uniquement si `company_id == x-entity-id` (403 sinon) — conforme à la spec "les entreprises ne voient que leurs propres données"
  - `POST /api/companies` : `gestionnaire`, `etudiant` (suggestion), `entreprise` (création propre profil)
  - `POST /api/companies/:id/contacts` et `PATCH /api/companies/:id` : `gestionnaire` (tous), `entreprise` (uniquement sa propre entreprise via `x-entity-id`)
  - `lecteur` : 403 sur toute écriture
- [x] Modifier `api-client.ts` pour envoyer `x-role` et `x-entity-id` issus du `role-context` dans chaque requête.
- [x] Écrire `backend/tests/access-control.test.ts` : `lecteur` reçoit 403 sur POST/PATCH companies ; `etudiant` peut appeler POST /api/companies ; `entreprise` peut modifier sa propre fiche mais pas celle d'une autre (403) ; `gestionnaire` peut tout faire.
- [x] Run: `cd backend && npm test -- --run tests/access-control.test.ts` — tous les tests PASS.
- [x] Run: `cd backend && npm test` — aucune régression.
- [ ] Compléter les tests d'accès dans Tasks 5, 7, 9 pour les routes correspondantes.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/access-control.test.ts`

**Human observables:**
- Une requête d'écriture avec le rôle `lecteur` retourne 403
- Une entreprise ne peut pas charger la fiche détaillée d'une autre entreprise
- Un étudiant ne voit pas les offres `soumise` des autres auteurs
- Le frontend continue à fonctionner avec le rôle sélectionné sans saisie manuelle d'identité dans les formulaires

---

### Task 4b: Role Selection

La spec dit "chaque utilisateur se connecte à la même application, puis accède à un espace adapté à son rôle." Cette tâche implémente un sélecteur de rôle sans mot de passe : l'utilisateur choisit son rôle, et pour les rôles étudiant et entreprise, il s'identifie en sélectionnant son nom ou sa société dans une liste. Implémentée avant Task 5 avec un fallback gracieux pour la liste des étudiants (vide tant que Task 5 n'est pas faite).

**Files:**
- Create: `frontend/src/context/role-context.tsx`
- Create: `frontend/src/pages/role-select.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `frontend/src/components/app-layout.tsx`

- [x] Écrire `role-context.tsx` : contexte React exposant `role` (`'gestionnaire' | 'lecteur' | 'etudiant' | 'entreprise' | null`), `entityId` (student_id ou company_id selon le rôle, ou null), `setRole(role, entityId?)` et `clearRole()`. La valeur est initialisée depuis localStorage et persistée à chaque changement.
- [x] Écrire `RoleSelectPage` : affiche quatre boutons (Gestionnaire, Lecteur, Étudiant, Entreprise). Cliquer sur Gestionnaire ou Lecteur enregistre le rôle directement et redirige vers `/`. Cliquer sur Étudiant affiche un champ de recherche filtrant la liste des étudiants via `GET /api/students` ; sélectionner un étudiant enregistre le rôle `etudiant` avec son `id` comme `entityId`. Cliquer sur Entreprise affiche un champ de recherche filtrant la liste des entreprises ; sélectionner une entreprise enregistre le rôle `entreprise` avec son `id` comme `entityId`.
- [x] Modifier `app.tsx` : envelopper l'arbre dans `<RoleProvider>`; si `role` est null, rediriger toutes les routes vers `/select-role` ; ajouter la route `/select-role` pointant vers `RoleSelectPage`. Ajouter `RequireWrite` pour bloquer l'accès direct aux routes d'écriture pour `lecteur`.
- [x] Modifier `AppLayout` : afficher les liens de navigation conditionnellement selon le rôle. Gestionnaire : toutes les sections admin + entreprises + offres. Lecteur : entreprises, offres (lecture seule). Étudiant : entreprises, offres. Entreprise : répertoire, offres. Tous les rôles : un bouton "Changer de rôle" qui appelle `clearRole()` et redirige vers `/select-role`.
- [x] Run: `cd frontend && npm run build` — pas d'erreur TypeScript.
- [x] Vérifier dans le navigateur : au premier chargement, redirection vers `/select-role` ; après sélection d'un rôle, navigation adaptée visible ; après rafraîchissement, le rôle est conservé.
- [ ] Commit.

**Verification:**
- Run: `cd frontend && npm run build`

**Human observables:**
- Au premier chargement, `http://localhost:5173` redirige vers `/select-role`
- Choisir "Gestionnaire" affiche les liens admin dans la nav
- Choisir "Étudiant" demande de se sélectionner dans la liste des étudiants importés (vide jusqu'à Task 5), puis affiche la nav étudiant
- Choisir "Entreprise" demande de sélectionner sa société, puis affiche la nav entreprise
- Après rafraîchissement de la page, le rôle et l'identité sont conservés
- Le bouton "Changer de rôle" ramène à la page de sélection
- Le rôle `lecteur` ne voit pas le bouton "+ Nouvelle entreprise" et ne peut pas accéder à `/admin/companies/new` directement

**Note d'impact sur les tâches suivantes :**
- Task 8 (offres frontend) : `SubmitOfferPage` utilise le `entityId` du contexte comme `company_id` ; `StudentProposalPage` utilise le `entityId` comme `student_id`
- Task 10 (applications frontend) : le bouton "Postuler" utilise `entityId` du contexte ; `CompanyDashboardPage` filtre par `entityId`

---

### Task 5: Students Import — Backend

**Files:**
- Create: `backend/src/features/students/students.types.ts`
- Create: `backend/src/features/students/students.schemas.ts`
- Create: `backend/src/features/students/students.queries.ts`
- Create: `backend/src/features/students/students.service.ts`
- Create: `backend/src/features/students/students.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/students-import.test.ts`

- [x] Écrire les tests couvrant : import réussi (retourne `{imported: N}`), listing après import, ligne invalide (email malformé → 400), idempotence (upsert par email), accès lecteur/etudiant refusé (403).
- [x] Run le test et confirmer qu'il échoue.
- [x] Définir `StudentInput` (`matricule?`, `first_name`, `last_name`, `email`, `date_naissance?`) et `Student`. Format réel : colonnes Excel `Matricule, Nom, Prénom, Email, Date-Naissance` (pas de colonne promotion dans le fichier). Schéma SQL mis à jour avec `matricule TEXT UNIQUE` et `date_naissance TEXT`.
- [x] Valider le payload avec Zod : tableau de `StudentInput`, chaque email doit être valide.
- [x] Implémenter `upsertStudents` : `INSERT ... ON CONFLICT(email) DO UPDATE SET` dans une transaction.
- [x] Implémenter `GET /api/students` qui retourne la liste triée par nom. Accessible sans auth (nécessaire pour la page de sélection de rôle).
- [x] Implémenter `POST /api/students/import` qui accepte un tableau JSON de lignes.
- [x] Protéger les routes students avec les helpers de Task 4c :
  - `GET /api/students` : public (pas d'auth requise)
  - `POST /api/students/import` : `gestionnaire` uniquement — 403 pour tout autre rôle, conforme à la spec
  - `GET /api/students/:id/applications` (ajouté en Task 9) : `gestionnaire`, `lecteur`, `etudiant` (uniquement ses propres candidatures via `x-entity-id`)
- [x] Brancher le router dans `app.ts` sous `/api/students`.
- [x] Run: `cd backend && npm test -- --run tests/students-import.test.ts` — 7 tests PASS.
- [x] Run: `cd backend && npm test` — aucune régression (42 tests).
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/students-import.test.ts`
- Expected: import, listing, validation, idempotency et accès refusé PASS

**Human observables:**
- `POST /api/students/import` avec `[{"matricule":"202502681","last_name":"Dupont","first_name":"Alice","email":"alice@student.vinci.be","date_naissance":"2006-06-20"}]` retourne `{"imported":1}`
- `GET /api/students` retourne la liste triée par nom
- Renvoyer le même payload met à jour l'étudiant sans créer de doublon

---

### Task 6: Students Import — Frontend

**Files:**
- Create: `frontend/src/features/students/students.types.ts`
- Create: `frontend/src/features/students/students.api.ts`
- Create: `frontend/src/pages/students-import.page.tsx`
- Create: `frontend/src/pages/students.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `frontend/src/components/app-layout.tsx`

- [x] Écrire `students.types.ts` avec l'interface `Student` (matricule, first_name, last_name, email, date_naissance, created_at).
- [x] Écrire `students.api.ts` avec `importStudents(rows)` (POST JSON) et `listStudents()` (GET).
- [x] Écrire `StudentsImportPage` : sélecteur de fichier `.xlsx` (format réel), parser client-side via SheetJS (import dynamique pour code-splitting), colonnes `Matricule / Nom / Prénom / Email / Date-Naissance`, aperçu tabulaire avant envoi, affichage du résultat ou de l'erreur, lien vers la liste après import réussi.
- [x] Écrire `StudentsPage` : liste tous les étudiants (matricule, nom, prénom, email, date de naissance) avec recherche et compteur, bouton import visible pour gestionnaire.
- [x] Ajouter les routes `/admin/students/import` et `/admin/students` dans `app.tsx`. Route import protégée par `RequireWrite`.
- [x] Ajouter les liens "Liste" et "Importer" dans `AppLayout` sous section "Étudiants", visibles pour `gestionnaire` et `lecteur`, action d'import réservée au `gestionnaire`.
- [x] Run: `cd frontend && npm run build` — pas d'erreur.
- [ ] Tester l'import puis la consultation de la liste dans le navigateur.
- [ ] Commit.

**Verification:**
- Run: `cd frontend && npm run build`

**Human observables:**
- `http://localhost:5173/admin/students/import` affiche un sélecteur de fichier `.xlsx` avec aperçu avant import
- Sélectionner le fichier Excel affiche les N étudiants détectés ; cliquer "Importer" envoie les données
- Un fichier malformé affiche un message d'erreur rouge
- `http://localhost:5173/admin/students` liste les étudiants importés avec recherche

---

### Task 7: Offers And Status Workflow — Backend

**Files:**
- Create: `backend/src/features/offers/offers.types.ts`
- Create: `backend/src/features/offers/offers.schemas.ts`
- Create: `backend/src/features/offers/offers.queries.ts`
- Create: `backend/src/features/offers/offers.service.ts`
- Create: `backend/src/features/offers/offers.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/offers.test.ts`

- [x] Installer `multer` et `@types/multer` dans `backend/package.json` et créer `backend/src/middlewares/upload.middleware.ts` : `dest: backend/uploads/`, types autorisés PDF et DOCX, taille max 5 Mo, 400 explicite si violation. Créer le dossier `uploads/` si absent. (Ceci est fait ici car l'endpoint d'upload est implémenté dans cette tâche ; Task 11 n'ajoutera plus que les handlers d'erreur et not-found.)
- [x] Écrire les tests couvrant : création d'une offre (statut `soumise`), listing admin (toutes les offres), listing étudiant (uniquement `validee_et_visible` plus ses propres propositions), filtrage étudiant par mot-clé (`?search=`), validation (`POST /:id/validate`), refus (`POST /:id/reject`), clôture (`POST /:id/mark-unavailable`), modification (`PATCH /:id`), correction de l'entreprise (`PATCH /:id/company`), upload de pièce jointe (`POST /:id/attachment`), création sans `priority_contact_id` (400).
- [x] Run le test et confirmer qu'il échoue.
- [x] Définir `OfferStatus` et `Offer` avec tous les champs du schéma.
- [x] Étendre le schéma SQL des offres avec les champs `submitted_by_student_id` (nullable), `created_by_company_id` (nullable) et `source_type` (`company` | `student`) afin de distinguer les propositions étudiantes des offres créées par entreprise sans complexifier le workflow de statuts.
- [x] Valider avec Zod : `company_id`, `priority_contact_id`, `contact_ids` (min 1), `description`, `remote_allowed`; si `remote_allowed` est true alors `remote_percentage` est requis. Valider le format du téléphone dans `ContactInputSchema` : si renseigné, doit correspondre à un format E.164 ou local acceptable (regex simple).
- [x] Ajouter le statut `refusee` à `OfferStatus`. Note : la spec liste quatre statuts minimaux et ne définit pas `refusee` explicitement, mais mentionne que le gestionnaire "valide ou refuse" une offre. Ce statut est une extension assumée qui couvre ce besoin réel. Une offre `refusee` reste visible à son auteur et à l'équipe pédagogique, mais jamais dans le catalogue étudiant.
- [x] Implémenter les queries : `insertOffer`, `linkOfferContacts` (table `offer_contacts`), `listOffers(scope, search?)` (filtre LIKE sur description, technologies, location si `search` est fourni, avec visibilité dépendante du rôle et de l'auteur), `findOfferById`, `updateOfferStatus` (écrit aussi dans `offer_status_history`), `updateOffer` (modifie les champs éditables d'une offre soumise), `updateOfferCompany` (change le `company_id`).
- [x] Exposer : `POST /api/offers`, `GET /api/offers` (scopé par rôle via `req.auth`, plus `?search=`), `GET /api/offers/:id`, `POST /api/offers/:id/validate`, `POST /api/offers/:id/reject`, `POST /api/offers/:id/mark-unavailable`, `PATCH /api/offers/:id` (modification des champs d'une offre), `PATCH /api/offers/:id/company` (corps `{ company_id }` pour corriger la référence), `POST /api/offers/:id/attachment` (upload multer, enregistre `attachment_path`).
- [x] Brancher dans `app.ts` sous `/api/offers`. L'endpoint d'upload utilise `upload.single('file')` depuis le middleware créé en début de cette tâche.
- [x] Protéger les routes offers avec les helpers de `authorization.middleware.ts` (créés en Task 4c) selon la matrice suivante :
  - `POST /api/offers` : `gestionnaire`, `entreprise`, `etudiant` — la spec couvre les propositions étudiantes avec le même formulaire
  - `GET /api/offers` : public pour les offres `validee_et_visible` ; `gestionnaire` et `lecteur` voient tout ; `etudiant` voit les offres visibles + ses propres propositions ; `entreprise` voit ses propres offres
  - `GET /api/offers/:id` : même règle que la liste
  - `POST /api/offers/:id/validate`, `POST /api/offers/:id/reject`, `POST /api/offers/:id/mark-unavailable`, `PATCH /api/offers/:id/company` : `gestionnaire` uniquement
  - `PATCH /api/offers/:id` : `gestionnaire` (tous), `entreprise` (ses propres offres), `etudiant` (ses propres propositions)
  - `POST /api/offers/:id/attachment` : `gestionnaire`, `entreprise` (propres offres), `etudiant` (propres propositions)
  - `lecteur` : lecture seule, 403 sur toute écriture
- [x] Ajouter dans `access-control.test.ts` : `etudiant` peut créer une offre (proposal) ; `lecteur` reçoit 403 sur POST /api/offers ; `entreprise` ne peut pas valider une offre.
- [x] Run: `cd backend && npm test -- --run tests/offers.test.ts` — tous les tests PASS.
- [x] Run: `cd backend && npm test` — aucune régression.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/offers.test.ts`
- Expected: création, listing, filtre, validation, clôture, modification, correction entreprise, upload passent

**Human observables:**
- `POST /api/offers` crée une offre avec statut `soumise`
- `GET /api/offers?search=react` retourne uniquement les offres mentionnant React
- `GET /api/offers` retourne des résultats différents selon le rôle connecté
- `POST /api/offers/:id/validate` → l'offre apparaît dans `GET /api/offers`
- `POST /api/offers/:id/reject` fait passer l'offre à l'état `refusee`
- `PATCH /api/offers/:id` modifie la description d'une offre soumise
- `PATCH /api/offers/:id/company` change l'entreprise rattachée
- `POST /api/offers/:id/attachment` enregistre un fichier dans `backend/uploads/`

---

### Task 8: Offers — Frontend

**Files:**
- Create: `frontend/src/components/status-badge.tsx`
- Create: `frontend/src/features/offers/offers.types.ts`
- Create: `frontend/src/features/offers/offers.api.ts`
- Create: `frontend/src/features/offers/offer-card.tsx`
- Create: `frontend/src/features/offers/offer-form.tsx`
- Create: `frontend/src/pages/offers.page.tsx`
- Create: `frontend/src/pages/offer-details.page.tsx`
- Create: `frontend/src/pages/admin-offers.page.tsx`
- Create: `frontend/src/pages/submit-offer.page.tsx`
- Create: `frontend/src/pages/student-proposal.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `frontend/src/components/app-layout.tsx`

- [x] Écrire `offers.types.ts` avec `OfferStatus` et `Offer` calqués sur la réponse backend.
- [x] Écrire `offers.api.ts` avec : `listVisibleOffers(search?)`, `listPedagogicalOffers(search?)`, `listMyStudentOffers()`, `listMyCompanyOffers()`, `getOffer(id)`, `validateOffer(id)`, `rejectOffer(id)`, `markUnavailable(id)`, `createOffer(input)`, `updateOffer(id, input)`.
- [x] Écrire `StatusBadge` : affiche un badge coloré par statut avec un label lisible en français.
- [x] Écrire `OfferCard` : affiche le début de la description, le badge de statut, et un lien vers la page détail.
- [x] Écrire `OffersPage` : liste les offres `validee_et_visible` avec `OfferCard` et un champ de recherche/filtre (par mot-clé dans la description, les technologies, ou le lieu) qui refait l'appel API.
- [x] Écrire `OfferDetailsPage` : charge l'offre par `id` (via `useParams`), affiche tous ses champs et le badge de statut. Si l'offre a une pièce jointe, afficher un lien de téléchargement.
- [x] Écrire `OfferForm` : formulaire partagé avec tous les champs de l'offre — description (obligatoire), lieu, technologies, objectifs, télétravail (checkbox + pourcentage conditionnel), remarques, et un champ d'upload de fichier optionnel (pièce jointe). Prend `companyId`, `contactId`, `initialValues?`, `onSubmit` et `submitLabel` en props.
- [x] Écrire `SubmitOfferPage` : page accessible au rôle entreprise. Récupère `company_id` et la liste des contacts depuis le contexte de rôle (`entityId`), affiche la liste des contacts pour en choisir un comme prioritaire, puis `OfferForm`. Si `offerId` est présent dans l'URL (route `/offers/:id/edit`), charge l'offre existante et prépopule le formulaire (`initialValues`).
- [x] Écrire `StudentProposalPage` : page accessible au rôle étudiant, en trois étapes. Étape 1 — recherche d'entreprise : champ de recherche appelant `listCompanies(search)` ; si l'entreprise est trouvée, l'étudiant la sélectionne et passe à l'étape 2. Étape 2 — sélection du contact : liste les contacts de l'entreprise choisie, l'étudiant en choisit un comme contact prioritaire. Étape 3 — formulaire de proposition : `OfferForm` avec `submitted_by_student_id = entityId` (contexte de rôle). Si l'entreprise n'est pas trouvée à l'étape 1, un bouton "Suggérer une nouvelle entreprise" ouvre un formulaire inline permettant de saisir le nom, l'email général, l'adresse et les informations d'un premier contact ; la soumission appelle `POST /api/companies` pour créer l'entreprise et son contact, puis passe directement à l'étape 3 avec l'entreprise nouvellement créée. Le gestionnaire verra cette entreprise dans la liste des entreprises récemment créées et pourra la corriger si nécessaire.
- [x] Écrire `AdminOffersPage` : liste toutes les offres avec badge de statut ; pour les offres `soumise`, affiche les boutons "Valider", "Refuser" et "Indisponible" ; pour chaque offre, affiche le nom de l'entreprise rattachée avec un bouton "Corriger l'entreprise" qui ouvre une recherche permettant de changer le `company_id` de l'offre (appel à `PATCH /api/offers/:id/company`) ; affiche un badge d'origine ("Étudiant" ou "Entreprise") basé sur `source_type` pour permettre à l'équipe pédagogique d'identifier rapidement la provenance de chaque offre.
- [x] Veiller à ce que les pages frontend n'affichent jamais de données hors périmètre du rôle courant : `lecteur` sans boutons d'action, `entreprise` sur ses seules offres, `etudiant` sur les offres publiées plus ses propres propositions.
- [x] Ajouter les routes `/offers`, `/offers/:id`, `/offers/new`, `/offers/:id/edit`, `/offers/proposal`, `/admin/offers` dans `app.tsx`.
- [x] Ajouter les liens correspondants dans `AppLayout` selon le rôle (Task 4b).
- [x] Run: `cd frontend && npm run build` — pas d'erreur TypeScript.
- [ ] Tester le cycle complet dans le navigateur : déposer une offre via `/offers/new`, valider via `/admin/offers`, filtrer dans `/offers`, modifier l'offre via `/offers/:id/edit`.
- [ ] Commit.

**Verification:**
- Run: `cd frontend && npm run build`

**Human observables:**
- `http://localhost:5173/offers` liste les offres publiées avec un champ de recherche fonctionnel
- Cliquer sur une offre ouvre la page détail avec tous les champs et un lien vers la pièce jointe si présente
- `http://localhost:5173/offers/new` (rôle entreprise) affiche les contacts de la société et le formulaire avec upload
- `http://localhost:5173/offers/:id/edit` prépopule le formulaire avec les valeurs existantes
- `http://localhost:5173/offers/proposal` (rôle étudiant) démarre par la recherche d'entreprise
- `http://localhost:5173/admin/offers` affiche un bouton "Corriger l'entreprise" sur chaque offre
- Cliquer "Valider" rafraîchit la liste et le badge passe à "Publiée"
- Cliquer "Refuser" passe le badge à "Refusée"

---

### Task 9: Applications And Candidate Selection — Backend

**Files:**
- Create: `backend/src/features/applications/applications.types.ts`
- Create: `backend/src/features/applications/applications.schemas.ts`
- Create: `backend/src/features/applications/applications.queries.ts`
- Create: `backend/src/features/applications/applications.service.ts`
- Create: `backend/src/features/applications/applications.routes.ts`
- Modify: `backend/src/app.ts`
- Create: `backend/tests/applications.test.ts`

- [x] Écrire les tests couvrant : création d'une candidature (201), doublon (409), listing des candidats côté entreprise et côté pédagogique, listing des candidatures d'un étudiant connecté, sélection d'un candidat (offre passe à `prise`).
- [x] Run le test et confirmer qu'il échoue.
- [x] Définir `Application` avec `id`, `offer_id`, `student_id`, `selected`, `created_at`.
- [x] Valider les payloads : `student_id` pour postuler, `application_id` pour sélectionner.
- [x] Implémenter `insertApplication` (catch `UNIQUE` constraint → 409), `listApplications(offerId)`, `findApplicationById`.
- [x] Implémenter `selectCandidate` : marque `selected = 1` sur la candidature, puis appelle `markOfferTaken` pour passer l'offre à `prise`.
- [x] Exposer : `POST /api/offers/:offerId/applications`, `GET /api/offers/:offerId/applications`, `POST /api/offers/:offerId/select-candidate`, `GET /api/students/:studentId/applications`.
- [x] Protéger les routes applications avec les helpers de Task 4c selon la matrice suivante :
  - `POST /api/offers/:offerId/applications` : `etudiant` uniquement — un étudiant postule pour lui-même (son `x-entity-id` est utilisé comme `student_id`, ignorant le corps si différent)
  - `GET /api/offers/:offerId/applications` : `gestionnaire`, `lecteur`, `entreprise` (uniquement ses propres offres via vérification que l'offre appartient à `x-entity-id`)
  - `POST /api/offers/:offerId/select-candidate` : `entreprise` (uniquement ses propres offres) — conforme à la spec
  - `GET /api/students/:studentId/applications` : `gestionnaire`, `lecteur`, `etudiant` (uniquement ses propres candidatures : 403 si `studentId` ≠ `x-entity-id`)
- [x] Ajouter dans `access-control.test.ts` : `entreprise` ne peut pas voir les candidatures d'une offre d'une autre entreprise (403) ; `etudiant` ne peut pas appeler `select-candidate` (403) ; `entreprise` peut retenir un candidat sur sa propre offre.
- [x] Brancher dans `app.ts` en utilisant `mergeParams: true` sur le router.
- [x] Run: `cd backend && npm test -- --run tests/applications.test.ts` — tous les tests PASS.
- [x] Run: `cd backend && npm test` — aucune régression.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test -- --run tests/applications.test.ts`
- Expected: création, doublon, listing, et sélection passent

**Human observables:**
- `POST /api/offers/:id/applications` avec `{"student_id":1}` retourne 201
- Même appel une deuxième fois retourne 409
- `GET /api/offers/:id/applications` liste les candidats
- `POST /api/offers/:id/select-candidate` avec `{"application_id":1}` passe l'offre à `prise`
- `GET /api/students/:id/applications` liste uniquement les candidatures de l'étudiant connecté ou, pour les rôles pédagogiques, celles de l'étudiant demandé

---

### Task 10: Applications — Frontend

**Files:**
- Create: `frontend/src/features/applications/applications.api.ts`
- Create: `frontend/src/pages/company-dashboard.page.tsx`
- Create: `frontend/src/pages/student-applications.page.tsx`
- Modify: `frontend/src/pages/offer-details.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `frontend/src/components/app-layout.tsx`

- [x] Écrire `applications.api.ts` avec : `applyToOffer(offerId, studentId)`, `listApplications(offerId)`, `listStudentApplications(studentId)`, `selectCandidate(offerId, applicationId)`.
- [x] Modifier `OfferDetailsPage` : ajouter un bouton "Postuler" visible uniquement sur les offres `validee_et_visible` et uniquement pour le rôle `etudiant`; utiliser `entityId` du contexte de rôle comme `student_id`; afficher confirmation ou erreur.
- [x] Écrire `CompanyDashboardPage` : affiche le profil de l'entreprise (nom, email général, adresse) ; permet de modifier ce profil via `PATCH /api/companies/:id` ; liste ses contacts (nom, email, rôles) avec formulaire d'ajout de contact depuis l'espace entreprise ; liste ses offres avec statut ; pour chaque offre, affiche les candidats avec leur nom et un bouton "Retenir" sur les offres `validee_et_visible`. Toutes les données proviennent d'endpoints déjà filtrés côté backend selon `entityId`.
- [x] Écrire `StudentApplicationsPage` : affiche les candidatures de l'étudiant connecté et ses propositions de stage avec leur statut (`soumise`, `validee_et_visible`, `refusee`, `prise`, `non_disponible`).
- [x] Ajouter la route `/company/dashboard` dans `app.tsx`.
- [x] Ajouter la route `/student/applications` dans `app.tsx`.
- [x] Ajouter le lien "Espace entreprise" dans `AppLayout` (visible uniquement pour le rôle entreprise).
- [x] Ajouter le lien "Mes candidatures" dans `AppLayout` (visible uniquement pour le rôle étudiant).
- [x] Run: `cd frontend && npm run build` — pas d'erreur.
- [ ] Tester le cycle complet : postuler en tant qu'étudiant, voir la candidature dans le dashboard entreprise, retenir le candidat.
- [ ] Commit.

**Verification:**
- Run: `cd frontend && npm run build`

**Human observables:**
- `http://localhost:5173/offers/:id` affiche un bouton "Postuler" uniquement pour le rôle étudiant
- Cliquer "Postuler" utilise l'identité de l'étudiant connecté (pas un id hardcodé)
- `http://localhost:5173/company/dashboard` affiche le profil modifiable de l'entreprise, ses contacts, ses offres et ses candidats
- `http://localhost:5173/student/applications` affiche les candidatures et propositions de l'étudiant connecté
- Cliquer "Retenir" passe l'offre au statut "Pourvue"

---

### Task 10b: Pedagogical Dashboards And Global Search

La spec demande un tableau de bord gestionnaire orienté supervision, ainsi que des vues de consultation pour le rôle lecteur. Cette tâche reste volontairement légère et se limite aux vues utiles à la V1.

**Files:**
- Modify: `frontend/src/pages/home.page.tsx`
- Create: `frontend/src/pages/admin-applications.page.tsx`
- Modify: `frontend/src/app/app.tsx`
- Modify: `frontend/src/components/app-layout.tsx`
- Modify: `frontend/src/features/offers/offers.api.ts`
- Modify: `frontend/src/features/companies/companies.api.ts`

- [x] Modifier `HomePage` pour qu'elle devienne conditionnelle au rôle :
  - `gestionnaire` : dashboard avec offres `soumise`, entreprises récemment créées, entreprises à risque de doublon, lien vers import CSV, lien vers les offres à clôturer
  - `lecteur` : dashboard de consultation avec accès rapide aux entreprises, offres, étudiants, candidatures
  - autres rôles : page d'accueil simple orientée navigation
- [x] Ajouter une recherche globale V1 légère sur le dashboard gestionnaire : un champ unique qui lance simultanément une recherche d'entreprises et d'offres et affiche les résultats regroupés. La recherche globale V1 est explicitement limitée à ces deux objets.
- [x] Écrire `AdminApplicationsPage` : vue de consultation des candidatures pour `gestionnaire` et `lecteur`, avec regroupement par offre et affichage du nom étudiant, du statut de sélection et de l'entreprise.
- [x] Ajouter la route `/admin/applications` dans `app.tsx`.
- [x] Ajouter les liens "Candidatures" et, pour `gestionnaire`, les raccourcis dashboard dans `AppLayout`.
- [x] Run: `cd frontend && npm run build` — pas d'erreur.
- [ ] Vérifier dans le navigateur : le dashboard gestionnaire montre bien les zones attendues ; le lecteur n'a aucun bouton d'action d'écriture.
- [ ] Commit.

**Verification:**
- Run: `cd frontend && npm run build`

**Human observables:**
- `http://localhost:5173/` affiche un dashboard différent selon le rôle
- Le gestionnaire voit immédiatement les offres en attente, les doublons probables et le lien d'import CSV
- Le lecteur peut consulter les candidatures sans voir de bouton d'action
- La recherche globale V1 retrouve à la fois des entreprises et des offres

---

### Task 11: Error Handling And Upload Plumbing

**Files:**
- Create: `backend/src/middlewares/error.middleware.ts`
- Create: `backend/src/middlewares/not-found.middleware.ts`
- Create: `backend/src/middlewares/upload.middleware.ts`
- Modify: `backend/src/app.ts`
- Modify: `backend/package.json`

- [ ] Écrire `not-found.middleware.ts` : handler Express qui retourne `{"error":"Route non trouvée"}` en 404.
- [ ] Écrire `error.middleware.ts` : handler d'erreur Express (4 paramètres) qui retourne `{"error": message}` en 500 et logue l'erreur.
- [ ] Brancher les deux middlewares dans `app.ts` **après** toutes les routes existantes. (Le middleware `upload` a déjà été créé en Task 7.)
- [ ] Run: `cd backend && npm test` — tous les tests passent encore.
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test`
- Expected: all tests still pass after middleware registration

**Human observables:**
- `curl http://localhost:3000/api/nope` retourne `{"error":"Route non trouvée"}` (JSON, pas HTML)
- Le dossier `backend/uploads/` est créé au démarrage
- Une requête avec body JSON invalide retourne un 400 lisible

---

### Task 12: Final Integration, Docs, And Manual Validation

**Files:**
- Modify: `README.md`
- Modify: specs si une clarification s'avère nécessaire

- [ ] Compléter le `README.md` : prérequis, commandes de lancement backend + frontend, localisation du fichier SQLite, convention de stockage des pièces jointes.
- [ ] Run: `cd backend && npm test` — tous les tests passent.
- [ ] Run: `cd frontend && npm run build` — build propre.
- [ ] Smoke test manuel complet (voir ci-dessous).
- [ ] Commit.

**Verification:**
- Run: `cd backend && npm test`
- Run: `cd frontend && npm run build`

**Human observables:**
- Tous les scénarios ci-dessous fonctionnent sans redémarrer les serveurs
- Le README permet de lancer l'app depuis zéro sur une machine fraîche
- Manual checks :
  - créer une entreprise avec contact → apparaît dans `/companies`
  - importer un CSV d'étudiants → `GET /api/students` les liste
  - déposer une offre → statut `soumise` visible dans admin
  - valider l'offre → apparaît dans `/offers`
  - consulter l'annuaire entreprises sans offre publiée
  - postuler à une offre depuis `/offers/:id` → confirmé dans dashboard entreprise
  - entreprise retient un candidat → offre passe à `prise`
  - gestionnaire ferme une offre comme `non_disponible`

---

## Self-Review

- Spec coverage :
  - Annuaire entreprises : lecture, création, ajout de contacts, vue doublons admin ✓
  - Import et listing étudiants ✓
  - Offres : création, modification, pièce jointe, filtre/recherche étudiant, workflow de statuts, refus, correction de référence entreprise ✓
  - Candidatures, sélection candidat, clôture gestionnaire, vue étudiant, vue pédagogique ✓
  - Espace entreprise : profil éditable, contacts, offres, candidatures ✓
  - Proposition étudiant avec recherche d'entreprise ✓
  - Sélection de rôle sans mot de passe (gestionnaire, lecteur, étudiant, entreprise) ✓
  - Contrôle d'accès backend aligné sur les rôles de la spec ✓
  - Dashboard gestionnaire, consultation lecteur et recherche globale V1 ✓
  - Validation téléphone ✓
- Chaque tâche backend est immédiatement suivie du frontend correspondant
- Le formulaire d'offre est partagé entre dépôt entreprise, proposition étudiant et modification
- La stack reste conforme à la conception technique validée
- Aucun bloc de code dans le plan
- Scope : aucune fonctionnalité V2 (SSO, conventions, évaluation) n'est introduite
