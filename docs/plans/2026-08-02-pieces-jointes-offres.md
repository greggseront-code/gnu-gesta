# Plan - finaliser les pièces jointes des offres

Date : 2026-08-02

Statut : brouillon

## Contexte

Le flux actuel sait écrire un seul fichier après la création d'une offre, mais
ne fournit pas le cycle complet de liste, téléchargement et suppression. Ce
plan organise le remplacement de ce comportement par une gestion de plusieurs
pièces jointes sur la base de développement recréable.

Sources à relire avant exécution :

* Spec : `docs/specs/2026-08-02-pieces-jointes-offres.md`
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* README de feature : `backend/src/features/offers/README.md`
* Review précédente :
  `docs/reviews/2026-06-20-context-engineering-comments.md`

## Objectif

Livrer une gestion complète et protégée de zéro à dix pièces jointes PDF/DOCX
par offre, sur le stockage local de développement, sans recréer une offre
lorsqu'un upload échoue.

Le plan doit permettre de vérifier :

* que le schéma frais et le seed SQL sont la seule base de données attendue,
  sans migration de `attachment_path` ;
* que les quatre opérations de liste, ajout, téléchargement et suppression
  respectent les droits existants sur les offres ;
* que les parcours entreprise, étudiant et gestionnaire supportent plusieurs
  fichiers, les erreurs partielles et le retry sans doublon ;
* que les fichiers physiques et leurs métadonnées restent cohérents lors des
  succès, rejets et suppressions.

## Périmètre

Inclus :

* table `offer_attachments` dans le schéma frais ;
* adaptation du seed SQL versionné ;
* stockage local sous `backend/uploads/` ;
* API plurielle et contrôles d'accès ;
* interface de sélection multiple, liste, téléchargement, retry et
  suppression ;
* tests backend, frontend et vérifications manuelles ;
* mise à jour de la documentation de référence et review d'implémentation.

Exclus :

* migration ou conservation de la base fictive existante ;
* stockage externe, réplication ou sauvegarde des fichiers ;
* antivirus, aperçu, versionnement ou restauration d'une pièce jointe ;
* création d'une route de suppression d'offre ;
* données de pièces jointes fictives sans fichier physique correspondant.

## Impacts prévus

* Backend : modèle, requêtes, service et routes de la feature `offers`, ainsi
  que le middleware d'upload et un helper de stockage local.
* Frontend : types et client API `offers`, formulaire partagé, parcours de
  création/modification, proposition étudiante et détail d'offre.
* Données : création de `offer_attachments`, retrait de
  `offers.attachment_path` du schéma frais et adaptation du seed SQL.
* Documentation : `docs/features.md`, `docs/data-model.md`, README backend,
  éventuelle limite locale dans `docs/production-readiness.md`, puis review.
* Tests : schéma/seed, API et permissions, cohérence disque/DB, composants et
  parcours frontend.

## Décisions propres à ce plan

* Le contrat API est pluriel. Un appel POST transporte un seul champ `file` ;
  le frontend répète les appels séquentiellement pour une sélection multiple.
* `Offer` ne contient plus `attachment_path`. Les pièces jointes utilisent un
  type `OfferAttachment` et des endpoints dédiés.
* `storage_name` contient uniquement le nom technique généré par le serveur ;
  aucun nom original ni chemin physique n'est exposé ou persisté.
* La limite de dix est contrôlée dans l'opération d'insertion backend, en tenant
  compte des lignes déjà présentes. Un fichier écrit mais refusé ou non
  enregistré est nettoyé au mieux.
* Les règles de lecture de l'offre, y compris le cas d'un étudiant ayant déjà
  postulé, sont réutilisées par la liste et le téléchargement des pièces
  jointes. Elles ne sont pas recopiées sous une variante simplifiée.
* L'ajout et la suppression réutilisent la règle d'écriture actuelle :
  gestionnaire, entreprise propriétaire ou étudiant auteur.
