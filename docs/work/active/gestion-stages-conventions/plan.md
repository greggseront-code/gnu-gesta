# Plan - Réimplémentation des stages et des conventions

Date : 2026-09-02

Statut : prêt à exécuter

Emplacement : `docs/work/active/gestion-stages-conventions/plan.md` tant que le
sujet est ouvert ; `docs/history/phases/` à la clôture.

## Contexte

La première implémentation a été annulée après la revue de qualité du
2026-08-28. Le besoin métier reste valide, mais sa réimplémentation doit
distinguer deux ensembles liés sans les livrer comme un seul bloc :

1. constituer et gérer un dossier de stage à partir d'une candidature
   sélectionnée ou d'une proposition étudiante acceptée ;
2. préparer, générer, faire signer hors application et suivre les conventions
   de ce dossier.

Le tag `archive/gestion-stages-016e952` sert uniquement à retrouver les erreurs
déjà observées et l'inventaire des parcours. Aucun fichier n'en est repris sans
être reconçu et couvert par les critères actuels.

Sources minimales à relire avant exécution :

* Spec : `docs/work/active/gestion-stages-conventions/spec.md` ;
* Parcours : `docs/work/active/gestion-stages-conventions/workflow.html` ;
* Review :
  `docs/history/reviews/2026-08-28-gestion-stages-conventions-quality-review.md` ;
* Features : `backend/src/features/offers/README.md`,
  `backend/src/features/applications/README.md`,
  `backend/src/features/students/README.md` et
  `backend/src/features/companies/README.md` ;
* Transversal : `docs/current/architecture.md`,
  `docs/current/data-model.md` et `docs/current/features.md`.

Sur déclencheur seulement :

* modèle juridique provisoire → créer ou mettre à jour l'ADR qui décrit
  précisément les substitutions, sans prendre une décision juridique dans un
  script ;
* stockage de production → `docs/operations/production-readiness.md`.

## Objectif

Livrer des incréments assez petits pour que chacun prouve un comportement
métier utilisable, avec une frontière nette entre la création/gestion du stage
et son circuit de conventions.

Le plan doit permettre de vérifier :

* qu'aucun dossier ne peut être invisible, dupliqué ou partiellement créé ;
* que les deux origines convergent vers le même contrat de dossier sans rendre
  une proposition étudiante publique ;
* que le blocage, la restauration et les états terminaux restent cohérents en
  base, dans l'API et dans l'interface ;
* que les documents sont protégés, reproductibles et isolés du dépôt ;
* que chaque permission, contrainte de données et mise à jour est exercée par
  un test qui atteint réellement le chemin concerné.

## Périmètre

Inclus :

* tout le périmètre de la spec version 2 ;
* les corrections F1 à F22 de la review, soit par un incrément explicite, soit
  par un garde-fou transversal vérifié à la clôture ;
* les adaptations backend, frontend, schéma, tests et documentation nécessaires
  à chaque tranche verticale.

Exclus :

* signature électronique, notifications et édition juridique libre ;
* choix définitif du stockage documentaire de production ;
* migration ou reconstitution de dossiers historiques ;
* reprise directe du commit annulé.

## Découpage fonctionnel

### Axe A - De l'origine au dossier de stage

Cet axe porte l'éligibilité annuelle, les deux créations atomiques, le blocage,
la lecture annuelle, la suppression/restauration et l'export. Il doit être
utilisable sans génération de convention : un dossier en `preparation` est un
résultat métier valide et atteignable.

### Axe B - Gestion des conventions

Cet axe commence sur un dossier existant. Il porte les dates et le signataire,
la convention générée, la convention signée et la confirmation. Il ne crée ni
offre, ni candidature, ni dossier.

Les états terminaux sont livrés après la confirmation, car ils ferment le cycle
du stage et non celui de l'offre d'origine.

## Impacts prévus

* Backend : nouvelle feature `internships`, orchestration transactionnelle dans
  les services, règles partagées dans `backend/src/lib`, intégrations locales
  aux features `students`, `applications` et `offers`.
* Frontend : contrats API et types `internships`, import annuel, retour des deux
  créations, anticipation du blocage, liste annuelle et détail du dossier.
* Données : éligibilités annuelles, dossiers de stage, unicités d'origine et de
  dossier bloquant, métadonnées des deux documents.
