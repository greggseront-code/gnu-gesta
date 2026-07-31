#!/usr/bin/env bash
# Deploiement sur le VPS. A executer sur le VPS lui-meme (en SSH), ou via
# deploy-prod.sh depuis le poste local. Jamais declenche automatiquement.
#
# Usage: ./deploy.sh [--env production|staging] [--skip-git] [-h|--help]
# Voir print_usage() ci-dessous pour le detail de chaque option.
set -euo pipefail

REPO_DIR="/home/ubuntu/gnu-gesta"
LOCK_FILE="/tmp/gnu-gesta-deploy.lock"
SITE_URL="https://gng.seront.be"
ENV_FILE="/etc/gnu-gesta/deploy-env.conf"
ALLOWED_ENVS=(production staging)

print_usage() {
  cat <<'USAGE'
Usage: ./deploy.sh [--env production|staging] [--skip-git] [-h|--help]

  --env production|staging   Bascule et persiste l'environnement runtime
                              (NODE_ENV) du service backend dans
                              /etc/gnu-gesta/deploy-env.conf. Sans cette
                              option, l'environnement deja en place n'est
                              pas modifie (defaut : production si jamais
                              configure jusqu'ici).

  --skip-git                 Deploie l'etat actuel du repo TEL QUEL : pas
                              de "git fetch"/"merge", pas de verification
                              d'arbre propre. Reserve aux tests locaux
                              avant commit/push : le repo peut alors
                              contenir des modifications non commitees.

  -h, --help                  Affiche cette aide et quitte.

Sans argument : redeploie le code deja pousse sur origin/main (pull
fast-forward uniquement), sans changer l'environnement runtime en place.
USAGE
}

target_env=""
skip_git=0

while [ $# -gt 0 ]; do
  case "$1" in
    --env)
      target_env="${2:-}"
      shift 2
      ;;
    --env=*)
      target_env="${1#--env=}"
      shift
      ;;
    --skip-git)
      skip_git=1
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Erreur: argument inconnu '$1'."
      print_usage
      exit 1
      ;;
  esac
done

if [ -n "$target_env" ]; then
  known=0
  for e in "${ALLOWED_ENVS[@]}"; do
    [ "$e" = "$target_env" ] && known=1
  done
  if [ "$known" -ne 1 ]; then
    echo "Erreur: environnement '$target_env' inconnu. Valeurs acceptees : ${ALLOWED_ENVS[*]}."
    exit 1
  fi
fi

exec 200>"$LOCK_FILE"
flock -n 200 || { echo "Un deploiement est deja en cours, on arrete."; exit 1; }

cd "$REPO_DIR"

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "main" ]; then
  echo "Erreur: la branche courante sur le VPS est '$current_branch', pas 'main'. Deploiement annule."
  exit 1
fi

if [ "$skip_git" -eq 1 ]; then
  echo "==> --skip-git : deploiement de l'etat actuel du repo TEL QUEL (pas de pull)."
  echo "    ATTENTION: peut inclure des modifications non commitees :"
  git status --short || true
else
  if [ -n "$(git status --porcelain)" ]; then
    echo "Erreur: le repo sur le VPS a des modifications non commitees. Deploiement annule."
    echo "Verifier manuellement avec 'git status' avant de relancer, ou utiliser --skip-git pour tester l'etat actuel avant de committer/pousser."
    exit 1
  fi

  echo "==> git pull (fast-forward uniquement)"
  git fetch origin
  git merge --ff-only origin/main
fi

echo "==> install + build backend"
(cd backend && npm ci)

echo "==> install + build frontend"
(cd frontend && npm ci && npm run build)

echo "==> redeploiement config Nginx"
sudo cp "$REPO_DIR/deploy/nginx/gng.seront.be.conf" /etc/nginx/sites-available/gng.seront.be
sudo nginx -t
sudo systemctl reload nginx

if [ -n "$target_env" ]; then
  echo "==> mise a jour de l'environnement runtime persistant : $target_env"
  sudo mkdir -p "$(dirname "$ENV_FILE")"
  echo "NODE_ENV=$target_env" | sudo tee "$ENV_FILE" > /dev/null
  sudo chmod 644 "$ENV_FILE"
elif [ -f "$ENV_FILE" ]; then
  echo "==> environnement runtime inchange ($(cat "$ENV_FILE"))"
else
  echo "==> environnement runtime inchange (production par defaut, aucun override en place)"
fi

echo "==> redeploiement service systemd backend"
sudo cp "$REPO_DIR/deploy/systemd/gnu-gesta-backend.service" /etc/systemd/system/gnu-gesta-backend.service
sudo systemctl daemon-reload
sudo systemctl restart gnu-gesta-backend

echo "==> verification"
sleep 2
site_ok=0
health_ok=0
curl -fsS -o /dev/null "$SITE_URL/" && site_ok=1
curl -fsS -o /dev/null "$SITE_URL/api/health" && health_ok=1

if [ "$site_ok" -eq 1 ] && [ "$health_ok" -eq 1 ]; then
  echo "OK: $SITE_URL et $SITE_URL/api/health repondent correctement."
else
  echo "ATTENTION: deploiement possiblement casse."
  [ "$site_ok" -eq 1 ] || echo "  - $SITE_URL ne repond pas."
  [ "$health_ok" -eq 1 ] || echo "  - $SITE_URL/api/health ne repond pas (le backend a peut-etre plante au demarrage : voir 'journalctl -u gnu-gesta-backend -n 50')."
  exit 1
fi

current_commit="$(git rev-parse --short HEAD)"
env_state="$([ -f "$ENV_FILE" ] && cat "$ENV_FILE" || echo 'NODE_ENV=production (defaut)')"
if [ "$skip_git" -eq 1 ]; then
  echo "Deploiement termine avec succes (base sur $current_commit + modifications locales non commitees) — environnement runtime : $env_state."
else
  echo "Deploiement termine avec succes ($current_commit) — environnement runtime : $env_state."
fi
