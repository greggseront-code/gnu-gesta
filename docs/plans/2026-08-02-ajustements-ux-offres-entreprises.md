# Plan - ajustements UX offres, entreprises et soumissions étudiantes

Date : 2026-08-02

Statut : implémenté (voir `docs/reviews/2026-08-02-ajustements-ux-offres-entreprises.md`)

## Écarts d'exécution par rapport à ce plan

* Tâche 001 : plutôt que d'initialiser `contactSearchDone = true`, l'état
  `contactSearchDone` a été entièrement retiré (devenu inconditionnellement
  vrai, donc sans utilité) ; le résultat observable est identique à celui
  décrit par la tâche.
* Tâche 007 : des fichiers de test non listés dans le plan ont été ajoutés
  pour couvrir des comportements sans test dédié préexistant —
  `frontend/src/features/offers/offer-card.test.tsx`,
  `frontend/src/pages/offer-details.test.tsx` et
  `frontend/src/pages/submit-offer.test.tsx` (nouveau fichier, la réaffectation
  ayant migré de `admin-offers.page.tsx` vers `submit-offer.page.tsx`).
* Aucun autre écart identifié : les tâches 001 à 007 ont été implémentées
  telles que décrites.

## Contexte

Un premier tour de test manuel de la feature de validation des offres,
entreprises et contacts (`docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`,
`docs/plans/2026-08-02-validation-offres-entreprises-contacts.md`) a fait
remonter six ajustements d'ergonomie et une règle métier manquante, formalisés
dans `docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md`. Ce plan
détaille comment les implémenter sans rouvrir le modèle de validation déjà en
place.

Sources à relire avant exécution :

