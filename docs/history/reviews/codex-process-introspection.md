# Introspection du processus Codex — Gestion des stages et conventions

Date : 2026-08-28

Objet : analyse de la revue de qualité
`2026-08-28-gestion-stages-conventions-quality-review.md` portant sur le commit
`016e952` (`feat: Gestion des stages et conventions`).

Ce document examine chaque constat de la revue, analyse ce qui, dans mon
processus d'exécution et dans le processus documentaire, a permis le problème,
et propose des corrections de processus. Il ne prescrit ni n'applique de
correctif de code.

## Méthode et limites

J'ai recommencé l'analyse à partir des sources suivantes, sans reprendre une
conclusion antérieure :

* le commit exact `016e952`, afin de ne pas confondre le travail revu avec les
  modifications ultérieures présentes dans le répertoire de travail ;
* la spec, le plan et la review de clôture archivés ;
* les sources courantes et les README de features au même commit ;
* le code backend, frontend, le schéma SQLite et l'ensemble des tests touchant
  les comportements cités ;
* trois reproductions indépendantes en SQLite mémoire : F1, F2 et la forme
  réelle de l'erreur de contrainte discutée en F18.

Les verdicts utilisés sont :

* **confirmé** : le constat et sa portée principale sont établis ;
* **confirmé avec nuance** : le problème existe, mais une formulation, une
  conséquence ou l'étendue annoncée doit être corrigée ;
* **partiel** : seule une partie du constat est soutenue par les sources.

Synthèse : F1, F3, F5, F7, F8, F10, F11, F12, F16, F17 et F20 sont confirmés ;
F2, F4, F6, F13, F14, F15, F18, F19 et F21 sont confirmés avec nuance ; F9 et
F22 sont partiels. Aucun constat n'est entièrement infondé.

## Analyse point par point

### F1 — Un dossier non daté change d'année après un réimport

**Verdict : confirmé.** La sous-requête de la liste annuelle rattache tout
dossier dont `academic_year IS NULL` au `MAX(academic_year)` des éligibilités de
l'étudiant. La reproduction indépendante donne bien un dossier visible en
`2026-2027`, puis une ligne « Sans stage » dans cette année et le dossier déplacé
en `2029-2030` après l'ajout de cette nouvelle éligibilité.

**Cause dans mon processus.** L'E2E nominal a découvert tardivement qu'un
dossier sans dates était invisible. J'ai traité ce symptôme par une règle
locale — « le montrer dans l'éligibilité la plus récente » — sans reconstruire
la matrice temporelle de cette règle. Je n'ai testé ni un réimport futur, ni un
étudiant éligible dans plusieurs années, ni la stabilité d'une année déjà
ouverte. J'ai privilégié la réussite immédiate du parcours E2E au maintien d'un
invariant durable.

**Cause documentaire.** La spec ne définissait pas le rattachement provisoire
d'un dossier non daté. Le plan non plus. La décision a été ajoutée après coup
dans la review de clôture et dans `docs/current/features.md`, mais sans décrire
sa stabilité face aux imports futurs ni lui associer un critère d'acceptation.

**Correction de processus.** Toute règle de rattachement temporel doit être
précédée d'une table de scénarios : zéro, une ou plusieurs éligibilités ; dossier
daté ou non ; import antérieur, courant ou futur ; réimport avant et après la
création. Une correction issue d'un E2E doit rouvrir la spec ou le plan, ajouter
l'invariant et les tests de régression avant d'être considérée comme close.

### F2 — Un dossier créé sans éligibilité est absent des vues

**Verdict : confirmé avec nuance.** Le défaut central est établi : les deux
chemins de création ne vérifient pas l'existence d'une éligibilité, tandis que
la liste annuelle part exclusivement de cette table. Un dossier peut donc
exister sans apparaître dans aucune année, et aucune page d'offre ne fournit un
lien direct vers lui. Cela concerne naturellement les étudiants antérieurs au
commit, puisqu'aucune éligibilité n'a été migrée.

La formule « sans recours » ou « seul un accès SQL permet d'en sortir » est
toutefois trop forte. Un gestionnaire peut réimporter l'étudiant avec une année
depuis l'interface ; le dossier non daté redevient alors visible dans
l'éligibilité la plus récente. Ce recours est indirect, non expliqué et peut
produire F1, mais il existe. De plus, l'absence de migration était explicitement
hors périmètre et reprise dans les limites opérationnelles ; le défaut est
surtout l'absence de garde ou de parcours de récupération cohérent avec ce
choix.

**Cause dans mon processus.** J'ai validé séparément la création du dossier,
l'import annuel et la préparation datée, sans tester leur composition sur une
fiche historique. J'ai supposé implicitement que tout étudiant susceptible
d'obtenir un stage possédait déjà une éligibilité, alors que le plan déclarait
en même temps qu'aucune migration ne serait faite.

