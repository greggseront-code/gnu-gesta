# Offers - Backend

## Endpoints

* `GET /api/offers` : liste les offres visibles selon le rôle courant.
* `POST /api/offers` : crée une offre ou une proposition étudiante.
* `GET /api/offers/:id` : lit une offre selon les droits.
* `POST /api/offers/:id/validate` : valide une offre.
* `POST /api/offers/:id/reject` : refuse une offre.
* `POST /api/offers/:id/mark-unavailable` : rend une offre indisponible.
* `PATCH /api/offers/:id` : modifie les champs descriptifs d'une offre.
* `PATCH /api/offers/:id/company` : change l'entreprise rattachée.
* `POST /api/offers/:id/attachment` : rattache une pièce jointe.

## Modèle de domaine

Une offre est rattachée à une entreprise et à des contacts.

Champs structurants :

* `company_id`
* `priority_contact_id`
* `description`
* `location`
* `technologies`
* `objectives`
* `remote_allowed`
* `remote_percentage`
* `attachment_path`
* `status`
* `submitted_by_student_id`
* `created_by_company_id`
* `source_type`

Statuts connus :

* `soumise`
* `validee_et_visible`
* `prise`
* `non_disponible`
* `refusee`

Le statut `refusee` existe dans le code et le schéma SQL, mais reste à confirmer
comme statut produit officiel.

## Règles métier

* Les offres sont filtrées selon le rôle courant.
* Les étudiants voient les offres `validee_et_visible`, leurs propositions et
  les offres auxquelles ils ont postulé si elles ne sont pas `non_disponible`.
* Les entreprises voient leurs propres offres.
* Les gestionnaires et lecteurs voient toutes les offres.
* Seul un `gestionnaire` valide, refuse, rend indisponible ou change
  l'entreprise rattachée.
* `remote_percentage` est requis quand `remote_allowed` vaut `true`.
* Les changements de statut sont historisés.

## Accès données

Tables utilisées :

* `offers` : création, lecture, recherche, modification, statut et pièce jointe.
* `offer_contacts` : rattachement des contacts à une offre.
* `applications` : utilisée pour la visibilité étudiant après candidature.
* `offer_status_history` : historique des changements de statut.

Points d'attention :

* La création rattache les contacts via `linkOfferContacts`.
* Les changements de statut insèrent une ligne dans `offer_status_history`.
* La pièce jointe est stockée comme chemin dans `offers.attachment_path`.

Voir aussi : `docs/data-model.md`.

## Permissions

* `GET /api/offers` et `GET /api/offers/:id` : visibilité calculée selon rôle,
  statut, auteur et candidatures.
* `POST /api/offers` : `gestionnaire`, `etudiant`, `entreprise`.
* `POST /api/offers/:id/validate` : `gestionnaire`.
* `POST /api/offers/:id/reject` : `gestionnaire`.
* `POST /api/offers/:id/mark-unavailable` : `gestionnaire`.
* `PATCH /api/offers/:id` : `gestionnaire`, entreprise propriétaire ou étudiant
  auteur.
* `PATCH /api/offers/:id/company` : `gestionnaire`.
* `POST /api/offers/:id/attachment` : `gestionnaire`, entreprise propriétaire
  ou étudiant auteur.

## Tests back

Fichiers de tests :

* `backend/tests/offers.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Création d'une offre avec statut `soumise`.
* Validation, refus et passage à `non_disponible`.
* Filtrage par rôle et recherche.
* Modification, changement d'entreprise et upload de pièce jointe.
* Rejet des fichiers non autorisés.

## Documents liés

* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