* Documentation : README `internships`, contrats locaux des features touchées,
  modèle de données et carte produit seulement lorsque le comportement est
  effectivement vérifié.
* Tests : tests HTTP par rôle, contraintes SQLite réellement déclenchées,
  rejeu/idempotence, contrats du client frontend, composants, DOCX et XLSX.

## Décisions propres à ce plan

* Chaque incrément est une tranche candidate à un commit vérifiable par
  Gregory ; une tranche ne commence pas en laissant les tests de la précédente
  rouges.
* Le schéma d'entrée d'une route reste dans la feature qui expose cette route.
  La notion d'année académique a un propriétaire unique dans chaque runtime :
  `backend/src/lib/academic-year.ts` et `frontend/src/lib/academic-year.ts`.
* La feature `internships` est propriétaire des règles de dossier et expose des
  opérations de service utilisables par `applications` et `offers`. Les
  couches `queries` ne créent pas d'objet appartenant à une autre feature.
* Les statuts bloquants ont une définition métier unique côté TypeScript. La
  duplication obligatoire dans l'index partiel SQLite est couverte par un test
  de cohérence qui échoue si les deux listes divergent.
* La réponse d'une sélection ou d'une acceptation contient l'identifiant du
  dossier créé. Le gestionnaire et le lecteur disposent des liens de détail ;
  l'entreprise reçoit la confirmation de création mais aucun accès aux
  conventions ni à la vue globale.
* Les écritures documentaires reçoivent une racine de stockage injectée depuis
  la composition de l'application. Les tests utilisent un répertoire
  temporaire ; aucun module ne crée un dossier au chargement.
* Une stratégie unique de propagation des erreurs asynchrones est introduite
  avant la première route asynchrone et réutilisée par l'export et les
  documents.
* Les transformations provisoires du modèle Word sont explicites, minimales et
  réversibles. Aucun texte juridique fixe n'est réécrit silencieusement par le
  pipeline.

Ne pas faire dans ce plan :

* créer toute la feature puis ajouter les tests après coup ;
* différer les contrôles de rôles à une tâche finale ;
* utiliser l'année d'éligibilité la plus récente comme rattachement implicite
  d'un dossier non daté ;
* exposer un chemin de fichier local dans une réponse API ;
* mélanger la génération DOCX et l'export XLSX dans le même incrément.

## Structure cible

```text
backend/src/lib/
  academic-year.ts
  async-route.ts
backend/src/features/internships/
  README.md
  internships.routes.ts
  internships.service.ts
  internships.queries.ts
  internships.schemas.ts
  internships.types.ts
  internship-documents.storage.ts
  convention-generator.ts
  internships-export.ts
backend/assets/
  convention-template.docx
frontend/src/lib/
  academic-year.ts
frontend/src/features/internships/
  internships.api.ts
  internships.types.ts
frontend/src/pages/
  internships.page.tsx
  internship-detail.page.tsx
```

La structure est une cible, pas une invitation à créer tous les fichiers dans
le premier incrément. Chaque fichier apparaît seulement quand une tranche en a
besoin.

## Règles de vérification par incrément

Chaque mutation ajoutée dans une tranche doit avoir, dans cette même tranche :

* un test nominal par requête HTTP ;
* un `403` HTTP pour chacun des rôles non autorisés ;
* un test de rejeu : absence d'effet de bord si les données sont identiques, ou
  conflit métier stable si l'opération n'est volontairement pas rejouable ;
* un test de rollback si elle touche plusieurs tables ou le disque et la base ;
* un test qui déclenche réellement chaque nouvelle contrainte SQLite et vérifie
  le code et le message métier retournés.

Chaque adaptation frontend doit avoir dans la même tranche :

* un test du contrat HTTP réel dans le client API ;
* un test du parcours nominal ;
* un test de l'état d'erreur lisible ;
* un test de confirmation pour toute action destructive.

## Tasks list

### 001. Importer l'éligibilité annuelle

**Résultat livrable :** le gestionnaire choisit une année valide et importe des
étudiants éligibles ; le même étudiant peut appartenir à plusieurs années et un
réimport ne retire aucune association.

**Files:**

* Create: `backend/src/lib/academic-year.ts`,
  `frontend/src/lib/academic-year.ts` ;
* Modify: `backend/src/db/schema.sql`, feature `students`, page et client
  d'import étudiant, tests et README `students`.

