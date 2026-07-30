#!/usr/bin/env bash
# Deploiement sur le VPS. A executer sur le VPS lui-meme (en SSH), ou via
# deploy-prod.sh depuis le poste local. Jamais declenche automatiquement.
set -euo pipefail

REPO_DIR="/home/ubuntu/gnu-gesta"
LOCK_FILE="/tmp/gnu-gesta-deploy.lock"
SITE_URL="https://gng.seront.be"

exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Un deploiement est deja en cours, on arrete."; exit 1; }

cd "$REPO_DIR"

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "main" ]; then
  echo "Erreur: la branche courante sur le VPS est '$current_branch', pas 'main'. Deploiement annule."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Erreur: le repo sur le VPS a des modifications non commitees. Deploiement annule."
  echo "Verifier manuellement avec 'git status' avant de relancer."
  exit 1
fi

echo "==> git pull (fast-forward uniquement)"
git fetch origin
git merge --ff-only origin/main

echo "==> install + build backend"
(cd backend && npm ci)

echo "==> install + build frontend"
(cd frontend && npm ci && npm run build)

echo "==> redeploiement config Nginx"
sudo cp "$REPO_DIR/deploy/nginx/gng.seront.be.conf" /etc/nginx/sites-available/gng.seront.be
sudo nginx -t
sudo systemctl reload nginx

echo "==> redeploiement service systemd backend"
sudo cp "$REPO_DIR/deploy/systemd/gnu-gesta-backend.service" /etc/systemd/system/gnu-gesta-backend.service
sudo systemctl daemon-reload
sudo systemctl restart gnu-gesta-backend

echo "==> verification"
sleep 2
if curl -fsS -o /dev/null "$SITE_URL/"; then
  echo "OK: $SITE_URL repond correctement."
else
  echo "ATTENTION: $SITE_URL ne repond pas comme attendu apres deploiement."
  exit 1
fi

echo "Deploiement termine avec succes ($(git rev-parse --short HEAD))."
