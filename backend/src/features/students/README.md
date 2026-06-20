# Students

## Rôle

Gérer le référentiel des étudiants et l'import initial.

## Responsabilités principales

* Importer une liste d'étudiants.
* Mettre à jour un étudiant existant par email lors d'un nouvel import.
* Lister les étudiants.
* Exposer les candidatures d'un étudiant avec contrôle d'accès.

## Règles métier locales

Règles portées principalement par cette feature.

* Un étudiant contient prénom, nom, email, matricule optionnel et date de
  naissance optionnelle.
* L'email est obligatoire et unique.
* Le matricule est optionnel dans l'import, mais unique s'il est présent.
* Seul un `gestionnaire` peut importer des étudiants.
* Un `etudiant` ne peut consulter que ses propres candidatures.

## États ou statuts

Cette feature ne gère pas de statuts.

* Non applicable.

## Interfaces exposées

API backend :

* `GET /api/students` : lister les étudiants.
* `POST /api/students/import` : importer des étudiants.
* `GET /api/students/:studentId/applications` : lister les candidatures d'un
  étudiant.

Écrans ou routes frontend :

* `/admin/students` : liste des étudiants.
* `/admin/students/import` : import des étudiants.
* `/student/applications` : consultation des candidatures côté étudiant.
* `/select-role` : sélection d'un étudiant pour le rôle courant.

Composants ou fonctions réutilisables :

* `frontend/src/features/students/students.api.ts`
* `frontend/src/features/students/students.types.ts`

## Dépendances

Features liées :

* `applications` : lister les candidatures d'un étudiant.

Services externes :

* Aucun identifié.

Librairies ou modules partagés :

* `authorization.middleware.ts`
* Table `students`.

## Fichiers principaux

* `students.routes.ts` : routes de liste, import et consultation des
  candidatures d'un étudiant.
* `students.service.ts` : façade vers l'import et la liste.
* `students.queries.ts` : upsert et lecture des étudiants.
* `students.schemas.ts` : validation des lignes d'import.
* `students.types.ts` : types `Student` et `StudentInput`.

## Validations et permissions

Validations :

* `StudentsImportSchema` exige une liste non vide.
* Chaque ligne exige `first_name`, `last_name` et `email`.
* `matricule` et `date_naissance` sont optionnels.
* L'import est un upsert basé sur l'email.

Permissions ou rôles :

* `GET /api/students` est public.
* `POST /api/students/import` est réservé à `gestionnaire`.
* `GET /api/students/:studentId/applications` est accessible à
  `gestionnaire`, `lecteur` et à l'`etudiant` concerné.

## Tests de référence

Fichiers de tests :

* `backend/tests/students-import.test.ts`
* `backend/tests/applications.test.ts`

Scénarios importants :

* Import d'une liste non vide.
* Rejet d'un email invalide.
* Upsert idempotent par email.
* Tri de la liste des étudiants.
* Contrôle d'accès sur l'import et les candidatures d'un étudiant.

## Limites connues

* La route de liste des étudiants est publique pour l'écran de sélection de
  rôle.
* Le format exact du CSV n'est pas géré ici: cette feature reçoit déjà des
  lignes structurées.

## Documents liés

* Specs : `docs/specs/2026-05-15-gestion-stages-v1-design.md`,
  `docs/specs/2026-05-15-gestion-stages-v1-technical-design.md`
* Reviews : `docs/reviews/2026-06-18-documentation-restructure.md`,
  `docs/reviews/2026-06-18-architecture-bird-eye-refactor.md`
