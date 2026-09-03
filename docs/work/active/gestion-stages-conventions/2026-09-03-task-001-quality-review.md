# Review de qualité — task 001 « Importer l'éligibilité annuelle »

Date : 2026-09-03

Périmètre : arbre de travail non commité correspondant au point 001 de
`docs/work/active/gestion-stages-conventions/plan.md`.

Emplacement : ce document reste dans `docs/work/active/` tant que le sujet est
ouvert. La review de clôture ira dans `docs/history/reviews/` (voir `AGENTS.md`).

## Verdict

Le point 001 est **livré et conforme** à ses critères de plan et de spec. Les
cinq éléments de la liste de travail sont réellement implémentés, les trois
régressions nommées existent sous les noms annoncés, et l'ensemble des suites et
builds passe. Aucun défaut majeur.

Dix écarts subsistent, mineurs à moyens. Deux d'entre eux (Q1, Q1bis) ont été
**reproduits par requête HTTP réelle** et concernent le comportement vu par
l'utilisateur. Trois autres (Q2, Q3, Q8) touchent la **falsifiabilité** de la
couverture : des tests passent aujourd'hui sans pouvoir échouer sur la
régression qu'ils sont censés surveiller. Ils méritent d'être traités avant que
002 ne les prenne pour acquis.

## Preuves exécutées

Commandes lancées pendant cette review, dans l'arbre de travail tel quel :

| Commande | Résultat |
| --- | --- |
| `npm test` dans `backend/` | 15 fichiers, 224 tests, verts |
| `npm run build` dans `backend/` | `tsc` sans erreur |
| `npm test -- --run` dans `frontend/` | 15 fichiers, 60 tests, verts |
| `npm run build` dans `frontend/` | `tsc` + `vite build` sans erreur |

Une sonde de diagnostic temporaire (`backend/tests/zz-probe-q1.test.ts`,
supprimée après usage) a en outre exercé quatre scénarios d'import par requête
HTTP réelle contre le serveur Express de test : matricule dupliqué dans le
fichier, matricule déjà pris par un autre étudiant, email dupliqué dans le
fichier, et réimport partiel. Ses résultats fondent Q1, Q1bis et Q6.

Régressions nommées exigées par le plan, retrouvées et vertes :

* `F12 schema import owned by students` —
  `backend/tests/students-import.test.ts` ;
* `F20 invalid academic year does not submit` —
  `frontend/src/pages/students-import.test.tsx` ;
* `academic year switches on September 15` — présent dans les deux runtimes
  (`backend/tests/academic-year.test.ts` et
  `frontend/src/lib/academic-year.test.ts`).

## Couverture des critères du plan

| Critère 001 | Preuve | État |
| --- | --- | --- |
| Table avec unicité étudiant/année et clé étrangère | `db.test.ts` : PK et FK réellement déclenchées | couvert, assertions imprécises (Q2) |
| Schéma `{ academic_year, students }` propriété de `students` | `students.schemas.ts` ; test de refus de l'ancien contrat tableau | couvert |
| Format, années consécutives, frontière 14/15 septembre | `academic-year.test.ts` des deux runtimes | couvert |
| Import additif, transactionnel, idempotent | trois tests : idempotence, multi-années, rollback | couvert |
| Aucune requête frontend si le formulaire est invalide | `F20 …does not submit` : bouton désactivé + API non appelée | couvert |

Critères de spec correspondants (`spec.md`, « Année académique, liste et
export ») : association vérifiée directement en base ✔, année mal formée ou non
consécutive refusée sans requête ✔, bascule du 15 septembre ✔. Les deux critères
restants de cette section (page annuelle, dossier non daté) relèvent de 005.

Règles transversales du plan appliquées à cette tranche :

* test nominal par requête HTTP ✔ ;
* `403` pour chaque rôle non autorisé — lecteur, étudiant **et entreprise**
  (ajouté par cette tranche) ✔ ; le refus CSRF est également couvert ;
