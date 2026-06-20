# Companies

## Rôle

Gérer le référentiel des entreprises et leurs contacts.

## Responsabilités principales

* Lister et rechercher les entreprises.
* Consulter une entreprise avec ses contacts.
* Créer une entreprise avec au moins un contact.
* Ajouter des contacts à une entreprise.
* Modifier les informations principales d'une entreprise.
* Signaler les risques de doublon simples.

## Règles métier locales

Règles portées principalement par cette feature.

* Une entreprise contient un nom, une adresse optionnelle et un email général.
* La création d'entreprise exige au moins un contact.
* Un contact contient prénom, nom, email, téléphone optionnel et rôles.
* Un contact porte au moins un rôle.
* Un `gestionnaire` peut modifier les entreprises.
* Une `entreprise` ne peut modifier que sa propre fiche.

## États ou statuts

Cette feature ne gère pas de statuts.

* Non applicable.

## Interfaces exposées

API backend :

* `GET /api/companies` : lister ou rechercher les entreprises.
* `GET /api/companies?duplicate_risk=true` : lister les entreprises avec risque
  de doublon.
* `GET /api/companies/:id` : consulter une entreprise avec ses contacts.
* `POST /api/companies` : créer une entreprise.
* `PATCH /api/companies/:id` : modifier les informations principales.
* `POST /api/companies/:id/contacts` : ajouter un contact.

Écrans ou routes frontend :

* `/companies` : répertoire des entreprises.
* `/admin/companies/new` : création d'entreprise.
* `/admin/companies/:id` : détail entreprise et contacts.
* `/company/dashboard` : profil entreprise et contacts côté entreprise.
* `/select-role` : sélection d'une entreprise pour le rôle courant.

Composants ou fonctions réutilisables :

* `frontend/src/features/companies/companies.api.ts`
* `frontend/src/features/companies/companies.types.ts`

## Dépendances

Features liées :

* `offers` : rattachement des offres aux entreprises et contacts.

Services externes :

* Aucun identifié.

Librairies ou modules partagés :

* `authorization.middleware.ts`
* Tables `companies` et `company_contacts`.

## Fichiers principaux

* `companies.routes.ts` : routes de consultation, création, mise à jour et ajout
  de contacts.
* `companies.service.ts` : création transactionnelle entreprise + contacts et
  recherche de doublons probables.
* `companies.queries.ts` : SQL des entreprises et contacts.
* `companies.schemas.ts` : validation des entreprises et contacts.
* `companies.types.ts` : types `Company`, `CompanyContact` et entrées associées.

## Validations et permissions

Validations :

* `CompanyInputSchema` exige `name`, `general_email` et au moins un contact.
* `ContactInputSchema` exige `first_name`, `last_name`, `email` et au moins un
  rôle.
* Rôles de contact connus : `maitre_de_stage`,
  `responsable_administratif`, `encadrant_technique`.
* Les rôles de contacts sont stockés en JSON texte dans SQLite.

Permissions ou rôles :

* `GET /api/companies` est public.
* `GET /api/companies/:id` requiert un rôle authentifié; `entreprise` est
  limitée à sa propre entreprise.
* `POST /api/companies` est ouvert à `gestionnaire`, `etudiant` et
  `entreprise`.
* `PATCH /api/companies/:id` et `POST /api/companies/:id/contacts` sont ouverts
  à `gestionnaire` et à l'`entreprise` propriétaire.

## Tests de référence

Fichiers de tests :

* `backend/tests/companies.test.ts`
* `backend/tests/access-control.test.ts`
* `frontend/src/pages/companies.test.tsx`

Scénarios importants :

* Recherche d'entreprises.
* Création avec au moins un contact.
* Détection de doublons probables.
* Contrôles d'accès par rôle et propriété entreprise.

## Limites connues

* La détection de doublons est approximative : elle compare le premier mot
  significatif du nom.
* La route de liste est publique pour alimenter la sélection de rôle et le
  référentiel étudiant.

## Documents liés

* Specs : `docs/specs/2026-05-15-gestion-stages-v1-design.md`,
  `docs/specs/2026-05-15-gestion-stages-v1-technical-design.md`
* Reviews : `docs/reviews/2026-06-18-documentation-restructure.md`,
  `docs/reviews/2026-06-18-architecture-bird-eye-refactor.md`
