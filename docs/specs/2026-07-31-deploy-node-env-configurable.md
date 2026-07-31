# Environnement runtime configurable au déploiement (production / staging)

## Contexte

Le pilote authentification Microsoft Entra (jalon 1, voir
`docs/specs/2026-07-31-authentification-microsoft-entra-v1.md` et
`docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`) refuse
volontairement de démarrer quand `NODE_ENV=production`
(`assertPilotEnvironmentAllowed()` dans
`backend/src/features/auth/auth.config.ts`), tant que le store de session
SQLite du jalon 2 n'existe pas. Or `deploy/systemd/gnu-gesta-backend.service`
définit `Environment=NODE_ENV=production` en dur : un déploiement du pilote
sur le VPS ferait planter le backend en boucle (`Restart=on-failure`).

Le VPS `gng.seront.be` n'héberge actuellement que des données fictives et
n'est pas encore utilisé par de vrais utilisateurs (voir
`docs/deployment.md`). L'utilisateur souhaite s'en servir comme
environnement de test réel pour le pilote, avant que le jalon 2 ne rende le
pilote éligible à une vraie production.

Par ailleurs, `deploy.sh` refuse tout déploiement si l'arbre du VPS n'est
pas propre — ce qui est justement le cas pendant le développement du pilote
(voir la review `docs/reviews/2026-07-31-authentification-microsoft-entra-pilot.md`).
Pour permettre de tester ces changements sur le VPS avant de les committer
et de les pousser, une option `--skip-git` s'ajoute au même script :
utilisée volontairement, elle contourne la vérification d'arbre propre et le
`git fetch`/`merge`, sans jamais devenir le comportement par défaut.

Le précédent spec de déploiement
(`docs/specs/2026-07-30-deploiement-semi-automatise.md`) excluait
explicitement la « gestion de plusieurs environnements (staging, etc.) — un
seul VPS de prod ». Ce spec revient sur cette exclusion, de façon minimale :
un seul VPS, mais dont l'environnement runtime déclaré (`NODE_ENV`) devient
choisissable au déploiement, avec `production` comme valeur par défaut
non-régressive.

## Objectif

Permettre de déployer une version du code sur le VPS existant avec
`NODE_ENV=staging` au lieu de `production`, de façon explicite et
persistante, sans risquer qu'un redéploiement ultérieur sans argument ne
revienne silencieusement à `production` et ne recasse le backend.

## Périmètre

Inclus :

* Une option `--env production|staging` à `deploy/deploy.sh` (et relayée par
  `deploy/deploy-prod.sh`) pour déclarer l'environnement runtime cible.
* Persistance du choix dans un fichier hors dépôt Git sur le VPS
  (`/etc/gnu-gesta/deploy-env.conf`), lu par le service systemd via
  `EnvironmentFile=`.
* `production` reste la valeur par défaut si le fichier n'existe pas encore
  ou si `--env` n'est pas fourni lors du tout premier déploiement.
* Un appel à `deploy.sh` sans `--env` ne modifie jamais l'environnement en
  place : il redéploie le code avec l'environnement déjà persisté.
* Une option `--skip-git` pour déployer l'état actuel du repo tel quel (sans
  `git fetch`/`merge`, sans exiger un arbre propre), afin de pouvoir tester
  un changement sur le VPS avant de le committer/pousser. Ce n'est jamais le
  comportement par défaut : sans cette option, un arbre non propre continue
  de faire échouer `deploy.sh` avant toute action.
* Une option `-h`/`--help` qui affiche l'usage de toutes les options.
* Renforcement de la vérification finale du déploiement : en plus de la
  page d'accueil (`/`), vérifier `/api/health` pour détecter un backend qui
  ne démarre pas (cas justement provoqué par un `NODE_ENV=production` combiné
  au garde-fou du pilote).
* Mise à jour de `docs/deployment.md`.

Exclus :

* Plusieurs VPS ou plusieurs domaines par environnement — un seul VPS,
  seule sa variable `NODE_ENV` runtime devient configurable.
* Toute automatisation du choix d'environnement (pas de détection
  automatique de branche, pas de CI).
* Modification du garde-fou `assertPilotEnvironmentAllowed()` lui-même : il
  continue de ne bloquer que la valeur exacte `production`, ce qui est déjà
  suffisant pour ce changement.
* Gestion des secrets applicatifs (`ENTRA_CLIENT_SECRET`, etc.) via
  systemd — prévue séparément au jalon 7 du plan d'authentification
  (`/etc/gnu-gesta/backend.env`, fichier distinct de
  `/etc/gnu-gesta/deploy-env.conf`).

## Comportement attendu

* `./deploy/deploy-prod.sh` (ou `./deploy/deploy.sh` en SSH) sans option :
  déploie le code déjà poussé sur `origin/main`, ne touche pas à
  l'environnement runtime déjà en place.
* `./deploy/deploy-prod.sh --env staging` : déploie le code et bascule
  durablement le service backend sur `NODE_ENV=staging` (écrit
  `/etc/gnu-gesta/deploy-env.conf`), jusqu'au prochain changement explicite.