**Travail :**

* [ ] Ajouter `student_academic_year_eligibility` avec unicité
  étudiant/année et clés étrangères.
* [ ] Faire appartenir le schéma `{ academic_year, students }` à la feature
  `students`, sans dépendance vers `internships`.
* [ ] Valider format, années consécutives et frontières du 14/15 septembre dans
  les propriétaires partagés de l'année académique.
* [ ] Rendre l'import additif, transactionnel et idempotent.
* [ ] Empêcher toute requête frontend si le formulaire est invalide et afficher
  une erreur utilisateur textuelle.

**Verification:**

* Run: tests backend `students-import` et `db`, tests frontend de l'import et du
  client `students`, puis builds ciblés.
* Expected: association vérifiée directement en base, année non consécutive
  refusée sans requête frontend, réimport sans doublon ni retrait.
* Régressions nommées : `F12 schema import owned by students`,
  `F20 invalid academic year does not submit`,
  `academic year switches on September 15`.

**Human observables:** l'écran exige une année comme `2026-2027`, explique une
année invalide et confirme le nombre d'étudiants rattachés.

### 002. Transformer une candidature sélectionnée en dossier

**Résultat livrable :** sélectionner une candidature crée un dossier
`preparation`, sélectionne la candidature et ferme l'offre dans une seule
transaction.

**Files:**

* Create: noyau de la feature `backend/src/features/internships/` ;
* Modify: `backend/src/db/schema.sql`, feature `applications`, composition de
  l'application, client et écran de sélection, tests et README concernés.

**Travail :**

* [ ] Ajouter le dossier minimal avec étudiant, entreprise, origine
  candidature, état et horodatages.
* [ ] Refuser avant mutation un étudiant sans aucune éligibilité avec le code
  métier stable indiquant l'import attendu.
* [ ] Orchestrer dans un service la transaction dossier + candidature + offre
  + historique, en gardant `queries` limitée au SQL.
* [ ] Ajouter les contraintes d'unicité de l'origine et du seul dossier
  bloquant ; observer l'erreur réelle du driver avant de la traduire.
* [ ] Retourner l'identifiant du dossier créé et conserver toutes les autres
  candidatures.

**Verification:**

* Run: tests backend `applications`, `internships-origin-candidature`, `db` et
  tests frontend du client/parcours de sélection.
* Expected: succès atomique ; panne injectée sans candidature sélectionnée,
  offre fermée ni dossier ; vraie collision SQLite traduite en conflit métier.
* Régressions nommées : `F2 selection rejects student without eligibility`,
  `concurrent selections create one blocking internship`,
  `failed selection rolls back all three records`.

**Human observables:** après sélection, l'entreprise voit que le dossier a été
créé ; les rôles autorisés peuvent retrouver son identifiant depuis l'offre.

### 003. Transformer une proposition étudiante sans la publier

**Résultat livrable :** accepter une proposition `soumise` crée directement le
dossier de son auteur et ferme la proposition à `prise`, sans candidature
artificielle ni visibilité publique.

**Files:**

* Modify: feature `offers`, service `internships`, administration des offres,
  détail d'offre, clients, tests et README concernés.

**Travail :**

* [ ] Séparer dans le service la publication d'une offre d'entreprise et
  l'acceptation d'une proposition étudiante.
* [ ] Vérifier auteur, source, état, dépendances validées et éligibilité avant
  la transaction.
* [ ] Produire des erreurs distinctes pour proposition refusée, état source
  inattendu, origine déjà utilisée et absence d'éligibilité.
* [ ] Renvoyer le dossier créé et préserver la visibilité privée de la
  proposition.

**Verification:**

* Run: tests backend `offers` et `internships-origin-proposal`, puis tests
  frontend du client et de l'administration des offres.
* Expected: aucun enregistrement `applications`, aucune visibilité par un autre
  étudiant, transaction totalement annulée sur erreur.
* Régressions nommées : `F5 rejected proposal does not claim an internship
  exists`, `accepted proposal stays private`, `proposal origin is used once`.

**Human observables:** l'action gestionnaire devient « Accepter et créer le
dossier » pour une proposition, avec accès immédiat au dossier créé.

### 004. Appliquer et annoncer le blocage étudiant

