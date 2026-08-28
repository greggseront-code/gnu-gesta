# Gestion des stages et des conventions

Date : 2026-08-26

Statut : implémentée

Emplacement archivé :
`docs/history/phases/2026-08-26-gestion-stages-conventions-spec.md`.

## Contexte

L'application gère actuellement des offres, des propositions déposées par des
étudiants et des candidatures. Lorsqu'une entreprise sélectionne une
candidature, l'offre passe directement à `prise`. Aucune entité ne représente
ensuite le stage, ses dates ou sa convention.

Une proposition étudiante suit aujourd'hui le même cycle de publication qu'une
offre ordinaire : sa validation la rend visible aux autres étudiants. Ce
comportement ne correspond pas au besoin métier. Une proposition acceptée doit
rester propre à son auteur et ouvrir son dossier de stage.

Le métier distingue désormais :

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
* suppression simple d'un dossier créé par erreur ou abandonné avant que son
  déroulement doive être conservé ;
* remise à disposition de l'offre classique après cette suppression ;
* retour d'une proposition étudiante supprimée à l'état `soumise`, sans la
  publier ;
* import des étudiants éligibles pour une année académique choisie ;
* page de suivi annuelle destinée aux gestionnaires et lecteurs ;
* export de cette page dans un fichier Excel `.xlsx`.

Exclus de cette première version :

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
* Un même étudiant peut être éligible sur plusieurs années, notamment s'il doit
  recommencer un stage l'année suivante.
* La page Stages est filtrée par année académique et part de cette liste
  d'éligibilité, afin d'afficher également les étudiants sans stage.

Le traitement des étudiants auparavant associés à l'année mais absents d'un
réimport reste à trancher dans les incertitudes.

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
* Cette acceptation ne passe jamais la proposition à
  `validee_et_visible`.
* L'acceptation crée directement un dossier pour l'étudiant auteur et place la
  proposition dans un état fermé équivalent à `prise`.
* La proposition reste consultable uniquement par le gestionnaire et son
  auteur, selon les règles de visibilité des propositions propres.
* Aucun enregistrement artificiel de candidature n'est créé pour cette origine.

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

Les adaptations nécessaires du modèle fourni sont décrites dans les
incertitudes. Elles ne sont pas réalisées par cette spec.

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

La notion exacte de dossier bloquant après un stage terminé, interrompu ou raté
reste à finaliser dans les incertitudes.

### Suppression simple et restauration de l'origine

La suppression simple sert à revenir sur une association créée par erreur ou
abandonnée sans conserver d'historique de stage.

* Seul le gestionnaire peut demander la suppression.
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

Une interruption ou un échec après le démarrage du stage peut nécessiter un
traitement distinct afin de conserver ce stage passé tout en autorisant un
nouveau dossier. Ce cas n'est pas assimilé silencieusement à une suppression
avant l'arbitrage décrit dans les incertitudes.

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
* Le fichier porte un nom explicite, par exemple
  `stages-2026-2027.xlsx`.
* Le gestionnaire et le lecteur peuvent lancer l'export.

## Règles métier

* Une offre ou proposition n'est jamais elle-même un stage.
* Un dossier de stage appartient à exactement un étudiant et une entreprise.
* Son origine est soit une candidature sélectionnée, soit une proposition de
  son étudiant.
* Une même origine ne peut produire qu'un seul dossier non supprimé.
* Un étudiant ne peut posséder qu'un seul dossier bloquant à la fois, toutes
  années académiques confondues.
* La création d'un dossier, la fermeture de l'offre ou proposition et la
  sélection éventuelle de la candidature sont transactionnelles.
* La date de début et la date de fin sont choisies par le gestionnaire.
* La date de fin doit être égale ou postérieure à la date de début.
* Le contact signataire doit exister, être validé et appartenir à l'entreprise
  du stage.
* Le contact signataire peut être différent du contact prioritaire de l'offre.
* Une proposition étudiante acceptée n'est jamais publiée aux autres étudiants.
* Une convention signée est nécessaire avant la confirmation manuelle.
* Le téléversement d'un fichier ne vaut jamais confirmation.
* Les documents d'un stage ne sont jamais exposés par un chemin de stockage
  public.
* Les contrôles d'accès sont appliqués par le backend.

## Critères d’acceptation

### Création et visibilité

* [ ] Sélectionner une candidature crée un dossier et passe atomiquement
  l'offre à `prise`.
* [ ] Accepter une proposition étudiante crée un dossier sans rendre la
  proposition visible aux autres étudiants.
* [ ] Un échec pendant la création ne laisse ni candidature sélectionnée, ni
  offre fermée, ni dossier partiel.
* [ ] Une origine déjà transformée ne peut pas produire un second dossier.

### Unicité et blocage

