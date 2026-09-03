# État courant

Date de l'instantané : 2026-09-03

- Branche de référence : `main`.
- Application : gestion des stages avec frontend React, API Express et SQLite.
- Authentification : Microsoft Entra sur le VPS ; `AUTH_MODE=dev` fournit des
  sessions locales allowlistées et protégées pour les tests manuels/E2E.
- Travail préparé mais non engagé : adresses structurées des entreprises dans
  `docs/work/active/adresses-structurees-entreprises/`.
- Autre sujet non engagé : départements d'entreprise, dans
  `docs/current/backlog.md`.
- Gestion des stages et conventions : besoin respecifié après rollback ; plan
  de réimplémentation en cours dans
  `docs/work/active/gestion-stages-conventions/plan.md`. Import et éligibilité
  annuelle implémentés ; prochaine tranche : transformation d'une candidature
  sélectionnée en dossier.
- Avant un usage avec trafic et données réels : traiter
  `docs/operations/production-readiness.md`.

Ce document n'est pas requis pour un correctif local. Le mettre à jour seulement
quand le statut d'un travail actif, un blocage ou la prochaine action change.
