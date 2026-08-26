# Validation des offres, entreprises et contacts proposés

## Contexte

Un étudiant qui soumet lui-même un stage peut rattacher sa proposition à une
entreprise existante ou créer une nouvelle entreprise avec un premier contact.
Il doit également pouvoir ajouter un contact manquant à une entreprise
existante.

Ces créations étudiantes sont nécessaires immédiatement pour encoder la
proposition, mais elles ne doivent pas enrichir le référentiel partagé avant
d'avoir été contrôlées par un gestionnaire. Le système valide déjà les offres,
mais les entreprises et les contacts ne portent actuellement aucun statut de
validation ni information sur leur créateur.

Le parcours actuel invite déjà l'étudiant à rechercher une entreprise avant de
la créer. Cette recherche doit devenir une condition explicite de création afin
de réduire les doublons. La même précaution est demandée avant l'ajout d'un
contact.

Le référentiel doit en outre empêcher les doublons exacts : l'email d'un
contact identifie ce contact de façon unique dans toute l'application, tandis
qu'une entreprise est identifiée de façon unique par la combinaison de son nom
et de son adresse. Le nom seul et l'email général d'une entreprise ne sont pas
des clés uniques.

## Objectif

Permettre aux étudiants d'utiliser immédiatement les entreprises et contacts
qu'ils proposent, tout en réservant leur visibilité au créateur et au
gestionnaire jusqu'à validation. Donner au gestionnaire des écrans organisés
pour contrôler les offres, entreprises et contacts en attente.

## Périmètre

Inclus :

* obligation pour l'étudiant de rechercher une entreprise avant de pouvoir en
  proposer une nouvelle ;
* obligation pour l'étudiant de rechercher les contacts d'une entreprise avant
  de pouvoir en ajouter un ;
* ajout d'un contact par un étudiant à une entreprise existante ;
* état de validation et traçabilité minimale du créateur pour les entreprises
  et contacts proposés par un étudiant ;
* validation conjointe d'une entreprise et de son premier contact ;
* visibilité des éléments en attente limitée au gestionnaire et à leur
  créateur ;
* validation préalable des dépendances d'une offre ;
* administration des offres dans `/admin/offers` ;
* administration des entreprises et contacts en attente dans
  `/admin/companies` ;
* compteurs et accès rapides depuis le tableau de bord du gestionnaire ;
* modification, acceptation et refus d'une entreprise ou d'un contact en
  attente par le gestionnaire ;
* unicité globale de l'email d'un contact, sans tenir compte de la casse et des
  espaces en début ou fin de valeur ;
* unicité de la combinaison nom et adresse d'une entreprise, sans tenir compte
  de la casse et des espaces en début ou fin de valeur ;
* migration des entreprises et contacts existants comme éléments validés.

Exclus :

* messagerie ou demande de correction entre le gestionnaire et l'étudiant ;
* notification par email ou dans l'application ;
* fusion automatique des doublons d'entreprises ou de contacts ;
* création d'une entreprise par un utilisateur ayant le rôle `entreprise` ;
* modification du cycle de candidature ou de sélection d'un étudiant ;
* refonte générale du référentiel des entreprises ;
* modélisation des départements ou unités internes d'une entreprise, conservée
  comme extension future ;
* authentification réelle des entreprises, qui reste hors du périmètre actuel.

## Comportement attendu

### Parcours étudiant — entreprise

* Dans le parcours de proposition de stage, l'étudiant doit effectuer une
  recherche d'entreprise avant que l'action de création soit disponible.
* Avant la recherche, l'interface affiche un message expliquant qu'il faut
  d'abord vérifier si l'entreprise existe déjà afin d'éviter un doublon.
* L'action permettant d'afficher le formulaire de création reste indisponible
  tant qu'une recherche n'a pas été exécutée.
* Après la recherche, l'étudiant peut sélectionner un résultat ou proposer une
  nouvelle entreprise.
* Une entreprise proposée est créée avec son premier contact, comme dans le
  parcours actuel.
* L'entreprise et son premier contact sont placés en attente de validation.
* L'étudiant créateur peut immédiatement sélectionner cette entreprise et ce
  contact pour terminer et soumettre sa proposition de stage.
