# Gestion des stages et des conventions

Statut : sujet ouvert, à réimplémenter.

Le besoin métier reste entièrement valide. Une première implémentation a été
livrée puis annulée : elle présentait des défauts de conception sur le
rattachement annuel et l'accès aux dossiers, ainsi qu'une couverture de tests
inférieure à ce que la spec demandait. Le besoin, les décisions déjà prises et
les corrections à apporter sont consolidés dans `spec.md`.

Lecture minimale si ce sujet est repris :

- `spec.md` ;
- `workflow.html` pour la vue d'ensemble des parcours ;
- `docs/current/data-model.md` et `docs/current/architecture.md` ;
- README des features `offers`, `applications`, `students` et `companies`.

Le code de la première implémentation reste consultable sous le tag Git
`archive/gestion-stages-016e952`. Il sert de référence de travail, jamais de
base à reprendre telle quelle : plusieurs de ses choix sont explicitement
corrigés par `spec.md`.

Aucun code ne doit être modifié sur la seule base de la présence de ce dossier.
