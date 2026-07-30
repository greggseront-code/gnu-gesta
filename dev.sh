#!/usr/bin/env bash
# Lance backend et frontend dans deux sessions tmux ("backend", "frontend").
# Utile sur un serveur/VPS accédé par SSH : les process survivent à la
# fermeture de la session SSH (contrairement à un npm run dev en foreground).
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

tmux kill-session -t backend 2>/dev/null || true
tmux kill-session -t frontend 2>/dev/null || true

tmux new -d -s backend -c "$PROJECT_ROOT/backend" 'npm run dev'
tmux new -d -s frontend -c "$PROJECT_ROOT/frontend" 'npm run dev'

echo "Backend  : tmux attach -t backend  (http://localhost:3000)"
echo "Frontend : tmux attach -t frontend (http://localhost:5173)"
echo "Se détacher sans arrêter : Ctrl+b puis d"
