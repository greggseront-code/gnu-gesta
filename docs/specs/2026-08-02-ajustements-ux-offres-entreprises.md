# Ajustements UX offres, entreprises et soumissions étudiantes

## Contexte

La feature de validation des offres, entreprises et contacts proposés par les
étudiants (`docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`)
vient d'être implémentée et déployée en environnement de test. Un premier tour
de test manuel par le gestionnaire a fait remonter plusieurs ajustements
d'ergonomie et une règle métier manquante sur les parcours d'offres et
d'entreprises. Ces remarques sont disparates (elles touchent plusieurs écrans
différents) mais partagent le même contexte : le parcours de soumission et de
consultation des offres par un étudiant, et les écrans de gestion associés.

## Objectif

Clarifier l'ergonomie de sélection d'un contact lors d'une proposition
d'étudiant, améliorer la lisibilité des offres (auteur, entreprise) pour
l'étudiant et le gestionnaire, déplacer la correction d'une offre validée vers
son écran de détail, et introduire la règle qu'un étudiant ne peut avoir qu'une
seule offre proposée en attente à la fois.

## Périmètre

Inclus :

* comportement de la recherche de contact une fois une entreprise sélectionnée
  dans le parcours de proposition étudiant ;
* libellé "Soumise par moi" dans la liste des offres pour l'étudiant qui l'a
  soumise ;
* affichage du nom de l'étudiant créateur d'une offre soumise, côté
  gestionnaire, dans la liste et dans le détail ;
* suppression de l'obligation de recherche préalable avant l'ajout d'un
  nouveau contact à une entreprise existante ;
* déplacement de la correction d'une offre validée (entreprise, contacts et
  texte de l'offre) de la liste `/admin/offers` vers le détail de l'offre ;
* limite d'une seule offre proposée en attente par étudiant à la fois ;
* affichage du nom de l'entreprise sur les offres (résumé et détail), avec lien
  vers le détail de l'entreprise.

Exclus :

* toute autre modification du workflow de validation déjà en place (statuts,
  visibilité, unicité) ;
* messagerie ou notification entre gestionnaire et étudiant ;
* limitation du nombre de candidatures (`applications`) d'un étudiant, qui
  reste illimité.

## Comportement attendu

### 1. Sélection du contact après l'entreprise (parcours étudiant)

* Une fois une entreprise sélectionnée dans le parcours de proposition, la zone
  de recherche de contact affiche par défaut la liste complète des contacts de
  cette entreprise (recherche vide = tous les contacts), plutôt qu'une boîte de
  recherche dont le résultat à vide n'est pas explicite.
* L'étudiant peut sélectionner un contact directement dans cette liste, ou
  affiner avec le texte de recherche.
* L'obligation de recherche préalable avant de pouvoir ajouter un nouveau
  contact (introduite par `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`)
  n'a plus lieu d'être : puisque la liste complète des contacts est déjà
  affichée par défaut, l'action d'ajout d'un nouveau contact devient disponible
  sans exiger de recherche préalable.

### 2. Libellé "Soumise par moi"

* Dans la liste des offres consultée par un étudiant, une offre qu'il a
  lui-même soumise (`submitted_by_student_id` = l'étudiant courant) porte le
  libellé "Soumise par moi" à la place du libellé générique actuel.

### 3. Nom de l'étudiant visible côté gestionnaire

* Lorsqu'une offre a été soumise par un étudiant, le gestionnaire voit le nom
  de cet étudiant :
  * dans la liste des offres du tableau de bord/gestion (`/admin/offers`) ;
  * dans le détail de l'offre.
* Ce nom n'est affiché que lorsque la source de l'offre est un étudiant
  (`source_type = student` avec `submitted_by_student_id` renseigné).

### 4. Correction d'une offre déplacée vers le détail

* Le bouton permettant de corriger une offre validée (actuellement "Réaffecter
  l'entreprise et les contacts", visible directement dans la liste
  `/admin/offers`) est retiré de la liste.
* Le détail d'une offre présente à la place un bouton "Modifier" qui permet :
  * de modifier les champs de texte de l'offre (comme un formulaire d'édition
    classique) ;
  * et de réaffecter l'entreprise, le contact prioritaire et les contacts
    associés (comportement atomique existant de
    `PATCH /api/offers/:id/assignment`), au même endroit.
* La liste `/admin/offers` garde un accès "Détails" vers cette vue ; c'est
  depuis le détail que la correction s'effectue, plus depuis la liste.

### 5. Une seule offre proposée en attente par étudiant

* Un étudiant peut candidater (`applications`) à autant d'offres qu'il le
  souhaite : cette règle n'est pas modifiée.
* En revanche, un étudiant ne peut avoir qu'une seule offre de sa propre
  soumission (`source_type = student`, `submitted_by_student_id` = lui) dans un
  état non finalisé (`soumise`) à un instant donné.
* S'il tente de soumettre une nouvelle offre alors qu'il en a déjà une en
  attente de validation, la création est refusée et l'interface lui indique
  qu'il a déjà une offre en attente et qu'il doit attendre sa validation avant
  d'en soumettre une nouvelle.
* Dès que sa précédente offre est validée, refusée, ou passe à un statut final,
  l'étudiant peut de nouveau soumettre une nouvelle offre.

### 6. Nom de l'entreprise visible et cliquable sur les offres

* Le nom de l'entreprise liée à une offre est affiché à la fois dans le résumé
  (liste) et dans le détail de l'offre.
