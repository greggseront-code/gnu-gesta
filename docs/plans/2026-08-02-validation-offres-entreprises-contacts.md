# Plan - validation des offres, entreprises et contacts

Date : 2026-08-02

Statut : brouillon

## Contexte

Le référentiel des entreprises et contacts doit accepter les propositions
étudiantes sans les rendre immédiatement visibles à tous. Le plan introduit la
modération de ces données, renforce les dépendances de validation des offres et
ajoute les parcours frontend nécessaires, sans étendre le périmètre à une
messagerie interne.

Sources à relire avant exécution :

* Spec : `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* Extensions futures : `docs/future-extensions.md`
* README de feature : `backend/src/features/companies/README.md`
* README de feature : `backend/src/features/offers/README.md`
* Review précédente : `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md`

## Objectif

Mettre en place un workflow complet de proposition, visibilité restreinte et
validation des entreprises et contacts, puis empêcher la publication d'une
offre tant que toutes ses dépendances ne sont pas validées.

Le plan doit permettre de vérifier :

* qu'un étudiant peut utiliser immédiatement ses propres données en attente,
  sans les exposer à un autre étudiant ou au lecteur ;
* que les créations du gestionnaire et les contacts ajoutés par l'entreprise
  sont directement validés ;
* que le gestionnaire dispose de files d'attente organisées et peut modifier,
  accepter, refuser ou réaffecter les soumissions ;
* qu'aucune offre ne devient visible avec une entreprise ou un contact en
  attente ;
* que les données existantes restent validées après migration.
* que l'email d'un contact et le couple nom/adresse d'une entreprise respectent
  leurs contraintes d'unicité normalisées.

## Périmètre

Inclus :

* évolution SQLite des entreprises et contacts ;
* contraintes d'unicité des contacts et entreprises ;
* filtrage backend des listes, recherches et lectures directes ;
* création et ajout de contact contextualisés par le rôle effectif ;
* endpoints de modération réservés au gestionnaire ;
* contrôle des dépendances et réaffectation atomique d'une offre ;
* recherche obligatoire avant les formulaires étudiants ;
* écrans `/admin/offers` et `/admin/companies` ;
* compteurs du tableau de bord ;
* tests backend et frontend, documentation et review finale.

Exclus :

* messagerie, commentaires de modération et notifications ;
* fusion automatique des doublons ;
* création d'une entreprise par le rôle `entreprise` ;
* historique des entreprises ou contacts refusés ;
* authentification réelle des entreprises ;
* changement du workflow des candidatures.

## Impacts prévus

* Backend : features `companies` et `offers`, avec ajustements des routes,
  schémas, services, requêtes et types.
* Frontend : contrats companies/offers, proposition étudiante, nouvelle page
  admin entreprises, administration des offres, accueil, navigation et gardes
  de routes.
* Données : colonnes de validation et d'attribution sur `companies` et
  `company_contacts`, index de filtrage et migration des lignes existantes.
* Documentation : modèle de données, carte des features, README companies et
  offers, éventuels écarts de spec et review d'implémentation.
* Tests : `db`, `companies`, `offers`, `access-control` et nouveaux tests de
  pages frontend.

## Décisions propres à ce plan

* Les entreprises et contacts utilisent `validation_status` avec les valeurs
  `pending` et `validated`. Un refus supprime la soumission et ne nécessite pas
  de troisième statut.
* `submitted_by_student_id` identifie le créateur autorisé à relire un élément
  en attente. Il reste nul pour les créations directement validées.
* `validated_at` est renseigné lors d'une création directement validée ou
  d'une acceptation. Il n'est pas nécessaire d'étendre `req.auth` avec
  l'identifiant technique du gestionnaire dans ce périmètre.
* `created_with_company` distingue les contacts de la soumission initiale. Tous
  les contacts transmis dans la transaction de création sont acceptés avec
  l'entreprise ; le formulaire étudiant continue à n'en créer qu'un.
* Les colonnes de validation ont une valeur par défaut `validated` pour que les
  bases existantes et les seeds restent valides. La migration vérifie
  explicitement ce résultat.
* L'email d'un contact est une clé métier unique globale. L'index porte sur
  `LOWER(TRIM(email))` et s'applique aux lignes validées comme aux lignes en
  attente.
* Une entreprise est unique par la combinaison normalisée de son nom et de son
  adresse. L'index porte sur `LOWER(TRIM(name))` et
  `LOWER(TRIM(COALESCE(address, '')))`, de sorte que `NULL`, une chaîne vide et
  une chaîne d'espaces représentent la même adresse absente.
* Le nom seul, l'adresse seule et l'email général d'une entreprise ne sont pas
  uniques. Une même organisation peut donc avoir plusieurs implantations.
* Avant de créer les index uniques sur une base existante, la migration cherche
  les conflits et échoue avec les identifiants à corriger. Elle ne supprime, ne
  fusionne et ne renomme aucune donnée métier automatiquement.
* Les services traduisent les violations d'unicité à la création ou à la
  modification en `409 Conflict`. Une erreur concernant un élément masqué reste
  générique et ne retourne ni son identifiant ni ses données.
* Un élément masqué est traité comme introuvable lors d'une lecture directe
  afin de ne pas révéler son existence à un utilisateur non autorisé.
* `GET /api/companies/pending` retourne les deux files de modération et les
  informations nécessaires à l'écran gestionnaire, y compris les offres qui
  bloqueraient un refus.
* Les actions de contrôle utilisent des routes explicites : validation d'une
  entreprise ou d'un contact, modification d'un contact et suppression de la
  soumission en cas de refus.
* Une suppression bloquée par une offre retourne `409 Conflict` avec les
  identifiants des offres concernées. La vérification métier précède le
  `DELETE`, même lorsque la clé étrangère SQLite bloquerait aussi l'opération.
* La correction d'une offre passe par
  `PATCH /api/offers/:id/assignment` avec `company_id`,
  `priority_contact_id` et `contact_ids`. L'opération remplace atomiquement
  l'entreprise et tous les contacts afin de préserver leur cohérence.
* L'ancienne correction limitée à `PATCH /api/offers/:id/company` est retirée
  après migration du seul appelant frontend ; elle ne doit pas rester comme
  chemin permettant de violer l'invariant entreprise/contacts.
* La création et la réaffectation d'une offre vérifient que le contact
  prioritaire figure dans `contact_ids` et que tous les contacts appartiennent
  à l'entreprise choisie.
* Une offre créée par un gestionnaire est insérée directement comme
  `validee_et_visible`. Une création étudiante ou entreprise reste `soumise`.
* La recherche préalable est imposée dans l'état du frontend ; elle ne devient
  pas un jeton serveur. Elle vise les doublons approchants, tandis que les
  index empêchent les doublons exacts selon les clés métier retenues.
* La page `/admin/companies` comporte deux sections adressables, Entreprises et
  Contacts, afin que les compteurs du tableau de bord puissent cibler la bonne
  section.

Ne pas faire dans ce plan :

* Ajouter un contournement frontend à un contrôle d'accès backend.
* Considérer le nom seul, l'adresse seule ou l'email général d'une entreprise
  comme une clé unique.
* Résoudre automatiquement un conflit historique en supprimant ou fusionnant
  des entreprises ou contacts.
* Supprimer en cascade une offre lorsqu'une entreprise ou un contact est
  refusé.
* Valider automatiquement une offre lorsque sa dernière dépendance est
  acceptée.
* Exposer les soumissions en attente au rôle `lecteur`.
* Permettre à un étudiant de créer une entreprise depuis l'annuaire générique
  sans passer par la recherche du parcours de proposition.

## Structure cible

```text
backend/src/features/
  companies/
    companies.routes.ts       # lecture filtrée et routes de modération
    companies.service.ts      # décisions par rôle et transactions
    companies.queries.ts      # filtres, files, références et mutations
    companies.schemas.ts
    companies.types.ts
  offers/
    offers.routes.ts           # validation et réaffectation complète
    offers.service.ts          # invariants des dépendances
    offers.queries.ts
    offers.schemas.ts
    offers.types.ts

