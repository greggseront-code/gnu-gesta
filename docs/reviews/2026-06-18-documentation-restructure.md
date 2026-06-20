# Review - restructuration de la documentation

Date: 2026-06-18

## Fichiers crees ou modifies

Crees:

- `CLAUDE.md`
- `docs/architecture.md`
- `docs/reviews/2026-06-18-documentation-restructure.md`
- `docs/templates/spec-template.md`
- `docs/templates/review-template.md`
- `docs/templates/feature-readme-template.md`
- `backend/src/features/applications/README.md`
- `backend/src/features/companies/README.md`
- `backend/src/features/offers/README.md`
- `backend/src/features/students/README.md`

Modifies:

- `docs/specs/2026-05-15-gestion-stages-v1-design.md`
- `docs/specs/2026-05-15-gestion-stages-v1-technical-design.md`

## Informations deplacees

- La vision de portail unique multi-roles a ete deplacee vers
  `docs/architecture.md`.
- La stack, les principes techniques, l'organisation backend et les conventions
  de nommage ont ete deplaces vers `docs/architecture.md`.
- Les objets metier centraux, les statuts et les regles d'acces globales ont ete
  resumes dans `docs/architecture.md`.
- Les specs V1 gardent le besoin fonctionnel, le perimetre, les parcours, les
  regles metier, les criteres d'acceptation et les decisions techniques propres
  a la V1.
- Les responsabilites locales des features ont ete documentees dans les README
  situes sous `backend/src/features/*`.

## Incertitudes

- Le contexte initial mentionnait un fichier `CLAUDE.md`, mais aucun fichier de
  ce nom n'etait present dans le workspace avant cette restructuration.
- La structure cible mentionnait `backend/features/*/README.md`; le code actuel
  utilise `backend/src/features/*`, donc les README ont ete crees dans les
  dossiers reels.
- Le statut `refusee` existe dans le code et le schema SQL, mais pas dans la
  liste minimale de la spec fonctionnelle initiale.
- L'authentification cible reste incertaine: le code actuel repose sur les
  headers `x-role` et `x-entity-id`.
- Le cycle de vie complet des pieces jointes n'est pas encore documente ni
  stabilise.

## Verification effectuee

- Inventaire des fichiers de documentation existants.
- Lecture des deux specs V1 existantes.
- Lecture des dossiers `backend/src/features/applications`, `companies`,
  `offers` et `students`.
- Lecture du schema SQL et des middlewares d'authentification/autorisation.

## Prochaines verifications recommandees

- Confirmer si `refusee` doit devenir un statut fonctionnel officiel.
- Decider si la documentation cible doit nommer `backend/src/features/` ou si
  une future restructuration de code est prevue vers `backend/features/`.
- Documenter le format exact d'import CSV quand il sera stabilise.
- Clarifier la strategie d'authentification cible.
- Clarifier la politique de stockage et suppression des pieces jointes.
