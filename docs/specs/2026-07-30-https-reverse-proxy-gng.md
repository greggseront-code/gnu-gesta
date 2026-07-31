# Publication HTTPS via Nginx + Let's Encrypt sur gng.seront.be

## Contexte

Le site GNU Gesta tourne actuellement sur le VPS (51.255.199.162) en exposant
directement les serveurs de dev (Vite sur 5173, backend Express/tsx sur 3000)
via HTTP. Un sous-domaine `gng.seront.be` a été créé chez OVH pointant vers
cette IP. On veut publier le site en HTTPS de façon adaptée à un usage réel,
plutôt que de continuer à exposer les serveurs de développement.

## Objectif

Servir GNU Gesta sur `https://gng.seront.be` via Nginx en reverse proxy, avec
un certificat Let's Encrypt auto-renouvelé, un frontend buildé statiquement et
un backend géré par systemd.

## Périmètre

Inclus :

* Build de production du frontend (`vite build`) servi en statique par Nginx.
* Service systemd pour le backend Express (build TypeScript, pas de dev
  watcher).
* Configuration Nginx : `server_name gng.seront.be`, proxy `/api` vers le
  backend, redirection HTTP -> HTTPS.
* Certificat Let's Encrypt via certbot (plugin nginx), renouvellement auto.

Exclus :

* Authentification/HTTPS pour d'autres sous-domaines futurs.
* Changement de la stack applicative (pas de PostgreSQL, pas de conteneurs).
* Durcissement pare-feu (ufw) — non demandé, `ufw` reste inactif comme
  actuellement.

## Comportement attendu

* `http://gng.seront.be` redirige vers `https://gng.seront.be`.
* `https://gng.seront.be` sert le frontend buildé.
* `https://gng.seront.be/api/*` est proxifié vers le backend Express local
  (port 3000).
* Le certificat se renouvelle automatiquement sans action manuelle.

## Règles métier

Aucune règle métier spécifique.

## Critères d'acceptation

* [ ] `curl -I https://gng.seront.be` répond 200 avec un certificat valide.
* [ ] `curl -I http://gng.seront.be` redirige (301/308) vers HTTPS.
* [ ] Le backend est démarré et redémarré automatiquement via systemd
      (`systemctl status gnu-gesta-backend`).
* [ ] `certbot renew --dry-run` réussit.

## Impacts techniques connus

Features impactées :

* Aucune feature métier backend/frontend modifiée.
* Infrastructure uniquement : Nginx, systemd, certbot.

Données impactées :

* Aucune.

Routes, API ou écrans impactés :

* Aucun changement fonctionnel ; seul le mode de service change (statique +
  proxy au lieu de serveurs de dev exposés).

Permissions ou rôles impactés :

* Aucun.

Tests à prévoir :

* Vérification manuelle HTTP -> HTTPS, chargement de l'app, appels `/api`.

## Documents liés

* PRD : -
* Architecture : `docs/architecture.md`
* README de feature : -
* Review : `docs/reviews/2026-07-30-https-reverse-proxy-gng.md` (à créer en
  fin de tâche)

## Incertitudes

* Process de déploiement futur (comment le build sera régénéré après chaque
  changement de code) — hors périmètre de cette tâche, à traiter séparément.
