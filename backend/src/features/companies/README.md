# Companies - Backend

## Endpoints

* `GET /api/companies` : liste ou recherche les entreprises.
* `GET /api/companies?duplicate_risk=true` : liste les entreprises avec risque
  de doublon.
* `GET /api/companies/:id` : lit une entreprise avec ses contacts.
* `POST /api/companies` : crée une entreprise avec ses contacts initiaux.
* `PATCH /api/companies/:id` : modifie les informations principales.
* `POST /api/companies/:id/contacts` : ajoute un contact.

## Modèle de domaine

Une entreprise contient :

* un nom ;
* un email général ;
* une adresse optionnelle ;
* une liste de contacts.

Un contact contient :

* prénom ;
* nom ;
* email ;
* téléphone optionnel ;
* un ou plusieurs rôles.

Rôles connus :

* `maitre_de_stage`
* `responsable_administratif`
* `encadrant_technique`

Cette feature ne gère pas de statuts.

## Règles métier

* Une entreprise doit être créée avec au moins un contact.
* Un contact doit porter au moins un rôle.
* La liste des entreprises peut être filtrée par recherche textuelle.
* La détection de doublons probables repose sur le premier mot significatif du
  nom.
* Une entreprise ne peut modifier que sa propre fiche, sauf gestionnaire.

## Accès données

Tables utilisées :

* `companies` : création, lecture, recherche, mise à jour et détection de
  doublons.
* `company_contacts` : création et lecture des contacts d'une entreprise.

Points d'attention :

* Les rôles de contacts sont sérialisés en JSON texte dans
  `company_contacts.roles`.
* La création entreprise + contacts est transactionnelle côté service.

Voir aussi : `docs/data-model.md`.

## Permissions

* `GET /api/companies` : public.
* `GET /api/companies/:id` : `gestionnaire`, `lecteur`, `etudiant`,
  `entreprise`; une entreprise est limitée à sa propre fiche.
* `POST /api/companies` : `gestionnaire`, `etudiant`, `entreprise`.
* `PATCH /api/companies/:id` : `gestionnaire` ou entreprise propriétaire.
* `POST /api/companies/:id/contacts` : `gestionnaire` ou entreprise
  propriétaire.

## Tests back

Fichiers de tests :

* `backend/tests/companies.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Recherche d'entreprises.
* Création avec au moins un contact.
* Détection de doublons probables.
* Contrôles d'accès par rôle et propriété entreprise.

## Documents liés

* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