**Résultat livrable :** dès qu'un dossier bloquant existe, l'étudiant ne peut
plus postuler ni proposer, et aucune entreprise ne peut le sélectionner
ailleurs ; l'interface l'annonce avant l'action.

**Files:**

* Modify: services et routes `applications`, `offers`, lecture synthétique du
  blocage dans `internships`, pages étudiantes et entreprise, clients et tests.

**Travail :**

* [ ] Garantir le blocage dans les trois commandes backend, à l'intérieur des
  transactions lorsque nécessaire.
* [ ] Exposer un état synthétique stable au frontend sans révéler un dossier à
  un rôle non autorisé.
* [ ] Désactiver candidature et proposition avec un message à la première
  personne ; nettoyer les erreurs de tout nom de classe technique.
* [ ] Vérifier que les candidatures anciennes restent consultables.

**Verification:**

* Run: tests backend `internships-blocking`, `applications`, `offers`, puis
  tests frontend des pages offre/proposition et du client API.
* Expected: trois refus `409` sans mutation ; actions désactivées avant clic ;
  collision concurrente toujours arrêtée par SQLite.
* Régressions nommées : `F8 blocked student sees reason before applying`,
  `another company cannot select blocked student`,
  `existing applications survive blocking`.

**Human observables:** l'étudiant comprend pourquoi ses actions sont
indisponibles sans devoir provoquer une erreur serveur.

### 005. Rendre les dossiers atteignables et suivre l'année

**Résultat livrable :** gestionnaire et lecteur peuvent ouvrir le détail depuis
l'origine et consulter une page annuelle contenant tous les étudiants
éligibles, avec ou sans dossier.

**Files:**

* Modify/Create: requêtes et routes de lecture `internships`, clients, page
  annuelle, page de détail, détail d'offre, navigation, tests et README
  `internships`.

**Travail :**

* [ ] Ajouter les lectures détail, origine et liste annuelle avec les
  permissions serveur prévues.
* [ ] Faire apparaître un dossier non daté dans toutes les années
  d'éligibilité de l'étudiant ; après datation, uniquement dans l'année calculée.
* [ ] Choisir le dossier le plus récent si plusieurs dossiers historiques
  existent pour la même ligne annuelle.
* [ ] Afficher explicitement « dates à compléter » et les étudiants sans stage.
* [ ] Documenter la règle de rattachement annuel dans le README de la feature.

**Verification:**

* Run: tests backend `internships-read` et contrôles d'accès, tests frontend des
  deux pages et des clients.
* Expected: nouvel import d'une année future sans disparition du dossier non
  daté ; `403` étudiant/entreprise sur détail, liste et documents inexistants ;
  lecture gestionnaire/lecteur identique.
* Régressions nommées : `F1 undated internship remains in every eligible year`,
  `origin links reach internship detail`, `annual row includes student without
  internship`.

**Human observables:** aucun dossier créé n'exige de connaître son URL ou de
passer par SQL pour être retrouvé.

### 006. Supprimer un dossier de préparation et restaurer son origine

**Résultat livrable :** le gestionnaire peut annuler un dossier admissible ; la
candidature/offre ou la proposition est restaurée atomiquement et l'étudiant
est débloqué.

**Files:**

* Modify: service, requêtes et route `internships`, intégrations `offers` et
  `applications`, page de détail, clients, tests et README.

**Travail :**

* [ ] Appliquer les préconditions `preparation` et date de début non atteinte.
* [ ] Restaurer une offre classique seulement si elle est encore `prise`, puis
  désélectionner la candidature d'origine.
* [ ] Restaurer une proposition seulement si elle est encore `prise`, vers
  `soumise`, sans la publier.
* [ ] Supprimer les données propres au dossier dans la même unité atomique et
  refuser un état source inattendu au lieu de l'écraser.
* [ ] Exiger une confirmation frontend qui énonce les conséquences.

**Verification:**

* Run: tests backend `internships-delete` pour les deux origines et tous les
  rôles, tests frontend de confirmation/annulation/erreur.
* Expected: restauration complète des deux branches ; panne injectée sans
  mutation partielle ; second appel sans effet ; lecteur, étudiant et
  entreprise refusés par HTTP.
* Régressions nommées : `F19 changed origin blocks restoration`,
  `deleted proposal returns to private submitted state`,
  `deletion rollback preserves internship and origin`.

