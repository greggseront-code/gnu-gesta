# Students - Backend

## Endpoints

* `GET /api/students` : liste les étudiants.
* `POST /api/students/import` : importe une liste d'étudiants avec son année
  académique d'éligibilité.
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

* L'import reçoit `{ academic_year, students }` ; l'année est explicite et les
  deux années civiles doivent être consécutives.
* L'import fait un upsert basé sur l'email.
* Il ajoute l'éligibilité annuelle sans retirer les étudiants absents d'un
  réimport. Un étudiant peut être éligible plusieurs années.
* L'email est obligatoire et unique, insensible à la casse
  (`idx_students_email_nocase`) : c'est la clé de liaison avec une session
  Microsoft étudiante (voir `backend/src/features/auth/README.md`).
  `ON CONFLICT(email)` (upsert d'import) cible la contrainte historique
  sensible à la casse ; un ré-import avec une casse différente de celle déjà
  en base créerait donc un conflit sur l'index insensible à la casse plutôt
  qu'une mise à jour — accepté en V1 car un import réel réutilise toujours
  la casse de l'annuaire source (voir `students.queries.ts`).
* Le matricule est optionnel, mais unique s'il est renseigné.
* Un étudiant ne peut consulter que ses propres candidatures.

## Accès données

Tables utilisées :

* `students` : import, upsert, liste et recherche par identifiant.
* `student_academic_year_eligibility` : années d'éligibilité importées.
* `applications` : consultée via la feature `applications` pour lister les
  candidatures d'un étudiant.

Points d'attention :

* L'import utilise une transaction et retourne le nombre de lignes reçues.
* `ON CONFLICT(email)` met à jour les champs d'un étudiant existant.

Voir aussi : `docs/current/data-model.md`.

## Permissions

* `GET /api/students` : `gestionnaire`, `lecteur` ou `entreprise` (session
  authentifiée requise ; pas `etudiant`). Utilisé comme référentiel par
  admin candidatures et l'espace entreprise, en plus de l'écran Étudiants.
* `POST /api/students/import` : `gestionnaire`.
* `GET /api/students/:studentId/applications` : `gestionnaire`, `lecteur` ou
  étudiant concerné.

Un compte étudiant Microsoft authentifié mais sans fiche correspondante
(`userPrincipalName`/`mail`) reçoit `student_not_imported` (voir
`backend/src/features/auth/README.md`) : aucune fiche n'est créée
automatiquement, et l'accès aux routes métier reste bloqué (`403`) jusqu'à
un import gestionnaire.

## Tests back

Fichiers de tests :

* `backend/tests/students-import.test.ts`
* `backend/tests/applications.test.ts`

Scénarios importants :

* Import d'une liste non vide avec année académique.
* Rejet d'un email invalide.
* Upsert idempotent par email.
* Tri de la liste des étudiants.
* Contrôle d'accès sur l'import et les candidatures d'un étudiant.

## Documents liés

* Carte des features : `docs/current/features.md`
* Modèle de données : `docs/current/data-model.md`
