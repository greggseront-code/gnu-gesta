# Companies - Backend

## Endpoints

* `GET /api/companies` : liste ou recherche les entreprises visibles pour le
  rôle courant.
* `GET /api/companies?duplicate_risk=true` : liste les entreprises avec risque
  de doublon (visibilité courante ; référentiel complet pour le gestionnaire).
* `GET /api/companies/pending` : file de modération gestionnaire — deux
  collections (`companies`, `contacts`) en attente, avec créateur, doublons
  probables et offres bloquantes.
* `GET /api/companies/:id` : lit une entreprise avec ses contacts visibles.
* `POST /api/companies` : crée une entreprise avec ses contacts initiaux.
* `POST /api/companies/:id/validate` : valide une entreprise en attente et,
  dans la même transaction, ses contacts de soumission initiale
  (`created_with_company`).
* `DELETE /api/companies/:id` : refuse (supprime) une soumission d'entreprise
  en attente non référencée par une offre.
* `PATCH /api/companies/:id` : modifie les informations principales.
* `POST /api/companies/:id/contacts` : ajoute un contact.
* `POST /api/companies/contacts/:contactId/validate` : valide un contact
  ajouté ultérieurement (indépendamment de l'entreprise).
* `PATCH /api/companies/contacts/:contactId` : modifie un contact (gestionnaire).
* `DELETE /api/companies/contacts/:contactId` : refuse (supprime) une
  soumission de contact en attente non référencée par une offre.

## Modèle de domaine

Une entreprise contient :

* un nom ;
* un email général ;
* une adresse optionnelle ;
* un statut de validation (`pending` ou `validated`) ;
* l'identifiant de l'étudiant créateur, s'il s'agit d'une soumission (sinon `null`) ;
* la date de validation (`validated_at`), renseignée à la création directement
  validée ou à l'acceptation ;
* une liste de contacts.

Un contact contient :

* prénom ;
* nom ;
* email ;
* téléphone optionnel ;
* un ou plusieurs rôles ;
* un statut de validation, l'identifiant de l'étudiant créateur, `validated_at` ;
* `created_with_company` : distingue un contact de la soumission initiale
  d'une entreprise d'un contact ajouté séparément par la suite.

Rôles connus :

* `maitre_de_stage`
* `responsable_administratif`
* `encadrant_technique`

## Règles métier

* Une entreprise créée par un étudiant est `pending`, avec son créateur
  enregistré ; ses contacts initiaux le sont également
  (`created_with_company = 1`).
* Une entreprise ou un contact créé par le gestionnaire est `validated`
  immédiatement.
* Un contact ajouté par une entreprise à sa propre fiche est `validated`
  immédiatement.
* Un contact ajouté par un étudiant à une entreprise existante (validée, ou
  sa propre entreprise en attente) est `pending`, avec `created_with_company = 0`.
* Le rôle `entreprise` ne peut pas créer d'entreprise (uniquement des
  contacts sur sa propre fiche).
* Un élément `pending` est visible par le gestionnaire et par l'étudiant
  créateur ; les autres rôles (y compris un autre étudiant) ne voient que les
  éléments `validated`. Un élément masqué se comporte comme absent (`404`),
  jamais comme un refus d'accès (`403`), pour ne pas révéler son existence.
* L'email normalisé (`LOWER(TRIM(email))`) d'un contact est unique dans tout
  le référentiel, quel que soit son statut. L'index unique porte sur les
  lignes en attente comme sur les lignes validées.
* Le couple nom/adresse normalisé (`LOWER(TRIM(name))` +
  `LOWER(TRIM(COALESCE(address, '')))`) d'une entreprise est unique ; une
  adresse absente, nulle ou vide représente la même valeur. Le nom seul,
  l'adresse seule et l'email général ne sont pas des clés uniques.
* Une violation d'unicité à la création ou à la modification retourne `409`
  avec un message invitant à rechercher et sélectionner l'élément existant ;
  un élément masqué en conflit ne révèle ni son identifiant ni ses données.
