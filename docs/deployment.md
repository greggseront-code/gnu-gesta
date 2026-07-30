# Déploiement

Ce document décrit comment GNU Gesta est hébergé et servi en production, et
comment reproduire ou étendre cette configuration (nouveau sous-domaine,
redéploiement après un changement de code).

## Vue d'ensemble

* Hébergement : un VPS OVH (IP publique `51.255.199.162`).
* Nom de domaine : `seront.be`, géré chez OVH (registrar = hébergeur du VPS).
* Le site est servi sur `https://gng.seront.be`.
* Le repo applicatif vit directement sur le VPS, dans
  `/home/ubuntu/gnu-gesta`.

```text
Client
  │  HTTPS (443)
  ▼
Nginx (reverse proxy + TLS)
  ├── fichiers statiques  ──►  frontend/dist
  └── /api/*  ──proxy──►  backend Express (127.0.0.1:3000, service systemd)
```

## DNS (OVH)

La zone DNS de `seront.be` est gérée dans le Manager OVH (Web Cloud > Noms de
domaine > seront.be > Zone DNS).

* `gng.seront.be` : enregistrement `A` vers `51.255.199.162`.
* Le domaine racine `seront.be` et `www.seront.be` pointent vers un autre
  hébergement OVH et ne sont pas concernés par ce déploiement.
* Des enregistrements `MX` existent sur `seront.be` pour les emails du
  domaine : ne jamais les modifier en touchant à la zone DNS.

Pour ajouter un nouveau sous-domaine pointant vers le même VPS, créer un
nouvel enregistrement `A` (`<sous-domaine>.seront.be` → `51.255.199.162`),
indépendant des autres entrées.

## Backend : service systemd

Le backend est géré par systemd plutôt que lancé manuellement, pour qu'il
redémarre automatiquement en cas de crash ou de reboot du VPS.

Fichier : `/etc/systemd/system/gnu-gesta-backend.service` (non versionné dans
le repo, propre au VPS).

```ini
[Unit]
Description=GNU Gesta backend (Express)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/gnu-gesta/backend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/home/ubuntu/gnu-gesta/backend/node_modules/.bin/tsx src/server.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Points notables :

* Le backend tourne via `tsx src/server.ts` (comme `npm run dev`, sans
  `--watch`), pas via le JS compilé par `npm run build`. `tsc` est configuré
  avec `moduleResolution: "Bundler"`, qui émet des imports relatifs sans
  extension ; Node en résolution ESM stricte ne sait pas les résoudre
  directement (`ERR_MODULE_NOT_FOUND`). `tsx` transpile à la volée et n'a pas
  ce problème. `npm run build` reste utile pour la vérification de types,
  mais son résultat n'est pas exécuté en production.
* `Restart=on-failure` : redémarrage auto si le process s'arrête en erreur.

Commandes utiles :

```bash
sudo systemctl status gnu-gesta-backend    # état du service
sudo systemctl restart gnu-gesta-backend   # redémarrer après un changement de code
sudo journalctl -u gnu-gesta-backend -f    # logs en direct
```

## Frontend : build statique

Le frontend est buildé en statique (`npm run build` dans `frontend/`, qui
lance `tsc` puis `vite build`) et servi directement par Nginx depuis
`frontend/dist`, sans serveur Node dédié.

`frontend/dist` reste dans `/home/ubuntu/gnu-gesta/frontend/dist` (pas copié
ailleurs). Pour que l'utilisateur `www-data` (celui sous lequel tourne
Nginx) puisse traverser `/home/ubuntu`, un droit d'exécution a été ajouté sur
ce dossier :

```bash
chmod o+x /home/ubuntu
```

Ce `+x` seul permet uniquement la traversée du dossier (accéder à un chemin
connu), pas le listing (`ls`) ni la lecture d'autres fichiers du home — les
permissions existantes sur les autres fichiers/dossiers du repo restent
inchangées et continuent de protéger le reste.

## Nginx

Fichier : `/etc/nginx/sites-available/gng.seront.be`, activé via un lien
symbolique dans `/etc/nginx/sites-enabled/` (convention Debian/Ubuntu : Nginx
ne charge que ce qui est dans `sites-enabled/`).

Rôle de la config :

* `server_name gng.seront.be` : ce bloc ne répond qu'à ce nom de domaine.
* `root frontend/dist` + `try_files $uri /index.html` : sert les fichiers
  statiques du build, avec fallback vers `index.html` pour les routes
  React (SPA) au rechargement de page.
* `location /api/` : proxy vers `http://127.0.0.1:3000/api/`, le backend
  Express local.