**Cause documentaire.** Les documents contiennent deux décisions compatibles
seulement si un pont est prévu : pas de migration historique, mais exigence
d'éligibilité lors de la préparation. Aucun document ne définit ce qui doit se
passer à la création pour un étudiant sans éligibilité, ni comment retrouver le
dossier depuis son origine.

**Correction de processus.** Pour toute nouvelle table d'association requise
par un parcours existant, ajouter une revue « données préexistantes » : garde à
l'entrée, migration, valeur de transition ou parcours de remédiation. Tester le
parcours avec une entité créée avant la feature. Exiger aussi qu'une création
retourne ou expose une navigation vers l'entité créée, indépendamment des vues
agrégées.

### F3 — Absence de tests backend des mutations refusées au lecteur

**Verdict : confirmé.** Les routes de mutation portent bien
`requireRole('gestionnaire')`, mais aucun test de la feature n'envoie une de ces
mutations comme lecteur. Le test frontend qui vérifie l'absence de boutons ne
teste pas la frontière de sécurité backend. Les tests génériques d'autres
features démontrent le middleware ailleurs, pas son application à ces routes.

**Cause dans mon processus.** J'ai confondu trois preuves différentes : la
présence visuelle ou non d'une action, la déclaration du middleware sur la
route, et un test d'autorisation effectif. L'E2E lecteur s'est arrêté à
l'observation « aucun bouton de mutation » au lieu de tenter directement les
requêtes interdites.

**Cause documentaire.** La spec demandait explicitement des contrôles backend
et le plan annonçait la protection des mutations, mais la vérification de la
tâche restait formulée globalement. Le README affirme ensuite que les
« permissions » sont couvertes, formulation plus large que les tests réels.

**Correction de processus.** Construire une matrice rôle × endpoint × méthode
pour toute nouvelle feature. Chaque case de refus importante doit avoir un test
HTTP. Une vérification frontend peut compléter cette matrice pour l'ergonomie,
jamais servir de preuve de sécurité.

### F4 — Critères d'acceptation insuffisamment testés

**Verdict : confirmé avec nuance.** La majorité des lacunes listées sont
établies : pas de sélection d'un étudiant déjà bloqué depuis une autre offre,
pas de contrainte concurrente exercée, pas d'assertion sur la conservation des
anciennes candidatures, pas de restauration d'une proposition, pas de contrôle
du contenu des éligibilités importées ou de l'année non consécutive, et pas de
matrice d'accès aux lectures et exports de stages.

Le premier exemple est néanmoins trop absolu. Le test « double
select-candidate retourne 409 » observe indirectement qu'une même sélection ne
réussit pas deux fois. Il s'arrête cependant sur le statut `prise`, ne vérifie
pas le nombre de dossiers et n'exerce pas la contrainte d'unicité d'origine.
Il s'agit donc d'une couverture partielle du comportement utilisateur, pas de
l'invariant de données.

**Cause dans mon processus.** La spec contenait une liste précise de « tests à
prévoir », mais le plan l'a condensée en quelques tâches et commandes globales.
J'ai pris le vert de la suite comme preuve de couverture et coché les tâches au
niveau de l'épopée, sans relier chaque critère à une assertion identifiable.

**Cause documentaire.** Le plan dit que toutes les sections V1 sont mappées à
une tâche, mais une tâche n'est pas une preuve. La review de clôture affirme
qu'aucun critère n'a été abandonné et qu'il ne reste aucun travail, sans tableau
de traçabilité entre critères, tests et vérifications manuelles.

**Correction de processus.** Maintenir dès la planification une matrice
`critère -> invariant -> test automatisé ou vérification manuelle -> preuve`.
Un critère ne peut être marqué couvert que par le nom du test ou une preuve
reproductible. Une couverture indirecte doit être nommée comme telle et
complétée pour les contraintes de données, transactions et courses.

### F5 — Message trompeur lors de l'acceptation d'une proposition

**Verdict : confirmé.** Une proposition étudiante qui n'est pas `soumise`, ou
qui n'a pas d'auteur, produit systématiquement
`InternshipOriginAlreadyUsedError`. Une proposition refusée ou indisponible
peut donc annoncer à tort qu'un dossier existe. Le message n'est correct que
pour certains états cohérents après acceptation.

**Cause dans mon processus.** J'ai regroupé sous une seule erreur des causes
techniquement proches dans le chemin nominal, sans construire la table
`état courant -> action -> erreur utilisateur`. Le scénario heureux
`soumise -> prise` a masqué les appels répétés ou incohérents.

**Cause documentaire.** Les documents décrivent le cycle attendu mais pas le
contrat des erreurs par état. « Erreurs métier explicites » dans le plan ne
définit ni code stable, ni message, ni cause.

**Correction de processus.** Pour chaque commande de transition, écrire une
table des préconditions et des erreurs distinctes. Tester le code d'erreur et
le sens du message pour chaque état rejeté, pas uniquement le statut HTTP.

### F6 — Rejet de promesse non géré sur l'export

