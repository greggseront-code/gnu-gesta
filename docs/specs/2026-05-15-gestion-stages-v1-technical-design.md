# Gestion des stages V1 - Spec technique

## Objectif

Definir les choix techniques V1 necessaires pour livrer une application simple,
lisible et auto-hebergeable. Les conventions durables sont decrites dans
`docs/architecture.md`.

## Decisions V1

- Frontend React, Vite et TypeScript.
- Backend Node.js, Express et TypeScript.
- Base SQLite.
- Requetes SQL explicites, sans ORM.
- Validation des payloads avec Zod.
- Organisation backend par features.

## Routes API attendues

Exemples de routes structurantes:

- `GET /api/offers`
- `GET /api/offers/:offerId`
- `POST /api/offers`
- `POST /api/offers/:offerId/applications`
- `POST /api/offers/:offerId/select-candidate`
- `POST /api/offers/:offerId/mark-unavailable`
- `GET /api/companies`
- `POST /api/companies`
- `POST /api/students/import`

## Donnees principales

Tables principales attendues:

- `students`
- `companies`
- `company_contacts`
- `offers`
- `offer_contacts`
- `applications`
- `offer_status_history`

Les tables et colonnes suivent les conventions SQL de `docs/architecture.md`.

## Contraintes techniques importantes

- Les candidatures doivent etre uniques par couple offre/etudiant.
- Les transitions de statut doivent etre historisees quand elles modifient une
  offre.
- Les controles d'acces doivent etre appliques cote backend.
- Les imports et creations doivent valider les donnees avant insertion.
- Les pieces jointes restent un mecanisme minimal en V1.

## Decisions restant a trancher

- Authentification cible et gestion des sessions.
- Remplacement eventuel des headers `x-role` et `x-entity-id`.
- Stockage cible et nettoyage des pieces jointes.
- Strategie de migration future vers PostgreSQL.