frontend/src/
  features/
    companies/
      companies.api.ts
      companies.types.ts
    offers/
      offers.api.ts
      offers.types.ts
  pages/
    admin-companies.page.tsx   # entreprises et contacts en attente
    admin-offers.page.tsx
    student-proposal.page.tsx
    home.page.tsx
```

## Tasks list

### 001. Ajouter le modèle de validation et sa migration SQLite

**Files:**

* Read: `backend/src/db/schema.sql`
* Read: `backend/src/db/db.migrate.ts`
* Read: `backend/src/db/seeds/seed.sql`
* Read: `backend/src/db/seeds/demo.sql`
* Modify: `backend/src/db/schema.sql`
* Modify: `backend/src/db/db.migrate.ts`
* Modify: `backend/tests/db.test.ts`

**Travail :**

* [ ] Ajouter à `companies` l'état de validation,
  `submitted_by_student_id` et `validated_at`.
* [ ] Ajouter les mêmes informations à `company_contacts`, ainsi que
  `created_with_company`.
* [ ] Contraindre les statuts à `pending` ou `validated` et les booléens à
  `0` ou `1` selon les conventions SQLite du projet.
* [ ] Ajouter les index utiles aux files d'attente et aux recherches par
  créateur.
* [ ] Ajouter l'index unique global sur l'email normalisé des contacts.
* [ ] Ajouter l'index unique sur le couple nom/adresse normalisé des
  entreprises, avec équivalence entre adresse nulle et adresse vide.
* [ ] Ajouter un audit de pré-migration qui liste les identifiants en conflit et
  bloque la création des index sans modifier les données.
* [ ] Étendre `applyColumnMigrations()` pour les bases existantes sans recréer
  les tables ni perdre de données.
* [ ] Garantir que toutes les lignes existantes et les seeds sont marqués
  `validated`, avec un `validated_at` cohérent.
* [ ] Tester une base neuve, une base historique sans conflit et une base
  historique contenant chaque type de conflit avant migration.

**Verification:**

* Run: `cd backend && npm test -- --run tests/db.test.ts`
* Run: `cd backend && npm run build`
* Expected: le schéma neuf et la migration historique valide produisent les
  mêmes colonnes et index ; aucun enregistrement existant ne rejoint la file
  d'attente ; une base conflictuelle échoue sans perte de données.

**Human observables:**

* Une base existante sans conflit démarre sans intervention manuelle.
* Les entreprises et contacts de démonstration restent visibles après la
  migration.

### 002. Contextualiser la création et la visibilité des entreprises et contacts

**Files:**

* Read: `backend/src/middlewares/auth-context.middleware.ts`
* Modify: `backend/src/features/companies/companies.types.ts`
* Modify: `backend/src/features/companies/companies.schemas.ts`
* Modify: `backend/src/features/companies/companies.queries.ts`
* Modify: `backend/src/features/companies/companies.service.ts`
* Modify: `backend/src/features/companies/companies.routes.ts`
* Modify: `backend/tests/companies.test.ts`
* Modify: `backend/tests/access-control.test.ts`

**Travail :**

* [ ] Faire passer `req.auth` aux services de création, liste, recherche,
  détection de doublons et lecture détaillée.
* [ ] Créer une entreprise et ses contacts initiaux comme `pending` avec le
  créateur lorsque le rôle effectif est `etudiant`.
* [ ] Créer les entreprises et contacts du gestionnaire comme `validated`.
* [ ] Retirer au rôle `entreprise` le droit de créer une entreprise.
* [ ] Ouvrir l'ajout de contact à l'étudiant lorsque l'entreprise cible est
  validée ou est sa propre entreprise en attente.
* [ ] Créer un contact étudiant comme `pending`, et un contact gestionnaire ou
  entreprise propriétaire comme `validated`.
* [ ] Filtrer toutes les listes et recherches : le gestionnaire voit tout, le
  créateur voit ses éléments en attente, les autres rôles ne voient que les
  éléments validés autorisés par leurs règles existantes.
* [ ] Filtrer les contacts retournés par le détail d'une entreprise avec la
  même règle.
* [ ] Retourner `404` pour un détail en attente demandé par un utilisateur non
  autorisé et conserver `403` pour une entreprise qui demande une autre fiche.
* [ ] Adapter la détection de doublons afin qu'elle ne révèle pas un élément
  masqué à un étudiant ou au lecteur, tout en restant complète pour le
  gestionnaire.
* [ ] Traduire les conflits exacts de nom/adresse et d'email en `409`, sans
  exposer l'identifiant ni les données d'un élément en attente masqué.

**Verification:**

* Run: `cd backend && npm test -- --run tests/companies.test.ts tests/access-control.test.ts`
* Run: `cd backend && npm run build`
* Expected: deux étudiants distincts ne voient jamais les soumissions en
  attente l'un de l'autre ; le gestionnaire voit les deux ; le lecteur ne voit
  que les données validées.

**Human observables:**

* Une recherche identique retourne des résultats différents selon le rôle et
  le créateur, sans fuite dans la lecture par URL directe.
* Un contact ajouté en mode entreprise est immédiatement disponible.

### 003. Exposer les actions gestionnaire sur les entreprises et contacts

**Files:**

* Modify: `backend/src/features/companies/companies.types.ts`
* Modify: `backend/src/features/companies/companies.schemas.ts`
* Modify: `backend/src/features/companies/companies.queries.ts`
* Modify: `backend/src/features/companies/companies.service.ts`
* Modify: `backend/src/features/companies/companies.routes.ts`
* Modify: `backend/tests/companies.test.ts`
* Modify: `backend/tests/access-control.test.ts`

**Travail :**

* [ ] Ajouter `GET /api/companies/pending`, réservé au gestionnaire, avec deux
  collections, les données du créateur, les doublons probables et les offres
  qui référencent chaque élément.
* [ ] Ajouter la modification d'un contact par le gestionnaire avec validation
  Zod des mêmes champs que la création.
* [ ] Appliquer les mêmes contrôles d'unicité aux modifications d'entreprise et
  de contact qu'à leur création.
* [ ] Ajouter l'acceptation d'une entreprise dans une transaction qui valide
  aussi tous ses contacts `created_with_company`.
* [ ] Ajouter l'acceptation individuelle d'un contact ajouté ultérieurement.
* [ ] Ajouter le refus d'une entreprise et d'un contact sous forme de
  suppression explicite de la soumission.
* [ ] Vérifier les références dans `offers.company_id`,
  `offers.priority_contact_id` et `offer_contacts` avant toute suppression.
* [ ] Retourner `409` et les `offer_ids` concernés si la suppression est
  bloquée ; ne supprimer aucune donnée dans ce cas.
* [ ] Refuser les transitions incohérentes : validation répétée, action sur un
  élément absent ou tentative de modération par un autre rôle.
* [ ] Vérifier l'atomicité de l'acceptation entreprise/contacts et l'absence de
  suppression en cascade d'une offre.

**Verification:**

* Run: `cd backend && npm test -- --run tests/companies.test.ts tests/access-control.test.ts`
* Run: `cd backend && npm run build`
* Expected: les files et actions sont réservées au gestionnaire ; une
  entreprise et ses contacts initiaux changent ensemble d'état ; un refus
  référencé retourne `409` sans mutation partielle.

**Human observables:**

* Les réponses bloquées identifient les offres à corriger.
* Une soumission non référencée disparaît de la file après refus.

### 004. Renforcer la création et la validation des offres

**Files:**

* Modify: `backend/src/features/offers/offers.types.ts`
* Modify: `backend/src/features/offers/offers.schemas.ts`
* Modify: `backend/src/features/offers/offers.queries.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/src/features/offers/offers.routes.ts`
* Modify: `backend/tests/offers.test.ts`
* Modify: `backend/tests/access-control.test.ts`

**Travail :**

* [ ] Vérifier à la création qu'une entreprise est visible pour l'auteur et
  que chaque contact appartient à cette entreprise.
* [ ] Exiger que `priority_contact_id` soit inclus dans `contact_ids`.
* [ ] Autoriser un étudiant à créer une offre avec sa propre entreprise ou ses
  propres contacts en attente, mais jamais avec ceux d'un autre étudiant.
* [ ] Insérer directement en `validee_et_visible` une offre créée par le
  gestionnaire et conserver `soumise` pour les rôles étudiant et entreprise.
* [ ] Conserver l'attribution nécessaire à la visibilité du créateur et
  enregistrer l'historique de statut attendu lors d'une création directement
  validée.
* [ ] Calculer pour le gestionnaire les dépendances en attente d'une offre :
  entreprise, contact prioritaire et contacts associés.
* [ ] Bloquer `POST /api/offers/:id/validate` avec `409` et une réponse
  structurée tant qu'une dépendance est en attente ou incohérente.
* [ ] Retirer au lecteur la visibilité des offres `soumise`, sans modifier son
  accès aux offres déjà publiées selon les règles existantes.
* [ ] Maintenir la visibilité d'une offre `soumise` pour son étudiant ou son
  entreprise créatrice et le gestionnaire.

**Verification:**

* Run: `cd backend && npm test -- --run tests/offers.test.ts tests/access-control.test.ts`
* Run: `cd backend && npm run build`
* Expected: aucune offre ne peut être publiée avec une dépendance en attente ou
  un contact d'une autre entreprise ; les offres du gestionnaire sont
  immédiatement publiées.

**Human observables:**

* L'erreur de validation distingue clairement l'entreprise et les contacts à
  traiter.
* Le créateur retrouve son offre en attente après rafraîchissement.

### 005. Remplacer la correction partielle par une réaffectation atomique

**Files:**

* Modify: `backend/src/features/offers/offers.schemas.ts`
* Modify: `backend/src/features/offers/offers.queries.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/src/features/offers/offers.routes.ts`
* Modify: `backend/tests/offers.test.ts`
* Modify: `backend/tests/companies.test.ts`

**Travail :**

* [ ] Ajouter le schéma de
  `PATCH /api/offers/:id/assignment` avec entreprise, contact prioritaire et
  liste complète des contacts.
* [ ] Réserver la route au gestionnaire.
* [ ] Exiger une entreprise et des contacts validés pour une correction
  gestionnaire destinée à débloquer une offre.
* [ ] Vérifier l'appartenance de tous les contacts et la présence du contact
  prioritaire dans la liste.
* [ ] Mettre à jour `offers.company_id`, `offers.priority_contact_id` et
  remplacer `offer_contacts` dans une transaction unique.
* [ ] Retirer `PATCH /api/offers/:id/company` et ses fonctions devenues
  dangereuses après migration de ses appelants.
* [ ] Tester qu'une transaction invalide laisse l'affectation initiale intacte.
* [ ] Tester que la réaffectation débloque ensuite le refus de l'ancienne
  entreprise ou de l'ancien contact.

**Verification:**

* Run: `cd backend && npm test -- --run tests/offers.test.ts tests/companies.test.ts`
* Run: `cd backend && npm run build`
* Expected: une offre ne peut jamais conserver un contact de son ancienne
  entreprise et un élément réaffecté peut ensuite être refusé.

**Human observables:**

* Après correction, le détail de l'offre présente uniquement la nouvelle
  entreprise et ses contacts.

### 006. Adapter les contrats frontend et le parcours de proposition étudiante

**Files:**

* Modify: `frontend/src/features/companies/companies.types.ts`
* Modify: `frontend/src/features/companies/companies.api.ts`
* Modify: `frontend/src/features/offers/offers.types.ts`
* Modify: `frontend/src/features/offers/offers.api.ts`
* Modify: `frontend/src/pages/student-proposal.page.tsx`
* Modify: `frontend/src/pages/companies.page.tsx`
* Modify: `frontend/src/pages/home.page.tsx`
* Modify: `frontend/src/pages/admin-company-form.page.tsx`
* Create: `frontend/src/pages/student-proposal.test.tsx`
* Modify: `frontend/src/pages/companies.test.tsx`

**Travail :**

* [ ] Ajouter aux types frontend l'état, le créateur et les informations de
  blocage nécessaires, sans exposer de champ interne inutile.
* [ ] Ajouter les appels API d'ajout de contact étudiant et de réaffectation
  complète d'une offre.
* [ ] Afficher avant la recherche d'entreprise le message anti-doublon et
  garder la création indisponible tant qu'une recherche n'a pas été soumise.
* [ ] Réinitialiser l'autorisation de créer lorsque le terme de recherche est
  modifié, afin qu'un ancien résultat ne débloque pas un nouveau terme.
* [ ] Ajouter à l'étape contact une recherche par nom ou email, le message
  anti-doublon et un formulaire de création débloqué seulement après cette
  recherche.
* [ ] Sélectionner immédiatement le contact créé puis permettre la poursuite de
  la proposition.
* [ ] Signaler visuellement à l'étudiant que sa propre entreprise ou son propre
  contact est en attente, sans empêcher son utilisation.
* [ ] Retirer des pages génériques et du tableau de bord étudiant/entreprise
  les liens de création d'entreprise ; conserver la création directe du
  gestionnaire.
* [ ] Tester les deux barrières de recherche, les messages, les remises à zéro
  et la sélection des données nouvellement créées.
* [ ] Afficher un message métier compréhensible lorsque l'API retourne `409`
  pour un contact ou une entreprise déjà existant.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/student-proposal.test.tsx src/pages/companies.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: les formulaires restent bloqués avant recherche et le parcours
  complet crée puis réutilise les éléments en attente sans erreur de type.

**Human observables:**

* L'étudiant comprend pourquoi il doit chercher avant de créer.
* Après création, l'entreprise ou le contact porte une indication « En attente
  de validation » et peut être choisi immédiatement.

### 007. Créer l'administration des entreprises et contacts en attente

**Files:**

* Modify: `frontend/src/features/companies/companies.types.ts`
* Modify: `frontend/src/features/companies/companies.api.ts`
* Create: `frontend/src/pages/admin-companies.page.tsx`
* Create: `frontend/src/pages/admin-companies.test.tsx`
* Modify: `frontend/src/pages/admin-company-detail.page.tsx`
* Modify: `frontend/src/app/app.tsx`
* Modify: `frontend/src/components/app-layout.tsx`
* Modify: `frontend/src/styles/global.css`

**Travail :**

* [ ] Ajouter un garde frontend fondé sur le rôle effectif `gestionnaire` et
  protéger `/admin/companies` sans se limiter au masquage de navigation.
* [ ] Afficher deux sections adressables avec compteurs, états vide, chargement
  et erreur.
* [ ] Présenter pour chaque soumission le créateur, la date, les données utiles,
  les doublons probables et les offres qui la référencent.
* [ ] Relier la modification d'une entreprise à son écran de détail et ajouter
  l'édition des contacts en attente.
* [ ] Implémenter les actions accepter et refuser avec confirmation avant la
  suppression.
* [ ] En cas de `409`, conserver la soumission à l'écran et afficher les liens
  vers toutes les offres à réaffecter.
* [ ] Après succès, rafraîchir les deux compteurs et retirer l'élément traité de
  la file.
* [ ] Ajouter l'entrée « Admin entreprises » uniquement dans la navigation du
  gestionnaire.
* [ ] Tester l'accès gestionnaire, les sections, l'acceptation, le refus simple
  et le refus bloqué.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/admin-companies.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: le gestionnaire traite les deux types de soumission ; un refus
  bloqué reste visible avec des liens exploitables.

**Human observables:**

* `/admin/companies` permet d'identifier en un regard le type et le volume de
  travail restant.
* Un lecteur, un étudiant ou une entreprise est redirigé hors de cet écran.

### 008. Mettre à niveau l'administration des offres et le tableau de bord

**Files:**

* Modify: `frontend/src/features/offers/offers.api.ts`
* Modify: `frontend/src/features/offers/offers.types.ts`
* Modify: `frontend/src/pages/admin-offers.page.tsx`
* Create: `frontend/src/pages/admin-offers.test.tsx`
* Modify: `frontend/src/pages/home.page.tsx`
* Create: `frontend/src/pages/home.test.tsx`
* Modify: `frontend/src/app/app.tsx`
* Modify: `frontend/src/components/app-layout.tsx`

**Travail :**

* [ ] Réserver `/admin/offers` au seul gestionnaire dans la route, la page et
  la navigation ; retirer son accès au lecteur.
* [ ] Afficher pour chaque offre `soumise` les dépendances en attente et les
  liens vers `/admin/companies`.
* [ ] Désactiver l'action de validation lorsque des dépendances sont signalées,
  tout en conservant le contrôle `409` du backend.
* [ ] Remplacer l'outil « Corriger l'entreprise » par une sélection complète de
  l'entreprise, du contact prioritaire et des contacts associés validés.
* [ ] Appeler la nouvelle route de réaffectation puis recharger les blocages de
  validation.
* [ ] Conserver les actions existantes de refus et de clôture d'offre.
* [ ] Charger sur l'accueil gestionnaire les compteurs d'offres, entreprises et
  contacts en attente.
* [ ] Faire pointer les compteurs vers `/admin/offers` et vers la section
  correspondante de `/admin/companies`.
* [ ] Tester les blocages, la réaffectation, les permissions et les trois
  compteurs.

**Verification:**

* Run: `cd frontend && npm test -- --run src/pages/admin-offers.test.tsx src/pages/home.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: la validation est impossible visuellement et côté API avant
  correction ; les compteurs reflètent les files après traitement.

