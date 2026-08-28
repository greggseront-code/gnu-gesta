# Architecture

Ce document donne une vue globale et stable de GNU Gesta. Il n'est requis que
pour un changement transversal ou multifeature. Le travail ponctuel va dans
`docs/work/active/` lorsqu'un artefact durable est utile, et les détails locaux dans
les `README.md` des features concernées.

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

## Documents de reference

- `docs/current/features.md`: carte produit front/back, parcours et cas limites.
- `docs/current/data-model.md`: reference globale du schema SQLite et des relations.
- `backend/src/features/*/README.md`: details backend locaux par feature.
- `docs/work/active/`: contexte temporaire des travaux non triviaux ouverts.
- `docs/history/`: artefacts datés clos, hors lecture par défaut.
- `docs/operations/deployment.md`: hebergement, DNS, Nginx, HTTPS et procedure de
  redeploiement.
- `docs/operations/production-readiness.md`: decisions prises "pour l'instant, en
  developpement" a reprendre avant une vraie mise en production.
- `docs/current/backlog.md`: évolutions produit identifiées mais non engagées.

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

- `auth`: authentification Microsoft Entra en environnement déployé, sessions
  locales allowlistées avec `AUTH_MODE=dev`, sessions SQLite, calcul du rôle de
  base et incarnations temporaires gestionnaire. Seule source de vérité pour
  `req.auth` (voir `middlewares/auth-context.middleware.ts`).
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
- `context/auth-context.tsx`: contexte d'authentification (identite, role de
  base, role effectif, entityId, statut) charge depuis `GET /api/auth/me`.
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
- En environnement déployé, Microsoft Entra (tenant Haute École Léonard de
  Vinci) est la source d'identité. Le `gestionnaire` (adresse exacte) et le
  domaine étudiant `student.vinci.be` attribuent le rôle de base ; tout autre
  compte du tenant est `lecteur`. En développement local seulement,
  `AUTH_MODE=dev` crée les mêmes sessions depuis une allowlist et échoue fermé
  hors loopback. Il n'existe pas de compte Microsoft `entreprise` : ce rôle
  n'est accessible que par incarnation temporaire du gestionnaire (voir
  `backend/src/features/auth/README.md`).
- La session serveur (cookie `HttpOnly`, SQLite via `session.store.ts`) est
  l'unique frontiere de securite. Aucune route metier n'accepte de requete
  anonyme ; `401` signale une session absente, `403` une session insuffisante.
  Les mutations passent par un jeton CSRF lie a la session.

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

Les questions non engagées appartiennent à `docs/current/backlog.md` ou à
`docs/operations/production-readiness.md`, pas à cette vue stable.