**Verdict : confirmé avec nuance.** La route est `async` sous Express 4.
`handleError()` relance les erreurs inconnues depuis le `catch`, ce qui devient
une promesse rejetée qu'Express 4 ne transmet pas à un middleware. Aucun
middleware d'erreur global n'est déclaré. La requête peut donc rester sans
réponse et un `unhandledRejection` est produit. L'arrêt du processus dépend de
la version de Node et de sa politique `--unhandled-rejections` ; il ne faut pas
présenter cette dernière conséquence comme universelle, même si elle est le
comportement par défaut des Node modernes.

**Cause dans mon processus.** J'ai réutilisé un helper conçu pour des handlers
synchrones dans l'unique handler asynchrone du router, sans audit de la manière
dont Express 4 propage les erreurs. Les tests ne forcent jamais l'échec de
génération du classeur.

**Cause documentaire.** Ni l'architecture ni le plan ne fixent une convention
uniforme pour les erreurs asynchrones Express. Le plan demande l'export nominal
mais pas son comportement en échec.

**Correction de processus.** Choisir et documenter une seule stratégie pour les
handlers asynchrones : wrapper `next(error)`, middleware compatible ou montée
de version contrôlée. Ajouter au moins un test de panne par intégration externe
ou génération de fichier, et vérifier que la réponse est terminée avec un 5xx
maîtrisé.

### F7 — Un enregistrement sans changement invalide la convention

**Verdict : confirmé.** Le service supprime la convention générée à chaque
`PATCH`, avant toute comparaison avec les valeurs persistées. Le test appelle
deux fois la même préparation et attend ensuite zéro convention : il consacre
donc le comportement au lieu de distinguer correction et no-op. Le plan et le
README parlent d'une invalidation après correction ou modification, ce qui
n'inclut pas naturellement un enregistrement identique.

**Cause dans mon processus.** J'ai choisi une invalidation conservatrice et
simple, mais je n'ai pas testé l'idempotence d'une commande exposée par un
formulaire prérempli. J'ai aussi accepté une assertion alignée sur
l'implémentation sans la confronter au vocabulaire fonctionnel.

**Cause documentaire.** « Une correction invalide » ne précise pas quels
champs affectent le document ni ce qu'est un changement réel. La review de
clôture reprend cette phrase sans relever que le code invalide à chaque appel.

**Correction de processus.** Pour toute mise à jour, définir explicitement
l'idempotence et les effets secondaires d'un no-op. Les tests doivent couvrir
valeur identique, valeur pertinente modifiée et valeur non pertinente modifiée.

### F8 — Blocage non anticipé dans l'interface étudiante

**Verdict : confirmé.** L'API de consultation ne fournit aucun état de blocage,
le bouton « Postuler » reste disponible, puis l'erreur est affichée avec
`String(err)`. Le résultat contient le préfixe technique `ApiError:` et un
message à la troisième personne. Le backend protège bien l'invariant, mais le
parcours n'est ni anticipé ni formulé pour l'utilisateur concerné.

**Cause dans mon processus.** Je me suis satisfait du refus backend et ai
interprété « adapter les retours de blocage » comme afficher l'exception après
l'action. Je n'ai pas traité le blocage comme un état d'interface à part
entière ni testé le parcours étudiant après création d'un dossier.

**Cause documentaire.** Le plan promet que les états bloqués expliquent la
suite, mais le contrat API ne prévoit aucune donnée permettant cette
anticipation. Le besoin UX et le besoin de contrat backend n'ont pas été reliés.

**Correction de processus.** Pour chaque refus métier prévisible, décider au
plan s'il doit être anticipé par l'API. Définir des codes d'erreur stables et un
adaptateur d'affichage sans nom de classe technique. Ajouter un test frontend
du blocage avant action et un test du message après refus de course éventuel.

### F9 — Arbitrages du modèle de convention insuffisamment gouvernés

**Verdict : partiel.** Le script prend bien des décisions sensibles : retrait
de la civilité et de l'accord de genre, reformulations contractuelles, ajout de
l'adresse, réécriture des dates, du régime horaire et de la mention finale. La
reproductibilité est aussi incomplète : `lxml` n'est déclaré dans aucun
manifeste et aucune vérification ne relie l'artefact versionné au script.

En revanche, « sans décision tracée » et « uniquement dans la review de
clôture » sont inexacts. Le plan archive explicitement le choix d'une
formulation neutre, la conservation provisoire du texte institutionnel et le
blocage sur adresse manquante. La review de clôture les reprend, et la
documentation courante signale que le texte institutionnel doit être validé.
Le vrai défaut est que la justification détaillée et le statut provisoire des
transformations ne vivent pas dans une source courante faisant autorité. Une
ADR est une option raisonnable, mais pas le seul support possible.

**Cause dans mon processus.** Comme la demande initiale m'autorisait à prendre
les choix raisonnables sans poser de question, j'ai traité une adaptation de
texte juridique comme une décision d'implémentation ordinaire. J'ai contrôlé le
rendu visuel, mais pas le niveau d'autorité requis pour modifier le contenu.

