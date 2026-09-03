# Gestion des stages et des conventions

Statut : sujet ouvert, réimplémentation en cours ; task 001 terminée.

Le besoin métier reste entièrement valide. Une première implémentation a été
livrée puis annulée : elle présentait des défauts de conception sur le
rattachement annuel et l'accès aux dossiers, ainsi qu'une couverture de tests
inférieure à ce que la spec demandait. Le besoin, les décisions déjà prises et
les corrections à apporter sont consolidés dans `spec.md`. L'exécution,
commencée par l'import et l'éligibilité annuelle, est découpée dans `plan.md`
en deux axes liés mais distincts : constitution et gestion du dossier de
stage, puis gestion de ses conventions.

Lecture minimale si ce sujet est repris :

- `spec.md` ;
- `plan.md` pour l'ordre d'exécution et les preuves attendues ;
- `workflow.html` pour la vue d'ensemble des parcours ;
- `docs/current/data-model.md` et `docs/current/architecture.md` ;
- README des features `offers`, `applications`, `students` et `companies`.

Le code de la première implémentation reste consultable sous le tag Git
`archive/gestion-stages-016e952`. Il sert de référence de travail, jamais de
base à reprendre telle quelle : plusieurs de ses choix sont explicitement
corrigés par `spec.md`.

Aucun code ne doit être modifié sur la seule base de la présence de ce dossier.