* [ ] Un étudiant possédant un dossier bloquant ne peut plus postuler.
* [ ] Il ne peut plus déposer une proposition.
* [ ] Une autre entreprise ne peut plus le sélectionner.
* [ ] Ses anciennes candidatures restent consultables sans être supprimées.
* [ ] Deux sélections concurrentes ne peuvent jamais créer deux dossiers pour
  le même étudiant.

### Convention

* [ ] Le gestionnaire peut choisir les dates et un contact signataire valide
  de l'entreprise.
* [ ] Une date de fin antérieure à la date de début est refusée.
* [ ] La convention DOCX est générée depuis une copie du modèle fixe.
* [ ] Toutes les variables validées du modèle sont remplacées sans altérer sa
  mise en page.
* [ ] Le modèle source reste inchangé après chaque génération.
* [ ] La convention générée peut être téléchargée par le gestionnaire et le
  lecteur.
* [ ] Le gestionnaire peut téléverser ou remplacer la convention signée.
* [ ] Le lecteur ne peut effectuer aucune mutation documentaire.
* [ ] La confirmation est impossible sans convention signée.
* [ ] Le téléversement seul ne confirme pas le stage.

### Suppression

* [ ] La suppression simple exige une confirmation explicite.
* [ ] Elle supprime le dossier et ses documents sans supprimer l'offre ou la
  proposition.
* [ ] Une offre classique redevient visible et sélectionnable.
* [ ] Sa candidature choisie redevient non sélectionnée.
* [ ] Une proposition redevient `soumise` et reste privée à son auteur.
* [ ] L'étudiant redevient disponible.
* [ ] Une erreur pendant la restauration ne produit aucune mutation partielle.

### Année académique, liste et export

* [ ] L'import associe les étudiants à l'année choisie.
* [ ] La date du 15 septembre ouvre la nouvelle année académique et celle du
  14 septembre appartient à l'année précédente.
* [ ] La page affiche tous les étudiants éligibles de l'année, avec ou sans
  stage.
* [ ] Les informations d'entreprise, de dates et de contact sont exactes.
* [ ] Le lecteur dispose de la consultation et de l'export, sans mutation.
* [ ] L'export `.xlsx` reprend toutes les lignes affichées et encode les dates
  comme dates Excel.
* [ ] Les autres rôles ne peuvent ni consulter la page globale ni exporter ses
  données.

## Impacts techniques connus

### Features impactées

Backend :

* nouvelle feature métier probable `backend/src/features/internships/` ;
* `backend/src/features/applications/` pour la sélection et le blocage ;
* `backend/src/features/offers/` pour le cycle distinct des propositions ;
* `backend/src/features/students/` pour l'import par année et l'éligibilité ;
* `backend/src/features/companies/` pour la lecture de l'adresse et le choix du
  signataire.

Frontend :

* nouvelle page gestionnaire/lecteur de suivi des stages ;
* écran de détail et de préparation d'un dossier ;
* adaptation de la sélection d'une candidature ;
* adaptation de l'acceptation d'une proposition étudiante ;
* adaptation de l'import des étudiants ;
* blocage ou masquage des actions étudiantes devenues interdites.

### Données impactées

Le modèle devra au minimum représenter :

* les années académiques ou leur identifiant canonique ;
* l'éligibilité d'un étudiant pour une ou plusieurs années ;
* les dossiers de stage ;
* leur origine candidature ou proposition ;
* leurs dates ;
* le contact signataire ;
* leur état de préparation ou de confirmation ;
* les métadonnées de la convention générée et de la convention signée.

La contrainte « un seul dossier bloquant » devra être sûre face aux écritures
concurrentes. Sa forme exacte dépend de la décision sur les états terminaux.

### Routes, API et écrans impactés

Les routes exactes seront fixées dans le plan. Le contrat devra couvrir au
minimum :

* création depuis une sélection ;
* acceptation d'une proposition ;
* consultation et mise à jour du dossier ;
* génération et téléchargement de la convention vierge ;
* téléversement et téléchargement de la convention signée ;
* confirmation du stage ;
* suppression et restauration atomique de l'origine ;
* liste annuelle des étudiants et stages ;
* export Excel.

### Permissions

* `gestionnaire` : consultation et toutes les mutations de stage, convention,
  suppression, import et export ;
* `lecteur` : consultation, téléchargement et export uniquement ;
* `entreprise` : sélection d'une candidature selon ses permissions actuelles,
  sans accès à la page globale ni aux documents de stage dans cette phase ;
* `etudiant` : candidatures et propositions sous réserve de ne pas posséder un
  dossier bloquant, sans accès à la page globale ni aux documents de stage dans
  cette phase.

### Tests à prévoir

* tests unitaires du calcul d'année académique aux deux dates frontières ;
* tests transactionnels des deux origines et de leur suppression ;
* tests de concurrence ou de contrainte sur l'unicité du stage bloquant ;
* tests du blocage de candidature, proposition et sélection ;
* tests de visibilité d'une proposition acceptée ;
* tests de choix d'un contact d'une autre entreprise, en attente ou supprimé ;
* tests de validation des dates ;
* tests de génération DOCX, y compris conservation de la structure du modèle
  et remplacement de toutes les variables ;
