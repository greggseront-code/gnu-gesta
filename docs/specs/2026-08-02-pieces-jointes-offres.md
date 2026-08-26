# Finalisation des pièces jointes des offres

## Contexte

Le dépôt d'une offre ou d'une proposition étudiante permet déjà de sélectionner
un document PDF ou DOCX. Le frontend crée d'abord l'offre, puis envoie le
fichier à `POST /api/offers/:id/attachment`. Le backend stocke le fichier dans
`backend/uploads/` et conserve son chemin dans `offers.attachment_path`.

Cette implémentation ne couvre cependant qu'un seul fichier par offre. Elle ne
permet ni de lister plusieurs pièces jointes ni de les supprimer. Le détail
d'une offre affiche par ailleurs un lien vers `GET
/api/offers/:id/attachment`, alors que cette route de téléchargement n'existe
pas. Enfin, le parcours de création doit gérer explicitement le cas où l'offre
est créée mais où un ou plusieurs uploads échouent.

Le stockage local est conservé pour cette phase. Son remplacement par un
stockage plus robuste fera l'objet d'une seconde phase.

L'application est encore en développement et ne contient aucune donnée de
production. La base SQLite est fictive : lorsqu'elle est absente, elle est
recréée depuis le schéma courant puis peuplée par
`backend/src/db/seeds/seed.sql`, qui reste la source de vérité des données de
développement. Cette évolution ne doit donc prévoir aucune migration des
données existantes.

## Objectif

Terminer le cycle de vie des pièces jointes d'une offre : ajout de plusieurs
documents, consultation, téléchargement protégé et suppression, sans annuler
une offre lorsque l'envoi d'un fichier échoue.

## Périmètre

Inclus :

* ajout de zéro à dix pièces jointes par offre ;
* fichiers PDF et DOCX de 5 Mo maximum chacun ;
* sélection de plusieurs fichiers dans les parcours de création et de
  modification d'une offre ;
* liste des pièces jointes sur le détail de l'offre ;
* téléchargement authentifié avec les mêmes droits que la consultation de
  l'offre ;
* suppression d'une pièce jointe par les utilisateurs autorisés à modifier
  l'offre ;
* gestion des pièces jointes par le gestionnaire ;
* conservation de l'offre et possibilité de réessayer lorsqu'un upload
  échoue ;
* remplacement direct du champ unique `offers.attachment_path` par un modèle
  multi-pièces jointes dans le schéma de la base recréée ;
* mise à jour de `backend/src/db/seeds/seed.sql` pour qu'il reste compatible
  avec le nouveau schéma ;
* stockage des fichiers dans `backend/uploads/` sous un nom technique généré
  par le serveur ;
* nettoyage des fichiers devenus inutiles lors d'un échec d'enregistrement ou
  d'une suppression.

Exclus :

* stockage objet, cloud ou service documentaire externe ;
* synchronisation ou réplication de `backend/uploads/` ;
* aperçu intégré du contenu des PDF ou DOCX ;
* antivirus ou analyse approfondie du contenu des documents ;
* versionnement et historique des pièces jointes supprimées ;
* restauration d'une pièce jointe supprimée ;
* upload anonyme ;
* augmentation des formats, de la taille maximale ou du nombre maximal de
  fichiers ;
* intégration automatique des pièces jointes dans la sauvegarde SQLite
  existante ;
* migration ou conservation des données de la base fictive actuelle ;
* compatibilité avec une base créée à partir de l'ancien schéma.

## Comportement attendu

### Création d'une offre ou d'une proposition

* Le champ « Pièces jointes » est optionnel et accepte une sélection multiple.
* L'interface indique les formats PDF/DOCX, la limite de 5 Mo par fichier et la
  limite de dix fichiers par offre.
* Le frontend valide ces contraintes avant l'envoi afin de fournir un retour
  immédiat, sans remplacer les validations du backend.
* L'offre est créée une seule fois, avant l'envoi des pièces jointes, afin
  d'obtenir son identifiant.
* Chaque fichier est ensuite envoyé séparément et associé à l'offre créée. Ce
  découpage permet d'afficher et de réessayer les échecs fichier par fichier.
* Si tous les uploads réussissent, l'utilisateur est dirigé vers le détail de
  l'offre.
* Si un ou plusieurs uploads échouent, l'offre et les fichiers déjà envoyés
  sont conservés. L'interface explique que l'offre existe déjà, identifie les
  fichiers en échec et permet de réessayer sans recréer l'offre.
* Depuis cet état d'erreur, l'utilisateur peut aussi continuer vers le détail
  de l'offre sans les fichiers restants.
* Une nouvelle soumission du formulaire après la création ne doit jamais créer
  une seconde offre pour compenser un échec d'upload.

### Ajout et suppression après création

* Le détail ou l'écran de modification d'une offre affiche toutes ses pièces
  jointes.
* Un utilisateur autorisé à modifier l'offre peut sélectionner et ajouter un
  ou plusieurs documents tant que le total ne dépasse pas dix.
* Chaque pièce jointe est affichée avec son nom technique généré par le serveur.
  Le nom original envoyé par l'utilisateur n'est pas conservé ni présenté.
* Chaque fichier peut être supprimé individuellement après une confirmation
  explicite dans l'interface.
* La suppression retire l'association en base de données et le fichier présent
  dans `backend/uploads/`.
* La suppression d'un fichier ne modifie ni l'offre ni son statut.
* Il n'existe pas d'action « remplacer » dédiée : l'utilisateur ajoute le
  nouveau fichier puis supprime l'ancien.

### Consultation et téléchargement

* Le détail d'une offre liste les pièces jointes accessibles avec une action de
  téléchargement pour chacune.
* Le backend vérifie la session et la visibilité de l'offre avant de retourner
  un fichier. Connaître l'identifiant d'une offre ou d'une pièce jointe ne
  suffit pas à télécharger le document.
* Les droits de téléchargement sont strictement identiques aux droits de
  consultation de l'offre, y compris les exceptions existantes pour l'auteur
  d'une proposition et l'étudiant ayant déjà postulé.
* Le téléchargement utilise le nom technique enregistré et une réponse
  `Content-Disposition: attachment`.
* Une pièce jointe inexistante ou qui n'appartient pas à l'offre demandée
  retourne `404` sans révéler d'information sur une autre offre.
* Si l'enregistrement existe mais que le fichier physique est absent, le
  backend retourne une erreur contrôlée, journalise l'incohérence et ne révèle
  aucun chemin du serveur.

### Administration

* Le gestionnaire voit la liste des pièces jointes depuis le détail d'une offre
  accessible via l'administration.
* Il peut télécharger, ajouter et supprimer des pièces jointes, quel que soit
  le créateur de l'offre.
* Le rôle `lecteur` peut télécharger les pièces jointes des offres qu'il peut
  consulter, mais ne peut ni en ajouter ni en supprimer.

## Règles métier

* Une offre peut avoir de zéro à dix pièces jointes.
* Chaque pièce jointe est un PDF ou un DOCX de 5 Mo maximum.
* Les limites sont contrôlées côté backend ; les contrôles frontend ne sont
  qu'une aide utilisateur.
* Le nombre maximal est vérifié avant chaque upload en tenant compte des
  pièces jointes déjà enregistrées.
* L'échec d'un upload n'annule jamais la création ni la modification de
  l'offre.
* Un upload réussi est conservé même si un autre fichier de la même sélection
  échoue.
* Le téléchargement suit les droits de lecture de l'offre.
* L'ajout et la suppression suivent les droits d'écriture existants :
  gestionnaire, entreprise propriétaire de l'offre ou étudiant auteur de la
  proposition.
* Le rôle `lecteur` n'a aucun droit de mutation.
* Les fichiers sont identifiés publiquement par un identifiant de pièce jointe
  et non par leur chemin physique.
* Le serveur génère un nom technique unique en conservant uniquement
  l'extension validée. Aucun chemin ou nom fourni par le client n'est utilisé
  pour déterminer l'emplacement du fichier.
* Un enregistrement de pièce jointe appartient à une seule offre.
* La suppression d'une offre, si elle est introduite ultérieurement, devra
  également supprimer ses fichiers physiques ; aucune suppression d'offre
  n'est ajoutée par cette spec.

## Contrat API attendu

* `GET /api/offers/:offerId/attachments` : liste les métadonnées des pièces
  jointes si l'utilisateur peut consulter l'offre.
* `POST /api/offers/:offerId/attachments` : ajoute un fichier via un corps
  `multipart/form-data` et un champ unique `file`. Le frontend répète cet appel
  pour une sélection multiple.
* `GET /api/offers/:offerId/attachments/:attachmentId` : télécharge une pièce
  jointe appartenant à l'offre.
* `DELETE /api/offers/:offerId/attachments/:attachmentId` : supprime une pièce
  jointe appartenant à l'offre.
* L'ancienne route singulière `POST /api/offers/:id/attachment` est remplacée
  par le contrat pluriel. Le frontend et la documentation sont mis à jour dans
  la même livraison ; aucune compatibilité publique externe n'est attendue.
* Les mutations restent protégées par le jeton CSRF lié à la session.

Métadonnées minimales retournées pour une pièce jointe :

* `id` ;
* `offer_id` ;
* `storage_name`, nom technique généré et affiché à l'utilisateur ;
* `mime_type` ;
* `size_bytes` ;
* `created_at`.

Le chemin absolu ou relatif utilisé par le serveur n'est jamais exposé dans la
réponse API.

## Stockage et cohérence

* Les fichiers restent stockés dans `backend/uploads/` pour cette phase.
* Le chemin du répertoire est résolu côté serveur et reste stable entre le code
  TypeScript exécuté directement et le code compilé.
* Le répertoire n'est pas vidé lors d'un simple redémarrage de l'application.
* L'enregistrement en base n'est créé qu'après l'écriture réussie du fichier.
  Si l'insertion en base échoue, le fichier écrit est supprimé au mieux et
  l'erreur est journalisée.
* Lors d'une suppression demandée par l'utilisateur, le système évite de
  laisser volontairement un fichier orphelin et journalise tout échec de
  nettoyage physique.
* La suppression manuelle de la base de développement ne supprime pas
  implicitement les fichiers locaux. Après régénération, les anciens fichiers
  ne sont plus référencés et peuvent être nettoyés manuellement.

## Base de développement et données fictives

* `backend/src/db/schema.sql` définit directement la table
  `offer_attachments` et ne définit plus la colonne unique
  `offers.attachment_path`.
* Aucun code de migration, de backfill ou de compatibilité avec
  `attachment_path` n'est ajouté dans `backend/src/db/db.migrate.ts`.
* Pour appliquer le nouveau schéma en développement, la base fictive locale est
  supprimée puis recréée selon le mécanisme de développement existant.
* `backend/src/db/seeds/seed.sql` reste l'unique source de vérité pour les
  données fictives chargées automatiquement lorsque la base est vide.
* Le seed est adapté au nouveau schéma, mais ne crée pas d'enregistrement de
  pièce jointe sans fichier physique correspondant. Une base fraîche peut donc
  commencer sans pièce jointe ; celles-ci sont ensuite ajoutées par l'interface
  ou l'API pendant les tests manuels.
* `backend/src/db/seeds/demo.sql` et le script non suivi
  `backend/scripts/db-seed.ts` ne deviennent pas des sources alternatives de
  population dans le cadre de cette spec.

Schéma minimal attendu pour `offer_attachments` :

* `id` : clé primaire ;
* `offer_id` : clé étrangère vers `offers.id`, avec suppression en cascade des
  métadonnées ;
* `storage_name` : nom technique unique ;
* `mime_type` ;
* `size_bytes` ;
* `created_at`.

La suppression en cascade de la ligne SQL ne suffit pas à supprimer un fichier
physique. Toute future suppression d'offre devra donc passer par un service qui
nettoie les pièces jointes avant ou après la suppression transactionnelle.

## Sécurité et validation

* Le backend vérifie l'extension et le type MIME autorisés. Une extension ne
  correspondant pas au type MIME est refusée.
* Les réponses de téléchargement empêchent l'interprétation automatique d'un
  contenu comme page web et forcent le téléchargement.
* Les erreurs ne contiennent jamais le chemin physique du fichier.
* La résolution du fichier vérifie qu'il reste sous le répertoire
  `backend/uploads/` afin d'empêcher toute traversée de chemin.
* Un dépassement de taille, un format invalide, une onzième pièce jointe ou un
  champ `file` absent retourne `400` avec un message exploitable par
  l'interface.
* Une session absente retourne `401` et un rôle insuffisant retourne `403`, en
  cohérence avec les conventions globales.

## Critères d’acceptation

* [ ] Une offre peut être créée sans pièce jointe.
* [ ] Le formulaire permet de sélectionner plusieurs PDF/DOCX et indique les
  limites de dix fichiers et 5 Mo par fichier.
* [ ] Une offre peut contenir jusqu'à dix pièces jointes distinctes.
* [ ] Le backend refuse un onzième fichier, un fichier supérieur à 5 Mo, une
  extension interdite ou un type MIME incohérent.
* [ ] La création de l'offre n'est exécutée qu'une seule fois avant les
  uploads.
* [ ] Si un upload échoue, l'offre et les uploads déjà réussis sont conservés.
* [ ] Après un échec, l'utilisateur peut réessayer uniquement les fichiers en
  erreur ou continuer vers l'offre sans créer de doublon.
* [ ] Le détail d'une offre liste chaque pièce jointe avec son nom technique.
* [ ] Chaque pièce jointe peut être téléchargée individuellement.
* [ ] Le téléchargement fonctionne pour tous les rôles autorisés à consulter
  l'offre et échoue pour les autres rôles ou sans session.
* [ ] Un identifiant de pièce jointe appartenant à une autre offre ne permet
  pas d'accéder au fichier.
* [ ] Le gestionnaire, l'entreprise propriétaire et l'étudiant auteur peuvent
  ajouter et supprimer les pièces jointes selon leurs droits d'écriture.
* [ ] Le lecteur peut télécharger les documents visibles, mais ne peut ni en
  ajouter ni en supprimer.
* [ ] La suppression retire la pièce jointe de l'interface, de la base et du
  répertoire local.
* [ ] Une base absente est recréée avec la table `offer_attachments` et sans la
  colonne `offers.attachment_path`.
* [ ] `backend/src/db/seeds/seed.sql` peuple correctement une base fraîche avec
  le nouveau schéma et reste l'unique seed automatique.
* [ ] Aucun code de migration ou de backfill de `attachment_path` n'est ajouté.
* [ ] Aucun chemin physique n'est exposé par l'API ou par les messages
  d'erreur.
* [ ] Les fichiers restent disponibles après un simple redémarrage tant que
  `backend/uploads/` et la base associée sont conservés.

## Impacts techniques connus

Features impactées :

* Backend : `backend/src/features/offers`
* Backend : `backend/src/middlewares/upload.middleware.ts`
* Backend : `backend/src/db/schema.sql`
* Backend : `backend/src/db/seeds/seed.sql`
* Frontend : `frontend/src/features/offers`
* Frontend : `frontend/src/pages/submit-offer.page.tsx`
* Frontend : `frontend/src/pages/student-proposal.page.tsx`
* Frontend : `frontend/src/pages/offer-details.page.tsx`
* Frontend : `frontend/src/pages/admin-offers.page.tsx`

Données impactées :

* nouvelle table `offer_attachments` ;
* suppression de `offers.attachment_path` dans le schéma recréé ;
* aucune migration de la base fictive existante ;
* fichiers physiques sous `backend/uploads/`.

Routes, API ou écrans impactés :

* nouveau contrat pluriel `/api/offers/:offerId/attachments` ;
* détail et modification d'une offre ;
* création d'une offre par une entreprise ;
* proposition de stage par un étudiant ;
* administration des offres.

Permissions ou rôles impactés :

* `gestionnaire` : lecture, ajout et suppression sur toutes les offres ;
* `lecteur` : téléchargement selon la visibilité, sans mutation ;
* `entreprise` : téléchargement selon la visibilité, ajout et suppression sur
  ses propres offres ;
* `etudiant` : téléchargement selon la visibilité, ajout et suppression sur
  ses propres propositions.

Tests à prévoir :

* tests backend des quatre routes de liste, ajout, téléchargement et
  suppression ;
* tests backend des rôles, de la propriété de l'offre et des tentatives
  croisées entre offres ;
* tests des formats, MIME, taille, limite de dix et absence de fichier ;
* tests du nettoyage physique après suppression et après échec
  d'enregistrement ;
* test de création d'une base fraîche avec le nouveau schéma ;
* test d'exécution de `backend/src/db/seeds/seed.sql` sur cette base ;
* vérification de l'absence de logique de migration propre à cette évolution ;
* tests frontend du choix multiple, des erreurs partielles, du retry sans
  recréation et de la suppression ;
* test du téléchargement depuis le détail d'une offre ;
* build TypeScript frontend et backend.

## Documents liés

* PRD : `docs/specs/2026-05-15-gestion-stages-v1-design.md`
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* README de feature : `backend/src/features/offers/README.md`
* Review ayant identifié la route manquante :
  `docs/reviews/2026-06-20-context-engineering-comments.md`
* Review d'implémentation : à créer dans `docs/reviews/` lors de la réalisation

## Incertitudes

* La seconde phase de stockage robuste n'est pas définie dans cette spec. Elle
  devra couvrir au minimum la sauvegarde, la restauration, la réplication et
  la migration des fichiers locaux existants.
* Aucun mécanisme automatique de détection ou de nettoyage des fichiers
  orphelins laissés par la suppression manuelle d'une base de développement
  n'est inclus.
