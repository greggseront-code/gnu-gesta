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
* Le développement se fait en local ; le VPS ne doit plus être édité
  directement. Un déploiement se déclenche manuellement via les scripts du
  dossier `deploy/` (voir "Déploiement" plus bas).

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

Fichier versionné : `deploy/systemd/gnu-gesta-backend.service`. C'est la
source de vérité ; `deploy/deploy.sh` le recopie vers
`/etc/systemd/system/gnu-gesta-backend.service` à chaque déploiement.

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
EnvironmentFile=-/etc/gnu-gesta/deploy-env.conf
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
* `EnvironmentFile=-/etc/gnu-gesta/deploy-env.conf` : fichier optionnel (le
  préfixe `-` évite une erreur systemd s'il est absent) qui peut surcharger
  `NODE_ENV` défini juste au-dessus. Ce fichier n'est **pas** versionné dans
  Git : il est créé/modifié uniquement par `deploy.sh` (voir
  "Environnement runtime : production vs staging" plus bas). En son
  absence, `NODE_ENV=production` (câblé juste au-dessus) s'applique — c'est
  le comportement par défaut, non régressif.

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

Fichier versionné : `deploy/nginx/gng.seront.be.conf` — c'est la source de
vérité, incluant les directives ajoutées par Certbot (`listen 443 ssl`,
chemins du certificat, redirection HTTP → HTTPS). `deploy/deploy.sh` le
recopie vers `/etc/nginx/sites-available/gng.seront.be` à chaque
déploiement ; ce dernier est activé via un lien symbolique dans
`/etc/nginx/sites-enabled/` (convention Debian/Ubuntu : Nginx ne charge que
ce qui est dans `sites-enabled/`).

Rôle de la config :

* `server_name gng.seront.be` : ce bloc ne répond qu'à ce nom de domaine.
* `root frontend/dist` + `try_files $uri /index.html` : sert les fichiers
  statiques du build, avec fallback vers `index.html` pour les routes
  React (SPA) au rechargement de page.
* `location /api/` : proxy vers `http://127.0.0.1:3000/api/`, le backend
  Express local.

Si Certbot modifie un jour cette config à nouveau (ex: ajout d'un domaine),
il faut reporter le changement dans `deploy/nginx/gng.seront.be.conf` pour
que le fichier versionné reste la source de vérité — sinon le prochain
déploiement écrasera la modification.

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

## Déploiement

Le workflow cible : développement et debug en local, push régulier sur
`main`, puis déploiement manuel déclenché volontairement quand une version
est prête. Le déclenchement est toujours manuel ; l'exécution, elle, tient en
une seule commande.

Tous les fichiers de déploiement vivent dans `deploy/`, séparé du code
applicatif (`frontend/`, `backend/`) :

```text
deploy/
  deploy.sh                       # execute sur le VPS : fait le deploiement
  deploy-prod.sh                  # a lancer en local : declenche deploy.sh via SSH
  nginx/gng.seront.be.conf        # source de verite de la config Nginx
  systemd/gnu-gesta-backend.service  # source de verite du service backend
```

**Depuis le poste local** (option la plus pratique — pas besoin d'ouvrir une
session SSH à la main) :

```bash
./deploy/deploy-prod.sh
```

Ce script ne fait qu'un `ssh` vers le VPS et y lance `deploy.sh`, en relayant
les options éventuelles (voir "Environnement runtime" plus bas).

**Depuis une session SSH sur le VPS** (équivalent, en étant déjà connecté) :

```bash
cd /home/ubuntu/gnu-gesta && ./deploy/deploy.sh
```

`./deploy/deploy.sh -h` affiche l'aide complète des options. Les deux
options disponibles peuvent se combiner :

* `--env production|staging` : voir "Environnement runtime" plus bas.
* `--skip-git` : déploie l'état actuel du repo **tel quel** (pas de `git
  fetch`/`merge`, pas de vérification d'arbre propre). Réservé aux tests
  locaux avant de committer/pousser — le repo peut alors contenir des
  modifications non commitées. Sans cette option, `deploy.sh` refuse de
  continuer si l'arbre n'est pas propre.

`deploy.sh` effectue, dans l'ordre, et s'arrête net à la première erreur :

1. Si `--env` est fourni, vérifie qu'il vaut `production` ou `staging`
   (sinon : arrêt immédiat, avant toute action).
2. Vérifie que le repo VPS est sur `main`.
3. Sans `--skip-git` : vérifie qu'il n'y a aucune modification non commitée
   (sinon arrêt, pour ne jamais déployer un état incertain par accident),
   puis `git fetch` + `git merge --ff-only origin/main`.
   Avec `--skip-git` : saute ces deux vérifications et affiche l'état
   (`git status --short`) à titre informatif seulement.
4. `npm ci` dans `backend/` et `frontend/`.
5. `npm run build` dans `frontend/` (régénère `dist/`).
6. Recopie `deploy/nginx/gng.seront.be.conf` vers
   `/etc/nginx/sites-available/gng.seront.be`, valide (`nginx -t`) et
   recharge Nginx.
7. Si `--env` a été fourni, écrit `NODE_ENV=<valeur>` dans
   `/etc/gnu-gesta/deploy-env.conf` ; sinon laisse ce fichier tel quel.
8. Recopie `deploy/systemd/gnu-gesta-backend.service` vers
   `/etc/systemd/system/`, `daemon-reload`, puis redémarre le backend.
9. Vérifie que `https://gng.seront.be/` **et**
   `https://gng.seront.be/api/health` répondent en HTTP 200 ; sinon le
   script se termine en erreur pour signaler un déploiement potentiellement
   cassé (voir "Environnement runtime" plus bas pour pourquoi les deux
   vérifications sont nécessaires).

Un verrou (`flock` sur `/tmp/gnu-gesta-deploy.lock`) empêche deux
déploiements de tourner en même temps.

Aucun déclenchement automatique n'existe (pas de webhook, pas de CI/CD sur
push) : c'est un choix assumé, le déploiement doit toujours être une action
volontaire.

## Environnement runtime : production vs staging

Le pilote authentification Microsoft Entra
(`docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`) refuse de
démarrer avec `NODE_ENV=production` tant que le store de session SQLite du
jalon 2 n'existe pas (`assertPilotEnvironmentAllowed()` dans
`backend/src/features/auth/auth.config.ts`). Le VPS n'héberge pour l'instant
que des données fictives : `NODE_ENV` peut donc être temporairement basculé
sur `staging` pour tester le pilote en conditions réelles sur ce même VPS,
sans en créer un second.

