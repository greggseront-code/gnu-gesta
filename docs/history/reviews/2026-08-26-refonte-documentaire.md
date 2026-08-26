# Review — refonte documentaire et routage de contexte

Date : 2026-08-26

Statut : close. Cette review n'est pas une lecture prérequise.

## Objectif

Adapter à GNU Gesta la refonte documentaire d'AI Router, garder les deux dépôts
structurellement proches et réduire le contexte chargé par défaut.

## Travail réalisé

- Installation des mêmes familles : `current`, `decisions`, `operations`,
  `work/active`, `history/phases`, `history/reviews`, `history/analyses` et
  `templates`.
- Création de `AGENT.md`, de l'index et de la matrice de lecture sur
  déclencheur ; `AGENTS.md` et `CLAUDE.md` ne sont que des ponts courts.
- Déplacement des références courantes, procédures et artefacts datés.
- Conservation de la proposition d'adresses structurées comme sujet préparé
  mais non engagé ; résumé des départements d'entreprise dans le backlog.
- Retrait des listes de specs/plans/reviews historiques dans les README de
  features.
- Mise à jour des modèles et prompts pour le cycle `work/active` → `history`.

## Écart volontaire avec AI Router

GNU Gesta n'a pas de feuille de route par phases ni de document de vision
produit distinct. Aucun `current/roadmap.md` ou `current/vision-produit.md` n'a
été inventé : ces fichiers dupliqueraient le README, la carte des features et le
backlog sans source métier supplémentaire. La taxonomie et le cycle de vie sont
autrement alignés.

`AGENTS.md` n'existe que pour les outils qui découvrent automatiquement ce nom ;
`AGENT.md` reste la source canonique, comme dans AI Router.

## Mesure de contexte

Pour un correctif backend local, le socle prescrit avant la lecture du README de
feature était `CLAUDE.md` + `docs/architecture.md` : 182 lignes, 922 mots et
6 994 octets. Il devient `AGENT.md` + `docs/current/state.md` : 65 lignes,
432 mots et 3 050 octets.

Réduction mesurée : 65 % des lignes, 54 % des mots et 57 % des octets sur le
socle documentaire commun. Les documents historiques restent disponibles mais
sortent entièrement du parcours par défaut.

## Vérifications

- Aucun fichier applicatif, test, configuration ou donnée modifié.
- Aucun lien Markdown relatif cassé sur les 63 fichiers documentaires contrôlés.
- Aucun ancien chemin de famille (`docs/specs`, `docs/plans`, `docs/reviews`,
  `docs/proposals`) dans les documents courants.
- La proposition d'adresses structurées reste explicitement non implémentée.

## Ce qui remonte hors de cette review

- Structure et cycle de vie : `docs/README.md`.
- Routage agent : `AGENT.md`.
- État actionnable : `docs/current/state.md`.
- Correspondance des chemins : document de migration voisin dans
  `docs/history/phases/`.
