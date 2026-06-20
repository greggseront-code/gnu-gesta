# Architecture

Ce document donne une vue globale et stable de GNU Gesta. Il doit rester court:
les demandes ponctuelles vont dans `docs/specs/`, et les details locaux dans les
`README.md` des features concernees.

## Vision systeme

GNU Gesta est un portail web unique de gestion des stages. Il partage un meme
modele de donnees entre les espaces pedagogique, etudiant et entreprise afin
d'eviter la duplication des workflows.

Acteurs principaux:

- `gestionnaire`: administre les donnees, valide les offres et cloture les cas.
- `lecteur`: consulte les donnees sans modification.
- `etudiant`: consulte les offres publiees, postule et depose des propositions.
- `entreprise`: gere son profil, ses contacts, ses offres et les candidatures
  recues.

## Stack

- Frontend: React, Vite, TypeScript.
- Backend: Node.js, Express, TypeScript.
- Base de donnees: SQLite.
- Acces aux donnees: SQL explicite avec `better-sqlite3`.
- Validation d'entrees: Zod.

## Principes architecturaux

- Separation claire entre frontend et backend.
- Pas de framework fullstack.
- Pas d'ORM.
- Backend organise par features metier.
- Conventions simples et lisibles pour des etudiants et pour Claude Code.
- Les controles d'acces doivent etre appliques cote backend.

## Arborescence

```text
frontend/
  src/
    app/
    components/
    context/
    features/
    lib/
    pages/
    styles/

backend/
  src/
    app.ts
    server.ts
    db/
    features/
      applications/
      companies/
      offers/
      students/
    middlewares/
```

Note: certains documents peuvent mentionner `backend/features/`, mais la
structure reelle actuelle est `backend/src/features/`.

## Backend

Le backend expose ses routes sous le prefixe `/api`. Les routes sont montees
dans `backend/src/app.ts`.

Une feature backend significative suit generalement cette structure:

- `[feature].routes.ts`: routes HTTP et controles proches du transport.
- `[feature].service.ts`: orchestration metier.
- `[feature].queries.ts`: SQL explicite.
- `[feature].schemas.ts`: schemas Zod.
- `[feature].types.ts`: types TypeScript locaux.

Features backend:

- `students`: referentiel et import des etudiants.
- `companies`: referentiel des entreprises et contacts.
- `offers`: offres de stage, propositions et cycle de publication.
- `applications`: candidatures et selection d'un candidat.

Les details metier locaux sont documentes dans les README de ces dossiers.

## Frontend

Le frontend est organise autour de pages et de features:

- `pages/`: ecrans principaux de l'application.
- `features/*/*.api.ts`: clients API par domaine.
- `features/*/*.types.ts`: types frontend par domaine quand necessaire.
- `components/`: composants reutilisables.
- `context/role-context.tsx`: contexte du role courant.
- `lib/`: utilitaires transversaux, dont le client API.

Les pages representent les parcours utilisateur principaux: administration des
offres et candidatures, gestion des entreprises, import etudiants, consultation
des offres, tableau de bord entreprise et propositions etudiantes.

## Regles transversales

- Le systeme est multi-roles: `gestionnaire`, `lecteur`, `etudiant`,
  `entreprise`.
- Les lecteurs sont en lecture seule.
- Les entreprises travaillent sur leurs propres donnees.
- Les etudiants ne doivent voir que les donnees pertinentes pour leur parcours.
- Les offres publiees servent de point de jonction entre entreprises, etudiants
  et candidatures.
- Les changements de statut d'offre sont un point central du workflow et doivent
  rester coherents entre features.

Les regles detaillees d'une entite ou d'un endpoint appartiennent au README de
la feature concernee.

## Conventions

- Dossiers de features: noms metier simples au pluriel.
- Fichiers backend: `[feature].routes.ts`, `[feature].service.ts`,
  `[feature].queries.ts`, `[feature].schemas.ts`, `[feature].types.ts`.
- Fonctions: `camelCase`, de preference verbe + objet.
- Composants React: `PascalCase`.
- Fichiers frontend: noms explicites et metier.
- Tables et colonnes SQL: `snake_case`.
- Cle primaire: `id`.
- Cle etrangere: `[entity]_id`.

## Open Questions

- Strategie d'authentification cible et remplacement eventuel des headers
  `x-role` et `x-entity-id`.
- Statut `refusee`: present dans le code et le schema SQL, mais a confirmer
  comme statut produit officiel.
- Cycle de vie des pieces jointes.
- Strategie de migration future vers PostgreSQL.
- Alignement eventuel entre la structure documentaire souhaitee
  `backend/features/` et la structure reelle `backend/src/features/`.
