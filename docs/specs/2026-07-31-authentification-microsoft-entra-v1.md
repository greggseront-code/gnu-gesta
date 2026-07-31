# Authentification Microsoft Entra V1 pour les utilisateurs de la haute école

> Statut : acceptée le 2026-07-31.

## Contexte

GNU Gesta utilise actuellement un sélecteur de rôle côté frontend. Le rôle et
l'identifiant d'entité sont stockés dans `localStorage`, puis envoyés au backend
avec les headers `x-role` et `x-entity-id`. Ce mécanisme facilite la
démonstration, mais ne constitue pas une authentification ni une frontière de
sécurité.

Les gestionnaires, lecteurs et étudiants disposent tous d'un compte Microsoft
de la Haute École Léonard de Vinci. Une inscription d'application Microsoft
Entra monolocataire a été créée pour GNG, avec une plateforme Web, l'URI de
redirection `https://gng.seront.be/api/auth/callback` et la permission déléguée
`User.Read`.

L'authentification réelle des entreprises est reportée. Le gestionnaire doit
néanmoins pouvoir tester les parcours existants en incarnant temporairement
une entreprise ou un étudiant, sans ouvrir cette possibilité aux lecteurs ni
aux étudiants connectés avec leur propre compte.

## Objectif

Authentifier les utilisateurs de la haute école avec Microsoft Entra et
attribuer côté backend un rôle initial `gestionnaire`, `etudiant` ou `lecteur`
à partir de leur identité vérifiée, tout en conservant explicitement deux modes
d'incarnation temporaires réservés au gestionnaire, l'un pour les entreprises
et l'autre pour les étudiants.

## Périmètre

Inclus :

* Connexion et déconnexion avec le tenant Microsoft Entra de la Haute École
  Léonard de Vinci.
* Utilisation d'un flux OpenID Connect/OAuth 2.0 Authorization Code traité par
  le backend Express.
* Lecture du profil de l'utilisateur connecté avec la permission déléguée
  `User.Read` uniquement.
* Session applicative sécurisée entre le navigateur et le backend.
* Attribution automatique du rôle de base selon l'adresse institutionnelle.
* Liaison d'un compte étudiant à une fiche existante du référentiel
  `students`.
* Remplacement du sélecteur libre des rôles `gestionnaire`, `etudiant` et
  `lecteur`.
* Maintien, pour l'unique gestionnaire, d'un bouton temporaire permettant de
  sélectionner une entreprise et de passer en mode `entreprise`.
* Ajout, pour l'unique gestionnaire, d'un bouton temporaire permettant de
  sélectionner un étudiant et de passer en mode `etudiant` avec l'identité
  métier de l'étudiant choisi.
* Possibilité de quitter chacun de ces modes et de retrouver le rôle de base
  `gestionnaire` sans devoir changer de compte.
* Protection des routes métier contre les requêtes anonymes et contre la
  falsification des headers d'authentification actuels.

Exclus :

* Authentification Microsoft ou locale des utilisateurs d'entreprise.
* Gestion dynamique de plusieurs gestionnaires.
* Écran d'administration des rôles.
* Attribution des rôles via des groupes ou des rôles applicatifs Microsoft
  Entra.
* Synchronisation de l'annuaire, des groupes ou de la liste des étudiants avec
  Microsoft Graph.
* Accès aux mails, fichiers, calendriers, contacts ou autres données Microsoft
  365.
* Support de comptes Microsoft extérieurs au tenant de la haute école.
* Provisionnement automatique d'une fiche étudiant depuis Microsoft Entra.
* Plan de suppression définitive des modes d'incarnation temporaires.

## Comportement attendu

### Accès initial et connexion

* Un utilisateur sans session applicative voit une page de connexion proposant
  un bouton « Se connecter avec Microsoft ».
* Le bouton redirige vers Microsoft Entra. Le mot de passe et le second facteur
  éventuel sont saisis uniquement chez Microsoft.
* Après une authentification réussie, Microsoft redirige vers
  `/api/auth/callback` et le backend établit une session applicative.
* Une session Microsoft déjà ouverte peut permettre le SSO, sous réserve des
  politiques d'accès conditionnel de la haute école.
* Une réponse Microsoft provenant d'un autre tenant, visant une autre
  application ou utilisant une redirection inattendue est rejetée.
* Une erreur de connexion affiche un message compréhensible et ne crée aucune
  session partielle.

### Attribution du rôle de base

L'adresse institutionnelle de référence est normalisée en minuscules et sans
espaces périphériques. Pour une décision de rôle, le backend utilise
prioritairement le `userPrincipalName` vérifié par Microsoft. Le champ `mail`
peut servir à retrouver un profil, mais ne peut pas élever à lui seul un
utilisateur au rôle `gestionnaire`.