**Human observables:**

* Depuis l'offre bloquée, le gestionnaire atteint directement la donnée à
  contrôler ou peut réaffecter l'offre.
* Le tableau de bord résume les trois files sans exposer leur contenu à un
  autre rôle.

### 009. Exécuter la vérification transversale des permissions et invariants

**Files:**

* Modify: `backend/tests/access-control.test.ts`
* Modify: `backend/tests/companies.test.ts`
* Modify: `backend/tests/offers.test.ts`
* Read: `backend/tests/helpers/authenticated-agent.ts`
* Read: `frontend/src/test-setup.ts`

**Travail :**

* [ ] Construire un scénario avec deux étudiants, un gestionnaire, un lecteur
  et une entreprise incarnée.
* [ ] Vérifier listes, recherches et lectures par identifiant pour une
  entreprise, un contact et une offre en attente.
* [ ] Vérifier les créations directement validées et les créations soumises à
  modération pour chaque rôle autorisé.
* [ ] Vérifier qu'un étudiant ne peut utiliser que ses propres dépendances en
  attente.
* [ ] Vérifier l'acceptation groupée, l'acceptation séparée et les refus avec ou
  sans référence.
* [ ] Vérifier que les routes gestionnaire retournent `403` aux autres rôles et
  `401` sans session.
