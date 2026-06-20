# Students - Backend

## Endpoints

* `GET /api/students` : liste les étudiants.
* `POST /api/students/import` : importe une liste d'étudiants.
* `GET /api/students/:studentId/applications` : liste les candidatures d'un
  étudiant.

## Modèle de domaine

Un étudiant contient :

* `matricule`, optionnel ;
* `first_name` ;
* `last_name` ;
* `email` ;
* `date_naissance`, optionnelle.

Cette feature ne gère pas de statuts.

## Règles métier

* L'import reçoit une liste structurée d'étudiants.
* L'import fait un upsert basé sur l'email.
* L'email est obligatoire et unique.
* Le matricule est optionnel, mais unique s'il est renseigné.
* Un étudiant ne peut consulter que ses propres candidatures.

## Accès données

Tables utilisées :

* `students` : import, upsert, liste et recherche par identifiant.
* `applications` : consultée via la feature `applications` pour lister les
  candidatures d'un étudiant.

Points d'attention :

* L'import utilise une transaction et retourne le nombre de lignes reçues.
* `ON CONFLICT(email)` met à jour les champs d'un étudiant existant.

Voir aussi : `docs/data-model.md`.

## Permissions

* `GET /api/students` : public.
* `POST /api/students/import` : `gestionnaire`.
* `GET /api/students/:studentId/applications` : `gestionnaire`, `lecteur` ou
  étudiant concerné.

## Tests back

Fichiers de tests :

* `backend/tests/students-import.test.ts`
* `backend/tests/applications.test.ts`

Scénarios importants :

* Import d'une liste non vide.
* Rejet d'un email invalide.
* Upsert idempotent par email.
* Tri de la liste des étudiants.
* Contrôle d'accès sur l'import et les candidatures d'un étudiant.

## Documents liés

* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
