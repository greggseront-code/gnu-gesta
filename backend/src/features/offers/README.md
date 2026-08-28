# Offers - Backend

## Endpoints

* `GET /api/offers` : liste les offres visibles selon le rôle courant.
* `POST /api/offers` : crée une offre ou une proposition étudiante.
* `GET /api/offers/:id` : lit une offre selon les droits.
* `GET /api/offers/:id/dependencies` : dépendances en attente (entreprise,
  contacts) bloquant la validation — gestionnaire uniquement.
* `POST /api/offers/:id/validate` : publie une offre classique ou accepte une
  proposition étudiante en créant son dossier de stage.
* `POST /api/offers/:id/reject` : refuse une offre.
* `POST /api/offers/:id/mark-unavailable` : rend une offre indisponible.
* `PATCH /api/offers/:id` : modifie les champs descriptifs d'une offre.
* `PATCH /api/offers/:id/assignment` : remplace atomiquement l'entreprise, le
  contact prioritaire et les contacts associés d'une offre.
* `GET /api/offers/:id/attachments` : liste les pièces jointes visibles.
* `POST /api/offers/:id/attachments` : ajoute un fichier multipart `file`.
* `GET /api/offers/:id/attachments/:attachmentId` : télécharge un fichier.
* `DELETE /api/offers/:id/attachments/:attachmentId` : supprime un fichier.

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
* Le lecteur voit toutes les offres **sauf** `soumise` (en attente de
  validation) ; il n'a pas accès aux écrans de validation.
* Le gestionnaire voit toutes les offres.
* Une offre créée par le gestionnaire est insérée directement
  `validee_et_visible` ; une création étudiante ou entreprise reste `soumise`.
  Si le gestionnaire tente de créer une offre en la rattachant à une
  entreprise ou un contact encore en attente, la création est refusée
  (`409`) plutôt que de publier une offre qui violerait l'invariant
  ci-dessous.
* À la création, l'entreprise doit être visible pour l'auteur (validée, ou sa
  propre soumission en attente pour un étudiant) et chaque contact doit lui
  appartenir et être visible selon la même règle ; `priority_contact_id` doit
  figurer dans `contact_ids`.
* Un étudiant ne peut utiliser que ses propres entreprises et contacts en
  attente, jamais ceux d'un autre étudiant (l'entreprise cible non visible
  retourne `404`).
* Une offre ne peut passer à `validee_et_visible` (création gestionnaire ou
  `POST /:id/validate`) que si son entreprise, son contact prioritaire et
  tous ses contacts associés sont `validated` ; sinon `409` avec
  `company_pending` et `pending_contact_ids`.
* Une proposition étudiante acceptée passe directement à `prise`, reste privée
  à son auteur et au gestionnaire et crée un dossier sans candidature.
* Un étudiant ayant un dossier bloquant ne peut plus déposer de proposition.
* Seul un `gestionnaire` valide, refuse, rend indisponible ou réaffecte
  l'entreprise et les contacts d'une offre.
* `PATCH /:id/assignment` remplace atomiquement `company_id`,
  `priority_contact_id` et l'ensemble des contacts liés (`offer_contacts`
  est entièrement recréé, jamais fusionné) ; l'entreprise et tous les
  contacts choisis doivent déjà être `validated`.
* `remote_percentage` est requis quand `remote_allowed` vaut `true`.
* Les changements de statut sont historisés, y compris la publication
  directe d'une offre créée par le gestionnaire.
* Une offre contient au maximum dix pièces jointes PDF ou DOCX de 5 Mo chacune.
  Le service compte et insère les métadonnées dans une transaction ; tout
  fichier rejeté après écriture est nettoyé.

## Accès données

Tables utilisées :

* `offers` : création, lecture, recherche, modification et statut.
* `offer_attachments` : métadonnées des documents rattachés aux offres.
* `offer_contacts` : rattachement des contacts à une offre ; remplacé
  entièrement lors d'une réaffectation.
* `companies`, `company_contacts` : vérification de visibilité à la création
  et de statut de validation (dépendances, réaffectation).
* `applications` : utilisée pour la visibilité étudiant après candidature.
* `offer_status_history` : historique des changements de statut.
* `internships` : création transactionnelle depuis une proposition acceptée et
  contrôle du blocage étudiant.

Points d'attention :

* La création rattache les contacts via `linkOfferContacts`, dans la même
  transaction que l'insertion de l'offre.
* La réaffectation (`replaceOfferAssignment`) est transactionnelle : une
  entreprise ou des contacts invalides ne modifient jamais l'affectation
  initiale.
* `PATCH /:id/company`, qui ne corrigeait que l'entreprise et laissait des
  contacts orphelins de l'ancienne entreprise, a été retirée après migration
  de son seul appelant frontend (`admin-offers.page.tsx`) vers
  `PATCH /:id/assignment`.
* Le fichier physique n'est jamais exposé comme chemin local : seul son nom
  technique est persisté dans `offer_attachments.storage_name`, puis résolu
  sous `backend/uploads/` par le helper de stockage.

Voir aussi : `docs/current/data-model.md`.

## Permissions

* `GET /api/offers` et `GET /api/offers/:id` : session authentifiée requise
  (`gestionnaire`, `lecteur`, `etudiant` ou `entreprise` — pas d'accès
  anonyme), puis visibilité calculée selon rôle, statut, auteur et
  candidatures.
* `GET /api/offers/:id/dependencies` : `gestionnaire` uniquement.
* `GET /api/offers/:id/attachments` et `GET /api/offers/:id/attachments/:attachmentId` :
  mêmes règles de lecture que le détail de l'offre, y compris l'étudiant ayant
  déjà postulé.
* `POST /api/offers` : `gestionnaire`, `etudiant`, `entreprise`.
* `POST /api/offers/:id/validate` : `gestionnaire`.
* `POST /api/offers/:id/reject` : `gestionnaire`.
* `POST /api/offers/:id/mark-unavailable` : `gestionnaire`.
* `PATCH /api/offers/:id` : `gestionnaire`, entreprise propriétaire ou étudiant
  auteur.
* `PATCH /api/offers/:id/assignment` : `gestionnaire` uniquement.
* `POST /api/offers/:id/attachments` et `DELETE /api/offers/:id/attachments/:attachmentId` :
  gestionnaire, entreprise propriétaire ou étudiant auteur.

## Tests back

Fichiers de tests :

* `backend/tests/offers.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Création directement validée (gestionnaire) et création `soumise`
  (étudiant, entreprise).
* Blocage de `/validate` et de la création gestionnaire par une dépendance en
  attente ; endpoint `/dependencies`.
* Réaffectation atomique, y compris l'échec d'une réaffectation invalide sans
  effet sur l'affectation initiale, et le déblocage d'un refus après
  réaffectation.
* Filtrage par rôle et recherche, y compris l'exclusion des offres `soumise`
  pour le lecteur et entre deux étudiants distincts.
* Validation, refus et passage à `non_disponible`.
* Modification, liste, upload multiple, téléchargement, suppression et rejet
  des fichiers non autorisés.
* Cycle complet : proposition étudiante avec entreprise en attente, contrôle
  gestionnaire, acceptation privée et création du dossier.

## Documents liés

* Carte des features : `docs/current/features.md`
* Modèle de données : `docs/current/data-model.md`
