# Spécification — Gestion des stages et des conventions

Version 2. Date : 2026-08-28.

Statut : à implémenter.

Cette version remplace la spec du 2026-08-26 archivée sous
`docs/history/phases/`. Elle conserve l'intégralité du besoin métier, y intègre
les décisions déjà arbitrées lors de la première implémentation, et corrige les
points que cette implémentation a révélés comme insuffisamment spécifiés.

## Contexte

L'application gère des offres, des propositions déposées par des étudiants et
des candidatures. Lorsqu'une entreprise sélectionne une candidature, l'offre
passe directement à `prise`. Aucune entité ne représente ensuite le stage, ses
dates ou sa convention.

Une proposition étudiante suit aujourd'hui le même cycle de publication qu'une
offre ordinaire : sa validation la rend visible aux autres étudiants. Ce
comportement ne correspond pas au besoin métier. Une proposition acceptée doit
rester propre à son auteur et ouvrir son dossier de stage.

Le métier distingue :

* l'offre, qui permet à une entreprise de rechercher un étudiant ;
* la proposition, par laquelle un étudiant présente le stage qu'il a trouvé ;
* le dossier de stage, qui associe un étudiant à une entreprise pendant la
  préparation et l'exécution du stage ;
* la convention, générée puis signée en dehors de l'application.

Le modèle fixe de convention fourni se trouve dans
`docs/annexes/convention.docx`.

## Objectif

Permettre au gestionnaire de transformer une sélection ou une proposition
acceptée en dossier de stage, de produire et suivre les documents de
convention, puis de consulter et exporter la situation des étudiants éligibles
par année académique.

## Périmètre

Inclus :

* création d'un dossier de stage à partir d'une candidature sélectionnée ;
* création d'un dossier de stage à partir d'une proposition étudiante
  acceptée, sans publication de cette proposition aux autres étudiants ;
* blocage des nouvelles candidatures et sélections tant que l'étudiant possède
  un stage bloquant ;
* choix par le gestionnaire de la date de début, de la date de fin et du
  contact d'entreprise signataire ;
* calcul de l'année académique à partir de la date de début ;
* génération d'une convention DOCX à partir du modèle fixe ;
* téléchargement de la convention générée ;
* téléversement d'une convention signée ;
* confirmation manuelle du stage par le gestionnaire après téléversement ;
* états terminaux manuels `termine`, `interrompu` et `echoue` ;
* suppression simple d'un dossier créé par erreur ou abandonné avant que son
  déroulement doive être conservé ;
* remise à disposition de l'offre classique après cette suppression ;
* retour d'une proposition étudiante supprimée à l'état `soumise`, sans la
  publier ;
* import des étudiants éligibles pour une année académique choisie ;
* page de suivi annuelle destinée aux gestionnaires et lecteurs ;
* export de cette page dans un fichier Excel `.xlsx` ;
* accès direct au dossier depuis son offre ou sa proposition d'origine.

Exclus de cette version :

* collecte ou vérification des signatures dans l'application ;
* signature électronique ;
* notifications ou envoi automatique de la convention aux parties ;
* remplacement du modèle Word depuis l'interface ;
* édition libre du contenu juridique de la convention ;
* publication d'une proposition étudiante acceptée comme offre ouverte ;
* accès de l'étudiant ou de l'entreprise à la page globale des stages ;
* historique des suppressions simples ;
* migrations de données historiques, l'application n'étant pas encore en
  production ;
* stockage de production définitif des documents, qui reste un sujet de
  préparation opérationnelle distinct.

## Comportement attendu

### Import et éligibilité par année académique

* Lors d'un import d'étudiants, le gestionnaire choisit explicitement l'année
  académique concernée, par exemple `2026-2027`.
* Le fichier ne contient que des étudiants éligibles au stage pour cette année.
* L'import conserve le référentiel étudiant existant et crée l'association
  entre chaque étudiant importé et l'année académique choisie.
* L'import est additif : il ne retire jamais un étudiant absent d'un réimport.
* Un même étudiant peut être éligible sur plusieurs années, notamment s'il doit
  recommencer un stage l'année suivante.
* La page Stages est filtrée par année académique et part de cette liste
  d'éligibilité, afin d'afficher également les étudiants sans stage.