* test de rejeu ✔ (réimport identique : une seule ligne d'éligibilité) ;
* test de rollback ✔ (`annule étudiants et éligibilités si une ligne fait
  échouer l'import`) ;
* contrat HTTP réel du client frontend ✔ (`students.api.test.ts`) ;
* parcours nominal et état d'erreur frontend ✔ — avec la réserve Q1 ;
* action destructive : sans objet, l'import est additif.

## Points forts

* La séparation `queries` / `service` / `routes` est respectée : la transaction
  et le SQL restent dans `queries`, le service ne fait que passer le contrat.
  C'est exactement l'inverse du défaut F14.
* L'erreur `400` renvoie désormais `{ error: <chaîne>, details: <flatten Zod> }`.
  `apiFetch` lit `body.error` : le `[object Object]` de F20 ne peut plus se
  produire sur ce chemin, et le `flatten()` reste disponible pour le débogage.
* Le README de `students`, `docs/current/data-model.md` et
  `docs/current/features.md` décrivent le comportement réellement livré, sans
  anticiper 002 à 012. La règle de l'année académique et son propriétaire sont
  nommés à l'endroit qui la porte.
* L'absence de suppression d'éligibilité, qui est une vraie conséquence du choix
  « additif », a été ouverte dans `docs/current/backlog.md` au lieu d'être
  passée sous silence.
* La contrainte est posée en `PRIMARY KEY (student_id, academic_year)` avec
  index secondaire `(academic_year, student_id)` : la lecture annuelle de 005 est
  déjà servie sans index supplémentaire.

## Constats

### Q1 — Moyen — Le seul échec métier réaliste de l'import renvoie une page HTML de pile

`backend/src/features/students/students.routes.ts:20`,
`backend/src/features/students/students.queries.ts:10`

**Vérifié par requête HTTP réelle** (sonde temporaire exécutée le 2026-09-03,
supprimée depuis — voir « Reproduction » ci-dessous).

Un fichier contenant deux fois le même matricule — ou un matricule déjà attribué
à un autre étudiant lors d'un import précédent — viole
`students.matricule UNIQUE`. better-sqlite3 lève, la route ne capture rien, et
`backend/src/app.ts` ne déclare aucun middleware d'erreur : l'exception atteint
le handler par défaut d'Express. Réponse observée, identique dans les deux cas :

```text
STATUS       : 500
CONTENT-TYPE : text/html; charset=utf-8
BODY         : <!DOCTYPE html> … <pre>SqliteError: UNIQUE constraint failed:
               students.matricule<br>    at /Users/<user>/dev/gyrus/gnu-gesta/
               backend/src/features/students/students.queries.ts:33:21<br>
               at sqliteTransaction (…/node_modules/better-sqlite3/lib/methods/
               transaction.js:65:24)<br> …
```

Trois conséquences, toutes constatées :

1. **La réponse n'est pas du JSON.** `apiFetch` fait
   `res.json().catch(() => ({}))`, `body.error` est donc `undefined` et
   l'utilisateur lit exactement `500 Internal Server Error` — aucune indication
   du matricule fautif ni de la correction à faire dans son fichier.
   **Confirmé dans un navigateur** (voir « Reproduction navigateur ») : le
   bandeau rouge de l'écran d'import ne contient que cette chaîne.
2. **La page divulgue l'arborescence absolue du serveur** et la pile complète
   (`NODE_ENV=test` ici ; le même comportement vaut pour `development`). Express
   ne masque la pile que sous `NODE_ENV=production`, valeur sur laquelle rien
   dans le dépôt ne repose aujourd'hui.
3. **Le rollback, lui, est correct** : `students` et
   `student_academic_year_eligibility` sont restés à 0 ligne. Le test de la
   tranche dit donc vrai sur ce qu'il assure.

Le dépôt possède déjà la réponse à ce problème et ne l'utilise pas ici :
`backend/src/lib/http-errors.ts` fournit `ConflictError` et
`translateUniqueConstraint`, et `offers`/`companies` traduisent leurs violations
d'index via un `handleServiceError` local.

Le test `annule étudiants et éligibilités si une ligne fait échouer l'import`
n'assertant que `res.status === 500`, il fige ce comportement comme attendu. Et
le test frontend « affiche une erreur API textuelle » injecte
`new Error('Import impossible.')`, message qu'aucune réponse réelle du backend
ne produit : l'état d'erreur lisible est démontré sur un cas fictif.

*Correction suggérée :* traduire `SQLITE_CONSTRAINT_UNIQUE` sur
`students.matricule` en `409` métier nommant le matricule en doublon, puis faire
porter au test de rollback l'assertion du code **et** du message, et au test
frontend un `ApiError` réel plutôt qu'un `Error` générique.

*Reproduction API :* un `POST /api/students/import` gestionnaire avec
`{ academic_year: '2026-2027', students: [alice, { …bob, matricule: alice.matricule }] }`
suffit ; la sonde couvrait aussi le cas du matricule déjà pris par un autre
email lors d'un import antérieur, avec le même résultat.

*Reproduction navigateur (2026-09-03) :* backend et frontend lancés en
`AUTH_MODE=dev`, connexion via `/dev-login` en fixture « Gestionnaire », dépôt
d'un `.xlsx` de deux lignes portant le même matricule `M001` dans le vrai
`<input type="file">` de l'écran d'import, puis clic sur « Importer 2 étudiants
pour 2025-2026 ». Résultat observé à l'écran :

* l'aperçu affiche correctement les deux lignes et leur matricule identique —
  rien n'alerte l'utilisateur avant l'envoi ;
* après le clic, un bandeau d'erreur rouge apparaît contenant le texte complet
  `500 Internal Server Error`, et rien d'autre ;
* l'aperçu et le fichier restent affichés, sans indication de ce qu'il faut
  corriger ni de la ligne fautive ;
* `POST /api/students/import → 500` dans l'onglet réseau ;
* **le rollback tient en conditions réelles** : aucun étudiant `*.probe@…` dans
  `backend/data/gesta.db` après l'échec, et les compteurs de `students` et
  `student_academic_year_eligibility` sont inchangés.

Note incidente : la valeur par défaut du champ année était `2025-2026` au
2026-09-03, ce qui vérifie la règle du 15 septembre dans un vrai navigateur.

### Q1bis — Moyen — Le réimport écrase les champs étudiants avec `NULL`

`backend/src/features/students/students.queries.ts:14`

**Vérifié par requête HTTP réelle.** L'upsert applique
`matricule = excluded.matricule` et `date_naissance = excluded.date_naissance`
sans condition. Un réimport du même étudiant à partir d'un fichier dépourvu des
colonnes `Matricule` ou `Date-Naissance` remplace donc les valeurs existantes
par `NULL`, en `200`, sans aucun signal :

```text
avant : {"id":1,"matricule":"M001","first_name":"Alice","date_naissance":"2005-01-01"}
après : {"id":1,"matricule":null, "first_name":"Alice","date_naissance":null}
```

Le comportement est antérieur à cette tranche : l'upsert n'a pas changé. Mais
001 fait du réimport un geste **normal et répété** — un étudiant qui recommence
son stage est réimporté l'année suivante, c'est le scénario que la tranche
revendique — et écrit dans le README de `students` que « le réimport est additif
et idempotent ». Cette phrase est vraie pour l'éligibilité et fausse pour la
fiche étudiant. Aucun test ne couvre le cas, ni backend, ni parsing frontend.

Deux effets connexes constatés au passage :

* deux lignes de même email dans un **même** fichier ne lèvent pas : la seconde
  écrase la première, et `imported` vaut `2` alors qu'un seul étudiant existe
  (le compteur retourne `students.length`, cf. Q6) ;
* le même email avec une casse différente est correctement rattaché à
  l'étudiant existant, sans doublon — le commentaire de `students.queries.ts:5`
  qui présente ce cas comme « non couvert par cet upsert » décrit donc une
  limite qui n'existe pas ; `ON CONFLICT(email)` retombe sur
  `idx_students_email_nocase`.

*Correction suggérée :* ne mettre à jour `matricule` et `date_naissance` que
lorsque la valeur importée est renseignée
(`matricule = COALESCE(excluded.matricule, students.matricule)`), ou décider
explicitement l'inverse et le documenter comme une écrasement volontaire. Dans
les deux cas, un test nommé et une correction de la phrase du README.

### Q2 — Moyen — Les contraintes SQLite sont déclenchées mais pas caractérisées

`backend/tests/db.test.ts:35`

Les deux assertions sont des `expect(...).toThrow()` sans motif. Elles passent
sur n'importe quelle exception : une faute de frappe dans le SQL du test, une
table renommée, un `PRAGMA foreign_keys` désactivé par mégarde produiraient
elles aussi un jet. Le test ne peut donc pas échouer pour la bonne raison.

Le plan demande explicitement « un test qui déclenche réellement chaque nouvelle
contrainte SQLite et vérifie le code et le message métier retournés ».

*Correction suggérée :* `.toThrow(/UNIQUE constraint failed: student_academic_year_eligibility/)`
et `.toThrow(/FOREIGN KEY constraint failed/)`.

### Q3 — Moyen — F13 n'est refermé que par convention, pas par un garde-fou

`backend/src/lib/academic-year.ts`, `frontend/src/lib/academic-year.ts`

Les deux fichiers sont identiques octet pour octet (45 lignes chacun). Le plan
autorise ce doublon — « un propriétaire unique dans chaque runtime » — mais
F13 reprochait précisément à la bascule du 15 septembre d'être maintenue à
plusieurs endroits. Passer de trois copies divergentes à deux copies identiques
réduit le risque sans le supprimer : rien n'échoue si l'une des deux est
corrigée seule. Les deux suites de tests, bien que symétriques, ne comparent
jamais les deux implémentations.

Le plan impose ce type de garde-fou pour les statuts bloquants (« la
duplication obligatoire dans l'index partiel SQLite est couverte par un test de
cohérence qui échoue si les deux listes divergent ») ; la même exigence n'a pas
été portée sur l'année académique.

*Correction suggérée :* soit un test de cohérence comparant le contenu des deux
modules, soit un commentaire d'invariant croisé en tête de chaque fichier
nommant explicitement l'autre. Le choix doit être tracé, sinon 011 refermera F13
à moitié.

### Q4 — Mineur — Exports non consommés introduits par la tranche

`backend/src/lib/academic-year.ts:37` et `:43`

`academicYearForDate` et `currentAcademicYear` ne sont importés par aucun module
de `backend/src/` : seul `isValidAcademicYear` l'est, par
`students.schemas.ts`. Ils ne vivent que dans leur propre test. Côté frontend,
`academicYearForDate` est dans le même cas.

Ces fonctions sont légitimement anticipées par 005 et 008, mais `AGENTS.md`
range « exports inutilisés » dans l'hygiène outillée, et F11 portait sur du code
mort. À défaut de les retirer, l'anticipation mérite d'être assumée à l'écrit —
une ligne dans le README de `students` suffit.

### Q5 — Mineur — Un `SELECT` par ligne et un cast non gardé

`backend/src/features/students/students.queries.ts:24` et `:40`

L'upsert est suivi d'un `SELECT id … COLLATE NOCASE` par étudiant, puis d'un
`as { id: number }` sans vérification. Si l'upsert n'avait rien produit, l'accès
`student.id` lèverait un `TypeError` à l'intérieur de la transaction —
techniquement sûr (tout est annulé) mais illisible.

`ON CONFLICT … DO UPDATE` supporte `RETURNING id` en SQLite, et le dépôt
l'utilise déjà (`db.test.ts`, `companies`). Une seule instruction remplacerait
les deux et supprimerait le cast.

### Q6 — Mineur — `imported` compte les lignes reçues, l'écran dit « importés »

`students.queries.ts:43` retourne `students.length`. **Vérifié :** un fichier
contenant deux fois le même email renvoie bien `imported: 2` alors qu'un seul
étudiant existe en base, et l'écran affiche « 2 étudiants importés ». Le README
est exact (« nombre de lignes reçues ») ; le libellé utilisateur ne l'est pas,
et ce cas n'est couvert par aucun test — ni backend, ni parsing frontend. Voir
aussi Q1bis, dont c'est la face visible.

*Correction suggérée :* soit dédupliquer par email avant l'envoi et le compter,
soit renvoyer le nombre d'associations réellement présentes après transaction.

### Q7 — Mineur — Fichiers parasites toujours suivis et modifiés

`git status --short` montre `.DS_Store` et `docs/.DS_Store` modifiés ;
`git ls-files` en compte cinq suivis (racine, `backend/`, `backend/src/`,
`backend/src/features/`, `docs/`). `.gitignore` ne les exclut pas.

C'est la reprise exacte d'un point de F21, sur une tranche qui se veut
exemplaire côté hygiène. À traiter avant le commit de 001, pas en 012.

### Q8 — Mineur — Le nom `F12 schema import owned by students` promet plus que le test

`backend/tests/students-import.test.ts:54`

Ce test vérifie le contrat `{ academic_year, students }` et les lignes créées en
base. F12 portait sur l'inversion de dépendance `students` → `internships` :
aucune assertion ne la surveille, et le test resterait vert si la feature
importait un jour `internships`. Le test compagnon « refuse l'ancien contrat
tableau » est plus proche du sujet, sans le couvrir non plus.

Le constat est atténué par le fait que `internships` n'existe pas encore : il n'y
a rien à interdire aujourd'hui. Mais F12 devra être re-prouvé en 002, quand la
dépendance redevient possible, et ne doit pas être considéré comme fermé par le
nom de ce test.

### Q9 — Observation — Le message d'erreur d'année apparaît dès la première frappe

`frontend/src/pages/students-import.page.tsx:150`

Le champ vidé est invalide : effacer l'année pour la retaper affiche
immédiatement le message d'erreur, avant que la saisie soit terminée.
Fonctionnellement correct et volontairement conservateur, mais un
déclenchement au `blur` ou après première soumission serait moins bruyant.
À arbitrer, pas un défaut.

## Ce qui n'a pas été vérifié

Pour que cette review reste falsifiable, voici ce qu'elle **n'établit pas** :

* **Q1 a été vérifié dans un navigateur**, de bout en bout, sur les serveurs de
  développement (voir « Reproduction navigateur »). **Q1bis ne l'a pas été** :
  le reproduire à l'écran suppose un import réussi, donc une écriture dans
  `backend/data/gesta.db` ; il reste prouvé au niveau API uniquement ;
* le parcours nominal de l'import n'a pas été rejoué dans un navigateur, pour la
  même raison ; il n'est prouvé que par `students-import.test.tsx` sur jsdom ;
* le comportement sur une base de développement existante : `schema.sql` utilise
  `CREATE TABLE IF NOT EXISTS` sur une table entièrement nouvelle, donc la
  migration est sûre par construction, mais aucun démarrage réel sur
  `backend/data/gesta.db` n'a été observé ;
* l'import d'un vrai fichier `.xlsx` de la source institutionnelle : les tests
  comme la reproduction navigateur fabriquent leur classeur avec
  `XLSX.utils.json_to_sheet` ;
* les performances de l'import sur une cohorte réelle (voir Q5, N+1 assumé).

## Recommandation

Traiter **Q1, Q1bis, Q2 et Q7** avant le commit de 001 : l'erreur réellement vue
par l'utilisateur et la fuite de la pile serveur, la perte silencieuse de
`matricule`/`date_naissance` au réimport, la seule preuve des nouvelles
contraintes, et la propreté de l'arbre livré. Les deux premières sont
reproductibles en une requête ; les corriger maintenant évite qu'un test de 002
ne les entérine.

Q1bis appelle aussi une correction de documentation : la phrase « le réimport
est additif et idempotent » du README de `students` doit préciser qu'elle porte
sur l'éligibilité annuelle, pas sur les champs de la fiche étudiant.

Trancher Q3 explicitement — garde-fou ou invariant écrit — pour que 011 hérite
d'une position claire sur F13.

Q4, Q5, Q6, Q8 et Q9 peuvent partir en 002 ou 012 sans risque, à condition
d'être portés dans le plan plutôt que dans cette seule review : `AGENTS.md`
rappelle qu'une contrainte encore vraie ne doit pas vivre uniquement dans une
review.
