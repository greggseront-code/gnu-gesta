# gnu-gesta

Application web de gestion des stages.

## Prérequis

- Node.js 20+

## Lancer en développement

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Sur un serveur/VPS (via SSH) :** utiliser plutôt `./dev.sh` à la racine, qui
lance backend et frontend dans deux sessions `tmux` ("backend", "frontend").
Ces process survivent à la fermeture de la session SSH — `tmux attach -t
backend` (ou `frontend`) pour s'y rattacher, `Ctrl+b` puis `d` pour se
détacher sans arrêter le process.

## Tests

```bash
cd backend && npm test
```

## Build frontend

```bash
cd frontend && npm run build
```

## Sauvegarde et restauration de la base de données

Les données vivent dans un unique fichier SQLite : `backend/data/gesta.db`. Ce
fichier (et tout `backend/data/`) est exclu de git — une sauvegarde doit donc
être copiée ailleurs (clé USB, autre disque, stockage cloud...) pour survivre
à une perte du serveur ou à une réinstallation du dépôt.

**Sauvegarder :**
```bash
cd backend
npm run db:backup
```
Crée un fichier horodaté dans `backend/data/backups/` (ex.
`gesta-2026-06-16T10-00-00.db`). Un chemin personnalisé peut être fourni :
```bash
npm run db:backup -- /chemin/vers/ma-sauvegarde.db
```

**Restaurer :**
```bash
cd backend
npm run db:restore -- data/backups/gesta-2026-06-16T10-00-00.db
```
⚠️ Arrêtez le serveur backend avant de restaurer : la restauration remplace
directement `backend/data/gesta.db`, et un serveur en cours d'exécution
garderait une connexion ouverte sur l'ancien fichier jusqu'à son redémarrage.
Relancez `npm run dev` une fois la restauration terminée.
