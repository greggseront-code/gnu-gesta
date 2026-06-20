# Applications

## Rôle

Gérer les candidatures des étudiants sur les offres et la sélection d'un
candidat par une entreprise.

## Responsabilités principales

* Créer une candidature pour une offre visible.
* Lister les candidatures d'une offre.
* Lister les candidatures d'un étudiant.
* Empêcher les candidatures dupliquées.
* Sélectionner une candidature pour une offre.
* Passer l'offre à `prise` lors de la sélection.

## Règles métier locales

Règles portées principalement par cette feature.

* Seul un `etudiant` peut créer une candidature.
* Une candidature n'est acceptée que si l'offre est `validee_et_visible`.
* Une entreprise ne peut consulter ou sélectionner que sur ses propres offres.
* Une candidature doit appartenir à l'offre cible avant sélection.
* Une offre déjà `prise` ne peut pas recevoir une nouvelle sélection.
* Le couple offre/étudiant est unique.

## États ou statuts

Cette feature ne possède pas de statut propre. Elle modifie le statut d'offre
vers `prise` lors de la sélection d'un candidat.

* `prise` : statut appliqué à l'offre après sélection.

## Interfaces exposées

API backend :

* `POST /api/offers/:offerId/applications` : créer une candidature.
* `GET /api/offers/:offerId/applications` : lister les candidatures d'une offre.
* `POST /api/offers/:offerId/select-candidate` : sélectionner une candidature.
* `GET /api/students/:studentId/applications` : route exposée par `students`,
  mais alimentée par cette feature.

Écrans ou routes frontend :

* `/student/applications` : candidatures et propositions de l'étudiant.
* `/admin/applications` : vue pédagogique des candidatures.
* `/company/dashboard` : consultation et sélection des candidatures reçues.

Composants ou fonctions réutilisables :

* `frontend/src/features/applications/applications.api.ts`

## Dépendances

Features liées :

* `offers` : vérification de l'offre, de son statut et de son entreprise
  propriétaire.
* `students` : consultation des candidatures d'un étudiant.

Services externes :

* Aucun identifié.

Librairies ou modules partagés :

* `authorization.middleware.ts`
* Tables `applications`, `offers` et `offer_status_history`.

## Fichiers principaux

* `applications.routes.ts` : routes de candidature et de sélection.
* `applications.service.ts` : façade métier vers les requêtes SQL.
* `applications.queries.ts` : insertion, consultation et sélection
  transactionnelle.
* `applications.schemas.ts` : validation du payload de sélection.
* `applications.types.ts` : type `Application`.

## Validations et permissions

Validations :

* `SelectCandidateSchema` exige un `application_id` entier positif.
* La création s'appuie sur `req.auth.entityId` comme identifiant étudiant.
* La contrainte unique SQL évite les doublons offre/étudiant.

Permissions ou rôles :

* `etudiant` : création d'une candidature.
* `gestionnaire`, `lecteur`, `entreprise` : lecture des candidatures d'une offre.
* `entreprise` : sélection d'une candidature sur ses propres offres.

## Tests de référence

Fichiers de tests :

* `backend/tests/applications.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Candidature uniquement sur offre validée et visible.
* Rejet des candidatures dupliquées.
* Contrôle d'accès entreprise sur ses propres offres.
* Blocage IDOR lors de la sélection d'une candidature d'une autre offre.
* Passage à `prise` et rejet d'une double sélection.

## Limites connues

* Les réponses ne joignent pas les détails enrichis de l'étudiant candidat.
* La sélection historise le changement de statut, mais le champ `changed_by`
  n'est pas renseigné.

## Documents liés

* Specs : `docs/specs/2026-05-15-gestion-stages-v1-design.md`,
  `docs/specs/2026-05-15-gestion-stages-v1-technical-design.md`
* Reviews : `docs/reviews/2026-06-18-documentation-restructure.md`,
  `docs/reviews/2026-06-18-architecture-bird-eye-refactor.md`