```bash
./deploy/deploy-prod.sh --env staging      # bascule et deploie
./deploy/deploy-prod.sh                    # redeploie, sans toucher a l'environnement en place
./deploy/deploy-prod.sh --env production   # revient explicitement en production
```

Pour tester du code pas encore commité/poussé (avant de committer, le temps
de valider un changement) :

```bash
./deploy/deploy-prod.sh --skip-git --env staging
```

* Sans `--env`, `deploy.sh` ne modifie jamais l'environnement runtime en
  place : un redéploiement ordinaire après `staging` reste en `staging`.
* `--skip-git` déploie l'arbre tel quel, modifications non commitées
  comprises, sans jamais toucher à `git` (pas de fetch, pas de merge). Ce
  n'est pas la valeur par défaut : sans cette option, un arbre non propre
  fait toujours échouer `deploy.sh` avant toute action, pour qu'on ne
  puisse pas déployer un état incertain par inadvertance une fois revenu au
  workflow normal.
* La valeur choisie est persistée dans `/etc/gnu-gesta/deploy-env.conf`
  (hors dépôt Git, une seule ligne `NODE_ENV=...`), lu par le service
  systemd via `EnvironmentFile=-/etc/gnu-gesta/deploy-env.conf`.
* Si ce fichier n'existe pas (VPS neuf, ou supprimé manuellement),
  `NODE_ENV=production` s'applique par défaut (câblé dans
  `deploy/systemd/gnu-gesta-backend.service`) : le comportement par défaut
  reste non régressif.
* C'est pour détecter un backend qui ne démarre pas dans ce genre de
  scénario que la vérification finale de `deploy.sh` teste aussi
  `/api/health`, pas seulement `/` : `/` est une page statique servie par
  Nginx indépendamment de l'état du backend Express, elle répondrait donc
  même si le backend est en crash-loop.
* Voir `docs/specs/2026-07-31-deploy-node-env-configurable.md` pour le détail
  de cette évolution.

## Limites connues

* `npm ci` est relancé systématiquement à chaque déploiement (frontend et
  backend), même sans changement de dépendances — plus simple à maintenir,
  mais un peu plus lent qu'une vérification conditionnelle sur le lockfile.
* Pas de rollback automatique : en cas d'échec du déploiement (build cassé,
  vérification finale en échec), il faut corriger et redéployer, ou revenir
  manuellement à un commit précédent sur le VPS.
* Le comportement au reboot complet du VPS n'a pas été testé en conditions
  réelles (les services sont activés au boot via `systemctl enable`, mais
  jamais vérifiés après un reboot effectif).
* Un seul sous-domaine est en HTTPS pour l'instant (`gng.seront.be`) ; la
  procédure d'ajout d'un nouveau sous-domaine reste manuelle (voir
  "Ajouter un nouveau sous-domaine" plus haut) et n'est pas encore intégrée à
  `deploy.sh`.

## Documents liés

* Spec (mise en place HTTPS) : `docs/specs/2026-07-30-https-reverse-proxy-gng.md`
* Review (mise en place HTTPS) : `docs/reviews/2026-07-30-https-reverse-proxy-gng.md`
* Spec (déploiement semi-automatisé) : `docs/specs/2026-07-30-deploiement-semi-automatise.md`
* Review (déploiement semi-automatisé) : `docs/reviews/2026-07-30-deploiement-semi-automatise.md`
* Spec (environnement runtime configurable) : `docs/specs/2026-07-31-deploy-node-env-configurable.md`
* Spec (pilote authentification Microsoft Entra) : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Architecture applicative : `docs/architecture.md`