* Ce nom est cliquable et amène vers le détail de l'entreprise correspondante,
  sous réserve des règles de visibilité déjà en vigueur (une entreprise en
  attente reste invisible à qui n'y a pas droit).

## Règles métier

* Un étudiant ne peut avoir qu'une offre de statut `soumise` dont il est le
  créateur (`submitted_by_student_id`) à la fois. Une tentative de nouvelle
  soumission alors qu'une offre `soumise` de cet étudiant existe déjà est
  refusée.
* Cette limite ne s'applique ni aux offres créées par une entreprise ou un
  gestionnaire, ni aux candidatures (`applications`) d'un étudiant.
* Le nom de l'étudiant créateur n'est exposé au gestionnaire que pour les
  offres dont la source est un étudiant.
* Le lien vers le détail d'une entreprise depuis une offre respecte les règles
  de visibilité déjà définies pour les entreprises en attente.
* L'ajout d'un nouveau contact à une entreprise existante par un étudiant ne
  requiert plus de recherche préalable exécutée : l'obligation posée par
  `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md` est
  abrogée par cette spec.

## Critères d'acceptation

* [x] Après sélection d'une entreprise dans le parcours de proposition, la
  liste des contacts de cette entreprise s'affiche entièrement avant toute
  saisie dans la recherche.
* [x] L'action d'ajout d'un nouveau contact est disponible sans qu'une
  recherche ait été exécutée au préalable.
* [x] Un étudiant voit "Soumise par moi" sur l'offre qu'il a lui-même soumise
  dans la liste des offres.
* [x] Le gestionnaire voit le nom de l'étudiant créateur dans la liste
  `/admin/offers` pour toute offre soumise par un étudiant.
* [x] Le gestionnaire voit le nom de l'étudiant créateur dans le détail d'une
  offre soumise par un étudiant.
* [x] Le bouton de correction d'entreprise/contacts n'apparaît plus dans la
  liste `/admin/offers`.
* [x] Le détail d'une offre propose un bouton "Modifier" permettant de changer
  le texte de l'offre et de réaffecter entreprise/contacts.
* [x] Une tentative de soumission d'une nouvelle offre par un étudiant ayant
  déjà une offre `soumise` en attente est refusée avec un message explicite.
* [x] Un étudiant peut de nouveau soumettre une offre dès que sa précédente
  offre soumise n'est plus au statut `soumise`.
* [x] Le nom de l'entreprise apparaît sur le résumé et sur le détail d'une
  offre, avec un lien vers le détail de l'entreprise.

## Impacts techniques connus

Features impactées :

* Backend : `backend/src/features/offers`
* Backend : `backend/src/features/companies` (lecture, pas de changement de
  règle de visibilité)
* Frontend : `frontend/src/pages/student-proposal.page.tsx`
* Frontend : `frontend/src/pages/admin-offers.page.tsx`
* Frontend : offres consultées côté étudiant (liste et détail)
* Frontend : `frontend/src/features/offers`

Données impactées :

* Aucune nouvelle colonne a priori pressentie : `submitted_by_student_id`,
  `source_type`, `company_id` et le statut `soumise` existent déjà. À confirmer
  au plan technique si un index est nécessaire pour vérifier efficacement
  "une offre `soumise` déjà existante pour cet étudiant".

Routes, API ou écrans impactés :

* `POST /api/offers` : nouvelle vérification bloquante si une offre `soumise`
  existe déjà pour l'étudiant soumetteur.
* `GET /api/offers` et `GET /api/offers/:id` : exposer le nom de l'étudiant
  créateur pour le gestionnaire, et l'entreprise liée (nom, identifiant) pour
  tous les rôles autorisés à voir l'offre.
* `/admin/offers` : retrait du bouton de correction dans la liste.
* Détail d'une offre (page à identifier/créer au plan technique si le détail
  n'est aujourd'hui qu'une modale ou une section de liste) : ajout du bouton
  "Modifier" (texte + réaffectation) et affichage du nom de l'étudiant et de
  l'entreprise.
* Parcours `/offers/proposal` : affichage par défaut de tous les contacts de
  l'entreprise sélectionnée.

Permissions ou rôles impactés :

* Aucun changement de permission : ajustements d'affichage et une nouvelle
  contrainte de création côté étudiant.

Tests à prévoir :

* refus de création d'une deuxième offre `soumise` par le même étudiant tant
  que la première n'est pas finalisée ;
* autorisation d'une nouvelle soumission après validation ou refus de la
  précédente ;
* présence du nom de l'étudiant dans les réponses `GET /api/offers` et
  `GET /api/offers/:id` uniquement quand la source est un étudiant ;
* présence du nom et de l'identifiant de l'entreprise dans les réponses
  d'offres ;
* tests frontend de l'affichage "Soumise par moi", du bouton "Modifier" dans
  le détail, et de la liste de contacts par défaut après sélection
  d'entreprise.

## Documents liés

* Spec liée : `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`
* Architecture : `docs/architecture.md`
* README de feature : `backend/src/features/offers/README.md`
* README de feature : `backend/src/features/companies/README.md`
* Review : à créer lors de l'implémentation

## Incertitudes

* L'emplacement exact du "détail d'une offre" côté frontend (page dédiée ou
  section dépliée dans `/admin/offers`) reste à trancher au plan technique ;
  cette spec exige seulement que la correction n'apparaisse plus dans la
  liste elle-même.
* Le comportement exact si l'étudiant tente de rouvrir/relancer une offre déjà
  `refusee` n'est pas précisé ici : cette spec ne bloque que la coexistence de
  deux offres `soumise` du même étudiant.