* Le formulaire d'import valide l'année avant d'émettre la requête : format,
  années consécutives, et aucun envoi si la saisie est invalide.

### Origine d'un dossier de stage

#### Candidature sélectionnée par une entreprise

* L'entreprise sélectionne une candidature sur l'une de ses offres, comme dans
  le parcours actuel.
* La sélection et la création du dossier de stage sont une seule opération
  transactionnelle.
* L'offre passe à `prise` et la candidature choisie devient sélectionnée.
* Le dossier reprend au minimum l'étudiant, l'offre, l'entreprise et l'origine
  `candidature`.
* Les autres candidatures restent enregistrées sans être modifiées.

#### Proposition déposée par un étudiant

* Le gestionnaire accepte la proposition.
* Cette acceptation ne passe jamais la proposition à `validee_et_visible`.
* L'acceptation crée directement un dossier pour l'étudiant auteur et place la
  proposition dans un état fermé équivalent à `prise`.
* La proposition reste consultable uniquement par le gestionnaire et son
  auteur, selon les règles de visibilité des propositions propres.
* Aucun enregistrement artificiel de candidature n'est créé pour cette origine.

#### Étudiant sans éligibilité

* La création vérifie que l'étudiant possède au moins une éligibilité annuelle.
* À défaut, elle est refusée par une erreur métier explicite qui nomme la
  correction attendue : importer l'étudiant pour l'année concernée.
* Aucun dossier ne peut donc exister hors de toute vue annuelle.

### Accès au dossier

* La page d'une offre ou d'une proposition ayant produit un dossier affiche un
  lien direct vers ce dossier, pour le gestionnaire et le lecteur.
* L'acceptation d'une proposition et la sélection d'une candidature indiquent
  le dossier créé et permettent de l'ouvrir immédiatement.
* Un dossier reste donc atteignable même si la vue annuelle ne l'affiche pas.

### Préparation du dossier

Après la création du dossier, le gestionnaire doit pouvoir :

* consulter l'étudiant, l'offre ou proposition d'origine et l'entreprise ;
* choisir une date de début ;
* choisir une date de fin ;
* choisir, parmi les contacts validés de l'entreprise, la personne qui signera
  la convention pour l'entreprise ;
* générer la convention seulement lorsque les données obligatoires sont
  complètes ;
* régénérer la convention tant que le stage n'a pas été confirmé, après une
  correction des dates ou du signataire.

Le contact signataire est une donnée propre au stage. Il peut être différent du
contact prioritaire de l'offre et des autres contacts associés à celle-ci.

L'enregistrement de la préparation est idempotent : soumettre à nouveau des
valeurs identiques ne produit aucun effet de bord, et en particulier ne détruit
pas la convention déjà générée. Seule une modification effective d'une date ou
du signataire invalide cette convention.

### Convention vierge

* L'application utilise un modèle fixe livré avec l'application.
* La génération crée un nouveau fichier DOCX ; elle ne modifie jamais le
  modèle source.
* Le nom du fichier téléchargé doit être explicite et sûr, par exemple
  `convention-nom-prenom-2026-2027.docx`.
* La convention générée contient au minimum :
  * le prénom et le nom de l'étudiant ;
  * le nom de l'entreprise ;
  * l'adresse de l'entreprise ;
  * l'identité du contact signataire choisi ;
  * la date de début ;
  * la date de fin ;
  * la date de génération lorsque le modèle l'exige.
* La mise en page, les champs non variables et les zones de signature du modèle
  sont conservés.
* Le gestionnaire peut télécharger la dernière convention générée.
* Le pipeline qui produit le modèle applicatif à partir de l'annexe déclare ses
  dépendances et offre une commande qui vérifie que l'artefact versionné
  correspond encore à sa source.

### Convention signée et confirmation

* La signature se déroule entièrement hors application.
* Le gestionnaire peut téléverser la convention finale signée depuis le dossier
  de stage.
* Le fichier signé est protégé par les mêmes permissions que le dossier.
* Le téléversement seul ne confirme jamais le stage.
* Après le téléversement, le gestionnaire dispose d'une action distincte
  « Confirmer le stage ».
