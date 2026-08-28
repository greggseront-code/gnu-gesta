# Revue de qualité — Gestion des stages et des conventions

Date : 2026-08-28

Objet : commit `016e952` « feat: Gestion des stages et conventions ».

Référence : `docs/history/phases/2026-08-26-gestion-stages-conventions-spec.md`.

Ce document ne liste que des constats problématiques. Il ne décrit pas ce qui
fonctionne, ne reprend pas la review de clôture
`docs/history/reviews/2026-08-26-gestion-stages-conventions.md` et n'a donné
lieu à aucune modification du code.

## Méthode

Lecture intégrale du diff backend, frontend, schéma, tests et documentation.
Les deux constats F1 et F2 ont été reproduits hors dépôt, en exécutant la
requête de `listAnnualInternshipRows` sur une base SQLite créée à partir de
`backend/src/db/schema.sql`. Les tests existants n'ont pas été relancés : ils
sont annoncés verts et le sont probablement, ce qui fait précisément partie du
sujet — ils passent sans couvrir plusieurs critères d'acceptation.

## Synthèse

| # | Sévérité | Constat |
| --- | --- | --- |
| F1 | Majeur | Un dossier non daté disparaît de l'année en cours dès qu'une éligibilité plus récente est importée |
| F2 | Majeur | Un dossier créé pour un étudiant sans éligibilité n'est visible dans aucune vue et bloque l'étudiant sans recours |
| F3 | Majeur | Aucun test backend des refus `403` du lecteur sur les mutations |
| F4 | Majeur | Plusieurs critères d'acceptation de la spec n'ont aucun test |
| F5 | Moyen | Erreur métier trompeuse à l'acceptation d'une proposition qui n'est pas `soumise` |
| F6 | Moyen | Rejet de promesse non géré sur la route d'export (Express 4, aucun middleware d'erreur) |
| F7 | Moyen | Un enregistrement de préparation sans changement détruit la convention générée |
| F8 | Moyen | Le blocage de l'étudiant n'est pas anticipé côté interface |
| F9 | Moyen | Le modèle de convention tranche des incertitudes de spec sans décision tracée |
| F10 | Moyen | `backend/internship-documents/` n'est pas ignoré par Git |
| F11 | Moyen | Code mort et schéma d'import orphelin laissés en place |
| F12 | Moyen | Inversion de dépendance entre `students` et `internships` |
| F13 | Moyen | Règles métier dupliquées (statuts bloquants, année académique) |
| F14 | Moyen | Logique métier dans la couche `queries` d'`applications` |
| F15 | Moyen | Couverture partielle des documents, du signataire et de l'export |
| F16 | Moyen | Tests frontend sans état d'erreur et sans contrat HTTP |
| F17 | Moyen | Les tests écrivent dans le répertoire de documents réel du dépôt |
| F18 | Mineur | Détection des contraintes SQLite par sous-chaîne de message |
| F19 | Mineur | Restauration de l'offre sans garde ni vérification du statut courant |
| F20 | Mineur | Validation du champ « année académique » inopérante à l'import |
| F21 | Mineur | Divers : effet de bord au chargement, `.DS_Store`, script Python non intégré |
| F22 | Mineur | Règle de rattachement annuel absente du README de la feature |

## Correction et comportement

### F1 — Majeur — Un dossier non daté disparaît de l'année en cours après un réimport

`backend/src/features/internships/internships.queries.ts:213`

La liste annuelle rattache un dossier dont `academic_year` est `NULL` à
l'éligibilité **la plus récente** de l'étudiant (`MAX(e2.academic_year)`), pas à
l'année consultée.

Reproduction : un étudiant éligible en `2026-2027`, doté d'un dossier créé mais
pas encore daté ; le gestionnaire importe ensuite la promotion `2029-2030` qui
contient le même étudiant. La ligne du dossier bascule immédiatement :

```
année 2026-2027 -> internship_id = [ null ]
année 2029-2030 -> internship_id = [ 2 ]
```

Conséquence : le dossier en cours de préparation sort de la vue de l'année de
travail, l'étudiant y réapparaît « Sans stage », et le dossier n'est plus
ouvrable depuis cette année alors qu'il bloque toujours l'étudiant. Le
rattachement provisoire est mentionné dans la review de clôture comme un choix
délibéré, mais son effet de bord — la disparition d'une année déjà ouverte —
n'est ni documenté ni testé.