**Human observables:** la confirmation distingue clairement le retour d'une
offre à la publication et celui d'une proposition à la file privée.

### 007. Exporter exactement la vue annuelle

**Résultat livrable :** gestionnaire et lecteur exportent en XLSX le même jeu de
données et les mêmes libellés que la page annuelle.

**Files:**

* Create: `backend/src/features/internships/internships-export.ts`,
  `backend/src/lib/async-route.ts` ;
* Modify: routes, service de liste partagé, page annuelle, client, dépendances,
  tests et README.

**Travail :**

* [ ] Faire consommer à la page et à l'export le même read model annuel.
* [ ] Produire noms, en-têtes, cellules vides, libellés d'état et types de date
  Excel attendus.
* [ ] Introduire la stratégie commune de route asynchrone et prouver qu'une
  erreur reçoit une réponse HTTP.
* [ ] Appliquer les permissions gestionnaire/lecteur et refuser étudiant et
  entreprise.

**Verification:**

* Run: tests backend `internships-export` et accès, test du client frontend,
  ouverture manuelle d'un classeur représentatif.
* Expected: une ligne par étudiant éligible, y compris sans stage ; dates
  numériques typées ; nom `stages-AAAA-AAAA.xlsx` ; erreur injectée sans
  requête pendante.
* Régressions nommées : `F6 export rejection reaches HTTP error handler`,
  `export headers and rows equal annual read model`,
  `student and company cannot export`.

**Human observables:** le fichier ouvert dans Excel correspond ligne par ligne
au filtre actuellement affiché.

### 008. Préparer les données nécessaires à la convention

**Résultat livrable :** sur un dossier existant, le gestionnaire choisit dates
et signataire ; l'année est calculée et validée contre les éligibilités.

**Files:**

* Modify: schéma, service/queries/schemas/routes `internships`, détail frontend,
  clients, tests et README.

**Travail :**

* [ ] Valider ordre des dates, année calculée et éligibilité correspondante.
* [ ] Accepter seulement un contact existant, validé et appartenant à
  l'entreprise du dossier.
* [ ] Rendre l'enregistrement idempotent par comparaison des valeurs
  persistées.
* [ ] Invalider la convention générée uniquement si une date ou le signataire
  change réellement ; la convention signée interdit toute modification.

**Verification:**

* Run: tests backend `internships-preparation`, tests frontend du formulaire et
  du client.
* Expected: trois refus distincts de signataire, dates invalides refusées,
  année manquante nommée, enregistrement identique sans effet de bord.
* Régressions nommées : `F7 unchanged preparation keeps generated convention`,
  `foreign pending or missing signer is rejected`,
  `start date requires matching eligibility`.

**Human observables:** le formulaire ne propose que les contacts valides de
l'entreprise et explique exactement le champ bloquant.

### 009. Générer et télécharger la convention vierge

**Résultat livrable :** gestionnaire et lecteur téléchargent un DOCX généré à
partir du modèle fixe ; seul le gestionnaire peut le générer ou le régénérer.

**Files:**

* Create: modèle applicatif, pipeline déclaré, stockage injectable et
  générateur DOCX ;
* Modify: `.gitignore`, dépendances backend, routes/services, détail frontend,
  clients, tests, README et ADR du modèle si nécessaire.

**Travail :**

* [ ] Exclure la racine documentaire locale de Git avant toute écriture.
* [ ] Déclarer les dépendances et commandes qui construisent puis vérifient le
  modèle applicatif depuis l'annexe.
* [ ] Tracer les substitutions provisoires ; ne réécrire aucun texte fixe sans
  décision explicite.
* [ ] Générer depuis une copie, sans variable résiduelle, avec nom de fichier
  sûr ; persister seulement les métadonnées et un nom technique.
* [ ] Injecter la racine de stockage et la créer à l'usage, jamais à l'import du
  module.
* [ ] Protéger génération et téléchargement par rôle et réutiliser la stratégie
  de route asynchrone déjà vérifiée par l'export.

**Verification:**

* Run: tests backend `internships-generated-convention`, commande de
  vérification du modèle, rendu du DOCX puis inspection visuelle.
* Expected: empreinte de l'annexe et du modèle inchangée avant/après, parties
  DOCX et zones de signature présentes, variables absentes, tests dans un
  répertoire temporaire, aucun fichier Git parasite.