**Cause documentaire.** Les incertitudes de la spec sont résolues dans le plan
archivé, tandis que les documents courants ne conservent que la nécessité d'une
validation future. Le dépôt ne distingue pas clairement décision technique,
choix éditorial provisoire et validation juridique externe. Le mot
« reproductible » dans la review de clôture est par ailleurs trop fort pour un
script sans environnement déclaré ni contrôle de parité.

**Correction de processus.** Classer les décisions par autorité. Une décision
juridique ou institutionnelle doit être marquée « provisoire, validation du
propriétaire requise », avec source, transformations exactes et responsable de
validation dans un document courant ou une ADR. Le pipeline de génération doit
déclarer ses dépendances et fournir une commande vérifiable qui compare
l'artefact produit à l'artefact versionné.

### F10 — Répertoire documentaire non ignoré par Git

**Verdict : confirmé.** `.gitignore` couvre `uploads/` et `data/`, pas
`internship-documents/`. Le module crée ce répertoire au chargement et les tests
y déposent des fichiers. Le risque de versionner une convention signée est
réel et porte sur des données personnelles.

**Cause dans mon processus.** J'ai traité le stockage comme une limite de
production, sans faire la revue d'hygiène locale minimale : ignore Git,
permissions, nettoyage, sauvegarde et racine de test.

**Cause documentaire.** La limite de stockage local est bien documentée, mais
la checklist opérationnelle ne descend pas jusqu'aux protections du dépôt. Le
plan sépare trop fortement « développement » et « production » alors qu'une
fuite Git peut arriver dès le développement.

**Correction de processus.** Toute nouvelle écriture disque doit déclencher une
checklist : chemin, ignore Git, nom non sensible, permissions, nettoyage,
racine injectable pour les tests et stratégie de sauvegarde. Cette vérification
doit précéder le premier test d'upload.

### F11 — Code mort et schéma orphelin

**Verdict : confirmé.** Les recherches de références au commit confirment que
les fonctions et constantes citées ne sont pas appelées, et que l'ancien
`StudentsImportSchema` n'est plus consommé. Les anciens chemins d'import ont
été conservés parallèlement au nouvel import annuel sans usage.

**Cause dans mon processus.** J'ai ajouté le nouveau chemin sans terminer la
suppression de l'ancien, et j'ai laissé plusieurs helpers préparatoires après
avoir changé de design. Le build TypeScript ne signale pas automatiquement les
exports non utilisés entre modules.

**Cause documentaire.** Le plan demande l'ajout et l'adaptation, pas un audit
des symboles rendus obsolètes. La review de clôture ne comporte pas de passe de
simplification après livraison.

**Correction de processus.** Ajouter avant clôture une passe `rg` sur les
exports nouveaux et remplacés, plus un diff d'API interne. Chaque ancien chemin
doit être supprimé, marqué déprécié avec un consommateur identifié, ou justifié.

### F12 — Dépendance de `students` vers `internships`

**Verdict : confirmé.** Le schéma du corps de `POST /api/students/import` est
défini dans `internships.schemas.ts`, puis importé par la feature `students`.
Le contrat de transport de l'endpoint appartient à `students`; seule la notion
réutilisable d'année académique justifie éventuellement un module partagé.

**Cause dans mon processus.** J'ai regroupé les nouveaux schémas par chantier
plutôt que par propriétaire métier, ce qui a minimisé le nombre de fichiers
touchés au prix d'une dépendance inversée.

**Cause documentaire.** Le plan nomme les features impactées mais ne dessine pas
leur graphe de dépendances ni la propriété des contrats. L'architecture décrit
les couches, pas les règles d'import entre features.

**Correction de processus.** Ajouter à la conception une table
`contrat -> feature propriétaire -> consommateurs`. Un type réellement partagé
va dans un module commun minimal ; le schéma complet d'une route reste à côté
de cette route.

### F13 — Règles métier répétées

**Verdict : confirmé avec nuance.** La coupure du 15 septembre est répétée dans
deux pages frontend et dans le backend, sans tests frontend. Les statuts
bloquants existent dans la requête SQL, l'index partiel et une constante
TypeScript inutilisée. La duplication entre SQL et TypeScript n'est pas
entièrement évitable : une contrainte de base doit rester autonome. Le défaut
est l'absence de source conceptuelle et de tests de cohérence, ainsi que les
copies évitables dans une même couche.

**Cause dans mon processus.** J'ai copié un calcul court au lieu d'en faire un
utilitaire frontend testé, et créé une constante de statuts sans l'utiliser.
Je n'ai pas traité l'index SQL et le service comme deux implémentations d'un
même invariant à maintenir ensemble.

**Cause documentaire.** Le plan mentionne ce couplage dans un « point
d'attention », mais ne le transforme ni en test ni en obligation de mise à jour
atomique. La règle d'année est décrite, pas son propriétaire logiciel.

**Correction de processus.** Centraliser les copies dans chaque runtime,
documenter explicitement les duplications inter-runtime inévitables, et ajouter
des tests de contrat communs sur un jeu de cas frontières. Toute évolution des
statuts doit avoir une checklist SQL + service + frontend + documentation.

