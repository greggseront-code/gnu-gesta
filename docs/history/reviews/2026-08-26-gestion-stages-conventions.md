# Review — Gestion des stages et des conventions

Date : 2026-08-28

Statut : close. Une review n'est jamais une lecture prérequise et n'est pas
réécrite pour coller à un état plus récent.

## Documents liés

* Spec : `docs/history/phases/2026-08-26-gestion-stages-conventions-spec.md`
* Plan : `docs/history/phases/2026-08-26-gestion-stages-conventions-plan.md`
* Workflow : `docs/history/phases/2026-08-26-gestion-stages-conventions-workflow.html`
* README de feature : `backend/src/features/internships/README.md`
* Architecture : `docs/current/architecture.md`

## Objectif

Introduire un dossier de stage distinct des offres et candidatures, converger
atomiquement depuis une sélection ou une proposition étudiante acceptée,
préparer et suivre les conventions, puis fournir une vue annuelle exportable
de tous les étudiants éligibles.

## Travail réalisé

* Ajout des éligibilités annuelles, dossiers, documents et contraintes SQLite,
  dont l'unicité partielle d'un dossier bloquant par étudiant.
* Création transactionnelle du dossier depuis une candidature sélectionnée ou
  une proposition acceptée, avec blocage des nouvelles candidatures,
  propositions et sélections concurrentes.
* Préparation du dossier, génération DOCX, dépôt protégé de la convention
  signée, confirmation, états terminaux et suppression simple avec restauration
  atomique de l'origine.
* Import annuel additif, liste annuelle incluant les étudiants sans stage et
  export Excel avec cellules de date natives.
* Pages React de liste et de détail, navigation par rôle, lecture seule du
  lecteur et libellés adaptés aux deux types d'offres.
* README locaux et documentation courante alignés sur les contrats livrés.

## Remarques correctives issues d'un échange humain

Aucune remarque corrective recueillie lors d'un échange humain.

## Écarts par rapport à la spec ou au plan

* Aucun critère d'acceptation V1 identifié n'a été abandonné.
* Extension contrôlée : ajout explicite des états `termine`, `interrompu` et
  `echoue`, que la spec laissait à arbitrer. Ces états libèrent l'étudiant tout
  en conservant l'historique.
* La liste annuelle retient le dossier le plus récent lorsqu'un étudiant a
  plusieurs dossiers historiques non bloquants sur la même année ; la spec ne
  définissait pas ce cas.
* Un dossier encore non daté est rattaché provisoirement à l'éligibilité la
  plus récente de l'étudiant afin de rester accessible dès sa création. Sa
  date de début détermine ensuite son année définitive.
* Le modèle applicatif conserve le texte institutionnel fixe de l'annexe mais
  neutralise les formulations genrées et remplace les anciens champs Word
  fragiles par des valeurs explicites. L'annexe source n'a pas été modifiée.

## Fichiers impactés

* Schéma et intégrations backend : `backend/src/db/schema.sql`, features
  `applications`, `offers`, `students` et nouvelle feature `internships`.
* Modèle documentaire : `backend/assets/convention-template.docx` et script
  reproductible `backend/scripts/build-convention-template.py`.
* Frontend : routes, navigation, import annuel, écrans d'offres et nouvelle
  feature/pages `internships`.
* Tests backend/frontend et documentation dans `docs/current/`,
  `docs/operations/` et les README de features.

## Décisions prises

* L'import annuel est additif et ne retire jamais implicitement un étudiant
  absent d'un réimport.
* `preparation` et `confirme` sont les seuls états bloquants ; les trois états
  terminaux sont manuels.
* La suppression simple est limitée à un dossier en préparation dont le début
  n'est pas passé.
* L'année calculée depuis la date de début doit faire partie des éligibilités
  importées de l'étudiant.
* L'absence d'adresse d'entreprise bloque la génération de convention.
* Les conventions générée et signée sont deux documents distincts. Modifier la
  préparation invalide la version générée, sans supprimer la version signée.
* Les fichiers signés acceptés sont PDF ou DOCX, avec une limite de 5 Mio.
* ExcelJS produit l'export XLSX afin de conserver styles, filtre, gel de ligne
  et vraies dates avec une seule dépendance backend.

## Tests et vérifications

Tests automatisés exécutés :

* `cd backend && npm test` : 15 fichiers, 219 tests passés.
* `cd backend && npm run build` : TypeScript compilé sans erreur.
* `cd frontend && npm test` : 13 fichiers, 53 tests passés.
* `cd frontend && npm run build` : TypeScript et build Vite passés.

Vérifications manuelles effectuées :

* Convention générée par le code applicatif, rendue sur deux pages : contenu
  remplacé, mise en page, zones de signature et absence de champs parasites
  contrôlés visuellement.
* Export Excel chargé et rendu avec l'outil de feuille de calcul : en-tête,
  largeur des colonnes, lignes alternées, filtre, ligne figée, cellules vides
  et cellules de date natives contrôlés.
* Parcours E2E exécuté dans le navigateur sur une base SQLite en mémoire
  isolée : connexion gestionnaire, import XLSX annuel, connexion étudiante,
  proposition avec entreprise/contact existants, acceptation gestionnaire,
  ouverture du dossier, saisie des dates et du signataire, génération de la
  convention, dépôt d'un PDF signé, confirmation, puis reconnexion lecteur.
* Le parcours E2E a révélé qu'un dossier sans dates était initialement masqué
  dans la liste annuelle. Le rattachement provisoire à l'éligibilité la plus
  récente a été ajouté, puis le parcours a été rejoué avec succès. Le lecteur
  ne voyait ensuite aucun bouton de mutation et aucune erreur console n'a été
  observée.

Non testé ou à vérifier :

* Validation juridique et institutionnelle du texte fixe de la convention.
* Stockage durable, sauvegarde et restauration des documents en production.
* Validation métier humaine d'un dossier réel et du circuit de signatures
  externe à l'application.

## Risques et limites

* Les conventions sont stockées localement sous
  `backend/internship-documents/`, hors sauvegarde SQLite et sans réplication.
* Le modèle institutionnel est une copie versionnée d'un document fourni et
  doit être officiellement validé avant usage réel.
* La suppression d'une éligibilité annuelle n'est pas exposée dans cette V1.
* Les avertissements de dépréciation Vite/React Router observés ne bloquent pas
  la feature mais devront être traités lors d'une montée de version frontend.

## Travail restant

* Aucun travail restant dans le périmètre V1 implémenté.
* Avant production, traiter les points documentés dans
  `docs/operations/production-readiness.md`.

## Incertitudes

* Le stockage documentaire de production et la version juridique officielle
  du modèle restent des décisions externes au dépôt.

## Ce qui remonte hors de cette review

* Documents courants mis à jour : `docs/current/architecture.md`,
  `docs/current/data-model.md`, `docs/current/features.md` et
  `docs/current/state.md`.
* Documentation opérationnelle mise à jour :
  `docs/operations/production-readiness.md`.
* README de features mis à jour : `applications`, `offers`, `students` et
  `internships`.
* Artefacts déplacés vers `docs/history/phases/` : spec, plan, contexte et
  workflow du chantier.