* [ ] Vérifier l'invariant entreprise/contacts avant et après réaffectation.
* [ ] Vérifier l'unicité de l'email des contacts et du couple nom/adresse des
  entreprises à la création comme à la modification, avec casse, espaces et
  adresse absente.
* [ ] Vérifier le cycle complet : proposition étudiante, contrôle des données,
  validation de l'offre puis visibilité pour un autre étudiant.

**Verification:**

* Run: `cd backend && npm test`
* Run: `cd frontend && npm test`
* Run: `cd backend && npm run build`
* Run: `cd frontend && npm run build`
* Expected: suites et builds verts, sans assouplissement des tests existants ni
  fuite inter-rôles.

**Human observables:**

* Un test manuel avec deux sessions étudiantes confirme que la donnée apparaît
  pour son créateur, disparaît pour l'autre avant validation, puis apparaît
  après validation.
* Le scénario gestionnaire peut corriger les références sans suppression
  d'offre.

### 010. Mettre à jour la documentation et produire la review

**Files:**

* Modify: `backend/src/features/companies/README.md`
* Modify: `backend/src/features/offers/README.md`
* Modify: `docs/features.md`
* Modify: `docs/data-model.md`
* Modify: `docs/future-extensions.md`
* Verify: `docs/architecture.md`
* Verify: `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`
* Modify: `docs/plans/2026-08-02-validation-offres-entreprises-contacts.md`
* Create: `docs/reviews/2026-08-02-validation-offres-entreprises-contacts.md`
* Read: `docs/templates/review-template.md`