* La gestion après création est portée par le détail de l'offre. L'écran
  `/admin/offers` y donne déjà accès, ce qui fournit le parcours gestionnaire
  sans dupliquer le composant dans chaque carte d'administration.
* En cas d'échec partiel après création, la page conserve l'identifiant de
  l'offre persistée et passe dans un état de gestion des uploads. Toute relance
  ne renvoie que les fichiers en erreur.
* Les tests de stockage utilisent un répertoire temporaire contrôlé et ne
  dépendent pas du contenu courant de `backend/uploads/`.
* `backend/src/db/seeds/seed.sql` reste le seul seed automatique. Ses
  modifications locales existantes doivent être relues et préservées pendant
  l'implémentation.

Ne pas faire dans ce plan :

* ajouter une migration ou un backfill de `offers.attachment_path` ;
* modifier `backend/src/db/seeds/demo.sql` ou faire de
  `backend/scripts/db-seed.ts` une source de vérité ;
* supprimer automatiquement la base locale ou les fichiers déjà présents ;
* servir directement `backend/uploads/` comme répertoire statique ;
* accepter un chemin ou un nom de destination fourni par le client ;
* annuler une offre parce qu'un upload a échoué.

## Structure cible

```text
backend/src/
  db/
    schema.sql
    seeds/seed.sql
  features/offers/
    offers.types.ts
    offers.queries.ts
    offers.service.ts
    offers.routes.ts
    offer-attachments.storage.ts      # nouveau, accès sûr au stockage local
  middlewares/
    upload.middleware.ts

frontend/src/
  features/offers/
    offers.types.ts
    offers.api.ts
    offer-form.tsx
    offer-attachments.tsx             # nouveau, liste et actions persistées
    offer-upload-status.tsx            # nouveau, échecs partiels et retry
  pages/
    submit-offer.page.tsx
    student-proposal.page.tsx
    offer-details.page.tsx
```

Les noms des deux composants frontend peuvent être ajustés pendant
l'implémentation si une séparation plus petite est suffisante, à condition de
ne pas dupliquer la logique de retry entre les deux parcours de création.

## Tasks list

### 001. Remplacer le champ unique par le schéma multi-pièces jointes

**Files:**

* Read: `backend/src/db/db.connection.ts`
* Read: `backend/src/db/db.migrate.ts`
* Modify: `backend/src/db/schema.sql`
* Modify: `backend/src/db/seeds/seed.sql`
* Modify: `backend/src/features/offers/offers.types.ts`
* Modify: `frontend/src/features/offers/offers.types.ts`
* Modify: `backend/tests/db.test.ts`

**Travail :**

* [ ] Retirer `attachment_path` de la définition fraîche de `offers`.
* [ ] Ajouter `offer_attachments` avec `id`, `offer_id`, `storage_name`,
  `mime_type`, `size_bytes` et `created_at`.
* [ ] Ajouter la clé étrangère `offer_id` avec `ON DELETE CASCADE`, l'unicité
  du nom technique et l'index utile aux listes par offre.
* [ ] Ajouter les contraintes simples possibles sur les métadonnées, sans
  déplacer dans SQLite les validations de contenu qui appartiennent au
  backend.
* [ ] Adapter le seed SQL courant au schéma frais sans ajouter de ligne de
  pièce jointe dépourvue de fichier physique et sans écraser ses changements
  métier existants.
* [ ] Retirer `attachment_path` des types `Offer` backend et frontend.
* [ ] Introduire le type `OfferAttachment` des deux côtés avec le même contrat.
* [ ] Étendre les tests DB pour vérifier la table, ses clés étrangères, ses
  contraintes et l'absence de la colonne historique.
* [ ] Tester `runSeed()` sur une base en mémoire fraîche et vérifier que le seed
  de référence s'exécute avec le nouveau schéma.
* [ ] Ne créer aucune logique de migration ou de backfill pour cette feature.

**Verification:**