Certbot a ensuite modifié ce même fichier pour ajouter `listen 443 ssl`, les
chemins vers le certificat, et la redirection HTTP → HTTPS.

Le site par défaut de Nginx (`/etc/nginx/sites-enabled/default`) a été
supprimé pour éviter toute ambiguïté sur le port 80.

Commandes utiles :

```bash
sudo nginx -t              # valider la syntaxe avant de recharger
sudo systemctl reload nginx
```

## HTTPS : Let's Encrypt / certbot

Le certificat est géré par `certbot` (paquets `certbot` +
`python3-certbot-nginx`), qui édite directement la config Nginx du site.

* Certificat actif : `/etc/letsencrypt/live/gng.seront.be/` (liens vers
  `/etc/letsencrypt/archive/gng.seront.be/`, qui versionne les renouvellements
  successifs).
* Config de renouvellement : `/etc/letsencrypt/renewal/gng.seront.be.conf`
  (domaines couverts, plugin `nginx` à utiliser).
* Renouvellement automatique : le paquet `certbot` installe et active un
  timer systemd (`certbot.timer`) qui exécute `certbot renew` deux fois par
  jour. Les certificats Let's Encrypt expirent après 90 jours ; le
  renouvellement se déclenche automatiquement bien avant l'échéance.

Vérifier que le renouvellement fonctionnerait sans réellement le faire :

```bash
sudo certbot renew --dry-run
```

## Ajouter un nouveau sous-domaine

1. Créer l'enregistrement DNS `A` dans la zone OVH (`<sous-domaine>.seront.be`
   → `51.255.199.162`), attendre la propagation.
2. Créer un nouveau fichier `/etc/nginx/sites-available/<sous-domaine>.seront.be`
   sur le modèle de `gng.seront.be` (adapter `server_name`, `root`, et le
   port du backend concerné si différent).
3. L'activer : `ln -s /etc/nginx/sites-available/<...> /etc/nginx/sites-enabled/`,
   puis `nginx -t && systemctl reload nginx`.
4. Générer le certificat : `sudo certbot --nginx -d <sous-domaine>.seront.be --redirect`.

## Redéployer après un changement de code

Il n'y a pas encore de pipeline de déploiement automatisé. Pour publier un
changement :

```bash
cd /home/ubuntu/gnu-gesta/frontend && npm run build
cd /home/ubuntu/gnu-gesta/backend && sudo systemctl restart gnu-gesta-backend
```

Le frontend n'a besoin que d'un rebuild (Nginx sert directement `dist/`) ; le
backend n'a besoin que d'un redémarrage du service (pas de build requis
puisqu'il tourne via `tsx`).

## Limites connues

* Pas de process de déploiement automatisé (build + restart manuels).
* Le comportement au reboot complet du VPS n'a pas été testé en conditions
  réelles (les services sont activés au boot via `systemctl enable`, mais
  jamais vérifiés après un reboot effectif).
* Un seul sous-domaine est en HTTPS pour l'instant (`gng.seront.be`).

## Documents liés

* Spec : `docs/specs/2026-07-30-https-reverse-proxy-gng.md`
* Review : `docs/reviews/2026-07-30-https-reverse-proxy-gng.md`
* Architecture applicative : `docs/architecture.md`