* Régressions nommées : `F9 template pipeline is declared and reproducible`,
  `F17 tests never write to repository storage`,
  `F21 importing storage has no filesystem side effect`.

**Human observables:** le fichier téléchargé porte un nom explicite et conserve
la mise en page du modèle fourni.

### 010. Téléverser la convention signée et confirmer séparément

**Résultat livrable :** le gestionnaire téléverse/remplace un PDF ou DOCX signé,
puis confirme le stage par une action distincte ; le lecteur télécharge sans
muter.

**Files:**

* Modify: schéma documentaire, stockage, routes/services `internships`, détail
  frontend, client API, tests et README.

**Travail :**

* [ ] Valider format, MIME, extension, taille maximale de 5 Mio et absence de
  fichier avant toute persistance définitive.
* [ ] Coordonner remplacement disque/base avec nettoyage compensatoire sur
  erreur.
* [ ] Refuser la confirmation sans convention signée ; ne jamais confirmer au
  seul téléversement.
* [ ] Tester par requête HTTP chaque mutation pour gestionnaire et les `403` de
  lecteur, étudiant et entreprise.
* [ ] Ajouter états de chargement, succès et erreur au frontend.

**Verification:**

* Run: tests backend `internships-signed-convention` et accès, tests frontend du
  client, de l'upload et de la confirmation.
* Expected: matrice PDF/DOCX valide, incohérences et taille refusées, upload
  laissant l'état `preparation`, confirmation seule passant à `confirme`, aucun
  fichier orphelin après panne.
* Régressions nommées : `reader gets 403 on every document mutation`,
  `upload does not confirm internship`, `failed replacement preserves previous
  signed document`.

**Human observables:** « Convention signée reçue » et « Stage confirmé » sont
deux états et deux actions visiblement distincts.

### 011. Clore un stage par un état terminal

**Résultat livrable :** le gestionnaire marque un stage confirmé `termine`,
`interrompu` ou `echoue`; le dossier reste dans son année et cesse de bloquer
l'étudiant.

**Files:**

* Modify: service/route/types `internships`, détail et liste frontend, clients,
  tests et README.

**Travail :**

* [ ] Autoriser les transitions uniquement depuis `confirme` et garder les
  états manuels.
* [ ] Faire coïncider définition TypeScript et index bloquant SQLite.
* [ ] Rendre le rejeu du même état sans effet et refuser une transition
  terminale différente.
* [ ] Vérifier qu'un nouveau dossier peut ensuite être créé sans modifier le
  dossier historique.

**Verification:**

* Run: tests backend `internships-lifecycle`, contraintes et accès, tests
  frontend des actions terminales.
* Expected: les trois états libèrent l'étudiant, restent listés dans l'année
  d'origine et refusent toutes les mutations de préparation/document.
* Régressions nommées : `terminal status releases student`,
  `blocking status constant matches partial index`,
  `terminal internship remains in original academic year`.

**Human observables:** l'historique reste consultable et le nouvel état indique
clairement qu'il ne s'agit pas d'une suppression.

### 012. Vérification transversale et clôture falsifiable

**Résultat livrable :** toutes les exigences sont reliées à une preuve nommée ;
les documents courants décrivent uniquement le comportement réellement livré.

**Files:**

* Modify: README des features, `docs/current/data-model.md`,
  `docs/current/features.md`, `docs/current/architecture.md` si la structure a
  changé, `docs/current/state.md` et artefacts de clôture.

**Travail :**

* [ ] Exécuter les suites et builds complets backend/frontend.
* [ ] Auditer toutes les routes de mutation contre la matrice des quatre rôles
  et toutes les contraintes contre leurs tests réels.
* [ ] Rechercher exports inutilisés, code mort, fichiers parasites et écritures
  hors répertoires temporaires.
* [ ] Faire les vérifications manuelles E2E des deux origines, de la convention,
  de la suppression et des trois états terminaux.
* [ ] Si l'E2E révèle un défaut, ajouter d'abord le test de régression nommé et
  corriger le README propriétaire avant de clore.
* [ ] Archiver spec et plan seulement après une review listant séparément les
  preuves automatisées, les vérifications manuelles et les éléments non
  vérifiés.

**Verification:**

* Run: `npm test` et `npm run build` dans `backend/` puis `frontend/`, commande
  de vérification du modèle, rendu DOCX, inspection XLSX et `git status --short`.