* Cette action est refusée si aucune convention signée n'est présente.
* Après confirmation, le dossier apparaît comme stage confirmé dans la page de
  suivi.

Le lecteur peut consulter et télécharger les documents, mais ne peut ni
générer, ni téléverser, ni confirmer.

### Blocage de l'étudiant

* Dès la création du dossier, l'étudiant est considéré comme ayant un stage
  bloquant, avant même la génération ou la signature de la convention.
* Tant qu'un dossier bloquant existe, l'étudiant ne peut plus :
  * postuler à une offre ;
  * déposer une nouvelle proposition de stage ;
  * être sélectionné par une autre entreprise.
* Les candidatures déjà déposées restent visibles et conservées.
* Une entreprise qui tente de sélectionner cet étudiant depuis une autre offre
  reçoit un refus métier explicite ; aucune sélection partielle ne doit être
  enregistrée.
* La règle est garantie par le backend et par une contrainte de données adaptée,
  pas uniquement par l'interface.
* L'interface étudiante connaît cet état avant l'action : l'API expose le
  blocage, les actions interdites sont désactivées et accompagnées d'une
  explication à la première personne. Un refus survenu malgré tout affiche un
  message métier lisible, sans nom de classe technique.

### États terminaux

* Le gestionnaire peut marquer un stage confirmé comme `termine`, `interrompu`
  ou `echoue`.
* Ces états sont manuels ; aucune bascule automatique n'est prévue.
* Ils conservent le dossier dans son année de suivi et libèrent l'étudiant pour
  un nouveau dossier.

### Suppression simple et restauration de l'origine

La suppression simple sert à revenir sur une association créée par erreur ou
abandonnée sans conserver d'historique de stage.

* Seul le gestionnaire peut demander la suppression.
* Elle n'est possible que sur un dossier en préparation dont la date de début
  n'est pas atteinte.
* L'interface demande une confirmation explicite et indique les conséquences.
* Le dossier de stage et ses documents propres sont supprimés.
* L'offre ou la proposition d'origine n'est jamais supprimée.
* Pour une offre classique :
  * la candidature précédemment sélectionnée redevient non sélectionnée ;
  * l'offre repasse de `prise` à `validee_et_visible` ;
  * toutes ses candidatures redeviennent sélectionnables, sous réserve que les
    étudiants concernés n'aient pas un autre stage bloquant.
* Pour une proposition étudiante :
  * la proposition retourne à `soumise` ;
  * elle reste visible seulement par son auteur et le gestionnaire ;
  * elle ne devient pas une offre ouverte aux autres étudiants.
* Après suppression, l'étudiant peut à nouveau postuler, proposer un stage ou
  être sélectionné.
* La suppression et la restauration de l'origine sont atomiques.
* La restauration vérifie l'état source attendu de l'origine. Si l'offre ou la
  proposition a changé d'état entre-temps, l'opération est refusée par une
  erreur explicite plutôt que d'écraser cet état.

### Année académique

* Une année académique commence le 15 septembre et se termine le 14 septembre
  suivant.
* Elle est nommée avec les deux années civiles, par exemple `2026-2027`.
* L'année du stage est calculée à partir de sa date de début :
  * du 15 septembre 2026 au 14 septembre 2027 inclus : `2026-2027` ;
  * le 14 septembre 2026 : `2025-2026`.
* Un stage peut se terminer dans une autre année académique ; son rattachement
  reste déterminé par sa date de début.
* L'année académique n'est pas saisie indépendamment dans le dossier afin
  d'éviter une incohérence avec la date de début.
* L'année calculée doit faire partie des éligibilités importées de l'étudiant ;
  sinon la préparation est refusée avec une erreur nommant l'année manquante.

### Rattachement d'un dossier non daté

Un dossier existe avant que ses dates soient saisies. Son rattachement annuel
doit rester stable et prévisible :

* un dossier non daté apparaît dans **toutes** les années d'éligibilité de
  l'étudiant, signalé comme « dates à compléter » ;
* il ne disparaît jamais d'une année déjà consultée parce qu'une éligibilité
  plus récente a été importée entre-temps ;
* dès que la date de début est enregistrée, le dossier n'apparaît plus que dans
  son année définitive ;
* si plusieurs dossiers coexistent pour un étudiant et une année, la ligne
  montre le plus récent.

