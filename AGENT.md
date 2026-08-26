# Règles agent — GNU Gesta

## Avant tout

Lire `docs/current/state.md`, puis ouvrir seulement les documents demandés par
la matrice. Le reste de `docs/` est disponible, pas prescrit.

## Matrice de lecture

| Type de tâche | Lectures minimales |
| --- | --- |
| Correctif local dans une feature backend | `docs/current/state.md` + `backend/src/features/<feature>/README.md` |
| Changement frontend local | `docs/current/state.md` + section concernée de `docs/current/features.md` |
| Nouvelle feature ou changement de comportement | + `docs/current/architecture.md` + les README concernés |
| Schéma, contrat d'API ou invariant transversal | + `docs/current/data-model.md` + les ADR concernées |
| Déploiement, `.env`, Entra, Nginx | + les documents utiles de `docs/operations/` |
| Arbitrage produit ou travail non engagé | + `docs/current/backlog.md` |
| Sujet ouvert | le `README.md` correspondant dans `docs/work/active/` |
| Documentation | `docs/README.md` |

## Lectures sur déclencheur

- `docs/decisions/ADR-*.md` : avant de contredire une décision qui contraint
  plusieurs features.
- `docs/history/` : seulement pour retracer une décision ou une régression, ou
  si un document courant ou actif y renvoie explicitement. Jamais par défaut.

Les reviews ne sont jamais une lecture prérequise. Une contrainte encore vraie
qui ne vit que dans une review doit remonter dans un document courant, une ADR
ou un README de feature.

## Écrire de la documentation

- Consulter `docs/README.md` avant de créer un document.
- Un sujet non trivial ouvre `docs/work/active/<sujet>/README.md`, puis une
  `spec.md` et un `plan.md` seulement si ces artefacts sont utiles.
- À la clôture, déplacer spec et plan dans `docs/history/phases/`, écrire la
  review utile dans `docs/history/reviews/`, et mettre à jour les sources
  courantes.
- Le README d'une feature décrit son contrat actuel, jamais toute son histoire.
- Ne jamais dupliquer un fait durable.

## Code et Git

- Commenter uniquement un invariant métier, une décision temporaire ou un piège
  d'architecture non évident.
- Préserver les changements utilisateur. Utiliser Git en lecture seule sauf
  demande explicite ; Gregory réalise les commits.
