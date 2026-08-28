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
  plusieurs features ou le processus de livraison.
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

## Livrer et clôturer

- Un commit livre une tranche vérifiable, pas un chantier entier.
- Trois tests par feature : chaque mutation refusée à chaque rôle non autorisé
  par requête HTTP ; chaque contrainte de données réellement déclenchée, en
  vérifiant l'erreur métier renvoyée ; l'idempotence de chaque mise à jour.
- Une découverte faite en E2E rouvre la conception : test de régression nommé
  et README de feature à jour avant de clore.
- L'hygiène est outillée, pas mémorisée : exports inutilisés, fichiers
  parasites, arbre Git propre après les tests, racine de fichiers injectée
  dans les suites de tests.
- Une clôture est falsifiable : distinguer ce qui est couvert par un test
  nommé, vérifié à la main, ou implémenté sans vérification. Jamais « aucun
  critère abandonné » sans ces listes.

Raisons et alternatives écartées : `docs/decisions/ADR-0001-regles-de-livraison-et-de-cloture.md`.
