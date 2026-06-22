# Review — commentaires context engineering

Date : 2026-06-20

## Documents lies

* Architecture : `docs/architecture.md`
* Carte des features : `docs/features.md`
* Modele de donnees : `docs/data-model.md`
* README de features : `backend/src/features/*/README.md`
* Consignes agent : `CLAUDE.md`

## Objectif

Relire le code et la documentation disponible en partant de `CLAUDE.md`, puis
ajouter des commentaires utiles pour un agent de codage sans surcharger le
contexte.

## Travail realise

* Ajout d'une regle dans `CLAUDE.md` pour cadrer les futurs commentaires.
* Ajout d'une section de references documentaires dans `docs/architecture.md`.
* Remplacement des commentaires temporaires `Issue ...` par des invariants
  durables dans la feature `applications`.
* Ajout de commentaires courts sur les points ou un agent pourrait casser une
  regle implicite : auth V1 par headers, visibilite des offres, attribution des
  offres, audit de statut, heuristique de doublons, upload multipart, migrations
  SQLite et dashboard entreprise.

## Ecarts par rapport a la spec ou au plan

* Pas de spec creee : la modification est documentaire et ne change pas le
  comportement applicatif.
* Aucun fichier non suivi preexistant n'a ete modifie.

## Fichiers impactes

* `CLAUDE.md`
* `docs/architecture.md`
* `backend/src/middlewares/auth-context.middleware.ts`
* `backend/src/db/db.migrate.ts`
* `backend/src/features/applications/applications.routes.ts`
* `backend/src/features/applications/applications.queries.ts`
* `backend/src/features/companies/companies.queries.ts`
* `backend/src/features/offers/offers.service.ts`
* `backend/src/features/offers/offers.queries.ts`
* `backend/src/features/offers/offers.routes.ts`
* `frontend/src/context/role-context.tsx`
* `frontend/src/features/offers/offers.api.ts`
* `frontend/src/pages/company-dashboard.page.tsx`
* `docs/reviews/2026-06-20-context-engineering-comments.md`

## Decisions prises

* Commenter seulement les invariants non evidents ou transversaux.
* Ne pas commenter les schemas, types, CRUD simples et JSX dont le sens est
  deja porte par les noms.
* Garder les commentaires proches du code a risque plutot que dupliquer les
  README de features.

## Tests et verifications

Tests automatises executes :

* Commande : `cd backend && npm test`
* Resultat : 78 tests passes apres relance hors sandbox. La premiere execution
  sandboxee a echoue avec `listen EPERM 0.0.0.0` lors de l'usage de Supertest.
* Commande : `cd frontend && npm run build`
* Resultat : build TypeScript/Vite OK.

Verifications manuelles effectuees :

* Lecture de `CLAUDE.md`, `README.md`, `docs/architecture.md`,
  `docs/features.md`, `docs/data-model.md`, des README backend de features et
  des principales routes/services/queries/pages frontend.
* Verification qu'il ne reste pas de marqueurs `Issue`, `TODO` ou `FIXME` dans
  les sources lues.
* Relecture du diff pour verifier que les commentaires ajoutent du contexte et
  non une paraphrase du code.

## Risques et limites

* Le frontend affiche un lien `GET /api/offers/:id/attachment`, mais la review
  n'a trouve qu'une route backend `POST /api/offers/:id/attachment`. Ce point
  semble etre un risque fonctionnel existant, non corrige dans cette tache.
* La strategie d'authentification cible reste ouverte : les commentaires
  documentent l'etat V1 par headers, pas une solution finale.
* Le statut `refusee` reste une incertitude produit deja documentee.

## Travail restant

* Ajouter une route de telechargement de piece jointe ou ajuster l'UI si ce lien
  n'est pas cense etre disponible.
* Clarifier l'authentification cible et la place de la table `users`.

## Incertitudes

* Faut-il considerer `refusee` comme statut produit officiel ou seulement comme
  etat technique temporaire ?
* Faut-il completer le plan documentaire non suivi
  `docs/plans/2026-06-20-feature-documentation-light-refactor.md` ou le laisser
  comme trace de travail historique ?