* test de non-modification du modèle source ;
* tests de formats, taille et contrôle d'accès des documents ;
* tests de confirmation avec et sans convention signée ;
* tests de liste annuelle incluant un étudiant sans stage ;
* tests de contenu et de types de cellules de l'export Excel ;
* tests backend d'accès gestionnaire, lecteur, étudiant et entreprise ;
* tests frontend des parcours principaux et des états d'erreur.

## État du modèle de convention fourni

L'inspection en lecture seule de `docs/annexes/convention.docx` relève les
champs Word suivants :

* `PrénomEtud` ;
* `NomEtud` ;
* `Feminin` ;
* `NomSoc` ;
* `TitreResp` ;
* `PrénomResp` ;
* `NomResp` ;
* un champ Word `DATE` ;
* un champ de publipostage technique `convAImpr` utilisé par une condition
  `SKIPIF`.

Le document contient actuellement deux pages et se rend sans chevauchement ni
contenu tronqué. Il présente toutefois des écarts fonctionnels avec la demande :

* les dates du stage sont écrites en dur au 17 septembre 2018 et au
  28 décembre 2018 ;
* l'adresse de l'entreprise n'apparaît pas dans la convention ;
* `TitreResp` suppose une civilité ou un titre absent des contacts actuels ;
* `Feminin` suppose une information de genre absente des étudiants actuels ;
* le texte institutionnel et les noms propres fixes doivent être confirmés
  comme encore valides ;
* le champ technique `convAImpr` et le texte visible « Sauter l'enregistrement
  si... » doivent être retirés ou remplacés pour une génération unitaire.

Le modèle devra être corrigé une seule fois après arbitrage, puis rester fixe
et versionné avec l'application.

## Documents liés

* Architecture : `docs/current/architecture.md`
* Modèle de données actuel : `docs/current/data-model.md`
* Carte produit actuelle : `docs/current/features.md`
* Applications : `backend/src/features/applications/README.md`
* Offres : `backend/src/features/offers/README.md`
* Étudiants : `backend/src/features/students/README.md`
* Entreprises : `backend/src/features/companies/README.md`
* Modèle métier fourni : `docs/annexes/convention.docx`
* Workflow visuel :
  `docs/history/phases/2026-08-26-gestion-stages-conventions-workflow.html`
* Plan : à écrire après validation de cette spec
* Review : à écrire après implémentation

## Incertitudes

Les points suivants doivent être tranchés avant de considérer la spec comme
validée :

1. **Stage interrompu ou raté.** Faut-il conserver un dossier terminal avec un
   état tel que `interrompu` ou `echoue`, afin qu'il reste visible dans son
   année d'origine tout en libérant l'étudiant pour un nouveau stage ? Cette
   option est recommandée et se distingue de la suppression simple sans
   historique.
2. **Fin normale.** Le stage devient-il `termine` automatiquement après sa date
   de fin, ou par une action du gestionnaire ? Un état terminal est nécessaire
   si un ancien stage ne doit plus bloquer un nouveau dossier.
3. **Réimport annuel.** Un import est-il une liste de remplacement pour l'année
   choisie, ou ajoute-t-il/met-il à jour les étudiants sans retirer ceux qui
   sont absents du nouveau fichier ?
4. **Cohérence éligibilité/date.** Peut-on créer un stage dont l'année calculée
   n'est pas une année pour laquelle l'étudiant a été importé comme éligible ?
5. **Formats du document signé.** Faut-il accepter uniquement PDF et DOCX, et
   conserver la limite actuelle de 5 Mio par fichier ?
6. **Adresse manquante.** La génération doit-elle être bloquée lorsqu'une
   entreprise existante ne possède pas d'adresse, ou le dossier doit-il
   permettre de saisir une adresse propre à la convention ?
7. **Civilité du signataire.** Faut-il ajouter une civilité aux contacts,
   choisir la valeur au niveau du stage, ou reformuler le modèle pour ne plus
   en avoir besoin ?
8. **Accord de genre.** Faut-il ajouter une donnée à l'étudiant, demander
   l'accord au moment de générer, ou reformuler la convention de manière
   neutre ?
9. **Texte institutionnel.** Les mentions fixes du modèle — Institut Paul
   Lambin, Brigitte BINOT, Bernard FRANK et José VANDER MEULEN — sont-elles
   encore les valeurs officielles à conserver ?

## Non-duplication

Cette spec décrit un comportement futur qui n'est pas encore présent dans les
documents courants. Les règles actuelles des offres, candidatures, étudiants,
entreprises, permissions et pièces jointes restent dans les documents liés et
ne sont reprises ici que lorsqu'elles doivent être modifiées par le nouveau
workflow.