**Travail :**

* [ ] Documenter les nouveaux champs, index et relations dans le modèle de
  données.
* [ ] Mettre à jour les endpoints, règles serveur, permissions et tests dans
  les deux README de feature.
* [ ] Mettre à jour les parcours et cas limites frontend dans la carte des
  features.
* [ ] Conserver dans `docs/future-extensions.md` la piste d'un modèle de
  départements rattachés à une entreprise, sans l'introduire dans ce chantier.
* [ ] Vérifier si l'architecture globale nécessite une modification ; la
  laisser inchangée si ses principes restent exacts.
* [ ] Reporter dans la spec toute décision métier qui aurait changé pendant
  l'implémentation.
* [ ] Cocher les tâches réellement terminées et documenter les écarts au plan.
* [ ] Créer la review depuis le template avec les commandes exécutées, les
  résultats, les limites et les vérifications humaines restantes.

**Verification:**

* Run: `git diff --check`
* Run: `rg -n "validation_status|/admin/companies|assignment" docs backend/src/features/*/README.md`
* Expected: documentation cohérente avec les routes, champs et fichiers réels ;
  aucun lien ne conserve l'ancienne correction partielle comme API active.

**Human observables:**

* Un nouvel agent peut retrouver depuis `docs/features.md` le parcours, les
  contrats frontend et les README backend concernés.