* Tant qu'ils sont en attente, l'étudiant créateur peut les retrouver dans les
  listes, recherches et détails utiles à son propre parcours. Les autres
  étudiants, les lecteurs et les utilisateurs non concernés ne les voient pas.

### Parcours étudiant — contact

* Après avoir sélectionné une entreprise existante, l'étudiant consulte ou
  recherche d'abord les contacts déjà enregistrés pour cette entreprise.
* L'interface rappelle qu'il faut vérifier si le contact existe déjà avant
  d'en créer un.
* L'action d'ajout d'un contact reste indisponible tant que la recherche des
  contacts n'a pas été exécutée.
* Si aucun contact approprié n'existe, l'étudiant peut encoder un nouveau
  contact avec les mêmes champs et contraintes que les contacts actuels.
* Le nouveau contact est en attente de validation, mais reste immédiatement
  sélectionnable par son créateur pour sa proposition de stage.
* Jusqu'à sa validation, ce contact n'est visible que par son créateur et le
  gestionnaire.

### Parcours entreprise et gestionnaire

* Une offre créée sous le rôle `entreprise` est soumise à la validation du
  gestionnaire, comme aujourd'hui.
* Un contact ajouté sous le rôle `entreprise` à sa propre entreprise est
  directement validé et ne rejoint pas la file d'attente.
* Une entreprise, un contact ou une offre créé par un gestionnaire est
  directement validé, sans étape supplémentaire.
* Le rôle `lecteur` ne peut ni consulter les éléments en attente ni accéder aux
  écrans de validation.

### Administration des offres

* La route `/admin/offers` reste l'écran de validation et de gestion des
  offres.
* Seul le gestionnaire peut consulter les offres en attente sur cet écran et
  exécuter les actions de validation ou de refus.
* Une offre en attente reste visible à l'étudiant ou à l'entreprise qui l'a
  créée dans son propre parcours.
* L'écran indique lorsqu'une offre dépend d'une entreprise ou d'un contact en
  attente et fournit un accès au contrôle de ces éléments.
* Le gestionnaire ne peut valider une offre que si son entreprise, son contact
  prioritaire et tous ses contacts rattachés sont validés.
* Le gestionnaire peut rattacher l'offre à une autre entreprise et à des
  contacts valides avant de la valider.
* Le refus d'une offre conserve le comportement existant et son statut
  `refusee` ; cette spec ne remplace pas ce refus par une suppression.

### Administration des entreprises et contacts

* Une nouvelle route `/admin/companies` présente les entreprises et contacts
  en attente dans deux sections clairement séparées, avec un compteur par
  section.
* Seul le gestionnaire peut accéder à cet écran.
* Chaque élément présente les informations nécessaires au contrôle, son
  créateur, sa date de soumission et les éventuels doublons probables.
* Le gestionnaire peut ouvrir le détail, modifier les données soumises,
  accepter l'élément ou le refuser.
* L'acceptation d'une entreprise valide atomiquement l'entreprise et le premier
  contact créé avec elle.
* L'acceptation d'un contact ajouté ultérieurement valide uniquement ce
  contact.
* Le refus correspond à la suppression de la soumission d'entreprise ou de
  contact. Aucun historique fonctionnel des soumissions refusées n'est exigé
  dans ce périmètre.
* Une entreprise ou un contact encore référencé par une offre ne peut pas être
  refusé et supprimé. L'interface explique le blocage et permet au gestionnaire
  d'accéder aux offres concernées afin de les rattacher à une autre entreprise
  ou à un autre contact.
* Le gestionnaire peut aussi laisser l'élément en attente pendant qu'il demande
  à l'étudiant, en dehors de l'application, d'encoder une autre entreprise ou
  un autre contact.

### Tableau de bord gestionnaire

* Le tableau de bord affiche le nombre d'offres en attente, d'entreprises en
  attente et de contacts en attente.
* Les compteurs conduisent respectivement vers `/admin/offers` ou vers la
  section appropriée de `/admin/companies`.
* Ces informations ne sont affichées qu'au gestionnaire.

## Règles métier

