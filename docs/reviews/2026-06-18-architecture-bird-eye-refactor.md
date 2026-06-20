# Review - architecture bird's eye refactor

Date: 2026-06-18

## Fichiers crees

- `docs/reviews/2026-06-18-architecture-bird-eye-refactor.md`

## Fichiers modifies

- `docs/architecture.md`
- `backend/src/features/applications/README.md`
- `backend/src/features/companies/README.md`
- `backend/src/features/offers/README.md`
- `backend/src/features/students/README.md`
- `docs/templates/feature-readme-template.md`

## Informations deplacees

- Les details des champs et contraintes etudiants ont ete deplaces vers
  `backend/src/features/students/README.md`.
- Les details entreprises, contacts, roles et doublons ont ete deplaces vers
  `backend/src/features/companies/README.md`.
- Les champs d'offre, statuts detailles, validations de teletravail et limites
  pieces jointes ont ete deplaces vers
  `backend/src/features/offers/README.md`.
- Les contraintes de candidature, l'unicite offre/etudiant et la selection ont
  ete deplacees vers `backend/src/features/applications/README.md`.
- `docs/architecture.md` conserve une vue globale: vision, stack, principes,
  arborescence, carte des features, vue frontend, regles transversales,
  conventions et questions ouvertes.

## Pertes d'information potentielles

- Aucune suppression volontaire d'information utile.
- Certains libelles ont ete reformules pour reduire la longueur de
  `docs/architecture.md`; les details correspondants sont conserves dans les
  README de features.

## Points restant a clarifier

- Confirmer si `refusee` est un statut produit officiel ou seulement une
  implementation technique actuelle.
- Clarifier la strategie d'authentification cible.
- Clarifier le cycle de vie des pieces jointes.
- Decider si la documentation doit continuer a referencer
  `backend/src/features/` ou anticiper une structure `backend/features/`.