### F14 — Orchestration métier dans `applications.queries.ts`

**Verdict : confirmé avec nuance.** Le contrôle de blocage, la transaction de
sélection, la création d'un dossier d'une autre feature et la traduction des
erreurs vivent dans `applications.queries.ts`. C'est un écart net par rapport à
la séparation recommandée `service = orchestration`, `queries = SQL`. Le mot
« généralement » de l'architecture en fait une convention, pas une interdiction
absolue, et une partie de cette orchestration existait avant le commit. Le
commit a néanmoins renforcé cette dette au lieu de la contenir.

**Cause dans mon processus.** J'ai privilégié l'extension de la transaction
existante là où elle se trouvait, pour préserver l'atomicité avec un petit diff.
Je n'ai pas effectué ensuite la passe architecturale qui aurait déplacé
l'orchestration sans perdre la transaction.

**Cause documentaire.** Le plan exige l'atomicité et cite à la fois queries et
service, mais ne désigne pas le propriétaire de la transaction multifeature.
La convention architecturale n'est pas reprise comme critère de review.

**Correction de processus.** Pour chaque transaction multifeature, dessiner
l'orchestrateur et les primitives SQL qu'il appelle avant de coder. Ajouter une
revue de frontières de couches après les tests fonctionnels, surtout lorsqu'un
fichier préexistant contient déjà de la dette.

### F15 — Couverture partielle des documents, du signataire et de l'export

**Verdict : confirmé avec nuance.** Les lacunes automatisées citées sont
réelles : aucun test des trois classes de signataire invalide, de l'immutabilité
du modèle source, des formats et tailles de fichiers, des colonnes et libellés
de l'export, ni de plusieurs utilitaires et cas invalides. Le test DOCX ne
contrôle que quelques chaînes et les placeholders.

La review de clôture indique toutefois une inspection visuelle manuelle du DOCX
sur deux pages et une inspection manuelle du classeur. Il est donc inexact de
dire qu'aucun contrôle de structure ou de mise en page n'a eu lieu ; le problème
est l'absence de contrôle automatisé reproductible et la portée limitée des
assertions.

**Cause dans mon processus.** J'ai utilisé les outils de rendu pour valider un
exemplaire nominal, puis considéré cette vérification comme suffisante. Je n'ai
pas séparé tests de contenu, tests de structure, tests de sécurité des fichiers
et inspection visuelle. Pour l'export, j'ai pris une cellule date et le nombre
de lignes comme échantillon représentatif de tout le contrat.

**Cause documentaire.** La spec détaillait très bien les tests attendus, mais
le plan les a regroupés sous « DOCX fidèle » et « inspection du classeur ».
La review de clôture ne liste pas explicitement ce qui reste non automatisé.

**Correction de processus.** Décomposer la qualité des artefacts en quatre
niveaux : validation d'entrée, contenu sémantique, structure technique et rendu
visuel. Conserver l'inspection visuelle, mais automatiser les invariants stables
(empreinte source, placeholders, parties ZIP, en-têtes, types de cellules,
nom de fichier, lignes vides) et les limites de sécurité.

### F16 — Tests frontend sans erreurs ni contrat HTTP

**Verdict : confirmé.** Les trois tests couvrent la liste nominale, la lecture
seule visuelle et la préparation nominale. Ils ne couvrent ni échec, ni upload,
ni confirmation, ni suppression/confirmation. Le module API étant entièrement
mocké, les tests ne valident pas ses URL, méthodes, corps ou en-têtes. Même les
helpers d'URL sont remplacés par des mocks dans la suite.

**Cause dans mon processus.** J'ai optimisé les tests pour le rendu rapide des
pages principales et isolé complètement le réseau. Cette isolation a supprimé
la seule preuve du contrat réellement envoyé. Je n'ai pas ajouté de niveau de
test intermédiaire pour le client API.

**Cause documentaire.** « Parcours principaux et états d'erreur » est resté une
phrase globale de la spec. Le plan a marqué le frontend terminé dès que les
routes se rendaient et que les parcours nominaux passaient.

**Correction de processus.** Répartir les tests frontend en trois niveaux :
composants avec mocks, client API avec `fetch` intercepté, et quelques parcours
intégrés. Exiger au moins un état d'erreur par mutation et un test du dialogue
de confirmation pour toute action destructive.

### F17 — Tests écrivant dans le répertoire réel du dépôt

**Verdict : confirmé.** Les routes utilisent l'uploader singleton construit
avec `DEFAULT_INTERNSHIP_DOCUMENTS_ROOT`. Les tests de routes écrivent donc sous
`backend/internship-documents/`. Le nettoyage ne connaît que les fichiers déjà
référencés en base ; une panne entre écriture et insertion peut laisser un
orphelin. F10 aggrave le risque.

**Cause dans mon processus.** Les fonctions de stockage acceptaient une racine
injectable, mais l'application assemblée dans les tests ne l'injectait pas.
J'ai vérifié le nettoyage du chemin heureux plutôt que l'isolation physique de
la suite.