Piste : rattacher un dossier non daté à *toutes* les éligibilités de l'étudiant,
ou à la plus ancienne éligibilité encore sans dossier, plutôt qu'à la plus
récente.

### F2 — Majeur — Un dossier sans éligibilité est invisible et sans recours

`backend/src/features/internships/internships.queries.ts:211`,
`backend/src/features/applications/applications.queries.ts:105`,
`backend/src/features/offers/offers.service.ts:166`

La création d'un dossier (sélection ou acceptation d'une proposition) ne
vérifie aucune éligibilité, alors que la préparation l'exige
(`internships.service.ts:90`). La liste annuelle part de
`student_academic_year_eligibility` : un dossier appartenant à un étudiant sans
aucune ligne d'éligibilité n'apparaît donc dans aucune année.

Reproduction : dossier créé pour un étudiant sans éligibilité →
`lignes 2029-2030 = 0` alors que `dossiers en base = 1`.

Aucune autre entrée ne mène à `/internships/:id` : ni la page d'offre, ni la
page des candidatures, ni un message après l'acceptation d'une proposition. Le
dossier devient donc inatteignable depuis l'interface, l'étudiant reste bloqué
indéfiniment (plus de candidature, plus de proposition, plus de sélection) et
seul un accès SQL permet d'en sortir. C'est le cas de tout étudiant importé
avant ce commit, aucune migration n'ayant été prévue.

Deux corrections indépendantes : refuser la création (ou avertir) quand
l'étudiant n'a aucune éligibilité, et ajouter un lien vers le dossier depuis
l'offre d'origine et depuis l'écran d'acceptation.

### F5 — Moyen — Erreur métier trompeuse à l'acceptation d'une proposition

`backend/src/features/offers/offers.service.ts:167`

Toute proposition étudiante qui n'est pas `soumise`, ou dont
`submitted_by_student_id` est nul, produit un `InternshipOriginAlreadyUsedError`,
c'est-à-dire un `409` « Cette offre ou proposition possède déjà un dossier de
stage. » Une proposition refusée, indisponible ou mal formée renvoie donc un
message factuellement faux au gestionnaire, qui ira chercher un dossier
inexistant. Les deux cas méritent des erreurs distinctes.

### F6 — Moyen — Rejet de promesse non géré sur l'export

`backend/src/features/internships/internships.routes.ts:48` et `:32`

`handleError()` relance l'erreur lorsqu'elle n'est pas une `HttpError`. Ce
contrat fonctionne pour les gestionnaires synchrones — Express 4 les entoure —
mais la route d'export est `async` : Express 4 n'attrape pas les rejets et
l'application ne déclare aucun middleware d'erreur (`backend/src/app.ts`). Une
défaillance d'ExcelJS ou du disque laisse donc la requête pendante jusqu'au
timeout client et produit un `unhandledRejection`, que Node termine par défaut
en arrêtant le processus. C'est la seule route `async` du router, la seule
concernée.

### F7 — Moyen — Enregistrer la préparation sans rien changer détruit la convention

`backend/src/features/internships/internships.service.ts:96`

Le `PATCH` supprime la convention générée à chaque appel, sans comparer les
valeurs soumises à celles en base. Le gestionnaire qui rouvre le formulaire et
clique « Enregistrer » sans modification perd le document généré, sans
avertissement — le formulaire frontend est pré-rempli et invite exactement à ce
geste (`frontend/src/pages/internship-detail.page.tsx:146`). Le test
`internships.test.ts:201` fige ce comportement au lieu de le signaler.
L'invalidation devrait être conditionnée à un changement réel de date ou de
signataire.

### F8 — Moyen — Le blocage de l'étudiant n'est pas anticipé côté interface

`frontend/src/pages/offer-details.page.tsx:44` et `:55`

Le backend refuse correctement la candidature et le dépôt de proposition
(`409`), mais rien côté interface n'anticipe ce refus : le bouton « Postuler »
reste actif, aucun bandeau n'explique la situation, et l'erreur s'affiche via
`String(err)`, soit « ApiError: Cet étudiant possède déjà un dossier de stage
bloquant. » — préfixe technique et formulation à la troisième personne adressée
à l'étudiant lui-même. Aucun champ d'API ne permet à l'interface de connaître
l'état bloquant avant l'action. Le plan attendait l'observable inverse : « les
états vides ou bloqués expliquent clairement la suite ».

