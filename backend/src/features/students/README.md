# Students - Backend

## Endpoints

* `GET /api/students` : liste les étudiants.
* `POST /api/students/import` : importe une liste d'étudiants éligibles pour
  une année académique.
* `GET /api/students/:studentId/applications` : liste les candidatures d'un
  étudiant.

## Modèle de domaine

Un étudiant contient :

* `matricule`, optionnel ;
* `first_name` ;
* `last_name` ;
* `email` ;
* `date_naissance`, optionnelle.

Cette feature ne gère pas de statuts. Elle est propriétaire de l'éligibilité
annuelle des étudiants.

## Règles métier

* L'import reçoit `{ academic_year, students }`. L'année respecte le format
  `AAAA-AAAA` et ses deux années sont consécutives.
* L'import fait un upsert basé sur l'email et rattache chaque étudiant à
  l'année demandée dans la même transaction.
* Un étudiant peut être éligible pendant plusieurs années.
* Le réimport est additif et idempotent : il ne duplique pas une association
  existante et ne retire jamais une association absente du nouveau fichier.
* L'année académique commence le 15 septembre et se termine le 14 septembre
  suivant. Le calcul et la validation partagés appartiennent à
  `backend/src/lib/academic-year.ts`.
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
* `student_academic_year_eligibility` : associations étudiant/année créées par
  l'import annuel.
* `applications` : consultée via la feature `applications` pour lister les
  candidatures d'un étudiant.

Points d'attention :

* L'import utilise une transaction couvrant l'upsert des étudiants et toutes
  les associations annuelles. Il retourne le nombre de lignes reçues et
  l'année académique concernée.
* `ON CONFLICT(email)` met à jour les champs d'un étudiant existant.
* `ON CONFLICT(student_id, academic_year) DO NOTHING` rend le rattachement
  annuel rejouable sans doublon.

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
* `backend/tests/academic-year.test.ts`
* `backend/tests/db.test.ts`
* `backend/tests/applications.test.ts`

Scénarios importants :

* Import d'une liste non vide et association vérifiée directement en base.
* Rejet d'un email invalide.
* Rejet d'une année mal formée ou non consécutive.
* Upsert idempotent par email et rattachement annuel sans doublon ni retrait.
* Éligibilité d'un étudiant sur plusieurs années et rollback de toute la
  transaction si une ligne échoue.
* Bascule de l'année académique entre les 14 et 15 septembre.
* Tri de la liste des étudiants.
* Contrôle d'accès HTTP de chaque rôle sur l'import et les candidatures d'un
  étudiant.

## Documents liés

* Carte des features : `docs/current/features.md`
* Modèle de données : `docs/current/data-model.md`
