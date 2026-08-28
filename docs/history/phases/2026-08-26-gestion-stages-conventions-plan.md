# Plan - Gestion des stages et des conventions

Date : 2026-08-26

Statut : implémenté

Emplacement archivé :
`docs/history/phases/2026-08-26-gestion-stages-conventions-plan.md`.

## Contexte

Ce plan transforme le workflow actuel, centré sur les offres et candidatures,
en un suivi de dossiers de stage distincts, avec éligibilité annuelle et
conventions protégées.

Sources minimales à relire avant exécution :

* Spec : `docs/history/phases/2026-08-26-gestion-stages-conventions-spec.md` ;
* Vue du parcours :
  `docs/history/phases/2026-08-26-gestion-stages-conventions-workflow.html` ;
* Features : `backend/src/features/applications/README.md`,
  `backend/src/features/offers/README.md`,
  `backend/src/features/students/README.md` et
  `backend/src/features/companies/README.md` ;
* Transversal : `docs/current/architecture.md`,
  `docs/current/data-model.md` et `docs/current/features.md`.

## Objectif

Créer un dossier de stage atomiquement depuis les deux origines prévues,
permettre sa préparation documentaire et son suivi annuel, et garantir les
permissions et blocages au niveau du backend et de SQLite.

Le plan doit permettre de vérifier :

* les critères d'acceptation métier et documentaires de la spec ;
* l'absence de mutation partielle lors d'une sélection, acceptation ou
  suppression ;
* l'accès en écriture du gestionnaire et la lecture seule du lecteur.

## Périmètre

Inclus : le périmètre V1 de la spec, plus les états terminaux manuels nécessaires
pour résoudre explicitement la fin, l'interruption et l'échec d'un stage.

Exclus : signature électronique, notifications, édition juridique libre,
stockage de production définitif et migration de données historiques.

## Impacts prévus

* Backend : nouvelle feature `internships`, intégration aux candidatures,
  offres et étudiants, routes documentaires protégées.
* Frontend : liste annuelle, détail du dossier, import annuel et adaptations
  des actions existantes.
* Données : éligibilités annuelles, dossiers, documents, index d'unicité
  partiels et index d'origine.
* Documentation : README de feature et sources courantes après vérification.
* Tests : transactions, contraintes, permissions, DOCX, XLSX et parcours React.

## Décisions propres à ce plan

* Un import annuel est additif : il crée ou met à jour les étudiants et leur
  éligibilité, sans retirer les absents d'un réimport.
* Les états sont `preparation`, `confirme`, `termine`, `interrompu` et `echoue`.
  Seuls `preparation` et `confirme` bloquent l'étudiant. Les trois états
  terminaux sont appliqués manuellement par le gestionnaire et restent visibles.
* La suppression simple est limitée à un dossier en préparation dont la date
  de début n'est pas passée. Les autres cas utilisent un état terminal.
* L'année calculée lors de la saisie des dates doit figurer parmi les
  éligibilités importées de l'étudiant.
* Une convention signée accepte PDF ou DOCX, à concurrence de 5 Mio.
* L'absence d'adresse d'entreprise bloque la génération ; l'adresse du
  référentiel est la source de vérité.
* Le modèle applicatif est une copie versionnée de l'annexe. Il est rendu neutre
  quant au genre et à la civilité ; le texte institutionnel fixe est conservé
  faute de source officielle plus récente. L'annexe fournie reste inchangée.
* La convention générée et la convention signée sont conservées comme deux
  documents distincts ; une régénération remplace uniquement la version vierge.

## Structure cible

```text
backend/src/features/internships/
  internships.routes.ts
  internships.service.ts
  internships.queries.ts
  internships.schemas.ts
  internships.types.ts
  internship-documents.storage.ts
  convention-generator.ts
  internships-export.ts
  README.md
backend/assets/convention-template.docx
frontend/src/features/internships/
  internships.api.ts
  internships.types.ts
frontend/src/pages/
  internships.page.tsx
  internship-detail.page.tsx
```

## Tasks list

### 001. Modèle de données et contrats

**Files:**

* Modify: `backend/src/db/schema.sql`, `backend/src/db/db.migrate.ts` ;
* Create: `backend/src/features/internships/internships.types.ts`,
  `backend/src/features/internships/internships.schemas.ts`.

**Travail :**

* [x] Ajouter les éligibilités, dossiers, documents et index métier.
* [x] Ajouter le calcul et la validation de l'année académique.
* [x] Garantir un seul dossier bloquant et une seule utilisation de l'origine.

**Verification:**

* Run: `npm test -- --run db.test.ts` dans `backend/`.
* Expected: schéma frais et contraintes valides.