* La review permet de distinguer ce qui a été automatisé des contrôles manuels
  encore nécessaires.

## Notes de migration

* La migration est additive pour `companies` et `company_contacts` ; elle ne
  recrée pas les tables et ne supprime aucune donnée existante.
* Les lignes historiques reçoivent `validation_status = 'validated'` et ne
  portent pas de `submitted_by_student_id`.
* Avant les index uniques, la migration contrôle les emails de contact avec
  `LOWER(TRIM(email))` et les entreprises avec
  `LOWER(TRIM(name))` + `LOWER(TRIM(COALESCE(address, '')))`. Tout groupe en
  conflit bloque le démarrage avec ses identifiants ; aucune résolution
  automatique n'est autorisée.
* Les contacts historiques reçoivent `created_with_company = 0`. Cette valeur
  n'a pas d'effet après validation et évite de les confondre avec une nouvelle
  soumission initiale.
* Les seeds ne doivent pas être réécrits pour ajouter les colonnes à chaque
  `INSERT` si les valeurs par défaut expriment déjà correctement leur statut.
* Le client frontend doit migrer vers `/assignment` avant le retrait de
  `/company` dans la même intervention. Aucun appelant externe n'est documenté
  à ce jour.
* Une sauvegarde SQLite avec `npm run db:backup` est recommandée avant le
  déploiement de production, même si la migration est additive.