* `./deploy/deploy-prod.sh --env production` : bascule explicitement (ou
  reconfirme) `NODE_ENV=production`.
* `./deploy/deploy-prod.sh --skip-git --env staging` : déploie l'état actuel
  du repo tel quel (modifications non commitées comprises), pour tester
  avant de committer/pousser. Sans `--skip-git`, un arbre non propre fait
  échouer le script avant toute action.
* `./deploy/deploy-prod.sh -h` affiche l'aide de toutes les options.
* Une valeur différente de `production`/`staging` pour `--env`, ou une
  option inconnue, fait échouer le script immédiatement, avec un message
  clair, avant toute action.
* Si `/etc/gnu-gesta/deploy-env.conf` n'existe pas du tout (VPS neuf, ou
  fichier supprimé manuellement), le service démarre quand même avec
  `NODE_ENV=production` (valeur câblée dans le service systemd,
  non régressive).
* En fin de déploiement, le script vérifie `https://gng.seront.be/` **et**
  `https://gng.seront.be/api/health` ; un échec de l'un ou l'autre fait
  échouer le déploiement avec un message explicite.

## Règles métier

Aucune règle métier applicative. Règles d'infrastructure :

* `production` est toujours la valeur par défaut en l'absence de
  configuration explicite.
* Le changement d'environnement est toujours une action volontaire et
  explicite (argument de script), jamais automatique.
* Le fichier d'environnement persistant ne contient aucun secret et peut
  rester lisible par l'utilisateur `ubuntu`.

## Critères d'acceptation

* [ ] `deploy.sh --env staging` bascule le backend en environnement
      non-production et le pilote authentification démarre sans erreur
      `assertPilotEnvironmentAllowed`.
* [ ] `deploy.sh` (sans option) après un `deploy.sh --env staging` précédent
      ne revient pas à `production`.
* [ ] `deploy.sh --env production` restaure explicitement le mode
      production.
* [ ] `deploy.sh --env valeur-invalide` échoue immédiatement, avant toute
      modification.
* [ ] `deploy.sh` avec un arbre non propre échoue avant toute action, sauf
      si `--skip-git` est explicitement passé.
* [ ] `deploy.sh -h` affiche l'usage de toutes les options.
* [ ] La vérification finale du déploiement échoue clairement si
      `/api/health` ne répond pas, même si `/` répond (page statique servie
      par Nginx indépendamment de l'état du backend).
* [ ] `docs/deployment.md` documente le nouveau comportement et le fichier
      `/etc/gnu-gesta/deploy-env.conf`.

## Impacts techniques connus

Features impactées :

* Aucune feature métier. Infrastructure de déploiement uniquement ; touche
  indirectement le pilote authentification (jalon 1) en le rendant
  déployable sur le VPS existant.

Données impactées :

* Aucune donnée applicative. Un nouveau fichier hors dépôt sur le VPS
  (`/etc/gnu-gesta/deploy-env.conf`).

Routes, API ou écrans impactés :

* Aucun changement fonctionnel. La vérification de déploiement interroge en
  plus `GET /api/health`, déjà existant.

Permissions ou rôles impactés :

* Aucun.

Configuration et secrets :

* Nouveau fichier `/etc/gnu-gesta/deploy-env.conf` (non secret, une seule
  ligne `NODE_ENV=...`), créé/mis à jour par `deploy.sh` via `sudo`.
* `deploy/systemd/gnu-gesta-backend.service` : la valeur par défaut
  `Environment=NODE_ENV=production` reste câblée dans le fichier versionné ;
  `EnvironmentFile=-/etc/gnu-gesta/deploy-env.conf` (le préfixe `-` rend le
  fichier optionnel) est ajouté après, pour que systemd applique la
  dernière valeur déclarée en cas de présence du fichier.

Tests à prévoir :

* Déploiement manuel avec `--env staging`, vérification que
  `/api/auth/login` répond (au lieu de faire planter le backend), puis
  retour explicite à `production`.
* Vérification qu'une valeur invalide ou une option inconnue est rejetée
  avant toute action sur le VPS.
* Vérification que `--skip-git` déploie bien un arbre non commité, et que
  son absence continue de bloquer un arbre non propre.

## Documents liés

* PRD : -
* Architecture : `docs/architecture.md`
* Déploiement : `docs/deployment.md`
* Spec précédente (déploiement semi-automatisé) :
  `docs/specs/2026-07-30-deploiement-semi-automatise.md`
* Spec liée (pilote authentification) :
  `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Plan lié : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review : `docs/reviews/2026-07-31-deploy-node-env-configurable.md` (à
  créer après déploiement réel et validation humaine)

## Incertitudes

* Le déploiement réel sur le VPS (exécution de `deploy-prod.sh`) n'a pas été
  effectué par l'agent : il modifie un service partagé et doit rester une
  action volontaire de l'utilisateur. Ce spec ne couvre que les fichiers du
  dépôt ; la validation du comportement réel sur le VPS reste à faire par
  l'utilisateur.