Cette règle appartient au README de la feature qui porte la requête annuelle.

### Page Stages

* Le gestionnaire et le lecteur peuvent ouvrir la page Stages.
* L'utilisateur choisit une année académique.
* La page affiche tous les étudiants importés comme éligibles pour cette année,
  y compris ceux qui ne possèdent aucun stage.
* Une ligne affiche au minimum :
  * le matricule, s'il existe ;
  * le nom et le prénom de l'étudiant ;
  * son email ;
  * l'indication « avec stage » ou « sans stage » ;
  * l'état du dossier, s'il existe ;
  * l'entreprise ;
  * la date de début ;
  * la date de fin ;
  * le contact signataire principal du stage.
* Les colonnes liées au stage restent vides pour un étudiant sans stage.
* Le gestionnaire peut ouvrir le dossier et réaliser les actions autorisées.
* Le lecteur peut ouvrir le dossier en lecture seule.
* Aucun étudiant et aucune entreprise ne peut accéder à cette vue globale.

### Export Excel

* L'export reprend l'année et le filtrage de la page.
* Il contient une ligne par étudiant éligible, y compris sans stage.
* Les colonnes correspondent aux données visibles dans le tableau.
* Les dates sont de vraies cellules de date Excel et non des chaînes
  préformatées.
* Le fichier porte un nom explicite, par exemple `stages-2026-2027.xlsx`.
* Le gestionnaire et le lecteur peuvent lancer l'export.

## Règles métier

* Une offre ou proposition n'est jamais elle-même un stage.
* Un dossier de stage appartient à exactement un étudiant et une entreprise.
* Son origine est soit une candidature sélectionnée, soit une proposition de
  son étudiant.
* Une même origine ne peut produire qu'un seul dossier non supprimé.
* Un étudiant ne peut posséder qu'un seul dossier bloquant à la fois, toutes
  années académiques confondues.
* `preparation` et `confirme` bloquent ; `termine`, `interrompu` et `echoue`
  sont terminaux et ne bloquent plus.
* Un dossier ne peut être créé que pour un étudiant possédant au moins une
  éligibilité annuelle.
* La création d'un dossier, la fermeture de l'offre ou proposition et la
  sélection éventuelle de la candidature sont transactionnelles.
* La date de début et la date de fin sont choisies par le gestionnaire.
* La date de fin doit être égale ou postérieure à la date de début.
* Le contact signataire doit exister, être validé et appartenir à l'entreprise
  du stage.
* Le contact signataire peut être différent du contact prioritaire de l'offre.
* L'absence d'adresse d'entreprise empêche la génération de la convention.
* Une proposition étudiante acceptée n'est jamais publiée aux autres étudiants.
* Une convention signée est nécessaire avant la confirmation manuelle.
* Le téléversement d'un fichier ne vaut jamais confirmation.
* Les documents d'un stage ne sont jamais exposés par un chemin de stockage
  public.
* Les contrôles d'accès sont appliqués par le backend.

## Contrat d'erreurs

La première implémentation a montré que « erreurs métier explicites » ne suffit
pas comme exigence. Le contrat attendu :

* chaque refus métier porte un code stable, distinct par cause ;
* le champ `error` d'une réponse reste une chaîne destinée à l'utilisateur ;
  les détails structurés, dont les erreurs de validation, vivent dans un champ
  séparé ;
* un état source inattendu ne réutilise jamais le message d'une autre cause :
  une proposition déjà refusée ne peut pas annoncer qu'un dossier existe ;
* la traduction d'une violation de contrainte de données est écrite après
  observation de l'erreur réelle du driver, jamais d'après une hypothèse sur
  son texte, et son test déclenche la contrainte pour de bon ;
* les gestionnaires de routes asynchrones suivent une stratégie unique et
  documentée : aucune erreur ne peut laisser une requête sans réponse.

## Exigences de qualité

* Chaque mutation refuse chaque rôle non autorisé, prouvé par requête HTTP ;
  le masquage d'un bouton n'est jamais une preuve d'autorisation.
* Chaque contrainte de données possède un test qui la déclenche réellement et
  vérifie l'erreur métier renvoyée.