**Cause documentaire.** Le plan ne fixe pas de règle pour les effets de bord
des tests. « Base SQLite en mémoire isolée » dans la review de clôture donne une
impression d'isolation globale alors que le système de fichiers ne l'est pas.

**Correction de processus.** Toute suite qui écrit un fichier doit recevoir un
répertoire temporaire propre au test et le supprimer indépendamment de l'état
de la base. L'isolation doit être vérifiée séparément pour la base, le disque,
les variables d'environnement et le réseau.

### F18 — Traduction fragile des contraintes SQLite

**Verdict : confirmé avec nuance, et le défaut est plus immédiat que décrit.**
Le code recherche le nom `idx_internships_one_blocking_per_student` dans le
message. Une reproduction avec la version installée de `better-sqlite3` renvoie
pour cette contrainte :

```text
name=SqliteError
code=SQLITE_CONSTRAINT_UNIQUE
message=UNIQUE constraint failed: internships.student_id
```

Le nom de l'index n'apparaît donc déjà pas : le chemin concurrent d'unicité du
dossier bloquant retombe en erreur non traduite. La revue a raison sur la
fragilité et l'absence de test, mais sa piste « code + nom d'index » ne résout
pas ce cas réel. Les contraintes d'origine, elles, ont des messages contenant
les colonnes recherchées.

**Cause dans mon processus.** J'ai écrit la traduction à partir d'une hypothèse
sur le texte produit par SQLite, sans provoquer la violation avec le driver et
la version réels. L'absence du test de contrainte signalée en F4 a laissé cette
hypothèse intacte.

**Cause documentaire.** Le plan exige une contrainte sûre face à la concurrence
mais ne demande pas de vérifier la forme de l'erreur remontée ni sa traduction
HTTP. L'invariant de base et le contrat d'erreur applicatif ont été considérés
comme une seule preuve.

**Correction de processus.** Écrire d'abord un test qui déclenche chaque
contrainte réelle et capture les propriétés structurées du driver. Séparer le
test « la base refuse » du test « l'API traduit en erreur métier ». Ne proposer
une stratégie de traduction qu'après observation de `code`, `message` et des
éventuelles propriétés propres au driver.

### F19 — Restauration de l'offre sans précondition suffisante

**Verdict : confirmé avec nuance.** `restoreOfferStatus()` suppose que l'offre
existe et réécrit son statut sans vérifier le statut courant. L'absence de ligne
produirait bien un `TypeError`, mais les clés étrangères rendent ce cas peu
probable dans une base intègre. La dérive de statut est plus plausible, car le
service de restauration n'exige pas que l'origine soit encore `prise`.

Le constat voisin sur la candidature est aussi juste : le contrôle de blocage
et l'insertion ne sont pas couverts par une transaction ou une contrainte
commune. Son impact fonctionnel actuel est limité, comme l'indique la review.

**Cause dans mon processus.** J'ai raisonné à partir du scénario nominal où
l'origine n'est jamais modifiée entre création et suppression. Je n'ai pas
formalisé la précondition de restauration ni testé une dérive d'état ou une
donnée incohérente.

**Cause documentaire.** La spec exige une restauration atomique, mais ne
précise pas la politique si l'origine a changé entre-temps. Le plan assimile
atomicité et validité des préconditions alors que ce sont deux sujets distincts.

**Correction de processus.** Chaque opération compensatoire doit documenter
son état source attendu, le nombre de lignes modifiées et le comportement en
cas d'écart. Ajouter des tests de stale state et, pour les invariants sujets à
course, vérifier la nécessité d'une transaction ou d'une contrainte de données.

### F20 — Validation frontend de l'année académique inopérante

**Verdict : confirmé.** Les attributs `required` et `pattern` sont portés par un
input hors formulaire, tandis que l'import est lancé par `onClick`; la
validation native n'est donc pas déclenchée. Le backend refuse correctement une
année non consécutive, mais renvoie un objet `flatten()` dans `error`.
`apiFetch` le passe comme message à `ApiError`, puis `String(err)` affiche une
forme telle que `ApiError: [object Object]`.

**Cause dans mon processus.** J'ai ajouté des attributs HTML comme indication
visuelle sans tester leur mécanisme réel de soumission. Je n'ai pas testé le
contrat d'erreur Zod imbriqué avec le client générique.

**Cause documentaire.** La validation d'année est décrite côté backend, pas
comme responsabilité partagée du formulaire et du contrat d'erreur. Aucun
exemple d'erreur structurée n'est défini.

**Correction de processus.** Tester les formulaires par l'action utilisateur
réelle avec une valeur invalide et vérifier qu'aucune requête ne part. Définir
un format d'erreur API stable où `error` reste une chaîne et les détails sont
dans un champ séparé, puis le tester au niveau du client frontend.

### F21 — Divers défauts d'hygiène et de cohérence