* Expected: suites et builds verts ; modèle reproductible ; aucun document de
  test, fichier temporaire, export inutile ou artefact non expliqué.

**Human observables:** la review de clôture permet de contredire toute annonce
de couverture en retrouvant le nom du test ou la manipulation exacte.

## Couverture explicite de la review du 2026-08-28

| Constats | Incréments de fermeture |
| --- | --- |
| F1, F22 - rattachement annuel non daté | 005 |
| F2 - dossier sans éligibilité et inatteignable | 001, 002, 005 |
| F3 - refus lecteur absents | règle transversale, 006 à 011, audit 012 |
| F4 - critères métier sans tests | 002 à 012, avec régressions nommées |
| F5 - erreur trompeuse sur proposition | 003 |
| F6 - rejet async de l'export | 007 |
| F7 - préparation identique destructive | 008 |
| F8 - blocage non anticipé | 004 |
| F9 - décisions cachées dans le modèle | 009 |
| F10, F17 - stockage et tests dans le dépôt | 009 |
| F11 - code mort | création au besoin, audit 012 |
| F12 - dépendance students/internships | 001 |
| F13 - règles dupliquées | 001, 011 |
| F14 - métier dans `queries` | 002, 003 |
| F15 - couverture documents/signataire/export | 007 à 010 |
| F16 - frontend sans erreurs ni contrat HTTP | règle transversale, 001 à 011 |
| F18 - traduction fragile des contraintes | 002 |
| F19 - restauration sans garde | 006 |
| F20 - validation frontend inopérante | 001 |
| F21 - effets de bord et hygiène | 009, 012 |

## Notes de migration

L'application n'étant pas en production, aucune donnée historique de stage
n'est inventée. Les nouvelles tables et contraintes doivent néanmoins être
idempotentes au démarrage et compatibles avec la base de développement
existante. Toute modification d'une table existante passe par la stratégie de
migration déjà documentée dans `docs/current/data-model.md` ; aucune base n'est
supprimée pour faire passer les tests.

## Points d'attention

* La spec contient une tension entre « ouvrir immédiatement le dossier après
  sélection » et l'absence d'accès entreprise aux conventions. Ce plan retient
  la permission explicite : l'entreprise reçoit la confirmation et l'ID, mais
  seuls gestionnaire et lecteur ouvrent le dossier. Si le produit veut donner
  une lecture limitée à l'entreprise, il faut modifier la spec avant
  l'incrément 005.
* Les mentions institutionnelles, la civilité et l'accord de genre du modèle
  restent provisoires. L'incrément 008 peut automatiser une décision tracée,
  pas remplacer sa validation externe.
* Le stockage local reste une limite de développement. L'injection et
  l'exclusion Git réduisent le risque sans prétendre résoudre la production.
* Une contrainte SQLite et une transaction applicative répondent à deux risques
  différents : concurrence d'un côté, orchestration et message métier de
  l'autre. Aucun des deux niveaux ne remplace l'autre.

## Vérification finale

* [ ] Chaque critère de la spec est relié à un test nommé ou à une vérification
  manuelle explicitement justifiée.
* [ ] Chaque mutation refuse chaque rôle non autorisé par requête HTTP.
* [ ] Chaque contrainte de données est réellement déclenchée par un test.
* [ ] Chaque mise à jour prouve son idempotence ou son rejeu contrôlé.
* [ ] Les tests et builds backend/frontend passent.
* [ ] Le DOCX et le XLSX ont été vérifiés automatiquement et visuellement.
* [ ] Le dépôt ne contient aucun document utilisateur ou artefact de test.
* [ ] Les README locaux et documents courants décrivent le code livré.
* [ ] Les écarts au plan et les limites non vérifiées sont listés.

## Self-review du plan

* Couverture de la spec : les créations, blocages, lectures, restauration,
  préparation, documents, confirmation, états terminaux et export possèdent
  chacun une tranche vérifiable.
* Cohérence architecture : les transactions vivent dans les services, le SQL
  dans les queries, les schémas près de leurs routes et les règles partagées
  ont un propriétaire explicite.
* Risques restants : validation juridique du modèle, permission de lecture
  éventuelle de l'entreprise et stockage documentaire de production.
* Première tranche exécutable : 001, import et éligibilité annuelle.