* Run: `cd backend && npm test -- tests/db.test.ts`
* Run: `cd backend && npm run build`
* Expected: le schéma et le seed s'exécutent sur une base fraîche, les types
  compilent et aucun test n'attend encore `attachment_path`.

**Human observables:**

* Une inspection SQLite d'une base fraîche montre `offer_attachments` et ne
  montre plus `offers.attachment_path`.
* Le seed charge les entreprises, contacts, étudiants et offres fictifs
  attendus sans créer de document cassé.

### 002. Isoler et sécuriser le stockage local des fichiers

**Files:**

* Modify: `backend/src/middlewares/upload.middleware.ts`
* Create: `backend/src/features/offers/offer-attachments.storage.ts`
* Create: `backend/tests/offer-attachments.storage.test.ts`

**Travail :**

* [ ] Centraliser le chemin canonique de `backend/uploads/`, la génération des
  noms techniques et la résolution sûre d'un fichier sous cette racine.
* [ ] Permettre aux tests de fournir une racine temporaire sans modifier le
  répertoire runtime par défaut.
* [ ] Conserver la limite Multer de 5 Mo par fichier.
* [ ] Valider le couple extension/type MIME : `.pdf` avec
  `application/pdf`, `.docx` avec le MIME OOXML attendu, sans reprendre le nom
  original comme nom de stockage.
* [ ] Normaliser l'extension autorisée et générer un nom non prédictible et
  suffisamment unique.
* [ ] Fournir les opérations nécessaires au service : résolution sûre,
  existence, taille, ouverture/téléchargement et suppression.
* [ ] Refuser toute résolution sortant de la racine d'upload et ne jamais
  inclure le chemin physique dans une erreur utilisateur.
* [ ] Traiter `ENOENT` comme une incohérence contrôlée et journalisable, sans
  masquer les autres erreurs du système de fichiers.

**Verification:**

* Run: `cd backend && npm test -- tests/offer-attachments.storage.test.ts`
* Run: `cd backend && npm run build`
* Expected: PDF/DOCX valides sont acceptés, les couples MIME/extension
  incohérents et les traversées de chemin sont refusés, les tests écrivent
  uniquement dans un répertoire temporaire.

**Human observables:**

* Un fichier accepté reçoit un nom technique sans fragment du chemin fourni
  par l'utilisateur.
* Aucune erreur affichable par l'API ne contient le chemin absolu du poste de
  développement.

### 003. Implémenter le modèle et le service des pièces jointes

**Files:**

* Modify: `backend/src/features/offers/offers.queries.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/src/features/offers/offers.types.ts`
* Modify: `backend/tests/offers.test.ts`

**Travail :**

* [ ] Remplacer `updateOfferAttachment` et `attachFile` par des opérations de
  liste, comptage, insertion, lecture par identifiant et suppression dans
  `offer_attachments`.
* [ ] Faire retourner une `OfferAttachment` après insertion, jamais une offre
  contenant un chemin.
* [ ] Vérifier la limite de dix dans l'opération de service qui insère les
  métadonnées, avec le comptage et l'insertion regroupés dans une transaction
  SQLite synchrone.
* [ ] Nettoyer le fichier déjà écrit si la limite est atteinte ou si
  l'enregistrement en base échoue.
* [ ] Pour une suppression autorisée, résoudre le nom stocké sous la racine,
  supprimer le fichier physique puis la ligne ; considérer un fichier déjà
  absent comme nettoyé, tout en journalisant l'incohérence.
* [ ] Retourner des erreurs métier contrôlées pour offre absente, pièce jointe
  absente et limite atteinte.
* [ ] Tester la liste ordonnée, l'ajout de plusieurs fichiers, la limite de dix,
  l'appartenance stricte d'une pièce jointe à son offre et la suppression.
* [ ] Tester le nettoyage du fichier après un rejet intervenant après l'écriture
  et après une suppression réussie.

**Verification:**