**Verdict : confirmé avec nuance.** Les faits sont établis : création du
répertoire à l'import du module, `Promise.all` avec une seule promesse, garde de
rôle répétée, deux `.DS_Store` modifiés par le commit, convention de nommage
hétérogène et script Python sans commande ni dépendance déclarée. Tous n'ont pas
la même portée : la garde frontend redondante peut être une défense en
profondeur acceptable, et le nommage est surtout une question de cohérence. Les
effets de bord d'import, les fichiers système suivis et la reproductibilité du
script sont les éléments substantiels.

**Cause dans mon processus.** Le chantier a accumulé des résidus de
refactorisation et des choix locaux que je n'ai pas revus lors d'une passe
finale de simplification. Je n'ai pas contrôlé le diff Git pour les artefacts
système ni exécuté le script depuis une procédure vierge.

**Cause documentaire.** La checklist finale ne contient ni propreté du diff,
ni effets de bord d'import, ni conformité des noms, ni reproductibilité des
outils hors Node. Elle permet donc de déclarer « chemins conformes » sans audit
mécanique.

**Correction de processus.** Ajouter une passe de finition distincte : statut
Git, fichiers parasites, imports sans effets de bord, promesses et wrappers
superflus, noms conformes, exports inutilisés et exécution des scripts depuis
leurs dépendances déclarées. Les redondances de sécurité doivent être
commentées comme intentionnelles ou retirées.

### F22 — Règle annuelle absente du README de feature

**Verdict : partiel.** La règle du dossier non daté n'apparaît effectivement pas
dans `backend/src/features/internships/README.md`. En revanche, elle ne vit pas
« uniquement dans la review de clôture » : `docs/current/features.md`, source
courante au commit, dit explicitement qu'un dossier non daté apparaît dans
l'éligibilité la plus récente. L'affirmation d'une violation directe de
`AGENT.md` est donc incorrecte.

Il reste un problème de placement : cette règle est un détail du contrat de la
requête annuelle et le README local est le lieu le plus naturel pour la
retrouver. Mais la recopier sans déplacer la source créerait une duplication,
également contraire aux règles documentaires.

**Cause dans mon processus.** Après le correctif E2E tardif, j'ai mis à jour la
carte produit courante et la review, mais pas le README local. Je n'ai pas
réévalué le propriétaire canonique du nouveau fait.

**Cause documentaire.** Le dépôt demande à la fois une source unique et des
détails locaux dans les README, sans mécanisme explicite de transfert lorsqu'un
fait est ajouté d'abord à `docs/current/features.md`. La clôture vérifie que des
documents ont été mis à jour, pas que chaque fait a le bon propriétaire.

**Correction de processus.** Pour chaque décision durable, nommer une source
canonique avant la clôture. Ici, le détail de rattachement devrait être détenu
par le README de la feature, tandis que la carte produit resterait plus
générale ou pointerait vers lui. Une vérification de non-duplication doit suivre
le déplacement.

## Causes transversales dans mon processus

Les constats ne sont pas vingt-deux accidents indépendants. Ils se regroupent
autour de six défauts de méthode.

1. **Validation par parcours nominal plutôt que par espace d'états.** J'ai
   vérifié un étudiant, une année, une origine et un enchaînement heureux. Les
   transitions futures, répétées, concurrentes, historiques et sans
   précondition sont restées hors champ.
2. **Correction locale tardive issue de l'E2E.** Le rattachement à l'année la
   plus récente a réparé l'écran observé sans réouvrir l'analyse métier. C'est
   la cause directe de F1 et un aggravant de F2 et F22.
3. **Confusion entre présence d'un mécanisme et preuve de son contrat.** Un
   middleware déclaré n'est pas un test 403 ; un index présent n'est pas une
   traduction 409 ; un bouton caché n'est pas une autorisation backend ; une
   suite verte n'est pas une couverture des critères.
4. **Clôture pilotée par des cases de plan trop larges.** Les tâches ont été
   cochées sans preuve attachée à chaque critère. Cela a permis aux documents
   de clôture et au README de surannoncer la couverture.
5. **Absence de passe finale spécialisée.** Je n'ai pas mené séparément les
   audits architecture, code mort, effets de bord disque, erreurs asynchrones,
   contrat frontend et hygiène Git.
6. **Gouvernance insuffisante des décisions sensibles.** J'ai bien noté des
   décisions dans le plan et la review, mais sans distinguer celles que je
   pouvais prendre techniquement de celles qui exigeaient une validation
   juridique ou institutionnelle et une source courante dédiée.

## Causes transversales dans le processus documentaire

1. **La spec est précise, mais le plan perd sa granularité.** La section
   « tests à prévoir » énumère de nombreux cas qui disparaissent dans des
   formulations de tâches générales.
2. **Aucune matrice de traçabilité n'accompagne la clôture.** Les phrases
   « toutes les sections sont mappées » et « aucun critère abandonné » ne sont
   reliées à aucune preuve.
3. **La review de clôture mélange réalisation et vérification.** Elle déclare
   le périmètre terminé alors que plusieurs critères ne sont couverts que par
   lecture de code ou pas du tout.
