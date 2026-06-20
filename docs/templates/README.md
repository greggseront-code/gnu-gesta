# Templates de documentation

La structure documentaire cible actuelle est volontairement légère.

## À utiliser maintenant

### Carte des features

Utiliser `docs/templates/features-map-template.md` pour créer ou maintenir :

* `docs/features.md`

Ce document centralise la vue produit des features et les liens utiles vers le
frontend et le backend.

### Modèle de données

Utiliser `docs/templates/data-model-template.md` pour créer ou maintenir :

* `docs/data-model.md`

Ce document décrit la base de données comme ressource transversale du backend.

### README backend de feature

Utiliser `docs/templates/backend-feature-readme-template.md` pour créer ou
maintenir :

* `backend/src/features/<feature>/README.md`

Ce document décrit uniquement l'implémentation backend locale : endpoints,
modèle, règles serveur, accès données, permissions et tests backend.

Les pages et briques frontend sont documentées dans `docs/features.md`.