* L'acceptation d'une entreprise valide atomiquement l'entreprise et ses
  contacts `created_with_company` encore en attente.
* Le refus d'une entreprise ou d'un contact équivaut à la suppression de la
  soumission ; aucun historique des refus n'est conservé.
* Une entreprise ou un contact encore référencé par une offre
  (`offers.company_id`, `offers.priority_contact_id`, `offer_contacts`) ne
  peut pas être refusé : la route retourne `409` avec les `offer_ids`
  concernés, sans mutation partielle.
* Seule une soumission `pending` peut être refusée via ces routes.
* La détection de doublons probables repose sur le premier mot significatif
  du nom et respecte la visibilité de l'appelant (sauf pour la file
  gestionnaire, qui compare tout le référentiel).
* Une entreprise ne peut modifier que sa propre fiche, sauf gestionnaire.

## Accès données

Tables utilisées :

* `companies` : création, lecture filtrée, recherche, mise à jour,
  modération et détection de doublons.
* `company_contacts` : création, lecture filtrée et modération.
* `students` : lecture du créateur (`submitted_by_student_id`) pour la file
  de modération.
* `offers`, `offer_contacts` : vérification des références bloquantes avant
  un refus.

Points d'attention :

* Les rôles de contacts sont sérialisés en JSON texte dans
  `company_contacts.roles`.
* La création entreprise + contacts est transactionnelle côté service, tout
  comme l'acceptation d'une entreprise et de ses contacts initiaux.
* Les index uniques normalisés (`idx_company_contacts_email_norm`,
  `idx_companies_name_address_norm`) sont créés dans `db.migrate.ts`, après
  un audit de conflits pré-migration qui bloque le démarrage sans supprimer
  ni fusionner de données (voir `docs/current/data-model.md`).
* La suppression d'une entreprise ou d'un contact vérifie l'absence de
  référence en base **avant** le `DELETE` : la clé étrangère
  `offer_contacts.contact_id ON DELETE CASCADE` ne suffit pas, elle
  supprimerait silencieusement un lien non prioritaire.

Voir aussi : `docs/current/data-model.md`.

## Permissions

* `GET /api/companies` : toute session authentifiée (`gestionnaire`,
  `lecteur`, `etudiant`, `entreprise`), filtrée par visibilité.
* `GET /api/companies/pending` : `gestionnaire` uniquement.
* `GET /api/companies/:id` : `gestionnaire`, `lecteur`, `etudiant`,
  `entreprise` ; une entreprise est limitée à sa propre fiche ; un élément
  masqué retourne `404`.
* `POST /api/companies` : `gestionnaire`, `etudiant` (pas `entreprise`).
* `POST /api/companies/:id/validate`, `DELETE /api/companies/:id`,
  `POST /api/companies/contacts/:contactId/validate`,
  `PATCH /api/companies/contacts/:contactId`,
  `DELETE /api/companies/contacts/:contactId` : `gestionnaire` uniquement.
* `PATCH /api/companies/:id` : `gestionnaire` ou entreprise propriétaire.
* `POST /api/companies/:id/contacts` : `gestionnaire`, entreprise
  propriétaire, ou étudiant si l'entreprise cible est visible (validée, ou sa
  propre soumission en attente).

## Tests back

Fichiers de tests :

* `backend/tests/companies.test.ts`
* `backend/tests/access-control.test.ts`
* `backend/tests/db.test.ts` (migration, index uniques)

Scénarios importants :

* Recherche et visibilité d'entreprises et de contacts selon le rôle et le
  créateur (y compris entre deux étudiants distincts).
* Création directement validée (gestionnaire, entreprise pour ses propres
  contacts) et création en attente (étudiant).
* File de modération, acceptation groupée et individuelle, refus simple et
  refus bloqué par une référence d'offre.
* Contraintes d'unicité normalisées (email, nom/adresse) à la création et à
  la modification.
* Contrôles d'accès par rôle et propriété entreprise.

## Documents liés

* Carte des features : `docs/current/features.md`
* Modèle de données : `docs/current/data-model.md`
