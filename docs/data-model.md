# Modèle de données

## Vue d'ensemble

Le backend utilise SQLite avec des requêtes SQL explicites via
`better-sqlite3`. Le schéma est centralisé côté backend et chargé au démarrage
de l'application.

La base est une ressource transversale du backend. Les README des features
doivent seulement documenter leur usage local des tables et renvoyer vers ce
document pour la vue globale.

## Fichiers DB backend

* `backend/src/db/schema.sql` : schéma SQL principal.
* `backend/src/db/db.connection.ts` : création de la connexion SQLite,
  activation des clés étrangères, mode WAL et base de test en mémoire.
* `backend/src/db/db.migrate.ts` : chargement du schéma, migrations de colonnes
  simples et seed de démonstration au premier lancement.

La base persistée est créée sous `backend/data/gesta.db` depuis le code compilé.
Les tests peuvent utiliser une base SQLite en mémoire via `createTestDb()`.

## Tables principales

* `users` : utilisateurs applicatifs, rôle et `entity_id`. Le flux V1 actuel
  utilise surtout les headers `x-role` et `x-entity-id`; l'usage de cette table
  reste à clarifier.
* `students` : référentiel des étudiants.
* `companies` : référentiel des entreprises.
* `company_contacts` : contacts rattachés aux entreprises.
* `offers` : offres de stage et propositions étudiantes.
* `offer_contacts` : table de liaison entre offres et contacts.
* `applications` : candidatures des étudiants aux offres.
* `offer_status_history` : historique des changements de statut des offres.

## Relations

* `company_contacts.company_id` référence `companies.id`.
* `offers.company_id` référence `companies.id`.
* `offers.priority_contact_id` référence `company_contacts.id`.
* `offers.submitted_by_student_id` référence `students.id`.
* `offers.created_by_company_id` référence `companies.id`.
* `offer_contacts.offer_id` référence `offers.id`.
* `offer_contacts.contact_id` référence `company_contacts.id`.
* `applications.offer_id` référence `offers.id`.
* `applications.student_id` référence `students.id`.
* `offer_status_history.offer_id` référence `offers.id`.

## Features et tables utilisées

* `backend/src/features/students`
  * `students` : import, upsert par email, liste et recherche par identifiant.
  * `applications` : consultée via la feature `applications` pour les
    candidatures d'un étudiant.

* `backend/src/features/companies`
  * `companies` : création, liste, recherche, mise à jour et détection simple
    de doublons.
  * `company_contacts` : création et lecture des contacts d'une entreprise.

* `backend/src/features/offers`
  * `offers` : création, lecture, recherche, modification et statuts.
  * `offer_contacts` : rattachement des contacts aux offres.
  * `applications` : utilisée dans les règles de visibilité étudiant.
  * `offer_status_history` : historisation des changements de statut.

* `backend/src/features/applications`
  * `applications` : création, liste, sélection et contrainte d'unicité
    offre/étudiant.
  * `offers` : vérification et mise à jour du statut lors d'une sélection.
  * `offer_status_history` : historisation du passage à `prise`.

## Conventions SQL

* Tables en `snake_case`, au pluriel.
* Colonnes en `snake_case`.
* Clé primaire nommée `id`.
* Clés étrangères nommées `[entity]_id`.
* Booléens stockés comme entiers SQLite (`0` ou `1`).
* Dates stockées en texte via `datetime('now')`.
* Les rôles de contacts sont stockés en JSON texte dans `company_contacts.roles`.

## Contraintes importantes

* `students.email` est unique.
* `students.matricule` est unique s'il est renseigné.
* `applications` impose l'unicité du couple `(offer_id, student_id)`.
* `offers.status` est limité à `soumise`, `validee_et_visible`, `prise`,
  `non_disponible` et `refusee`.
* `offers.source_type` est limité à `company` ou `student`.
* Les clés étrangères sont activées à la connexion.

## Limites et questions ouvertes

* La stratégie de migration est minimale : schéma SQL complet plus ajouts de
  colonnes ciblés dans `db.migrate.ts`.
* La migration future vers PostgreSQL n'est pas définie.
* Le statut `refusee` existe dans le schéma, mais reste à confirmer comme statut
  produit officiel.
* La table `users` existe dans le schéma, mais l'authentification V1 repose
  actuellement sur des headers.
* Le cycle de vie des pièces jointes n'est pas décrit par le modèle relationnel;
  les offres stockent seulement un chemin dans `attachment_path`.
