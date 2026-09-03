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

* `users` : identité technique Microsoft Entra. `entra_tenant_id` +
  `entra_object_id` (immuables, uniques ensemble) identifient le compte ;
  `role` et `entity_id` sont un instantané du dernier login (audit), jamais
  relus pour autoriser une requête — la session est la seule source de
  vérité d'autorisation. Les lignes historiques sans `tid`/`oid` (V1
  headers) restent inertes.
* `sessions` : sessions Express persistées (`express-session`, store
  `backend/src/features/auth/session.store.ts`), 8h renouvelables. Remplace
  le `MemoryStore` du pilote.
* `students` : référentiel des étudiants.
* `student_academic_year_eligibility` : rattachement additif des étudiants aux
  années académiques pour lesquelles ils sont éligibles au stage.
* `companies` : référentiel des entreprises. Porte un état de validation
  (`validation_status`), l'étudiant créateur éventuel
  (`submitted_by_student_id`) et la date de validation (`validated_at`).
* `company_contacts` : contacts rattachés aux entreprises. Mêmes colonnes de
  validation que `companies`, plus `created_with_company` (contact de la
  soumission initiale d'une entreprise vs ajouté séparément).
* `offers` : offres de stage et propositions étudiantes.
* `offer_attachments` : métadonnées des fichiers rattachés aux offres ; le
  fichier physique est conservé séparément sous `backend/uploads/` avec un nom
  technique généré par le serveur.
* `offer_contacts` : table de liaison entre offres et contacts.
* `applications` : candidatures des étudiants aux offres.
* `offer_status_history` : historique des changements de statut des offres.

## Relations

* `company_contacts.company_id` référence `companies.id`.
* `student_academic_year_eligibility.student_id` référence `students.id` avec
  suppression en cascade.
* `companies.submitted_by_student_id` référence `students.id` (étudiant
  créateur d'une soumission ; `NULL` pour un élément créé directement validé).
* `company_contacts.submitted_by_student_id` référence `students.id`, avec la
  même sémantique.
* `offers.company_id` référence `companies.id`.
* `offers.priority_contact_id` référence `company_contacts.id`.
* `offer_attachments.offer_id` référence `offers.id` avec suppression en
  cascade.
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
  * `student_academic_year_eligibility` : création idempotente des associations
    étudiant/année lors de l'import.
  * `applications` : consultée via la feature `applications` pour les
    candidatures d'un étudiant.

* `backend/src/features/companies`
  * `companies` : création, liste, recherche, mise à jour et détection simple
    de doublons.
  * `company_contacts` : création et lecture des contacts d'une entreprise.

* `backend/src/features/offers`
  * `offers` : création, lecture, recherche, modification et statuts.
  * `offer_attachments` : liste, ajout, téléchargement et suppression des
    métadonnées de documents.
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

* `students.email` est unique, insensible à la casse
  (`idx_students_email_nocase`, ajouté au jalon 3 de l'authentification). Le
  lien entre une session étudiante et sa fiche `students` se fait par cet
  email (`userPrincipalName` Microsoft, puis `mail` en repli).
* `students.matricule` est unique s'il est renseigné.
* `student_academic_year_eligibility` impose l'unicité du couple
  `(student_id, academic_year)` ; un étudiant peut donc appartenir à plusieurs
  années, mais jamais deux fois à la même.
* `users.email` est unique, insensible à la casse
  (`idx_users_email_nocase`) ; le couple `(entra_tenant_id, entra_object_id)`
  est unique quand les deux sont renseignés
  (`idx_users_entra_identity`).
* `applications` impose l'unicité du couple `(offer_id, student_id)`.
* `offer_attachments.storage_name` est non nul et unique ; `mime_type` est
  limité à `application/pdf` et au MIME DOCX OOXML ; `size_bytes` est compris
  entre 0 et 5 MiB. L'offre est limitée à dix lignes par le service, dans une
  transaction.
* `offers.status` est limité à `soumise`, `validee_et_visible`, `prise`,
  `non_disponible` et `refusee`.
* `offers.source_type` est limité à `company` ou `student`.
* `companies.validation_status` et `company_contacts.validation_status` sont
  limités à `pending` ou `validated` (défaut `validated`, pour que les bases
  existantes et les seeds restent valides sans modification).
* `company_contacts.email` est unique dans tout le référentiel, sur
  `LOWER(TRIM(email))` (`idx_company_contacts_email_norm`), quel que soit le
  statut de validation.
* Le couple `(companies.name, companies.address)` est unique sur
  `LOWER(TRIM(name))` + `LOWER(TRIM(COALESCE(address, '')))`
  (`idx_companies_name_address_norm`) : une adresse nulle, vide ou composée
  uniquement d'espaces représente la même valeur absente. Le nom seul,
  l'adresse seule et l'email général ne sont pas des clés uniques.
* Les clés étrangères sont activées à la connexion.

## Limites et questions ouvertes

* La stratégie de migration est minimale : schéma SQL complet plus ajouts de
  colonnes ciblés dans `db.migrate.ts`. Les index uniques ajoutés sur des
  colonnes existantes (`users`, `students`) sont créés dans ce même fichier,
  après les migrations de colonnes dont ils dépendent (voir
  `normalizeStudentEmails()` dans `db.migrate.ts` pour la résolution des
  doublons de casse avant contrainte).
* Contrairement à `normalizeStudentEmails()`, les index uniques de
  `companies`/`company_contacts` ne résolvent jamais un conflit historique
  automatiquement : `enforceCompanyAndContactUniqueness()` audite la base
  avant de créer ces index et fait échouer le démarrage (avec les
  identifiants en conflit) si un doublon exact existe déjà, sans supprimer ni
  fusionner de données.
* La migration future vers PostgreSQL n'est pas définie.
* Le statut `refusee` existe dans le schéma, mais reste à confirmer comme statut
  produit officiel.
* `offers` ne contient pas de colonne `attachment_path`. La base fictive est
  recréée depuis le schéma frais ; aucune migration ou backfill de cet ancien
  champ n'est prévu. Les fichiers locaux ne sont pas inclus dans les backups
  SQLite.