### F18 — Mineur — Détection des contraintes par sous-chaîne de message

`backend/src/features/internships/internships.errors.ts:17`

`translateInternshipConstraint()` reconnaît les violations d'unicité en
cherchant `idx_internships_one_blocking_per_student`,
`internships.origin_offer_id` et `internships.origin_application_id` dans le
texte de l'erreur SQLite. Un changement de formulation du moteur, un renommage
d'index ou de colonne fait silencieusement retomber le cas dans le `throw err`
final, donc dans un `500` au lieu du `409` métier. Le code d'erreur
(`SQLITE_CONSTRAINT_UNIQUE`) combiné au nom d'index serait plus stable — et
aucun test ne passe aujourd'hui par ce chemin (voir F4).

### F19 — Mineur — Restauration de l'offre sans garde

`backend/src/features/internships/internships.service.ts:173`

`restoreOfferStatus()` fait `get(offerId) as { status: string }` sans vérifier
l'absence de ligne : une incohérence de données produirait un
`TypeError` non typé plutôt qu'une erreur métier. Par ailleurs la restauration
écrit `validee_et_visible` sans vérifier que l'offre est bien `prise`, ce qui
peut réactiver une offre entre-temps passée à un autre statut.

Constat voisin, sans conséquence pratique aujourd'hui :
`applications.queries.ts:32` vérifie le blocage hors transaction avant
d'insérer la candidature, et aucune contrainte de données ne couvre ce cas ;
une candidature peut donc naître pendant une sélection concurrente. L'impact
est faible puisque les candidatures existantes sont de toute façon conservées.

## Qualité du code et respect des normes

### F9 — Moyen — Le modèle de convention tranche des incertitudes non arbitrées

`backend/scripts/build-convention-template.py:16`, `:108`

La spec excluait explicitement « l'édition libre du contenu juridique de la
convention » et laissait ouvertes les incertitudes 6 à 9 (adresse manquante,
civilité du signataire, accord de genre, textes institutionnels). Le script
supprime les champs `TitreResp` et `Feminin` (remplacés par une chaîne vide),
réécrit en dur des phrases du contrat — « en année terminale du Baccalauréat en
Informatique », le régime horaire de l'article 2, la mention finale — et fixe
la formulation neutre. Ce sont des décisions juridiques prises dans un script
de build ; elles ne vivent que dans la review de clôture, alors qu'`AGENT.md`
demande qu'une contrainte encore vraie remonte dans un document courant, une
ADR ou un README de feature. Une ADR est le bon support ici.

Corollaire technique : l'artefact `backend/assets/convention-template.docx` est
versionné, mais rien ne vérifie qu'il correspond encore au script (ni test de
régénération, ni empreinte). Le script lui-même introduit une dépendance Python
et `lxml` non déclarée, absente de `package.json` et de toute procédure.

### F10 — Moyen — Le répertoire des conventions n'est pas ignoré par Git

`.gitignore`, `backend/src/features/internships/internship-documents.storage.ts:53`

`uploads/` et `data/` sont ignorés, `internship-documents/` ne l'est pas. Le
module crée le répertoire dès son chargement, et les tests y écrivent de vraies
conventions (voir F17) : des conventions signées — donc des données
personnelles — peuvent être committées par inadvertance.

### F11 — Moyen — Code mort et schéma orphelin

* `backend/src/features/students/students.service.ts:9` et
  `students.queries.ts:10` : `importStudents()` / `upsertStudents()` ne sont
  plus appelés que l'un par l'autre depuis le passage à l'import annuel.
* `backend/src/features/students/students.schemas.ts:11` :
  `StudentsImportSchema` n'est plus référencé.
* `backend/src/features/internships/internships.types.ts:81` :
  `BLOCKING_INTERNSHIP_STATUSES` est exporté et jamais utilisé.
* `internships.service.ts:191` (`getInternshipRow`),
  `internships.queries.ts:41` (`findInternshipByOriginOffer`),
  `internship-documents.storage.ts:79` (`internshipDocumentSize`) : jamais
  appelés.

Sur une base de code destinée à rester lisible « pour des étudiants et pour
Claude Code », ces résidus font croire à des chemins d'exécution inexistants.