* Run: `cd backend && npm test -- tests/offers.test.ts tests/offer-attachments.storage.test.ts`
* Expected: les opérations DB/disque restent cohérentes et aucun test ne lit ou
  n'écrit `offers.attachment_path`.

**Human observables:**

* Plusieurs lignes `offer_attachments` peuvent référencer la même offre.
* Après suppression, ni la ligne ni le fichier correspondant ne subsistent.

### 004. Exposer l'API plurielle avec les permissions existantes

**Files:**

* Modify: `backend/src/features/offers/offers.routes.ts`
* Modify: `backend/src/features/offers/offers.service.ts`
* Modify: `backend/tests/offers.test.ts`
* Modify: `backend/tests/access-control.test.ts`

**Travail :**

* [ ] Factoriser dans la feature la décision de lecture actuellement répartie
  entre `isVisible` et l'exception de candidature, puis l'utiliser à la fois
  pour `GET /api/offers/:id` et les routes de pièces jointes.
* [ ] Réutiliser une seule décision d'écriture pour le PATCH d'offre, l'ajout et
  la suppression de pièces jointes.
* [ ] Ajouter `GET /api/offers/:offerId/attachments` avec contrôle de lecture.
* [ ] Remplacer le POST singulier par
  `POST /api/offers/:offerId/attachments`, champ multipart `file`, réponse
  `201` contenant les métadonnées.
* [ ] Ajouter
  `GET /api/offers/:offerId/attachments/:attachmentId` avec vérification de
  l'offre, de la visibilité et de l'appartenance avant `res.download()`.
* [ ] Forcer `Content-Disposition: attachment`, utiliser le nom technique et
  ajouter les en-têtes empêchant l'interprétation du contenu comme HTML.
* [ ] Ajouter
  `DELETE /api/offers/:offerId/attachments/:attachmentId`, protégé par le
  CSRF et retournant `204` après suppression.
* [ ] Retourner `404` pour une pièce absente ou rattachée à une autre offre,
  sans exposer son existence ni son chemin.
* [ ] Retourner des erreurs contrôlées pour fichier absent sur disque, fichier
  multipart manquant, taille, type, extension et limite de dix.
* [ ] Supprimer l'ancienne route singulière dans la même livraison.
* [ ] Couvrir les rôles : gestionnaire complet, lecteur en téléchargement
  seulement, entreprise propriétaire, étudiant auteur, étudiant ayant postulé,
  utilisateur non propriétaire et session absente.

**Verification:**

* Run: `cd backend && npm test -- tests/offers.test.ts tests/access-control.test.ts`
* Run: `cd backend && npm run build`
* Expected: les quatre endpoints respectent les codes `200/201/204`,
  `400/401/403/404` attendus et les mêmes règles de visibilité que le détail
  d'offre.

**Human observables:**

* Un lecteur peut télécharger un document d'une offre visible mais reçoit un
  refus sur POST et DELETE.
* Modifier l'identifiant d'offre autour d'un identifiant de pièce jointe valide
  ne donne jamais accès au fichier.

### 005. Adapter le contrat frontend et le formulaire multi-fichiers

**Files:**

* Modify: `frontend/src/features/offers/offers.types.ts`
* Modify: `frontend/src/features/offers/offers.api.ts`
* Modify: `frontend/src/features/offers/offer-form.tsx`
* Create: `frontend/src/features/offers/offer-form.test.tsx`

**Travail :**

* [ ] Ajouter les clients API de liste, ajout et suppression, ainsi qu'un
  générateur d'URL de téléchargement par offre et pièce jointe.
* [ ] Conserver le traitement `FormData` sans imposer de `Content-Type` et
  transmettre le CSRF sur chaque upload.
* [ ] Utiliser `apiFetch` pour DELETE afin de conserver le comportement commun
  des erreurs et du CSRF.
* [ ] Remplacer `file?: File` par `files: File[]` dans le contrat de soumission
  du formulaire.
* [ ] Activer `multiple` sur le champ, afficher les fichiers sélectionnés et
  permettre de retirer un fichier avant la soumission.
