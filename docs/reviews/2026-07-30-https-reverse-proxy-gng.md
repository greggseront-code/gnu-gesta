# Review — Publication HTTPS via Nginx + Let's Encrypt sur gng.seront.be

Date : 2026-07-30

## Documents liés

* Spec : `docs/specs/2026-07-30-https-reverse-proxy-gng.md`
* README de feature : -
* Architecture : `docs/architecture.md`

## Objectif

Servir GNU Gesta sur `https://gng.seront.be` via Nginx, avec un frontend
buildé statiquement, un backend géré par systemd, et un certificat Let's
Encrypt auto-renouvelé.

## Travail réalisé

* Correction d'un bug bloquant le build backend : import manquant de
  `CompanyWithContacts` dans `backend/src/features/companies/companies.queries.ts`.
* Build de production du frontend (`frontend/dist`).
* Service systemd `gnu-gesta-backend` (`/etc/systemd/system/gnu-gesta-backend.service`) :
  lance le backend via `tsx src/server.ts` (pas de build `dist/` utilisé en
  exécution, voir écart ci-dessous), `Restart=on-failure`, activé au boot.
* Installation de `nginx`, `certbot`, `python3-certbot-nginx`.
* Config Nginx `/etc/nginx/sites-available/gng.seront.be` : sert
  `frontend/dist` en statique, proxy `/api/` vers `http://127.0.0.1:3000/api/`,
  fallback SPA (`try_files $uri /index.html`).
* Permission `o+x` ajoutée sur `/home/ubuntu` (traversée uniquement, pas de
  lecture/listing) pour permettre à `www-data` d'atteindre `frontend/dist`.
* Certificat Let's Encrypt obtenu et déployé via `certbot --nginx`, avec
  redirection HTTP -> HTTPS automatique. Renouvellement géré par
  `certbot.timer` (déjà actif après install du paquet).

## Écarts par rapport à la spec ou au plan

* La spec prévoyait un backend "buildé" (`tsc`) lancé avec `node dist/server.js`.
  En pratique, `tsc` avec `moduleResolution: "Bundler"` émet des imports
  relatifs sans extension, incompatibles avec la résolution ESM stricte de
  Node en exécution directe (`ERR_MODULE_NOT_FOUND`). Le service systemd
  exécute donc `tsx src/server.ts` (comme en dev, sans `--watch`), ce qui
  évite ce problème sans toucher aux conventions d'import du code source.
  `npm run build` reste disponible et fonctionnel pour la vérification de
  types, mais son résultat (`dist/`) n'est pas utilisé en production pour le
  backend.

## Fichiers impactés

* `backend/src/features/companies/companies.queries.ts` (fix import)
* `docs/specs/2026-07-30-https-reverse-proxy-gng.md` (nouveau)
* `docs/reviews/2026-07-30-https-reverse-proxy-gng.md` (nouveau)
* Hors dépôt (configuration serveur sur le VPS, non versionnée) :
  * `/etc/systemd/system/gnu-gesta-backend.service`
  * `/etc/nginx/sites-available/gng.seront.be` (+ symlink `sites-enabled`)
  * `/etc/letsencrypt/live/gng.seront.be/*`
  * Permission `/home/ubuntu` (`chmod o+x`)

## Décisions prises

* Backend exécuté via `tsx` plutôt que via le build `tsc` compilé, pour
  rester cohérent avec le comportement de dev existant sans réécrire les
  imports du projet en `moduleResolution: NodeNext`.
* Pas de changement de pare-feu (`ufw` reste inactif), conformément au
  périmètre exclu de la spec.
* Frontend servi directement depuis `frontend/dist` (pas de copie vers
  `/var/www`) ; permission de traversée ajoutée sur `/home/ubuntu` plutôt que
  de dupliquer les artefacts de build. Le process de re-déploiement après un
  futur changement de code reste à définir (cf. Incertitudes de la spec).

## Tests et vérifications

Tests automatisés exécutés :

* Aucun (changement d'infrastructure, pas de code métier testé unitairement).

Vérifications manuelles effectuées :

* `dig gng.seront.be` → résout vers `51.255.199.162`.
* `systemctl status gnu-gesta-backend` → actif, écoute sur le port 3000.
* `curl -H "Host: gng.seront.be" http://localhost/` → 200, sert bien
  `frontend/dist/index.html`.
* `curl -H "Host: gng.seront.be" http://localhost/api/students` → 200, données
  JSON valides.
* `curl -I http://gng.seront.be/` → 301 vers `https://gng.seront.be/`.
* `curl https://gng.seront.be/` → 200.
* `curl https://gng.seront.be/api/students` → 200.
* `certbot renew --dry-run` → succès simulé.

Non testé ou à vérifier :

* Comportement après un redémarrage complet du VPS (le service systemd et
  nginx sont activés au boot, mais un reboot réel n'a pas été effectué pour
  le confirmer).
* Process de mise à jour du build frontend/backend lors d'un futur
  déploiement (non défini, voir Incertitudes).

## Risques et limites

* Le backend tourne via `tsx` (transpilation à la volée), pas via du JS
  précompilé : léger surcoût de démarrage, sans impact notable pour ce
  volume d'usage.
* Aucun process de déploiement automatisé : toute mise à jour du code
  nécessite de relancer manuellement `npm run build` (frontend) et
  `systemctl restart gnu-gesta-backend`.
* Un seul sous-domaine HTTPS configuré ; les autres sous-domaines mentionnés
  par l'utilisateur restent à faire suivre le même schéma.

## Travail restant

* Définir un process de déploiement (build + restart) pour les futures mises
  à jour de code.
* Répliquer la même configuration Nginx + certbot pour les autres
  sous-domaines prévus.

## Incertitudes

* Faut-il migrer le backend vers un vrai build JS exécutable directement par
  Node (`moduleResolution: NodeNext` + extensions explicites), ou rester sur
  `tsx` en production de façon durable ?