Les règles sont évaluées dans cet ordre :

1. L'adresse exacte `gregory.seront@vinci.be` reçoit le rôle
   `gestionnaire`.
2. Toute autre adresse dont le domaine est exactement `student.vinci.be`
   reçoit le rôle `etudiant`.
3. Toute autre personne authentifiée dans le tenant reçoit le rôle `lecteur`.

Le contrôle du domaine étudiant porte sur la partie située après le dernier
`@`. Une adresse comme `nom@student.vinci.be.example.org` ne correspond donc
pas au domaine étudiant.

### Liaison au référentiel étudiant

* Pour un compte classé `etudiant`, le backend recherche une fiche `students`
  dont l'adresse correspond, sans tenir compte de la casse, à l'adresse
  institutionnelle vérifiée.
* Si la fiche existe, son `id` devient l'`entityId` étudiant utilisé par les
  règles d'autorisation existantes.
* La personne ne choisit plus son profil dans une liste et ne peut pas prendre
  l'identité d'un autre étudiant.
* Si aucune fiche ne correspond, l'authentification Microsoft réussit mais
  l'accès aux fonctionnalités métier est bloqué avec le message « Votre compte
  étudiant n'est pas encore référencé dans GNG. Contactez un gestionnaire. »
  Aucune fiche n'est créée automatiquement et la personne ne retombe pas
  silencieusement sur le rôle `lecteur`.

### Session et contexte d'autorisation

* Le backend est la source de vérité de l'identité, du rôle et de l'`entityId`.
* La session est transportée dans un cookie `HttpOnly`, `Secure` et avec une
  politique `SameSite` compatible avec le retour Microsoft.
* Aucun jeton Microsoft, secret ou rôle privilégié n'est stocké dans
  `localStorage`.
* Une requête sans session valide reçoit une réponse `401` sur une route
  protégée.
* Une requête authentifiée mais non autorisée pour son rôle reçoit une réponse
  `403`.
* Les headers `x-role` et `x-entity-id` envoyés par le navigateur ne permettent
  plus de choisir les rôles `gestionnaire`, `etudiant` ou `lecteur`, ni de
  changer l'étudiant lié à la session.
* Le frontend récupère l'identité et le rôle courants depuis le backend, plutôt
  que depuis le stockage local.

### Modes d'incarnation temporaires réservés au gestionnaire

* Seule une session dont le rôle de base est `gestionnaire` voit les boutons
  d'incarnation et peut appeler les opérations backend correspondantes.
* Un lecteur ou un étudiant connecté avec son propre compte ne voit pas ces
  boutons et reçoit une réponse `403` s'il tente d'appeler directement ces
  opérations.
* Le bouton « Passer en mode entreprise (temporaire) » ouvre la sélection
  d'entreprise existante et permet de choisir une entreprise, comme dans le
  prototype actuel.
* Le bouton « Passer en mode étudiant (temporaire) » ouvre la liste des
  étudiants existants et permet de choisir un étudiant.
* Le choix est enregistré côté backend dans la session sans modifier le rôle
  de base `gestionnaire` :
  * le mode entreprise définit un `effectiveRole` égal à `entreprise` et un
    `entityId` égal à l'entreprise choisie ;
  * le mode étudiant définit un `effectiveRole` égal à `etudiant` et un
    `entityId` égal à l'étudiant choisi.
* En mode entreprise, les règles d'autorisation et de propriété existantes du
  rôle `entreprise` continuent de s'appliquer.
* En mode étudiant, l'application présente exactement le parcours de
  l'étudiant sélectionné et les règles limitant un étudiant à ses propres
  données continuent de s'appliquer.
* Un seul mode d'incarnation peut être actif à la fois.
* L'interface indique clairement qu'un mode temporaire est actif et affiche
  l'entreprise ou l'étudiant incarné.
* Un bouton « Quitter le mode temporaire » restaure immédiatement le rôle
  effectif `gestionnaire` et supprime l'`entityId` incarné.
* La déconnexion supprime également tout mode d'incarnation actif.
* Ces modes ne permettent jamais de modifier le rôle de base, d'incarner un
  autre gestionnaire ou d'accorder le rôle `lecteur`.
* L'incarnation d'une entreprise sans authentification propre et l'incarnation
  d'un étudiant par le gestionnaire sont des exceptions V1 connues et acceptées
  temporairement. Elles ne constituent pas le modèle d'authentification cible.

### Déconnexion

* « Se déconnecter » supprime la session GNG et ramène à la page de connexion.
* Par défaut, cette action ne déconnecte pas globalement l'utilisateur de son
  compte Microsoft ni des autres applications de la haute école.
* Après déconnexion, les routes protégées ne sont plus accessibles avec
  l'ancien cookie de session.

## Règles métier