* [ ] Valider au frontend le nombre, la taille, l'extension et le type MIME avec
  des messages par fichier, sans considérer ces validations comme une barrière
  de sécurité.
* [ ] Empêcher une sélection de création supérieure à dix ; sur une offre
  persistée, tenir compte du nombre de pièces déjà listées.
* [ ] Tester zéro, un et plusieurs fichiers, le retrait avant soumission et les
  quatre catégories d'erreur locale.

**Verification:**

* Run: `cd frontend && npm test -- src/features/offers/offer-form.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: le formulaire soumet un tableau de fichiers valides et aucune
  référence frontend à `attachment_path` ou à l'ancienne route ne subsiste.

**Human observables:**

* Le champ annonce clairement « PDF ou DOCX, 5 Mo maximum, 10 fichiers ».
* Plusieurs noms sont visibles avant l'envoi et peuvent être retirés
  individuellement.

### 006. Rendre la création résistante aux échecs partiels

**Files:**

* Modify: `frontend/src/pages/submit-offer.page.tsx`
* Modify: `frontend/src/pages/student-proposal.page.tsx`
* Create: `frontend/src/features/offers/offer-upload-status.tsx`
* Create: `frontend/src/pages/submit-offer.test.tsx`
* Modify: `frontend/src/pages/student-proposal.test.tsx`

**Travail :**

* [ ] Partager une petite orchestration qui envoie les fichiers un à un et
  retourne les succès et échecs sans rejeter tout le lot.
* [ ] Dans chaque parcours, créer l'offre une seule fois puis mémoriser son
  identifiant avant le premier upload.
* [ ] Si tout réussit, conserver la navigation automatique vers le détail.
* [ ] Si un fichier échoue, afficher l'identifiant ou le lien de l'offre déjà
  créée, les uploads réussis et les fichiers restant en erreur.
* [ ] Ajouter « Réessayer les fichiers en erreur » sans réexécuter
  `createOffer`, et retirer de la file chaque fichier finalement réussi.
* [ ] Ajouter « Continuer sans ces fichiers » vers le détail de l'offre.
* [ ] Désactiver les actions concurrentes pendant une création, un upload ou un
  retry pour éviter les doubles clics.
* [ ] Appliquer le même comportement à une modification d'offre, sans annuler
  les champs déjà enregistrés si un nouvel upload échoue.
* [ ] Tester explicitement qu'un échec sur le deuxième fichier conserve le
  premier et que le retry n'appelle pas `createOffer` une seconde fois.
* [ ] Conserver dans le test étudiant les étapes de recherche/choix
  d'entreprise et de contact déjà couvertes.

**Verification:**

* Run: `cd frontend && npm test -- src/pages/submit-offer.test.tsx src/pages/student-proposal.test.tsx`
* Expected: les deux parcours partagent le même contrat d'erreur partielle et
  une offre n'est créée qu'une fois, y compris après plusieurs retries.

**Human observables:**

* Après un upload partiellement échoué, l'utilisateur voit clairement que
  l'offre est enregistrée.
* Un clic sur retry ne crée aucune offre supplémentaire dans la base.

### 007. Ajouter la gestion persistée sur le détail de l'offre

**Files:**

* Create: `frontend/src/features/offers/offer-attachments.tsx`
* Create: `frontend/src/features/offers/offer-attachments.test.tsx`
* Modify: `frontend/src/pages/offer-details.page.tsx`
* Create: `frontend/src/pages/offer-details.test.tsx`
* Verify: `frontend/src/pages/admin-offers.page.tsx`

**Travail :**

* [ ] Charger et afficher toutes les métadonnées de pièces jointes d'une offre,
  avec le nom technique et une action de téléchargement par ligne.
* [ ] Utiliser l'URL backend protégée pour le téléchargement ; ne jamais
  construire une URL vers `backend/uploads/`.
* [ ] Calculer l'autorisation d'afficher les actions de mutation à partir du
  rôle courant et de la propriété de l'offre, en restant cohérent avec le
  backend.
* [ ] Pour les utilisateurs autorisés, ajouter des fichiers dans la limite des
  places restantes et rafraîchir la liste après chaque succès.
* [ ] Ajouter une confirmation avant DELETE, retirer la ligne après `204` et
  afficher une erreur sans masquer le reste de la liste en cas d'échec.
* [ ] Pour le lecteur ou un utilisateur en lecture seule, ne rendre que la
  liste et les téléchargements.
* [ ] Remplacer le bloc actuel conditionné par `offer.attachment_path` sur le
  détail.
* [ ] Vérifier que le lien « Voir le détail » de `/admin/offers` donne bien au
  gestionnaire accès au composant complet ; ne pas dupliquer la gestion dans
  la liste d'administration si ce parcours est suffisant.
* [ ] Tester liste vide, plusieurs documents, téléchargement, ajout, limite de
  dix, confirmation/suppression, erreur API et mode lecture seule.

**Verification:**

* Run: `cd frontend && npm test -- src/features/offers/offer-attachments.test.tsx src/pages/offer-details.test.tsx src/pages/admin-offers.test.tsx`
* Run: `cd frontend && npm run build`
* Expected: le détail fournit le cycle complet, l'administration y accède et
  les rôles non mutateurs ne voient aucune action d'ajout ou de suppression.

**Human observables:**

* Une offre avec trois documents affiche trois noms et trois téléchargements
  distincts.
* Depuis `/admin/offers`, le gestionnaire peut ouvrir l'offre puis ajouter ou
  supprimer un document.

### 008. Mettre à jour la documentation et effectuer la vérification finale

**Files:**

* Modify: `docs/features.md`
* Modify: `docs/data-model.md`
* Modify: `backend/src/features/offers/README.md`
* Modify if needed: `docs/production-readiness.md`
* Create: `docs/reviews/2026-08-02-pieces-jointes-offres.md`

**Travail :**

* [ ] Remplacer le contrat singulier par les quatre routes plurialisées dans la
  carte des features et le README backend.
* [ ] Documenter `offer_attachments`, ses relations, contraintes et l'abandon
  de `offers.attachment_path` dans le modèle de données.
* [ ] Documenter les permissions de lecture et d'écriture ainsi que la limite
  de dix fichiers de 5 Mo.
* [ ] Signaler que le stockage local n'est ni sauvegardé ni adapté à une future
  production, sans concevoir la seconde phase dans cette livraison.
* [ ] Rechercher les mentions résiduelles de l'ancienne route et du champ
  historique ; ne conserver que les références de contexte dans la spec ou les
  anciennes reviews.
* [ ] Exécuter les suites complètes et les builds des deux applications.
* [ ] Réaliser le parcours manuel entreprise, étudiant, lecteur et
  gestionnaire sur une base fictive fraîche.
* [ ] Créer la review finale avec les fichiers réellement modifiés, les tests,
  les observables, les écarts et les limites restantes.

**Verification:**

* Run: `cd backend && npm test`
* Run: `cd backend && npm run build`
* Run: `cd frontend && npm test`
* Run: `cd frontend && npm run build`
* Run: `rg -n "attachment_path|/attachment\\b" backend/src backend/tests frontend/src docs/features.md docs/data-model.md backend/src/features/offers/README.md`
* Expected: toutes les suites et builds passent ; la recherche ne retourne que
  les références historiques explicitement conservées ou aucun résultat dans
  les sources actives.

**Human observables:**

* Entreprise : création avec plusieurs fichiers, échec partiel simulé, retry et
  suppression depuis le détail.
* Étudiant : même comportement depuis la proposition de stage.
* Lecteur : téléchargements visibles, aucune mutation possible.
* Gestionnaire : accès complet depuis `/admin/offers` vers le détail.
* Sécurité : URL croisée entre deux offres refusée, session absente refusée et
  aucun chemin local visible dans les réponses.

## Notes de migration

* Il n'y a aucune migration de données à écrire. La base SQLite locale est
  fictive et doit être recréée depuis `schema.sql` et `seed.sql`.
* `offers.attachment_path` est supprimé directement du schéma frais et des
  types applicatifs.
* L'ancienne route `POST /api/offers/:id/attachment` est supprimée avec son
  client frontend ; aucune période de compatibilité n'est prévue.
* Les fichiers déjà présents dans `backend/uploads/` ne sont pas repris. Ils
  peuvent rester orphelins après la recréation de la base et être nettoyés
  manuellement.
* La suppression effective de `backend/data/gesta.db` est une action manuelle
  hors de ce plan d'édition ; ne pas l'exécuter sans vérifier que le serveur est
  arrêté et que les données sont bien jetables.

## Points d'attention

* Le worktree contient déjà des changements dans
  `backend/src/db/seeds/seed.sql`. Les intégrer à la nouvelle structure sans
  les écraser ni les reformater massivement.
* L'écriture du fichier par Multer précède l'insertion SQL. Tous les retours
  après cette écriture doivent passer par un nettoyage au mieux du fichier.
* Le disque et SQLite ne partagent pas de transaction. Journaliser les rares
  incohérences restantes et tester les chemins d'échec contrôlables.
* La limite de dix doit être imposée côté backend, même si le frontend envoie
  les fichiers séquentiellement.
* Une URL de téléchargement ouverte dans un nouvel onglet transmet le cookie de
  session, mais pas un jeton CSRF ; c'est attendu pour un GET sans mutation.
* Les règles de visibilité des offres ont récemment évolué, notamment pour le
  lecteur, les propositions étudiantes et les dépendances en attente. Éviter
  toute copie divergente dans les nouvelles routes.
* Les tests ne doivent pas supprimer ou inspecter les fichiers réels déjà
  présents dans `backend/uploads/`.
* La suppression en cascade SQL ne nettoie pas le disque. Si une suppression
  d'offre est ajoutée plus tard, elle devra obligatoirement passer par le
  service de stockage.
* `storage_name` est volontairement visible. Vérifier qu'il ne contient aucune
  donnée issue du chemin ou du nom original.

## Vérification finale

* [ ] Les tests automatisés pertinents passent.
* [ ] Le build pertinent passe.
* [ ] Les vérifications manuelles importantes sont listées.
* [ ] Les documents liés sont à jour.
* [ ] Les chemins documentés correspondent à la structure réelle.
* [ ] Les écarts par rapport au plan sont documentés.
* [ ] Une base fictive fraîche peut être créée et peuplée par le seed versionné.
* [ ] Aucun fichier réel préexistant dans `backend/uploads/` n'a été supprimé
  par les tests.

## Self-review

* Couverture de la spec :
  * schéma frais, API, stockage, permissions, multi-upload, retry, suppression,
    administration, tests et documentation sont répartis en tâches
    vérifiables ;
  * la contrainte explicite d'absence de migration est présente dans le
    périmètre, la première tâche, les notes et les vérifications finales.
* Cohérence architecture :
  * les requêtes SQL restent dans `offers.queries.ts`, l'orchestration dans le
    service, le transport et les autorisations HTTP dans les routes ;
  * l'accès au disque est isolé derrière un helper testable et le frontend
    conserve ses appels API dans la feature `offers` ;
  * les droits restent calculés côté backend, l'interface ne servant qu'à
    masquer les actions impossibles.
* Risques restants :
  * absence de transaction distribuée entre SQLite et le système de fichiers ;
  * fichiers orphelins possibles après suppression manuelle de la DB ;
  * stockage local non sauvegardé et non adapté à la production ;
  * détection fondée sur extension et MIME déclarés, sans antivirus ni analyse
    profonde du contenu.
* Travail restant :
  * définir dans une seconde spec le stockage robuste, la sauvegarde, la
    restauration et la reprise des fichiers locaux avant toute production.