### F12 — Moyen — Inversion de dépendance entre `students` et `internships`

`backend/src/features/students/students.routes.ts:5`

Le schéma d'entrée de `POST /api/students/import` (`StudentsAnnualImportSchema`)
est défini dans `internships.schemas.ts` et importé par la feature `students`,
dont le propre `students.schemas.ts` devient orphelin. Le contrat d'entrée d'un
endpoint appartient à la feature qui l'expose ; seule la notion d'année
académique méritait d'être partagée.

### F13 — Moyen — Règles métier dupliquées

* Statuts bloquants : littéral SQL dans `internships.queries.ts:14`, index
  partiel dans `schema.sql`, constante inutilisée dans `internships.types.ts:81`.
  Trois définitions de la même règle, dont une morte.
* Calcul de l'année académique : `internships.service.ts:34` côté backend,
  puis deux copies frontend indépendantes et écrites différemment
  (`frontend/src/pages/students-import.page.tsx:10` et
  `frontend/src/pages/internships.page.tsx:14`). La bascule du 15 septembre est
  ainsi maintenue à trois endroits, et aucun test frontend ne la couvre.

### F14 — Moyen — Logique métier dans la couche `queries`

`backend/src/features/applications/applications.queries.ts:32` et `:105`

`docs/current/architecture.md` fixe `queries.ts` = « SQL explicite » et
`service.ts` = « orchestration métier ». Le commit place dans `queries` le
contrôle du blocage, la création d'un dossier appartenant à une autre feature et
la traduction des erreurs de contrainte. Le fichier portait déjà des erreurs
métier, mais le commit aggrave l'écart au lieu de le réduire ; l'équivalent côté
`offers` est correctement placé dans le service.

### F20 — Mineur — Validation du champ « année académique » inopérante

`frontend/src/pages/students-import.page.tsx:133`

Le champ porte `required` et `pattern="\d{4}-\d{4}"`, mais il n'est pas dans un
`<form>` et l'import est déclenché par un `onClick` : ces attributs ne sont
jamais évalués. Une saisie comme `2026-2028` part donc au backend, qui la
refuse avec un `flatten()` Zod ; `ApiError` reçoit alors un objet comme message
(`api-client.ts:58`) et l'écran affiche `[object Object]`.

### F21 — Mineur — Divers

* `internship-documents.storage.ts:53` : `createInternshipDocumentUpload()` est
  appelé au chargement du module et crée un répertoire sur disque — effet de
  bord d'import qui contraint tout test important la feature.
* `frontend/src/pages/internships.page.tsx:47` : `Promise.all([...])` sur une
  seule promesse ; garde de rôle dupliquée entre `app.tsx:59` et la page
  (`internships.page.tsx:62`).
* `.DS_Store` (racine et `docs/`) est suivi par Git et modifié par le commit.
* Nommage hétérogène des nouveaux fichiers de la feature :
  `internships-export.ts` d'un côté, `internships.errors.ts` de l'autre.

## Tests

### F3 — Majeur — Aucun test backend des refus opposés au lecteur

La spec fait de ces refus des critères d'acceptation explicites (« Le lecteur ne
peut effectuer aucune mutation documentaire », « Le lecteur dispose de la
consultation et de l'export, sans mutation »). `backend/tests/internships.test.ts`
ne teste aucun `403` de lecteur : ni `PATCH /:id`, ni `generate-convention`, ni
`signed-convention`, ni `confirm`, ni `terminal-status`, ni `DELETE`. La seule
vérification existante est frontend et porte sur l'absence de boutons —
c'est-à-dire exactement ce que la spec refuse comme garantie (« Les contrôles
d'accès sont appliqués par le backend »).

### F4 — Majeur — Critères d'acceptation sans test

Critères de la spec sans couverture, dans l'ordre du document :

* « Une origine déjà transformée ne peut pas produire un second dossier. »
* « Une autre entreprise ne peut plus le sélectionner. » — seuls la candidature
  et la proposition sont testés (`internships.test.ts:128`).
* « Deux sélections concurrentes ne peuvent jamais créer deux dossiers. » —
  l'index partiel `idx_internships_one_blocking_per_student` n'est jamais
  atteint par un test ; le chemin `translateInternshipConstraint()` n'est donc
  jamais exercé (voir F18).