* Le rôle `gestionnaire` est accordé uniquement à
  `gregory.seront@vinci.be`, après comparaison normalisée et exacte de
  l'identité vérifiée par Microsoft.
* Le rôle `etudiant` est accordé uniquement aux comptes du domaine exact
  `student.vinci.be`.
* Tous les autres comptes authentifiés du tenant sont des `lecteur` et restent
  soumis aux restrictions de lecture seule existantes.
* Le rôle de base ne peut pas être choisi ou modifié depuis le frontend.
* Un étudiant ne peut agir que pour la fiche `students` liée à son propre
  compte Microsoft.
* Les comparaisons d'adresses sont insensibles à la casse.
* Le seul accès Microsoft Graph demandé est `User.Read`, au nom de
  l'utilisateur connecté.
* Seul le rôle de base `gestionnaire` peut activer un mode d'incarnation
  temporaire.
* Les modes entreprise et étudiant sont des dérogations de démonstration
  réversibles dans la session, pas des changements persistants de rôle.
* Un lecteur ou un étudiant authentifié ne peut sélectionner ni une entreprise
  ni un autre étudiant à incarner.
* Aucun endpoint métier contenant des données de stages n'est accessible de
  façon anonyme. Les endpoints techniques nécessaires à la connexion et le
  healthcheck peuvent rester publics.

## Critères d'acceptation

* [ ] Un utilisateur non connecté est dirigé vers la page de connexion et ne
      peut pas appeler une route métier protégée.
* [ ] `gregory.seront@vinci.be`, authentifié par le tenant attendu, obtient le
      rôle de base `gestionnaire`.
* [ ] Une adresse du domaine exact `student.vinci.be` obtient le rôle de base
      `etudiant` et l'`entityId` de la fiche étudiant portant la même adresse.
* [ ] Un utilisateur dont le rôle de base est `etudiant` ne peut ni
      sélectionner ni usurper la fiche d'un autre étudiant.
* [ ] Un compte du domaine étudiant absent du référentiel est bloqué avec le
      message prévu, sans création automatique et sans rôle `lecteur` de
      remplacement.
* [ ] Tout autre compte authentifié du tenant obtient le rôle `lecteur` et ne
      peut effectuer aucune opération d'écriture interdite aux lecteurs.
* [ ] Un compte extérieur au tenant Entra configuré ne peut pas ouvrir de
      session GNG.
* [ ] Modifier `localStorage`, `x-role` ou `x-entity-id` ne permet pas de
      devenir gestionnaire, étudiant ou de changer d'identité étudiante.
* [ ] L'API distingue une absence d'authentification (`401`) d'une absence de
      permission (`403`).
* [ ] Le gestionnaire peut activer le mode entreprise temporaire, choisir une
      entreprise et utiliser uniquement les droits de cette entreprise.
* [ ] Le gestionnaire peut activer le mode étudiant temporaire, choisir un
      étudiant et voir exactement le parcours autorisé de cet étudiant.
* [ ] Un lecteur ou un étudiant authentifié ne voit pas les commandes
      d'incarnation et ne peut pas activer ces modes par un appel API direct.
* [ ] Un seul mode d'incarnation peut être actif à la fois.
* [ ] Le gestionnaire peut quitter le mode actif et retrouver immédiatement
      son rôle de base `gestionnaire` sans se reconnecter.
* [ ] La déconnexion invalide la session GNG et tout mode d'incarnation
      éventuel, sans déconnecter les autres applications Microsoft par défaut.
* [ ] Aucun jeton Microsoft ni secret applicatif n'apparaît dans le frontend,
      `localStorage`, les logs ou le dépôt Git.
* [ ] L'application ne demande aucune permission Microsoft Graph autre que
      `User.Read`.

## Impacts techniques connus

Features impactées :

* Backend : nouvelle feature transversale d'authentification, à documenter dans
  un README local lors de l'implémentation.
* Backend : `backend/src/middlewares/auth-context.middleware.ts` et
  `backend/src/middlewares/authorization.middleware.ts`.
* Backend : features `students`, `companies`, `offers` et `applications`, dont
  les contrôles d'accès consomment le contexte d'authentification.
* Frontend : `frontend/src/pages/role-select.page.tsx` ou son remplacement par
  une page de connexion.
* Frontend : `frontend/src/context/role-context.tsx`,
  `frontend/src/lib/api-client.ts`, `frontend/src/app/app.tsx` et
  `frontend/src/components/app-layout.tsx`.

Données impactées :

* La table `students` reste le référentiel métier des étudiants et la liaison
  se fait par adresse institutionnelle normalisée.
* La table `users`, actuellement peu utilisée, devra être clarifiée : soit elle
  devient la table de liaison persistante avec les identifiants Entra (`tid` et
  `oid`), soit la première version conserve cette liaison dans la session. Ce
  choix appartient au futur plan technique.