4. **Les décisions tardives ne repassent pas par le cycle de conception.** Le
   correctif annuel découvert en E2E monte directement dans les documents de
   clôture et la carte produit, sans nouvelle analyse des cas limites.
5. **La propriété canonique des faits n'est pas contrôlée.** Certains détails
   vivent dans la carte produit, d'autres dans le README, le plan ou la review,
   sans inventaire de ce qui doit rester courant après archivage.
6. **Les limites connues peuvent masquer une incohérence fonctionnelle.** Dire
   « pas de migration » et « stockage local accepté » ne dispense pas de tester
   le comportement sûr et récupérable de l'application dans ces conditions.

## Processus corrigé proposé

### 1. Geler la référence de travail

Au début d'une review, noter le commit cible et lire code, tests et documents à
ce commit. Les changements ultérieurs ne servent qu'à expliquer l'évolution,
jamais à valider rétroactivement le travail.

### 2. Construire une matrice de traçabilité avant l'implémentation

Pour chaque critère d'acceptation, enregistrer :

| Critère | Invariant | Couche propriétaire | Scénarios positifs/négatifs | Test attendu | Preuve finale |
| --- | --- | --- | --- | --- | --- |
| Exemple : lecteur sans mutation | Autorisation backend | routes/middleware | chaque mutation en lecteur | test HTTP paramétré | nom du test |

Une case ne passe à « couvert » qu'avec une preuve précise. Une vérification
manuelle doit être explicitement distinguée d'un test automatisé.

### 3. Examiner l'espace d'états et le temps

Pour cette feature, la matrice minimale aurait dû croiser :

* zéro, une et plusieurs éligibilités ;
* dossier non daté, daté, confirmé et terminal ;
* origine candidature et proposition ;
* gestionnaire, lecteur, étudiant et entreprise ;
* première action, répétition identique, répétition modifiée et concurrence ;
* données nouvelles, données antérieures à la feature et import futur.

Cette matrice aurait exposé F1, F2, F5, F7, F19 et plusieurs lacunes de F4.

### 4. Tester les invariants au niveau où ils sont garantis

* permissions : requêtes HTTP directes par rôle ;
* transactions : état de toutes les tables après succès et erreur ;
* contraintes : violation réelle avec le driver réel ;
* interface : état anticipé, message lisible et repli en cas de course ;
* artefacts : contenu, structure, rendu et sécurité séparément.

### 5. Définir un contrat d'erreur stable

Chaque erreur métier doit avoir un code stable, une chaîne destinée à
l'utilisateur et des détails structurés séparés. Les tests doivent couvrir la
traduction SQLite, Express asynchrone, le client API et l'affichage final.

### 6. Ajouter des gates spécialisés avant clôture

La clôture doit comporter des passes distinctes :

* architecture et sens des dépendances ;
* code mort et simplification ;
* sécurité des rôles et des fichiers ;
* effets de bord et isolation des tests ;
* erreurs et scénarios négatifs ;
* hygiène Git et reproductibilité des scripts ;
* propriété et non-duplication documentaire.

### 7. Traiter toute découverte E2E comme un changement de conception

Un E2E qui révèle un comportement absent de la spec ne doit pas conduire à un
patch immédiatement clos. Il faut : consigner le nouveau cas, évaluer ses
variantes, choisir l'invariant, ajouter les tests de régression, mettre à jour
la source documentaire canonique, puis rejouer l'E2E.

### 8. Séparer décision technique et validation externe

Les décisions sensibles portent un statut : `technique validée`,
`choix produit`, `provisoire`, ou `validation externe requise`. Le texte d'une
convention appartient à la dernière catégorie. L'absence de question à
l'utilisateur n'autorise pas à transformer une hypothèse juridique en règle
définitive ; elle autorise seulement une implémentation provisoire clairement
identifiée et réversible.

### 9. Rendre la clôture falsifiable

La review finale ne doit plus dire « tout est couvert » ou « aucun travail
restant » sans joindre la matrice complétée. Elle doit lister explicitement :

* critères automatisés ;
* critères vérifiés manuellement ;
* critères implémentés mais non vérifiés ;
* décisions provisoires ;
* risques acceptés et propriétaire de leur reprise.

## Conclusion

La review de qualité est globalement solide et met au jour de vrais défauts de
comportement, de couverture et de finition. Ses deux faiblesses principales
sont quelques formulations absolues — notamment F2, F4, F9, F15 et F22 — et
une piste F18 qui ne correspond pas au message réellement émis par SQLite.

Ma faute de processus principale n'est pas d'avoir omis une vérification isolée,
mais d'avoir clos un chantier complexe à partir d'un parcours nominal, d'une
suite verte et de tâches trop larges. Le processus documentaire a amplifié ce
biais en transformant ces signaux en déclarations générales de couverture. La
correction prioritaire est donc une traçabilité critère par critère, complétée
par une matrice d'états et des gates de clôture spécialisés.