* Chaque commande de mise à jour possède un test d'idempotence.
* Les documents acceptés sont PDF ou DOCX, limités à 5 Mio ; format, taille et
  cohérence extension/type sont testés, ainsi que leurs refus.
* Les invariants stables des artefacts sont automatisés : empreinte du modèle
  source avant et après génération, absence de variable non remplacée, parties
  du conteneur DOCX, en-têtes et types de cellules du classeur, nom de fichier.
  L'inspection visuelle complète ces tests, elle ne les remplace pas.
* Toute écriture disque passe par une racine injectable ; les suites de tests
  écrivent dans un répertoire temporaire et ne laissent rien dans le dépôt.
* Le répertoire de stockage local est exclu de Git avant le premier
  téléversement.
* Le client API frontend est testé au niveau du contrat HTTP, en plus des tests
  de composants ; chaque mutation possède au moins un test d'état d'erreur, et
  toute action destructive un test de sa confirmation.
* La règle de calcul de l'année académique possède un propriétaire logiciel
  unique par runtime, testé sur ses dates frontières.

## Critères d'acceptation

### Création et visibilité

* [ ] Sélectionner une candidature crée un dossier et passe atomiquement
  l'offre à `prise`.
* [ ] Accepter une proposition étudiante crée un dossier sans rendre la
  proposition visible aux autres étudiants.
* [ ] Un échec pendant la création ne laisse ni candidature sélectionnée, ni
  offre fermée, ni dossier partiel.
* [ ] Une origine déjà transformée ne peut pas produire un second dossier.
* [ ] La création est refusée pour un étudiant sans éligibilité, avec un
  message indiquant l'import à réaliser.
* [ ] Le dossier créé est atteignable depuis son offre ou sa proposition.

### Unicité et blocage

* [ ] Un étudiant possédant un dossier bloquant ne peut plus postuler.
* [ ] Il ne peut plus déposer une proposition.
* [ ] Une autre entreprise ne peut plus le sélectionner.
* [ ] Ses anciennes candidatures restent consultables sans être supprimées.
* [ ] Deux sélections concurrentes ne peuvent jamais créer deux dossiers pour
  le même étudiant, et la seconde reçoit l'erreur métier prévue.
* [ ] L'interface étudiante annonce le blocage avant toute tentative.

### Convention

* [ ] Le gestionnaire peut choisir les dates et un contact signataire valide
  de l'entreprise.
* [ ] Un contact d'une autre entreprise, non validé ou inexistant est refusé.
* [ ] Une date de fin antérieure à la date de début est refusée.
* [ ] La convention DOCX est générée depuis une copie du modèle fixe.
* [ ] Toutes les variables validées du modèle sont remplacées sans altérer sa
  mise en page.
* [ ] Le modèle source reste inchangé après chaque génération, vérifié par
  empreinte.
* [ ] Réenregistrer une préparation identique ne détruit pas la convention.
* [ ] Modifier une date ou le signataire invalide la convention générée.
* [ ] La convention générée peut être téléchargée par le gestionnaire et le
  lecteur.
* [ ] Le gestionnaire peut téléverser ou remplacer la convention signée.
* [ ] Un fichier d'un autre format, incohérent ou trop volumineux est refusé.
* [ ] Le lecteur ne peut effectuer aucune mutation documentaire, vérifié par
  requête HTTP sur chacune d'elles.
* [ ] La confirmation est impossible sans convention signée.
* [ ] Le téléversement seul ne confirme pas le stage.

### Suppression et états terminaux

* [ ] La suppression simple exige une confirmation explicite.
* [ ] Elle supprime le dossier et ses documents sans supprimer l'offre ou la
  proposition.
* [ ] Une offre classique redevient visible et sélectionnable.
* [ ] Sa candidature choisie redevient non sélectionnée.
* [ ] Une proposition redevient `soumise` et reste privée à son auteur.
* [ ] L'étudiant redevient disponible.
* [ ] Une erreur pendant la restauration ne produit aucune mutation partielle.
* [ ] Une origine dont l'état a changé entre-temps fait échouer la restauration
  au lieu d'écraser cet état.
* [ ] Un état terminal libère l'étudiant et conserve le dossier dans son année.

### Année académique, liste et export