## Points d'attention

* `company_contacts.roles` reste du JSON texte : toute nouvelle requête doit
  continuer à désérialiser les rôles avant de répondre.
* La route statique `/pending` doit être déclarée avant `/:id` dans le routeur
  Express.
* Les requêtes de doublons doivent appliquer la visibilité courante, sauf dans
  la file gestionnaire qui doit volontairement comparer tout le référentiel.
* Les index uniques incluent les soumissions en attente. Un conflit `409` peut
  donc concerner un élément invisible à l'appelant ; le message doit rester
  utile sans confirmer son propriétaire ni exposer ses données.
* Les valeurs doivent être normalisées de la même manière dans les contrôles de
  service, les requêtes de diagnostic et les index SQLite.
* La création d'entreprise accepte actuellement plusieurs contacts malgré une
  interface qui en envoie un. La transaction de validation doit traiter tous
  les contacts marqués `created_with_company`.
* Un contact en attente ajouté à une entreprise validée ne doit pas rendre
  l'entreprise elle-même en attente.
* Une entreprise validée peut contenir simultanément des contacts validés et
  des contacts en attente de créateurs différents ; le filtrage se fait donc
  au niveau de chaque contact.
* La clé étrangère `offer_contacts.contact_id ON DELETE CASCADE` ne suffit pas
  pour le refus : elle supprimerait silencieusement un lien non prioritaire.
  Le service doit bloquer avant le `DELETE`.
