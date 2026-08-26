# Review — Déploiement semi-automatisé VPS

Date : 2026-07-30

## Documents liés

* Spec : `docs/history/phases/2026-07-30-deploiement-semi-automatise-spec.md`
* README de feature : -
* Architecture : `docs/current/architecture.md`

## Objectif

Permettre un déploiement déclenché manuellement (jamais automatique) mais
sans étapes manuelles répétitives, avec la config Nginx et le service
systemd versionnés dans le repo, clairement séparés du code applicatif.

## Travail réalisé

* Création du dossier `deploy/`, séparé de `frontend/` et `backend/` :
  * `deploy/nginx/gng.seront.be.conf` : copie exacte de la config Nginx
    active sur le VPS (y compris les directives ajoutées par Certbot :
    `listen 443 ssl`, chemins du certificat, redirection HTTP → HTTPS).
  * `deploy/systemd/gnu-gesta-backend.service` : copie exacte du service
    systemd déjà en place.
  * `deploy/deploy.sh` : script exécuté sur le VPS qui pull (`ff-only`),
    installe (`npm ci` backend + frontend), build le frontend, redéploie la
    config Nginx et le service systemd, redémarre le backend, et vérifie
    que le site répond en HTTPS avant d'annoncer un succès.
  * `deploy/deploy-prod.sh` : script à lancer depuis le poste local, qui
    déclenche `deploy.sh` à distance via `ssh`.
* Mise à jour de `docs/operations/deployment.md` : sections Backend/Nginx pointent
  désormais vers les fichiers versionnés comme source de vérité, et la
  section "Redéployer après un changement de code" est remplacée par une
  section "Déploiement" décrivant le nouveau workflow.

## Écarts par rapport à la spec ou au plan

Aucun écart identifié.

## Fichiers impactés

* `deploy/deploy.sh` (nouveau)
* `deploy/deploy-prod.sh` (nouveau)
* `deploy/nginx/gng.seront.be.conf` (nouveau)
* `deploy/systemd/gnu-gesta-backend.service` (nouveau)
* `docs/operations/deployment.md` (mis à jour)
* `docs/history/phases/2026-07-30-deploiement-semi-automatise-spec.md` (nouveau)

## Décisions prises

* `npm ci` est relancé systématiquement à chaque déploiement (backend et
  frontend), sans vérification conditionnelle sur le hash du lockfile —
  plus simple à maintenir, documenté comme limite connue plutôt
  qu'optimisé prématurément.
* Le script échoue avant toute action si le repo VPS a des modifications
  non commitées ou n'est pas sur `main`, pour ne jamais déployer un état
  incertain ou mélanger du code non versionné avec un déploiement.
* Un verrou `flock` protège contre deux déploiements concurrents.
* Pas de rollback automatique : en cas d'échec, arrêt net avec message
  clair ; la correction/le retour en arrière restent manuels.
* La procédure d'ajout d'un nouveau sous-domaine n'a pas été automatisée
  dans `deploy.sh` (hors périmètre de cette tâche) ; elle reste documentée
  comme étapes manuelles dans `docs/operations/deployment.md`.

## Tests et vérifications

Tests automatisés exécutés :

* Aucun (scripts shell d'infrastructure, pas de suite de tests dédiée).

Vérifications manuelles effectuées :

* `bash -n` sur `deploy.sh` et `deploy-prod.sh` : pas d'erreur de syntaxe.
* Diff entre `deploy/nginx/gng.seront.be.conf` et la config live du VPS :
  identique au contenu près (différences uniquement de mise en forme).
* Application réelle de `deploy/nginx/gng.seront.be.conf` sur le VPS
  (`cp` + `nginx -t` + `reload`) : succès, `curl https://gng.seront.be/`
  répond toujours 200 après coup.
* Comparaison de `deploy/systemd/gnu-gesta-backend.service` avec le fichier
  live : identique.

Non testé ou à vérifier :

* Exécution complète de bout en bout de `deploy.sh` (le garde-fou
  "aucune modification non commitée" bloque tant que ce travail lui-même
  n'est pas commité — à valider juste après le commit de cette tâche).
* Exécution de `deploy-prod.sh` depuis un poste local réel (testé
  uniquement en lecture de code, pas en conditions réelles depuis une autre
  machine).
* Comportement du verrou `flock` en cas de déploiement concurrent réel.

## Risques et limites

* Tant que `deploy.sh` n'a pas tourné une première fois avec succès de bout
  en bout, il reste un risque que la logique d'orchestration (ordre des
  étapes, gestion d'erreur) contienne un problème non détecté par la
  relecture seule.
* `deploy-prod.sh` suppose un accès SSH déjà configuré vers
  `ubuntu@51.255.199.162` depuis le poste local (clé SSH en place) ; ce
  prérequis n'est pas vérifié par le script lui-même.

## Travail restant

* Lancer `deploy.sh` une première fois en conditions réelles après commit
  pour valider le chemin complet (voir "Non testé").
* Valider `deploy-prod.sh` depuis le poste local une fois configuré.
* Éventuellement automatiser l'ajout de nouveaux sous-domaines dans
  `deploy.sh` si le besoin se confirme.

## Incertitudes

* Faut-il, à terme, rendre `npm ci` conditionnel (hash du lockfile) pour
  accélérer les déploiements fréquents ?
