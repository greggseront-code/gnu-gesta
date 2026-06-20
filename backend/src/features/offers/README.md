# Offers

## Rôle

Gérer les offres de stage, les propositions étudiantes et leur cycle de
publication.

## Responsabilités principales

* Créer une offre pour une entreprise ou une proposition pour un étudiant.
* Filtrer les offres visibles selon le rôle.
* Valider, refuser ou rendre une offre non disponible.
* Modifier les champs descriptifs d'une offre.
* Rattacher une pièce jointe.
* Permettre au gestionnaire de corriger l'entreprise rattachée.

## Règles métier locales

Règles portées principalement par cette feature.

* Une offre est rattachée à une entreprise.
* Une offre a un contact prioritaire et une liste de contacts.
* Une offre contient description, lieu, technologies, objectifs, télétravail,
  remarques et pièce jointe optionnelle.
* Les étudiants voient les offres `validee_et_visible`, leurs propositions et
  les offres auxquelles ils ont postulé si elles ne sont pas `non_disponible`.
* Les entreprises voient leurs propres offres.
* Les gestionnaires et lecteurs voient toutes les offres.
* Seul un `gestionnaire` valide, refuse ou marque une offre non disponible.

## États ou statuts

Lister les statuts gérés ou modifiés par cette feature.

* `soumise` : statut initial.
* `validee_et_visible` : offre approuvée et visible.
* `prise` : offre attribuée à un candidat.
* `non_disponible` : offre fermée sans nouvelle candidature.
* `refusee` : statut implémenté, mais à confirmer comme statut produit stable.

Les changements de statut sont historisés dans `offer_status_history`.

## Interfaces exposées

API backend :

* `GET /api/offers` : lister les offres visibles selon le rôle.
* `POST /api/offers` : créer une offre.
* `GET /api/offers/:id` : consulter une offre selon les droits.
* `POST /api/offers/:id/validate` : valider une offre.
* `POST /api/offers/:id/reject` : refuser une offre.
* `POST /api/offers/:id/mark-unavailable` : rendre une offre indisponible.
* `PATCH /api/offers/:id` : modifier une offre.
* `PATCH /api/offers/:id/company` : changer l'entreprise rattachée.
* `POST /api/offers/:id/attachment` : rattacher une pièce jointe.

Écrans ou routes frontend :

* `/offers` : liste des offres.
* `/offers/new` : dépôt d'une offre.
* `/offers/proposal` : proposition de stage étudiante.
* `/offers/:id` : détail d'une offre.
* `/offers/:id/edit` : modification d'une offre.
* `/admin/offers` : administration des offres.
* `/company/dashboard` : offres de l'entreprise.

Composants ou fonctions réutilisables :

* `frontend/src/features/offers/offers.api.ts`
* `frontend/src/features/offers/offers.types.ts`
* `frontend/src/features/offers/offer-card.tsx`
* `frontend/src/features/offers/offer-form.tsx`
* `frontend/src/components/status-badge.tsx`

## Dépendances

Features liées :

* `applications` : accès étudiant aux offres déjà candidatées.
* `companies` : rattachement entreprise et contacts.

Services externes :

* Aucun identifié.

Librairies ou modules partagés :

* `upload.middleware.ts`
* `authorization.middleware.ts`
* Tables `offers`, `offer_contacts`, `applications` et
  `offer_status_history`.

## Fichiers principaux

* `offers.routes.ts` : routes de liste, détail, création, validation, refus,
  clôture, modification, changement d'entreprise et pièce jointe.
* `offers.service.ts` : orchestration de création, consultation et changement de
  statut.
* `offers.queries.ts` : SQL des offres, contacts rattachés et transitions de
  statut.
* `offers.schemas.ts` : validation des offres et patchs.
* `offers.types.ts` : types `Offer`, `OfferInput`, statuts et origine.

## Validations et permissions

Validations :

* `OfferInputSchema` exige `company_id`, `priority_contact_id`, au moins un
  `contact_id`, `description` et `remote_allowed`.
* Si `remote_allowed` vaut `true`, `remote_percentage` est requis.
* `remote_percentage` doit être un entier entre 0 et 100.
* `PatchOfferCompanySchema` exige un `company_id` entier positif.

Permissions ou rôles :

* `gestionnaire`, `etudiant` et `entreprise` peuvent créer une offre selon le
  contexte.
* `gestionnaire` seul peut valider, refuser, rendre indisponible ou changer
  l'entreprise rattachée.
* `gestionnaire`, `entreprise` propriétaire et `etudiant` auteur peuvent
  modifier une offre.
* La visibilité des offres dépend du rôle et du statut.

## Tests de référence

Fichiers de tests :

* `backend/tests/offers.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Création d'une offre avec statut `soumise`.
* Validation, refus et passage à `non_disponible`.
* Filtrage par rôle et recherche.
* Modification, changement d'entreprise et upload de pièce jointe.
* Rejet des fichiers non autorisés.

## Limites connues

* Le statut `refusee` doit être confirmé fonctionnellement.
* La création ne vérifie pas explicitement dans cette feature que les contacts
  appartiennent à l'entreprise cible.
* Les pièces jointes sont stockées sous forme de chemin; leur cycle de vie reste
  minimal.

## Documents liés

* Specs : `docs/specs/2026-05-15-gestion-stages-v1-design.md`,
  `docs/specs/2026-05-15-gestion-stages-v1-technical-design.md`
* Reviews : `docs/reviews/2026-06-18-documentation-restructure.md`,
  `docs/reviews/2026-06-18-architecture-bird-eye-refactor.md`
