# Review — validation des offres, entreprises et contacts proposés

Date : 2026-08-02

## Documents liés

* Spec : `docs/history/phases/2026-08-02-validation-offres-entreprises-contacts-spec.md`
* Plan : `docs/history/phases/2026-08-02-validation-offres-entreprises-contacts-plan.md`
* README de feature : `backend/src/features/companies/README.md`
* README de feature : `backend/src/features/offers/README.md`
* Architecture : `docs/current/architecture.md`
* Modèle de données : `docs/current/data-model.md`

## Objectif

Permettre aux étudiants de proposer des entreprises et des contacts
immédiatement utilisables dans leur propre parcours, sans les rendre visibles
au reste du référentiel avant validation par un gestionnaire ; empêcher la
publication d'une offre tant que son entreprise et ses contacts sont en
attente ; donner au gestionnaire des écrans organisés pour contrôler offres,
entreprises et contacts en attente.

## Travail réalisé

Backend (`backend/src/features/companies`, `backend/src/features/offers`,
`backend/src/db`) :

* Migration additive : `validation_status`, `submitted_by_student_id`,
  `validated_at` sur `companies` et `company_contacts` ; `created_with_company`
  sur `company_contacts`. Index uniques normalisés (email de contact ; couple
  nom/adresse d'entreprise, adresse absente/nulle/vide équivalente). Audit de
  conflits pré-migration qui bloque le démarrage sans supprimer ni fusionner
  de données historiques.
* Nouveau module `backend/src/lib/http-errors.ts` (`HttpError`,
  `ConflictError`, `NotFoundError`, `BadRequestError`,
  `translateUniqueConstraint`) utilisé par les deux features pour traduire
  les violations métier en réponses HTTP structurées.
* `companies` : création et visibilité contextualisées par rôle et créateur
  (étudiant → `pending` + immédiatement utilisable par lui ; gestionnaire /
  entreprise propriétaire → `validated` direct) ; un élément masqué se
  comporte comme absent (`404`). Nouvelles routes de modération :
  `GET /pending`, `POST /:id/validate`, `DELETE /:id`,
  `POST /contacts/:contactId/validate`, `PATCH /contacts/:contactId`,
  `DELETE /contacts/:contactId`. Suppression bloquée par référence d'offre
  (`409` + `offer_ids`), vérifiée avant le `DELETE`.
* `offers` : vérification de visibilité de l'entreprise et d'appartenance des
  contacts à la création ; blocage (`409`) de la création gestionnaire et de
  `POST /:id/validate` tant qu'une dépendance est en attente ; nouvel
  endpoint `GET /:id/dependencies` ; `PATCH /:id/assignment` remplace
  atomiquement entreprise/contact prioritaire/contacts associés (remplace
  `PATCH /:id/company`, retirée avec ses fonctions après migration de son
  appelant frontend).

Frontend (`frontend/src/features/companies`, `frontend/src/features/offers`,
pages) :

* `student-proposal.page.tsx` : recherche obligatoire (entreprise puis
  contact) avant de débloquer la création, avec message anti-doublon et
  remise à zéro du blocage quand le terme de recherche change ; badges "En
  attente de validation" ; messages `409` lisibles.
* Nouvelle page `admin-companies.page.tsx` (`/admin/companies`, gestionnaire
  uniquement) : deux files adressables avec compteurs, créateur, doublons
  probables, offres bloquantes, accepter/refuser avec confirmation.
* `admin-company-detail.page.tsx` : édition de l'entreprise et des contacts
  en attente, acceptation/refus directement depuis le détail.
* `admin-offers.page.tsx` : affichage des dépendances en attente avec lien
  vers `/admin/companies`, validation désactivée tant qu'elles subsistent,
  outil de réaffectation complète (entreprise validée + contacts validés)
  remplaçant l'ancienne correction d'entreprise seule.
* `home.page.tsx` : trois compteurs (offres, entreprises, contacts en
  attente) sur le tableau de bord gestionnaire, chacun lié à l'écran
  correspondant.
* `lib/api-client.ts` : `ApiError` porte désormais le corps JSON complet de
  l'erreur (ex. `offer_ids`), au-delà du seul message.

## Écarts par rapport à la spec ou au plan

* Le retrait de `PATCH /api/offers/:id/company` (tâche 005 du plan) a été
  effectué à la fin de la tâche 008, une fois son unique appelant frontend
  migré, plutôt que dans la tâche 005 elle-même — conforme à la note de
  migration du plan, mais décalé d'une tâche. Voir
  `docs/history/phases/2026-08-02-validation-offres-entreprises-contacts-plan.md`.
* Décision non explicitée par la spec : une création d'offre par le
  gestionnaire référençant une entreprise ou un contact encore en attente est
  refusée (`409`) plutôt que rétrogradée silencieusement en `soumise`.
* Aucun autre écart identifié.

## Fichiers impactés

Voir la liste complète dans le plan (section "Impacts prévus" et fichiers
listés par tâche). Résumé des zones touchées :

* `backend/src/db/schema.sql`, `backend/src/db/db.migrate.ts`
* `backend/src/lib/http-errors.ts` (nouveau)
* `backend/src/features/companies/*`
* `backend/src/features/offers/*`
* `backend/src/features/auth/auth.routes.ts` (appel `findCompanyById` mis à
  jour avec le contexte d'authentification)
* `backend/tests/*.test.ts`
* `frontend/src/lib/api-client.ts`
* `frontend/src/features/companies/*`, `frontend/src/features/offers/*`
* `frontend/src/pages/student-proposal.page.tsx`,
  `companies.page.tsx`, `admin-company-form.page.tsx`,
  `admin-company-detail.page.tsx`, `admin-companies.page.tsx` (nouveau),
  `admin-offers.page.tsx`, `home.page.tsx`
* `frontend/src/app/app.tsx`, `frontend/src/components/app-layout.tsx`
* `frontend/src/styles/global.css` (`.alert-info`)
* Documentation : ce document, les deux README de feature,
  `docs/current/data-model.md`, `docs/current/features.md`, le plan.

## Décisions prises

* `validated_at` n'a pas de défaut SQLite au niveau colonne (`ALTER TABLE ADD
  COLUMN` interdit les défauts non constants) : il est renseigné
  explicitement par la couche service à la création directement validée ou à
  l'acceptation, via `CASE WHEN validation_status = 'validated' THEN
  datetime('now') ELSE NULL END` dans les requêtes d'insertion.
* La détection de conflit pré-migration groupe sur les colonnes réelles
  (`GROUP BY` sur nom et adresse séparément), jamais sur une concaténation,
  pour ne jamais rapporter un faux conflit entre deux combinaisons distinctes
  (ex. nom="ab"+adresse="" et nom="a"+adresse="b").
* Le rejet (refus) d'une entreprise ou d'un contact n'est autorisé que
  lorsque son statut est encore `pending`, en plus du contrôle de référence
  par une offre — une garde supplémentaire non explicitement demandée par la
  spec mais cohérente avec "refuser les transitions incohérentes".
* `getOfferDependencyStatus` / `GET /:id/dependencies` est une nouvelle route
  gestionnaire réutilisée à la fois pour bloquer `/validate` côté backend et
  pour afficher les dépendances côté `admin-offers.page.tsx`.
* Les libellés exacts des deux messages anti-doublon (spec, incertitude) :
  "Vérifiez d'abord que cette entreprise n'existe pas déjà dans le
  répertoire, afin d'éviter un doublon." et "Vérifiez d'abord si le contact
  existe déjà parmi ceux enregistrés pour cette entreprise, afin d'éviter un
  doublon."
* Chemins des routes de modération (spec, incertitude) : `GET
  /api/companies/pending`, `POST /api/companies/:id/validate`, `DELETE
  /api/companies/:id`, `POST /api/companies/contacts/:contactId/validate`,
  `PATCH /api/companies/contacts/:contactId`, `DELETE
  /api/companies/contacts/:contactId`.

## Tests et vérifications

Tests automatisés exécutés :

* Commande : `cd backend && npm test`
* Résultat : 196 tests passés (12 fichiers).
* Commande : `cd backend && npm run build`
* Résultat : succès (`tsc`, aucune erreur).
* Commande : `cd frontend && npm test`
* Résultat : 44 tests passés (9 fichiers).
* Commande : `cd frontend && npm run build`
* Résultat : succès (`tsc` + `vite build`, aucune erreur).

Vérifications manuelles effectuées :

* Migration rejouée sur une copie jetable de la base réelle
  (`backend/data/gesta.db`, jamais le fichier original) : aucun conflit
  d'unicité, 57 entreprises et 69 contacts marqués `validated` sans
  intervention manuelle.

Non testé ou à vérifier :

* Parcours manuel dans un navigateur (recherche entreprise/contact,
  création, file de modération, réaffectation d'offre) : non exécuté dans
  cette session, à valider humainement avant mise en production.
* Le scénario à deux sessions étudiantes simultanées dans un vrai navigateur
  (plutôt qu'en tests d'intégration Supertest) reste à confirmer
  manuellement.

## Risques et limites

* L'absence d'historique de refus rend une soumission irrécupérable après
  confirmation (connu et accepté, voir plan).
* La détection de doublons approchants reste heuristique ; seuls les
  doublons exacts (email, couple nom/adresse) sont bloqués par les index.
* Une base historique déjà en conflit (email ou nom/adresse dupliqué) bloque
  le démarrage du backend jusqu'à correction manuelle — vérifié absent sur la
  base réelle actuelle, mais à surveiller sur tout futur import massif de
  données.
* L'ajout de plusieurs contacts dans une création d'entreprise reste possible
  au niveau API (`CompanyInputSchema.contacts` accepte un tableau), même si le
  parcours étudiant n'en envoie qu'un.
* Les éventuels consommateurs externes de l'ancienne route
  `PATCH /api/offers/:id/company` ne sont pas inventoriés hors de ce dépôt ;
  elle a été retirée après confirmation que son seul appelant connu
  (`admin-offers.page.tsx`) était migré.

## Travail restant

* Validation humaine des parcours frontend dans un navigateur (voir
  "Non testé ou à vérifier").
* Aucune tâche du plan (001 à 010) ne reste à implémenter.

## Incertitudes

* Aucune incertitude bloquante restante ; les deux incertitudes de la spec
  (libellés des messages anti-doublon, chemins des routes d'administration)
  ont été tranchées et sont documentées dans "Décisions prises" ci-dessus.
