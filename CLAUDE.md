# CLAUDE.md

- Lire `docs/architecture.md` avant toute modification significative.
- Creer ou mettre a jour une spec dans `docs/specs/` pour les changements non
  triviaux.
- Lire les `README.md` des features impactees avant de modifier leur code.
- Mettre a jour les `README.md` de features si leur comportement ou leur
  structure change.
- Creer un document de review dans `docs/reviews/` a la fin d'une tache
  significative.
- Utiliser les templates disponibles dans `docs/templates/`.
- Ajouter des commentaires dans le code uniquement quand ils preservent un
  invariant metier, une decision V1 temporaire ou un piege d'architecture utile
  a un agent de codage; eviter de commenter le CRUD evident.
- Utiliser Git uniquement en lecture (`status`, `diff`, `log`) sauf demande
  explicite.