* La validation d'une offre doit contrôler tous les contacts de
  `offer_contacts`, pas uniquement `priority_contact_id`.
* Le changement d'entreprise actuel ne corrige pas les contacts. Il ne doit pas
  être conservé comme route alternative après l'ajout de l'affectation
  atomique.
* Une incarnation gestionnaire utilise le rôle effectif étudiant ou entreprise
  et doit donc suivre les mêmes règles que ce rôle. Les files de validation ne
  sont accessibles qu'après sortie de l'incarnation.
* Le cycle `refusee` des offres reste inchangé et distinct de la suppression
  des soumissions d'entreprise ou de contact.
* La confirmation de refus dans le frontend ne remplace jamais la vérification
  de références côté backend.

## Vérification finale

* [ ] Les tests automatisés pertinents passent.
* [ ] Le build pertinent passe.
* [ ] Les vérifications manuelles importantes sont listées.
* [ ] Les documents liés sont à jour.
* [ ] Les chemins documentés correspondent à la structure réelle.
* [ ] Les écarts par rapport au plan sont documentés.
* [ ] Une base historique est migrée sans faire apparaître de faux éléments en
  attente.
* [ ] Les règles de visibilité sont identiques pour liste, recherche et lecture
  directe.
* [ ] Les erreurs `409` de dépendance sont compréhensibles dans les deux écrans
  gestionnaire.
* [ ] La réaffectation d'une offre conserve l'invariant entreprise/contacts.

## Self-review

* Couverture de la spec :
  * les avertissements et recherches obligatoires sont couverts par la tâche
    006 ;
  * la visibilité créateur/gestionnaire est couverte par les tâches 002, 004
    et 009 ;
  * les files et actions gestionnaire sont couvertes par les tâches 003, 007
    et 008 ;
  * les dépendances et chemins alternatifs de réaffectation sont couverts par
    les tâches 004 et 005 ;
  * la migration et la documentation sont couvertes par les tâches 001 et 010.
* Cohérence architecture :
  * les règles d'accès restent imposées côté backend ;
  * les features `companies` et `offers` conservent la séparation
    routes/services/queries/schemas/types ;
  * les transactions SQLite portent les opérations multi-tables.
* Risques restants :
  * l'absence d'historique de refus rend la soumission irrécupérable après
    confirmation ;
  * la détection des doublons approchants reste heuristique, même si les
    doublons exacts sont bloqués par les index ;
  * une base historique conflictuelle nécessitera une correction humaine avant
    de pouvoir démarrer avec la nouvelle version ;
  * l'ajout de plusieurs contacts dans une création d'entreprise reste possible
    au niveau API même si le parcours en présente un seul ;
  * les éventuels consommateurs externes de l'ancienne route `/company` ne sont
    pas inventoriés hors du dépôt.
* Travail restant :
  * implémenter les tâches 001 à 010 dans l'ordre ;
  * valider humainement les libellés anti-doublon et le scénario à deux
    étudiants ;
  * produire la review avant de déclarer la feature terminée.