* Une entreprise créée par un étudiant commence en attente de validation.
* Le premier contact créé avec cette entreprise commence également en attente.
* L'entreprise et son premier contact forment une même soumission et sont
  validés ensemble, dans une seule opération atomique.
* Un contact ajouté par un étudiant à une entreprise existante commence en
  attente et est validé séparément.
* Les entreprises et contacts créés par un gestionnaire sont directement
  validés.
* Les contacts ajoutés par une entreprise à sa propre fiche sont directement
  validés.
* Les offres créées par un étudiant ou une entreprise commencent avec le statut
  `soumise` et doivent être validées par un gestionnaire.
* Les offres créées par un gestionnaire sont directement validées et visibles.
* Un élément en attente est visible par le gestionnaire et par l'étudiant qui
  l'a créé. Il est absent des listes, recherches et accès directs de tous les
  autres rôles.
* Une offre en attente est visible par le gestionnaire et par son créateur,
  étudiant ou entreprise.
* Les contrôles de visibilité sont appliqués côté backend sur les listes, les
  recherches et la lecture par identifiant. Le masquage dans le frontend ne
  constitue pas un contrôle d'accès.
* Un étudiant peut utiliser ses propres entreprises et contacts en attente dans
  ses propositions, mais ne peut pas utiliser ceux proposés par un autre
  étudiant.
* Une offre ne peut passer à `validee_et_visible` que si son entreprise, son
  contact prioritaire et tous ses contacts associés sont validés.
* Une entreprise ou un contact référencé par une offre ne peut être supprimé.
  Les références doivent d'abord être corrigées par le gestionnaire.
* Le refus d'une entreprise ou d'un contact non référencé supprime la
  soumission.
* La recherche préalable est une condition d'interface et de parcours : elle
  limite les doublons approchants sans garantir leur absence.
* L'email normalisé d'un contact est unique dans tout le référentiel, quel que
  soit son statut ou son entreprise. La normalisation ignore la casse et les
  espaces placés avant ou après l'adresse email.
* La combinaison du nom normalisé et de l'adresse normalisée d'une entreprise
  est unique, quel que soit son statut. La normalisation ignore la casse et les
  espaces placés avant ou après chaque valeur.
* Pour cette contrainte, une adresse absente, nulle ou vide après normalisation
  représente la même valeur. Deux entreprises de même nom sans adresse ne
  peuvent donc pas coexister.
* Le nom seul, l'adresse seule et l'email général d'une entreprise ne sont pas
  uniques. Une même organisation peut exister à plusieurs adresses.
* Une tentative de création ou de modification qui viole une contrainte
  d'unicité est refusée avec `409 Conflict` et un message exploitable invitant
  l'utilisateur à rechercher et sélectionner l'élément existant.
* Les contraintes d'unicité s'appliquent également aux éléments en attente. Un
  élément masqué à l'utilisateur n'est toutefois pas révélé dans le détail de
  la réponse d'erreur.
* Les entreprises et contacts présents avant l'introduction de cette feature
  sont considérés comme validés lors de la migration.

## Critères d’acceptation

* [ ] Un étudiant ne peut pas ouvrir le formulaire de création d'entreprise
  avant d'avoir exécuté une recherche.
* [ ] Le parcours affiche avant la création d'entreprise un message demandant
  de vérifier qu'elle n'existe pas déjà.
* [ ] Une entreprise et son premier contact créés par un étudiant sont en
  attente, restent utilisables par cet étudiant et sont invisibles aux autres
  étudiants et au lecteur.
* [ ] Un étudiant peut rechercher les contacts d'une entreprise existante puis,
  seulement après cette recherche, proposer un nouveau contact.
* [ ] Le parcours affiche avant l'ajout d'un contact un message demandant de
  vérifier qu'il n'existe pas déjà.
* [ ] Un contact proposé par un étudiant est immédiatement utilisable dans sa
  proposition, mais reste invisible aux autres étudiants et au lecteur.
* [ ] Un étudiant ne peut ni lister ni ouvrir par identifiant une entreprise ou
  un contact en attente créé par un autre étudiant.