* Spec : `docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md`
* Spec liée : `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* README de feature : `backend/src/features/offers/README.md`
* README de feature : `backend/src/features/companies/README.md`
* Review précédente : `docs/reviews/2026-08-02-validation-offres-entreprises-contacts.md`

## Objectif

Livrer les six ajustements de la spec (recherche de contact, libellé "Soumise
par moi", nom de l'étudiant visible côté gestionnaire, correction d'offre
déplacée vers le détail, une offre soumise en attente par étudiant, nom
d'entreprise cliquable) sans régression sur le modèle de validation existant.

Le plan doit permettre de vérifier :

* qu'un étudiant peut ajouter un contact sans recherche préalable et voit la
  liste complète des contacts par défaut ;
* qu'un étudiant ne peut avoir qu'une offre `soumise` en attente à la fois ;
* que le nom de l'entreprise et, le cas échéant, celui de l'étudiant créateur
  apparaissent sur les offres, aux bons endroits et pour les bons rôles ;
* que la correction d'une offre (texte, entreprise, contacts) se fait
  uniquement depuis son détail, plus depuis la liste `/admin/offers`.

## Périmètre

Inclus : les six points de
`docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md`.

Exclus :

* toute modification du modèle de validation lui-même (statuts, visibilité,
  unicité), déjà couvert par le plan précédent ;
* limitation du nombre de candidatures (`applications`) d'un étudiant.

## Impacts prévus

* Backend : `backend/src/features/offers` (types, queries, service, routes,
  tests).
* Frontend : `frontend/src/pages/student-proposal.page.tsx`,
  `frontend/src/pages/admin-offers.page.tsx`,
  `frontend/src/pages/offer-details.page.tsx`,
  `frontend/src/pages/submit-offer.page.tsx`,
  `frontend/src/pages/offers.page.tsx`,
  `frontend/src/features/offers/*`.
* Données : aucune migration de schéma requise (toutes les colonnes utilisées
  existent déjà : `company_id`, `submitted_by_student_id`, `status`).
* Documentation : `backend/src/features/offers/README.md`, le plan et la spec
  (cases à cocher), review de fin de tâche.
* Tests : `backend/tests/offers.test.ts`, `backend/tests/access-control.test.ts`,
  `frontend/src/pages/student-proposal.test.tsx`,
  `frontend/src/pages/admin-offers.test.tsx`, et tout nouveau test de page
  concerné.

## Décisions propres à ce plan

* **Enrichissement des offres par jointure, pas par recomposition côté
  frontend.** `GET /api/offers` et `GET /api/offers/:id` renverront directement
  `company_name` et `submitted_by_student_name` (nullable), calculés par une
  jointure `LEFT JOIN` sur `companies` et `students` au moment de la lecture.
  Alternative écartée : garder `admin-offers.page.tsx` récupérer
  `listCompanies()` séparément pour construire une correspondance côté client
  (solution déjà en place aujourd'hui) — écartée car elle ne couvrirait pas le
  nom de l'entreprise sur `offer-details.page.tsx` et `offers.page.tsx`, et
  parce qu'elle duplique une jointure que le backend peut faire une fois pour
  tous les écrans.
* **`submitted_by_student_name` est toujours inclus dans la réponse, sans
  filtre de rôle supplémentaire dans la couche HTTP.** Une offre dont
  `source_type = student` n'est de toute façon visible que par le
  gestionnaire et par l'étudiant créateur (règle déjà appliquée par
  `isVisible()`/`listOffers`) : exposer ce nom à qui voit déjà l'offre ne
  révèle rien de plus.
* **La contrainte "une offre soumise en attente par étudiant" est vérifiée en
  base au moment de la création**, pas seulement côté frontend, par une
  requête dédiée (`findPendingSubmittedOfferByStudent`) suivie d'un rejet
  `409 Conflict` — cohérent avec le principe déjà appliqué aux dépendances de
  validation (contrôle serveur, le frontend n'est qu'un confort d'affichage).
* **La réaffection entreprise/contacts rejoint l'écran d'édition existant**
  (`/offers/:id/edit`, `submit-offer.page.tsx`), réservée au gestionnaire dans
  ce contexte, plutôt que de créer un nouvel écran. Le bloc de recherche et de
  sélection actuellement dans `admin-offers.page.tsx` (lignes ~292-408) est
  déplacé tel quel vers `submit-offer.page.tsx`, gardé derrière
  `role === 'gestionnaire'`. Alternative écartée : créer une page de détail
  d'offre dédiée à l'édition — inutile, `offer-details.page.tsx` a déjà un
  bouton "Modifier" vers cette page pour `entreprise`/`gestionnaire`
  (`offer-details.page.tsx:98-102`).
* **Le contact affiché par défaut à l'étape 2 du parcours étudiant est la
  liste complète des contacts de l'entreprise sélectionnée**, déjà présente en
  mémoire via `selectedCompany.contacts` (aucun appel réseau supplémentaire) :
  `contactSearchDone`/`contactSearchResults` sont initialisés avec cette liste
  complète au lieu d'un état vide, et la recherche filtre simplement cette même
  liste comme aujourd'hui.

Ne pas faire dans ce plan :

* Changer les routes API de réaffectation (`PATCH /:id/assignment`) ou de
  dépendances (`GET /:id/dependencies`), déjà correctes.
* Ajouter un historique ou une notification liés à la limite d'une offre par
  étudiant.
* Modifier `PATCH /api/offers/:id` pour accepter `company_id`/`priority_contact_id`
  ­— la réaffectation continue de passer exclusivement par
  `PATCH /:id/assignment`.

## Tasks list

### 001. Retirer l'obligation de recherche préalable au contact et lister les contacts par défaut

**Files:**

* Modify: `frontend/src/pages/student-proposal.page.tsx`
* Modify: `frontend/src/pages/student-proposal.test.tsx`

**Travail :**

* [x] Initialiser l'étape 2 (contact) avec `contactSearchDone = true` et
  `contactSearchResults = selectedCompany.contacts` dès l'entrée dans l'étape,
  au lieu d'un état vide nécessitant une recherche.
* [x] Garder le filtrage texte existant (`handleContactSearch`) pour affiner
  cette même liste, mais ne plus conditionner l'affichage de "Proposer un
  nouveau contact" à `contactSearchDone`.
* [x] Retirer le message "Vérifiez d'abord si le contact existe déjà…" affiché
  avant recherche (n'a plus de sens si la liste est déjà visible) ou
  l'adapter en rappel non bloquant, sans condition d'affichage liée à la
  recherche.
* [x] Vérifier que `resetContactStep()` (appelé à la sélection d'une nouvelle
  entreprise) réinitialise bien vers la liste complète des contacts de la
  nouvelle entreprise, pas vers un état vide.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/student-proposal.test.tsx`
* Run: `cd frontend && npm run build`
* Expected : après sélection d'une entreprise, tous ses contacts sont visibles
  sans action de recherche ; le bouton "Proposer un nouveau contact" est
  disponible immédiatement.

**Human observables:**

* L'étudiant voit directement la liste des contacts existants dès l'étape 2.

### 002. Limiter à une offre soumise en attente par étudiant

**Files:**

* Modify: `backend/src/features/offers/offers.queries.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/tests/offers.test.ts`

**Travail :**

* [x] Ajouter `findPendingSubmittedOfferByStudent(db, studentId): Offer | null`
  dans `offers.queries.ts` (`SELECT * FROM offers WHERE submitted_by_student_id
  = ? AND status = 'soumise'`).
* [x] Dans `createOffer` (`offers.service.ts`), quand `auth.role === 'etudiant'`,
  vérifier avant insertion qu'aucune offre `soumise` de cet étudiant n'existe
  déjà ; sinon lever `ConflictError` avec un message explicite ("Vous avez
  déjà une offre en attente de validation. Attendez qu'elle soit traitée avant
  d'en soumettre une nouvelle.") et `{ existing_offer_id }` en détail.
* [x] Ne pas appliquer cette limite aux créations `entreprise` ou
  `gestionnaire`.
* [x] Tester : refus de la deuxième soumission tant que la première est
  `soumise` ; autorisation d'une nouvelle soumission après validation, refus
  ou passage à `non_disponible` de la précédente ; absence d'effet sur les
  candidatures (`applications`) ou sur les créations `entreprise`.

**Verification:**

* Run: `cd backend && npm test -- --run tests/offers.test.ts`
* Run: `cd backend && npm run build`
* Expected : un étudiant avec une offre `soumise` reçoit `409` à la deuxième
  tentative ; le message est directement affichable côté frontend (déjà
  propagé par `formError`/`ApiError` dans `student-proposal.page.tsx`).

**Human observables:**

* Un étudiant qui tente une deuxième proposition voit un message clair au lieu
  d'une erreur générique.

### 003. Enrichir les offres avec le nom de l'entreprise et de l'étudiant créateur

**Files:**

* Modify: `backend/src/features/offers/offers.types.ts`
* Modify: `backend/src/features/offers/offers.queries.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/tests/offers.test.ts`

**Travail :**

* [x] Étendre le type `Offer` (ou introduire `OfferWithNames extends Offer`,
  utilisé par toutes les routes de lecture) avec `company_name: string` et
  `submitted_by_student_name: string | null`.
* [x] Ajouter la jointure dans `listOffers` et dans une nouvelle
  `findOfferWithNamesById` : `JOIN companies c ON c.id = o.company_id`,
  `LEFT JOIN students st ON st.id = o.submitted_by_student_id`, en sélectant
  `c.name AS company_name` et
  `(st.first_name || ' ' || st.last_name) AS submitted_by_student_name` (NULL
  si pas de `submitted_by_student_id`).
* [x] Faire en sorte que toutes les réponses HTTP d'offre (liste, détail,
  création, validation, refus, indisponibilité, modification, réaffectation,
  pièce jointe) passent par ce chemin enrichi avant d'être renvoyées — les
  fonctions de mutation existantes gardent leur `RETURNING *` interne pour
  leur propre logique, mais le `service.ts` relit l'offre via
  `findOfferWithNamesById` juste avant de retourner la réponse à la route.
* [x] Adapter les tests existants qui asserent la forme exacte d'un `Offer`
  retourné par l'API.

**Verification:**

* Run: `cd backend && npm test -- --run tests/offers.test.ts`
* Run: `cd backend && npm run build`
* Expected : toute réponse JSON d'offre contient `company_name`, et
  `submitted_by_student_name` non nul uniquement quand `source_type =
  'student'`.

**Human observables:**

* Aucun directement à ce stade (préparation des tâches 004 et 005).

### 004. Afficher le nom de l'entreprise, cliquable, sur le résumé et le détail des offres

**Files:**

* Modify: `frontend/src/features/offers/offers.types.ts`
* Modify: `frontend/src/features/offers/offer-card.tsx`
* Modify: `frontend/src/pages/offers.page.tsx`
* Modify: `frontend/src/pages/offer-details.page.tsx`
* Modify: `frontend/src/pages/admin-offers.page.tsx`

**Travail :**

* [x] Ajouter `company_name` et `submitted_by_student_name` au type frontend
  `Offer` (miroir du type backend de la tâche 003).
* [x] `offer-card.tsx` : afficher `offer.company_name` comme lien vers
  `/admin/companies/${offer.company_id}` au lieu de la prop `companyName`
  actuellement optionnelle et jamais fournie par `offers.page.tsx`.
* [x] `offer-details.page.tsx` : ajouter le nom de l'entreprise (lien identique)
  dans l'en-tête ou le bloc "Informations".
* [x] `admin-offers.page.tsx` : remplacer la construction manuelle de la `Map`
  `companies` (fetch séparé de `listCompanies()`) par `offer.company_name`,
  toujours en lien cliquable vers `/admin/companies/${offer.company_id}`.
* [x] Vérifier que le lien reste cohérent avec les règles de visibilité
  existantes de `/admin/companies/:id` (une entreprise en attente non visible
  pour le rôle courant continuera de renvoyer une erreur gérée par la page,
  sans changement de comportement à faire ici).

**Verification:**

* Run: `cd frontend && npm test`
* Run: `cd frontend && npm run build`
* Expected : le nom de l'entreprise est visible et cliquable sur `/offers`,
  `/offers/:id` et `/admin/offers`.

**Human observables:**

* Cliquer sur le nom de l'entreprise depuis une offre ouvre son détail.

### 005. Afficher "Soumise par moi" et le nom de l'étudiant créateur côté gestionnaire

**Files:**

* Modify: `frontend/src/features/offers/offer-card.tsx`
* Modify: `frontend/src/pages/offers.page.tsx`
* Modify: `frontend/src/pages/offer-details.page.tsx`
* Modify: `frontend/src/pages/admin-offers.page.tsx`

**Travail :**

* [x] Dans `offers.page.tsx`/`offer-card.tsx`, quand `role === 'etudiant'` et
  `offer.submitted_by_student_id === entityId` (via `useAuth()`), afficher le
  badge/libellé "Soumise par moi" à la place du libellé générique actuel.
* [x] Dans `admin-offers.page.tsx`, remplacer le badge "Étudiant" existant
  (ligne ~214-216) par un affichage qui inclut `offer.submitted_by_student_name`
  quand `offer.source_type === 'student'` (ex. "Étudiant : Prénom Nom").
* [x] Dans `offer-details.page.tsx`, afficher `offer.submitted_by_student_name`
  quand `offer.source_type === 'student'` et `role === 'gestionnaire'`, dans le
  bloc "Informations".
* [x] Ne rien afficher côté étudiant, entreprise ou lecteur au-delà de ce qui
  existe déjà (le nom de l'étudiant reste une information de gestion).

**Verification:**

* Run: `cd frontend && npm test`
* Run: `cd frontend && npm run build`
* Expected : un étudiant voit "Soumise par moi" sur sa propre proposition ; le
  gestionnaire voit le nom de l'étudiant dans la liste et le détail d'une
  offre étudiante.

**Human observables:**

* Le gestionnaire identifie l'auteur d'une offre étudiante sans devoir ouvrir
  une autre page.

### 006. Déplacer la réaffectation entreprise/contacts vers l'écran de modification et retirer le bouton de la liste

**Files:**

* Modify: `frontend/src/pages/admin-offers.page.tsx`
* Modify: `frontend/src/pages/submit-offer.page.tsx`
* Modify: `frontend/src/pages/admin-offers.test.tsx`

**Travail :**

* [x] Retirer de `admin-offers.page.tsx` le bouton "Réaffecter l'entreprise et
  les contacts" et tout le bloc de réaffectation inline (recherche
  d'entreprise, sélection de contacts, confirmation — lignes ~29-38 et
  ~108-179 et ~274-408 de l'état actuel), ainsi que les états React qui ne
  servent plus qu'à cela.
* [x] Dans `submit-offer.page.tsx`, quand `role === 'gestionnaire'` et
  `isEdit` est vrai, ajouter une section "Entreprise et contacts" reprenant
  telle quelle la logique déplacée (recherche d'entreprise validée, sélection
  des contacts validés, contact prioritaire, confirmation via
  `reassignOffer(id, {...})`), affichée en plus du formulaire de texte
  existant (`OfferForm`).
* [x] Après une réaffectation confirmée depuis cet écran, rafraîchir
  localement l'entreprise/les contacts affichés (comme le faisait
  `admin-offers.page.tsx`) sans nécessairement recharger toute la page.
* [x] Vérifier que le lien "Modifier" de `offer-details.page.tsx`
  (`canEdit = role === 'entreprise' || role === 'gestionnaire'`) reste le seul
  point d'entrée vers cette page pour ces deux rôles ; aucun changement requis
  sur `offer-details.page.tsx` pour cette tâche.
* [x] Mettre à jour les tests de `admin-offers.test.tsx` qui couvraient
  l'ancien bouton/bloc de réaffectation ; ajouter un test de
  `submit-offer.page.tsx` (nouveau fichier de test si absent) couvrant la
  réaffectation gestionnaire.

**Verification:**

* Run: `cd frontend && npm test`
* Run: `cd frontend && npm run build`
* Expected : `/admin/offers` ne propose plus de réaffectation inline ; la
  réaffectation reste possible uniquement depuis `/offers/:id/edit` pour le
  gestionnaire.

**Human observables:**

* Le gestionnaire doit ouvrir le détail puis "Modifier" pour changer
  l'entreprise ou les contacts d'une offre ; la liste `/admin/offers` reste
  focalisée sur valider/refuser/indisponible.

### 007. Vérification transversale et documentation

**Files:**

* Modify: `backend/src/features/offers/README.md`
* Modify: `docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md` (cases
  à cocher)
* Modify: `docs/plans/2026-08-02-ajustements-ux-offres-entreprises.md` (cases
  à cocher, statut)
* Create: `docs/reviews/2026-08-02-ajustements-ux-offres-entreprises.md`

**Travail :**

* [x] Mettre à jour `backend/src/features/offers/README.md` : nouveaux champs
  de réponse (`company_name`, `submitted_by_student_name`), règle de la limite
  d'une offre soumise par étudiant, mention de l'endroit où vit désormais la
  réaffectation côté frontend.
* [x] Faire tourner l'ensemble des suites de tests backend et frontend, pas
  seulement les fichiers touchés par chaque tâche.
* [x] Cocher les critères d'acceptation de la spec un par un, en confirmant
  chacun manuellement ou par un test précis.
* [x] Rédiger la review de fin de tâche (`docs/reviews/`) avec le même gabarit
  que la review précédente.

**Verification:**

* Run: `cd backend && npm test && npm run build`
* Run: `cd frontend && npm test && npm run build`
* Expected : toutes les suites passent, aucune régression sur les tests déjà
  verts avant ce plan.

**Human observables:**

* Aucun en soi ; cette tâche consolide la vérification des six précédentes.

## Points d'attention

* La tâche 003 change la forme de l'objet `Offer` renvoyé par toutes les
  routes existantes : toute assertion de test qui compare un `Offer` complet
  (`toEqual`) plutôt que ses champs pertinents devra être ajustée en même
  temps, pas seulement les tests qui ciblent explicitement les nouveaux
  champs.
* `submit-offer.page.tsx` sert aussi à la création d'offre par une entreprise
  (`isEdit === false`) : la section de réaffectation ajoutée en tâche 006 doit
  rester strictement conditionnée à `isEdit && role === 'gestionnaire'`, pour
  ne pas apparaître pendant un dépôt initial.
* La limite d'une offre par étudiant (tâche 002) ne doit pas bloquer un
  étudiant dont l'unique offre `soumise` vient d'être réaffectée par le
  gestionnaire vers une autre entreprise : la réaffectation ne change pas
  `submitted_by_student_id` ni `status`, donc le comportement attendu (offre
  toujours comptée comme "en attente" jusqu'à validation) reste correct sans
  traitement particulier.
* Le nom affiché (`first_name || ' ' || last_name`) suit la convention déjà
  utilisée ailleurs dans le code (`admin-company-detail.page.tsx`,
  fonction `initials`) ; rester cohérent avec cet ordre plutôt que
  `last_name, first_name`.

## Vérification finale

* [x] Les tests automatisés pertinents passent (`backend/tests/offers.test.ts`,
  `backend/tests/access-control.test.ts`, suites frontend concernées).
* [x] Les builds `backend` et `frontend` passent.
* [x] Les six points de la spec sont vérifiés manuellement dans un navigateur.
* [x] `backend/src/features/offers/README.md` reflète les nouveaux champs et
  règles.
* [x] Les chemins documentés correspondent à la structure réelle des fichiers
  frontend/backend après implémentation.
* [x] Les écarts par rapport à ce plan sont documentés dans une section
  "Écarts d'exécution" en tête de ce fichier, comme pour le plan précédent.

## Self-review

* Couverture de la spec : les sept tâches couvrent les six points de
  `docs/specs/2026-08-02-ajustements-ux-offres-entreprises.md` un par un
  (001↔#1, 002↔#5, 003+004↔#6, 003+005↔#2 et #3, 006↔#4), plus une tâche de
  vérification transversale.
* Cohérence architecture : aucune nouvelle route, aucune nouvelle table ;
  réutilise `PATCH /:id/assignment` et `PATCH /:id` existants, et le seul
  écran d'édition déjà en place.
* Risques restants : la jointure de la tâche 003 est appliquée partout où une
  offre est lue ou renvoyée après mutation ; un oubli sur un chemin de retour
  laisserait `company_name`/`submitted_by_student_name` absents sur cette
  seule réponse — à vérifier explicitement pendant la tâche 007.
* Travail restant : aucun au-delà des sept tâches ci-dessus.