* Une éventuelle évolution du schéma devra préserver un identifiant Microsoft
  immuable (`oid` avec le `tid`) plutôt que de considérer l'adresse comme une
  identité permanente.
* Un stockage de sessions compatible avec le déploiement Express sur un VPS
  unique est nécessaire. Le stockage mémoire par défaut d'Express n'est pas un
  stockage de production acceptable.

Routes, API ou écrans impactés :

* Nouvelles routes d'authentification attendues sous `/api/auth`, couvrant au
  minimum la connexion, le callback, la consultation de la session courante et
  la déconnexion.
* Contrat d'API attendu pour exposer au frontend l'identité courante, le rôle de
  base, le rôle effectif, l'`entityId` et l'éventuel mode d'incarnation actif.
* Contrat d'API attendu pour activer les modes entreprise et étudiant, et pour
  quitter le mode actif. Ces opérations vérifient le rôle de base
  `gestionnaire` côté backend.
* Page initiale de connexion Microsoft.
* Suppression de la sélection libre des profils gestionnaire, lecteur et
  étudiant.
* Adaptation du bouton actuel « Changer de rôle » en actions explicites de
  déconnexion, d'entrée dans les modes entreprise ou étudiant et de sortie du
  mode actif, visibles uniquement au gestionnaire lorsque nécessaire.
* Réévaluation des routes actuellement publiques uniquement pour alimenter le
  sélecteur de rôle, notamment `GET /api/students` et
  `GET /api/companies`.

Permissions ou rôles impactés :

* `gestionnaire` : attribué à une seule adresse autorisée.
* `etudiant` : attribué par domaine puis lié à une fiche `students`, ou utilisé
  comme rôle effectif temporaire lorsque le gestionnaire incarne un étudiant.
* `lecteur` : rôle par défaut pour tout autre compte du tenant.
* `entreprise` : rôle effectif temporaire choisi uniquement par le
  gestionnaire, sans identité d'entreprise réelle dans cette version.
* Microsoft Graph : permission déléguée `User.Read` uniquement.

Configuration et secrets :

* ID du tenant Entra.
* ID client de l'inscription d'application.
* Secret client ou certificat utilisé uniquement par le backend.
* URI de redirection publique exacte.
* Secret de signature ou de chiffrement des sessions.
* Aucune de ces valeurs sensibles ne doit être committée ; un exemple de
  configuration sans valeur secrète doit être documenté.

Tests à prévoir :

* Tests unitaires de normalisation d'adresse et de classification des rôles,
  incluant les domaines ressemblants mais invalides.
* Tests du gestionnaire exact, d'un étudiant connu, d'un étudiant inconnu et
  d'un lecteur.
* Tests du tenant, de l'audience, du retour OAuth, de l'état et des erreurs de
  connexion sans dépendre du service Microsoft réel dans la suite automatique.
* Tests d'intégration des sessions, de `/api/auth/me`, de la déconnexion et des
  codes `401`/`403`.
* Régression de tous les contrôles d'accès existants sans recours aux headers
  falsifiables.
* Tests des modes entreprise et étudiant, des sélections d'entité, de la
  propriété des ressources, de l'exclusivité du mode actif, du retour au rôle
  gestionnaire et de l'invalidation à la déconnexion.
* Tests vérifiant qu'un lecteur ou un étudiant ne peut pas activer les modes
  temporaires, y compris par appel direct à l'API.
* Tests frontend de la page de connexion, de la restauration de session et des
  navigations conditionnées par le rôle.
* Test manuel de bout en bout avec un compte gestionnaire, un compte étudiant
  importé et un compte lecteur du tenant de la haute école.

## Documents liés

* PRD : -
* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
* README de feature : `backend/src/features/students/README.md`
* Configuration Entra : inscription d'application GNG dans le tenant de la
  Haute École Léonard de Vinci.
* Plan : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review : `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md` (à
  créer après une éventuelle implémentation)

## Incertitudes

* La correspondance réelle entre `userPrincipalName`, `mail` et les adresses
  importées devra être confirmée avec un compte étudiant du tenant. Le plan lié
  impose entre-temps un rapprochement non ambigu et interdit à `mail`
  d'accorder le rôle `gestionnaire`.
* Une déconnexion Microsoft globale pourrait être ajoutée séparément si un
  besoin différent de la déconnexion locale acceptée est confirmé.
* Les modes temporaires permettent volontairement à l'unique gestionnaire
  d'incarner une entreprise ou un étudiant existant. Cette capacité privilégiée
  doit rester identifiable dans la session et devra être réévaluée lors de
  l'authentification réelle des entreprises et de l'ajout de plusieurs
  gestionnaires.
