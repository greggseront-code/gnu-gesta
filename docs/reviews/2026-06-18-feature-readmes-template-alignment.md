# Review - alignement des README de features

Date: 2026-06-18

## Fichiers créés

* `docs/reviews/2026-06-18-feature-readmes-template-alignment.md`

## Fichiers modifiés

* `backend/src/features/applications/README.md`
* `backend/src/features/companies/README.md`
* `backend/src/features/offers/README.md`
* `backend/src/features/students/README.md`

## Informations déplacées ou reformulées

* Les sections anglaises ont été alignées sur le template français
  `docs/templates/feature-readme-template.md`.
* Les routes API existantes ont été déplacées dans `Interfaces exposées`.
* Les règles de validation et de permissions ont été regroupées dans
  `Validations et permissions`.
* Les fichiers de tests de référence ont été ajoutés à partir des tests
  existants.
* Les routes frontend et fichiers réutilisables ont été ajoutés à partir de
  l'arborescence existante.

## Pertes d'information potentielles

* Aucune suppression volontaire d'information utile.
* Certains libellés ont été reformulés pour correspondre au template.

## Points restant à clarifier

* Confirmer si les README de features doivent rester en français avec accents,
  comme le template actuel.
* Confirmer si chaque future feature doit documenter aussi ses écrans frontend
  même lorsque son dossier est côté backend.