* [ ] L'import associe les étudiants à l'année choisie, vérifié en base.
* [ ] Une année mal formée ou non consécutive est refusée, sans requête émise
  par un formulaire invalide.
* [ ] La date du 15 septembre ouvre la nouvelle année académique et celle du
  14 septembre appartient à l'année précédente.
* [ ] La page affiche tous les étudiants éligibles de l'année, avec ou sans
  stage.
* [ ] Un dossier non daté apparaît dans toutes les années d'éligibilité de son
  étudiant et n'en disparaît pas après un nouvel import.
* [ ] Les informations d'entreprise, de dates et de contact sont exactes.
* [ ] Le lecteur dispose de la consultation et de l'export, sans mutation.
* [ ] L'export `.xlsx` reprend toutes les lignes affichées, ses en-têtes et ses
  libellés d'état, et encode les dates comme dates Excel.
* [ ] Les autres rôles ne peuvent ni consulter la page globale ni exporter ses
  données, vérifié par requête HTTP pour l'étudiant et l'entreprise.

## Décisions déjà arbitrées

Ces arbitrages sont issus de la première implémentation. Ils restent valables
et n'ont pas à être rediscutés, sauf mention contraire.

| Sujet | Décision | Autorité |
| --- | --- | --- |
| Réimport annuel | Additif ; ne retire jamais un étudiant absent | Produit |
| Stage interrompu ou raté | États terminaux manuels, dossier conservé | Produit |
| Fin normale | Action du gestionnaire, pas de bascule automatique | Produit |
| Éligibilité et date | L'année calculée doit être une éligibilité de l'étudiant | Produit |
| Adresse manquante | Bloque la génération de la convention | Produit |
| Formats du document signé | PDF et DOCX, 5 Mio maximum | Technique |
| Conventions générée et signée | Deux documents distincts | Technique |
| Export XLSX | ExcelJS, une seule dépendance backend | Technique |

## Points encore ouverts

Ces points exigent une validation extérieure au dépôt. Toute implémentation les
traite comme provisoires, clairement identifiés et réversibles.

* **Texte institutionnel du modèle.** Les mentions fixes de l'annexe — Institut
  Paul Lambin, Brigitte BINOT, Bernard FRANK, José VANDER MEULEN — et les
  clauses réécrites lors de la première implémentation doivent être validées
  par le propriétaire du document. Statut : validation externe requise.
* **Civilité du signataire et accord de genre.** L'annexe utilise `TitreResp` et
  `Feminin`, absents du modèle de données. La première implémentation a retenu
  une formulation neutre, sans validation. Statut : choix provisoire.
* **Stockage documentaire de production.** Traité dans
  `docs/operations/production-readiness.md`.

## Impacts techniques connus

Backend : nouvelle feature `internships` ; `applications` pour la sélection et
le blocage ; `offers` pour le cycle distinct des propositions ; `students` pour
l'import par année et l'éligibilité ; `companies` pour l'adresse et le
signataire. Le schéma d'entrée d'une route reste dans la feature qui l'expose ;
l'orchestration métier et les transactions multifeatures vivent dans un
service, pas dans une couche `queries`.

Le modèle de données doit représenter les années académiques, l'éligibilité
d'un étudiant pour une ou plusieurs années, les dossiers, leur origine, leurs
dates, le signataire, leur état et les métadonnées des deux conventions. La
contrainte « un seul dossier bloquant » doit être sûre face aux écritures
concurrentes.

Frontend : page annuelle, détail du dossier, adaptation de la sélection, de
l'acceptation d'une proposition et de l'import, accès au dossier depuis
l'origine, et anticipation des actions étudiantes devenues interdites.

Permissions : `gestionnaire` mute tout ; `lecteur` consulte, télécharge et
exporte ; `entreprise` sélectionne selon ses droits actuels sans accès à la vue
globale ni aux documents ; `etudiant` candidate et propose sous réserve de ne
pas posséder de dossier bloquant.

## Documents liés

* Parcours : `workflow.html`
* Architecture : `docs/current/architecture.md`
* Modèle de données : `docs/current/data-model.md`
* Carte produit : `docs/current/features.md`
* Modèle métier fourni : `docs/annexes/convention.docx`
* Première implémentation, annulée : tag `archive/gestion-stages-016e952`