* [ ] Une offre soumise par un étudiant reste visible et modifiable par son
  auteur selon les permissions existantes, tout en étant invisible aux autres
  étudiants jusqu'à validation.
* [ ] Une offre soumise par une entreprise reste visible par cette entreprise
  et par le gestionnaire jusqu'à validation.
* [ ] Un contact ajouté par une entreprise à sa propre fiche est directement
  validé.
* [ ] Les créations effectuées par le gestionnaire ne génèrent aucun élément en
  attente.
* [ ] Le lecteur ne peut consulter ni les éléments en attente ni les écrans
  `/admin/offers` et `/admin/companies`.
* [ ] `/admin/companies` sépare clairement les entreprises et les contacts en
  attente et affiche leur nombre.
* [ ] Le gestionnaire peut modifier puis accepter ou refuser une entreprise ou
  un contact en attente.
* [ ] Valider une entreprise valide dans la même transaction son premier
  contact.
* [ ] Le backend refuse la validation d'une offre si son entreprise, son
  contact prioritaire ou un de ses contacts associés est encore en attente.
* [ ] L'écran d'administration d'une offre identifie ses dépendances en attente
  et permet au gestionnaire d'accéder à leur contrôle.
* [ ] Le gestionnaire peut corriger l'entreprise et les contacts d'une offre
  avant validation.
* [ ] Le refus d'une entreprise ou d'un contact encore référencé est bloqué avec
  une explication et un accès aux offres concernées.
* [ ] Après correction des références, le gestionnaire peut supprimer la
  soumission d'entreprise ou de contact refusée.
* [ ] Les listes, recherches et lectures directes appliquent toutes les mêmes
  règles de visibilité côté backend.
* [ ] Les entreprises et contacts antérieurs à la feature restent visibles et
  sont automatiquement marqués comme validés.
* [ ] Deux contacts ne peuvent pas partager le même email, y compris avec une
  casse différente ou des espaces périphériques.
* [ ] Deux entreprises ne peuvent pas partager le même nom et la même adresse,
  y compris avec une casse différente ou des espaces périphériques.
* [ ] Deux entreprises de même nom peuvent coexister si leurs adresses sont
  différentes.
* [ ] Deux entreprises de même nom et sans adresse ne peuvent pas coexister.
* [ ] Une violation d'unicité à la création ou à la modification retourne
  `409` sans révéler les données d'une soumission masquée.
* [ ] Le tableau de bord du gestionnaire affiche les trois compteurs d'éléments
  en attente avec des liens vers les écrans correspondants.
* [ ] Des tests backend couvrent les permissions, la visibilité par créateur,
  les dépendances de validation et les refus bloqués par des références.

## Impacts techniques connus

Features impactées :

* Backend : `backend/src/features/companies`
* Backend : `backend/src/features/offers`
* Frontend : `frontend/src/features/companies`
* Frontend : `frontend/src/features/offers`
* Frontend : `frontend/src/pages/student-proposal.page.tsx`
* Frontend : `frontend/src/pages/admin-offers.page.tsx`
* Frontend : nouvelle page d'administration des entreprises et contacts
* Frontend : `frontend/src/pages/home.page.tsx`
* Frontend : `frontend/src/app/app.tsx`
* Frontend : `frontend/src/components/app-layout.tsx`

Données impactées :

* `companies` doit porter un état de validation, l'identifiant éventuel de
  l'étudiant créateur et les métadonnées utiles à la validation.
* `company_contacts` doit porter un état de validation, l'identifiant éventuel
  de l'étudiant créateur et les métadonnées utiles à la validation.
* Le lien entre une entreprise proposée et son ou ses contacts initiaux doit
  permettre une validation atomique de la soumission initiale.
* Un index unique normalisé doit garantir l'unicité globale de
  `company_contacts.email`.
* Un index unique normalisé doit garantir l'unicité du couple `companies.name`
  et `companies.address`, en traitant une adresse nulle comme une chaîne vide.
* La migration doit marquer comme validées toutes les entreprises et tous les
  contacts existants et détecter tout conflit préalable avant de créer les
  index uniques.
* Aucun nouveau statut d'offre n'est requis : `soumise` et
  `validee_et_visible` couvrent déjà le workflow principal.

