#!/usr/bin/env bash
# A lancer depuis le poste local pour declencher un deploiement a distance
# sur le VPS. Declenchement toujours manuel.
set -euo pipefail

VPS_HOST="ubuntu@51.255.199.162"
REMOTE_SCRIPT="/home/ubuntu/gnu-gesta/deploy/deploy.sh"

ssh -t "$VPS_HOST" "$REMOTE_SCRIPT"