* « Ses anciennes candidatures restent consultables sans être supprimées. »
* « Une proposition redevient `soumise` et reste privée à son auteur. » — la
  suppression n'est testée que pour l'origine `candidature`
  (`internships.test.ts:245`), alors que la branche proposition de
  `deleteInternship()` a sa propre logique de restauration.
* « L'import associe les étudiants à l'année choisie. » — `students-import.test.ts`
  a été adapté à la nouvelle forme de requête mais ne vérifie jamais le contenu
  de `student_academic_year_eligibility`, ni le rejet d'une année non
  consécutive pourtant validée par `AcademicYearSchema`.
* « Les autres rôles ne peuvent ni consulter la page globale ni exporter ses
  données. » — seul l'accès étudiant à un document est testé
  (`internships.test.ts:199`) ; ni `GET /api/internships`, ni l'export, ni le
  détail ne sont testés pour l'étudiant ou l'entreprise.

### F15 — Moyen — Convention, signataire et export insuffisamment couverts

* Signataire : le service refuse un contact d'une autre entreprise, non validé
  ou inexistant (`internships.service.ts:83`) ; la spec demandait explicitement
  ces trois tests, aucun n'existe.
* « Le modèle source reste inchangé après chaque génération » : critère explicite
  de la spec, aucun test (l'assertion serait pourtant triviale — empreinte du
  fichier avant/après).
* Documents : aucun test de format ni de taille (extension et mimetype
  incohérents, fichier au-delà de 5 Mio, absence de fichier), alors que
  `validateInternshipDocument()` et la limite multer sont du code neuf.
* Structure du DOCX : le test vérifie la présence de deux chaînes et l'absence
  de `{{…}}` ; rien ne contrôle que la mise en page et les zones de signature du
  modèle sont conservées, ce que la spec demandait.
* Export : seules la cellule `H2` et le nombre de lignes sont vérifiés. Ni les
  en-têtes, ni la ligne « Sans stage » et ses cellules vides, ni le libellé
  d'état, ni le nom de fichier `stages-2029-2030.xlsx` ne sont contrôlés, alors
  que « les colonnes correspondent aux données visibles » est un critère.
* `academicYearForDate()` : deux dates frontières testées, aucune date invalide
  (`2026-02-30`), et ni `frenchDate()` ni `conventionDownloadName()` ne sont
  testés directement — la normalisation des accents n'est vérifiée
  qu'indirectement sur un nom sans accent.

### F16 — Moyen — Tests frontend sans état d'erreur ni contrat

`frontend/src/pages/internships.test.tsx`

La spec demandait « tests frontend des parcours principaux et des états
d'erreur ». Les trois tests couvrent l'affichage, la lecture seule et le
parcours nominal de préparation ; aucun ne couvre un échec (`409` de blocage,
`400` de dates, échec d'upload), ni le téléversement, ni la confirmation, ni la
suppression avec sa confirmation explicite — pourtant un critère d'acceptation
(« La suppression simple exige une confirmation explicite »). Le module
`internships.api` étant intégralement mocké, aucun test frontend ne vérifie les
URL ni les corps de requête réellement envoyés.

### F17 — Moyen — Les tests écrivent dans le répertoire réel du dépôt

`backend/tests/internships.test.ts:63`

Les fonctions de stockage acceptent toutes un paramètre `root`, mais les tests
passent par les routes et donc par la racine par défaut
`backend/internship-documents/`. Le nettoyage repose sur un `afterEach` qui
énumère la base : un test qui échoue avant l'insertion, ou une base fermée
prématurément, laisse des fichiers dans l'arborescence de travail — non ignorée
par Git (F10).

## Documentation

### F22 — Mineur — Règle de rattachement annuel absente du README

`backend/src/features/internships/README.md:78`

Le README documente le choix du dossier le plus récent pour une même année,
mais pas le rattachement d'un dossier non daté à l'éligibilité la plus récente
— la règle qui produit F1. Elle ne vit que dans la review de clôture, ce
qu'`AGENT.md` exclut explicitement pour une contrainte encore vraie.

## Ce qui ne relève pas d'un défaut de ce commit

Pour mémoire, et sans action attendue : le stockage local des documents, la
validation juridique du modèle et l'absence de migration des données existantes
sont assumés et documentés dans `docs/operations/production-readiness.md`.