Routes, API ou écrans impactés :

* `GET /api/companies` et `GET /api/companies/:id` : filtrage selon le statut,
  le rôle et le créateur.
* `POST /api/companies` : statut calculé selon le rôle courant et enregistrement
  du créateur étudiant.
* `POST /api/companies/:id/contacts` : ouverture à l'étudiant, avec contrôle de
  visibilité de l'entreprise et statut calculé selon le rôle.
* Les routes de création et modification d'entreprise ou de contact doivent
  traduire une violation d'unicité en réponse `409` stable.
* Nouvelles routes gestionnaire pour lister, modifier, accepter et refuser les
  entreprises et contacts en attente ; les chemins HTTP précis seront fixés
  dans le plan technique.
* `GET /api/offers` et `GET /api/offers/:id` : maintien de la visibilité pour le
  créateur et exclusion pour les utilisateurs non autorisés.
* `POST /api/offers/:id/validate` : vérification de la validation de
  l'entreprise et de tous les contacts liés.
* Remplacement de `PATCH /api/offers/:id/company` par
  `PATCH /api/offers/:id/assignment`, qui corrige atomiquement l'entreprise,
  le contact prioritaire et les contacts associés.
* `/admin/offers` : validation des offres et présentation des dépendances.
* `/admin/companies` : file de validation des entreprises et contacts.
* Parcours `/offers/proposal` : recherche obligatoire et ajout d'un contact.
* Tableau de bord gestionnaire : compteurs et liens vers les files d'attente.

Permissions ou rôles impactés :

* `gestionnaire` : accès exclusif à toutes les files d'attente et aux actions de
  contrôle.
* `lecteur` : aucun accès aux éléments en attente ni aux écrans de validation.
* `etudiant` : lecture et usage de ses propres soumissions en attente ; ajout
  d'un contact après recherche préalable.
* `entreprise` : lecture de ses propres offres en attente ; création d'offres à
  valider et ajout de contacts directement validés à sa propre fiche.

Tests à prévoir :

* tests unitaires ou d'intégration des transitions de validation des
  entreprises et contacts ;
* validation atomique d'une entreprise et de son premier contact ;
* création directe comme élément validé pour le gestionnaire ;
* création directe comme contact validé pour l'entreprise propriétaire ;
* visibilité des listes, recherches et lectures par identifiant pour chaque
  rôle et pour deux étudiants distincts ;
* utilisation par un étudiant de sa propre entreprise ou de son propre contact
  en attente ;
* impossibilité de valider une offre liée à une dépendance en attente ;
* correction de l'entreprise et des contacts d'une offre ;
* impossibilité de refuser et supprimer une entreprise ou un contact encore
  référencé ;
* validation des schémas d'entrée et contrôle de l'appartenance d'un contact à
  l'entreprise de l'offre ;
* tests frontend du déblocage des formulaires après recherche et des messages
  anti-doublon ;
* test de migration garantissant que les données existantes sont validées ;
* tests d'unicité normalisée des emails de contact à la création et à la
  modification ;
* tests d'unicité normalisée du couple nom/adresse d'entreprise, notamment avec
  deux adresses distinctes et avec une adresse absente ;
* test de migration d'une base historique contenant un conflit, sans
  suppression ni fusion automatique.

## Documents liés

* PRD : aucun
* Architecture : `docs/current/architecture.md`
* README de feature : `backend/src/features/companies/README.md`
* README de feature : `backend/src/features/offers/README.md`
* Carte produit : `docs/current/features.md`
* Modèle de données : `docs/current/data-model.md`
* Extensions futures : `docs/history/analyses/company-departments.md`
* Review : à créer lors de l'implémentation

## Incertitudes

* Le texte exact des deux messages anti-doublon reste à fixer pendant
  l'implémentation, sans modifier leur intention ni le blocage avant recherche.
* Les chemins et formats exacts des nouvelles routes d'administration seront
  définis dans le plan technique.
* La stratégie technique permettant de relier les contacts initiaux à la
  soumission d'entreprise reste à déterminer ; le comportement atomique décrit
  dans cette spec est obligatoire.