**Human observables:** un étudiant peut être éligible plusieurs années mais ne
peut avoir qu'un dossier bloquant.

### 002. Création atomique et blocages

**Files:**

* Modify: features `applications`, `offers` et `students` ;
* Create: queries et service `internships`.

**Travail :**

* [x] Créer le dossier dans la transaction de sélection.
* [x] Accepter une proposition sans publication ni candidature artificielle.
* [x] Bloquer candidature, proposition et autre sélection.
* [x] Restaurer atomiquement l'origine lors d'une suppression simple.

**Verification:**

* Run: tests backend `applications`, `offers` et `internships`.
* Expected: aucune mutation partielle et erreurs métier explicites.

**Human observables:** les deux parcours convergent vers le même dossier et
l'étudiant redevient disponible après une suppression autorisée.

### 003. Préparation, documents et cycle de vie

**Files:**

* Create: stockage documentaire, générateur DOCX, routes et modèle applicatif ;
* Modify: `backend/src/app.ts`, dépendances backend.

**Travail :**

* [x] Saisir dates et signataire avec validations métier.
* [x] Générer et télécharger la convention sans modifier le modèle.
* [x] Téléverser/remplacer la convention signée et confirmer séparément.
* [x] Appliquer manuellement un état terminal et protéger les mutations lecteur.

**Verification:**

* Run: tests backend documentaires et rendu visuel d'une convention générée.
* Expected: DOCX fidèle et protégé, confirmation impossible sans fichier signé.

**Human observables:** les actions disponibles suivent l'état du dossier et les
documents sont téléchargés avec des noms explicites.

### 004. Liste annuelle et export Excel

**Files:**

* Modify: feature `students` ;
* Create: requêtes annuelles et export `internships`.

**Travail :**

* [x] Importer avec une année académique explicite.
* [x] Lister chaque étudiant éligible, avec ou sans stage.
* [x] Exporter le même jeu de données en XLSX avec de vraies dates.

**Verification:**

* Run: tests backend de liste et inspection du classeur exporté.
* Expected: une ligne par éligibilité, filtres cohérents et cellules de date.

**Human observables:** le tableau et le fichier exporté contiennent les mêmes
lignes et colonnes.

### 005. Parcours frontend

**Files:**

* Create: feature et pages frontend `internships` ;
* Modify: routeur, navigation, import, administration des offres, détail offre
  et espace entreprise.

**Travail :**

* [x] Ajouter la page annuelle accessible au gestionnaire et lecteur.
* [x] Ajouter le détail éditable ou en lecture seule selon le rôle.
* [x] Adapter l'acceptation d'une proposition et les retours de blocage.
* [x] Rendre les confirmations destructives explicites et sympathiques.

**Verification:**

* Run: tests frontend ciblés puis build.
* Expected: routes protégées et principaux parcours rendus sans erreur.

**Human observables:** un lecteur ne voit aucune action de mutation et les états
vides ou bloqués expliquent clairement la suite.

### 006. Vérification et documentation

**Files:**

* Modify: documentation courante et README de features concernés.

**Travail :**

* [x] Exécuter tests et builds complets.
* [x] Vérifier visuellement le DOCX et l'interface principale.
* [x] Consigner les écarts réels au plan et les limites opérationnelles.

**Verification:**

* Run: `npm test` et `npm run build` dans `backend/` et `frontend/`.
* Expected: suites et builds verts.

**Human observables:** la documentation décrit le comportement effectivement
livré, sans recopier l'historique du chantier.

## Notes de migration

L'application n'étant pas encore en production, les nouvelles tables sont
créées par le schéma courant. Les migrations de colonnes existantes restent
compatibles ; aucune donnée historique de stage n'est inventée.

## Points d'attention

* Le stockage local des documents reste une limite de développement à traiter
  dans la préparation opérationnelle.
* Les mentions institutionnelles fixes du modèle sont conservées provisoirement.
* La contrainte SQLite porte sur les états bloquants ; toute évolution future
  des états doit mettre à jour l'index partiel en même temps que le service.

## Vérification finale

* [x] Les tests automatisés pertinents passent.
* [x] Le build pertinent passe.
* [x] Les vérifications manuelles importantes sont listées.
* [x] Les documents liés sont à jour.
* [x] Les chemins documentés correspondent à la structure réelle.
* [x] Les écarts par rapport au plan sont documentés.

## Self-review

* Couverture de la spec : toutes les sections V1 sont mappées à une tâche.
* Cohérence architecture : feature backend dédiée, SQL explicite et contrôles
  d'accès backend.
* Risques restants : fidélité du modèle Word et stockage local.
* Travail restant : exécution des six tâches ci-dessus.
