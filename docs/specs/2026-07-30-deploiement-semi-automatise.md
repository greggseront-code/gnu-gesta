# Déploiement semi-automatisé VPS

## Contexte

Le développement se fait désormais localement (poste de dev), avec des push
git réguliers. Le VPS ne doit plus être édité directement. Quand une version
est prête, le déploiement en production doit rester déclenché manuellement,
mais sans étapes manuelles répétitives une fois déclenché. La config Nginx et
le service systemd (actuellement seulement dans `/etc` sur le VPS, non
versionnés — voir `docs/deployment.md`) doivent devenir la source de vérité
versionnée, clairement séparée du code applicatif.

## Objectif

Un script sur le VPS qui effectue tout le déploiement en une commande
(pull, install, build, redéploiement config, restart, vérification), et un
script local qui déclenche ce même déploiement à distance via SSH — sans
jamais se déclencher automatiquement.

## Périmètre

Inclus :

* `deploy/nginx/gng.seront.be.conf` et `deploy/systemd/gnu-gesta-backend.service` :
  copies versionnées de la config actuellement en place sur le VPS.
* `deploy/deploy.sh` : script exécuté sur le VPS (déclenché manuellement,
  en SSH), qui pull, installe, build, redéploie la config, restart le
  backend, et vérifie que le site répond.
* `deploy/deploy-prod.sh` : script à lancer depuis la machine locale, qui
  déclenche `deploy.sh` sur le VPS via SSH.
* Mise à jour de `docs/deployment.md` pour documenter le nouveau workflow.

Exclus :

* Tout déclenchement automatique (webhook, CI/CD sur push, cron).
* Rollback automatique en cas d'échec (juste un arrêt net avec message
  clair).
* Gestion de plusieurs environnements (staging, etc.) — un seul VPS de prod.

## Comportement attendu

* Depuis le poste local : `./deploy/deploy-prod.sh` déclenche un déploiement
  complet à distance et affiche le résultat.
* Depuis une session SSH sur le VPS : `./deploy/deploy.sh` fait la même
  chose, exécuté localement sur le serveur.
* Le script échoue immédiatement (et n'applique rien de partiel côté service)
  si : le repo VPS a des modifications non commitées, le `git pull` n'est pas
  fast-forward, le build frontend échoue, ou la config Nginx est invalide
  (`nginx -t`).
* En fin de script, une vérification HTTP confirme que le site répond bien
  avant d'annoncer un succès.
* Un verrou (`flock`) empêche deux déploiements concurrents.

## Règles métier

Aucune règle métier spécifique.

## Critères d'acceptation

* [ ] `deploy/deploy.sh` exécuté sur le VPS met à jour le code, reconstruit
      le frontend, redémarre le backend, et le site répond correctement en
      HTTPS après coup.
* [ ] `deploy/deploy-prod.sh` exécuté depuis le poste local déclenche le
      même résultat à distance.
* [ ] Modifier `deploy/nginx/gng.seront.be.conf` puis redéployer applique
      bien le changement à la config Nginx active sur le VPS.
* [ ] Un `git status` non propre sur le VPS bloque le déploiement avec un
      message clair plutôt que d'écraser silencieusement quoi que ce soit.

## Impacts techniques connus

Features impactées :

* Aucune feature métier. Infrastructure et outillage de déploiement
  uniquement.

Données impactées :

* Aucune.

Routes, API ou écrans impactés :

* Aucun changement fonctionnel.

Permissions ou rôles impactés :

* Aucun.

Tests à prévoir :

* Exécution manuelle du déploiement de bout en bout, une fois depuis le VPS,
  une fois depuis le poste local.

## Documents liés

* PRD : -
* Architecture : `docs/architecture.md`
* README de feature : -
* Review : `docs/reviews/2026-07-30-deploiement-semi-automatise.md` (à créer
  en fin de tâche)

## Incertitudes

* `npm ci` est relancé systématiquement à chaque déploiement (frontend et
  backend), même sans changement de dépendances — plus simple, mais plus
  lent qu'une vérification conditionnelle sur le hash du lockfile. À
  optimiser plus tard si la durée du déploiement devient gênante.
