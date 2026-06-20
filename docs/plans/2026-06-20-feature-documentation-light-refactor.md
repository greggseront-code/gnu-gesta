# Plan - refactor documentation features leger

Date : 2026-06-20

## Objectif

Refactoriser la documentation sans creer une structure trop lourde.

La documentation cible doit permettre de comprendre :

* la vision globale du projet ;
* le modele de donnees ;
* les features produit et leurs liens front/back ;
* les details backend locaux.

Le code applicatif ne doit pas etre modifie.

## Decision de structure

Ne pas creer pour l'instant :

* `docs/features/<feature>.md` pour chaque feature ;
* `frontend/src/features/*/README.md`.

Raison :

* le frontend actuel n'est pas strictement feature-first ;
* les pages frontend composent souvent plusieurs features ;
* des README frontend par feature risqueraient d'etre faibles ou repetitifs ;
* une carte transversale unique suffit pour l'etat actuel du projet.

## Structure documentaire cible

```text
docs/
  architecture.md
  data-model.md
  features.md
  specs/
  reviews/
  templates/

backend/src/features/
  applications/README.md
  companies/README.md
  offers/README.md
  students/README.md
```

## Responsabilite de chaque document

### `docs/architecture.md`

Vue globale courte :

* vision systeme ;
* stack ;
* principes architecturaux ;
* arborescence ;
* conventions principales ;
* liens vers `docs/features.md` et `docs/data-model.md` ;
* questions ouvertes.

Ne pas y remettre les details metier locaux.

### `docs/features.md`

Carte produit transversale des features.

Pour chaque feature :

* but metier ;
* parcours utilisateur principal ;
* regles principales ;
* contrat front/back resume ;
* pages frontend concernees ;
* briques frontend concernees ;
* backend lie ;
* cas limites ou incertitudes.

Ce fichier documente le frontend au niveau utile aujourd'hui, sans imposer une
organisation frontend feature-first.

### `docs/data-model.md`

Vue globale de la base de donnees :

* choix SQLite et SQL explicite ;
* fichiers DB backend ;
* tables principales ;
* relations ;
* mapping features backend -> tables utilisees ;
* conventions SQL ;
* limites et questions ouvertes.

### `backend/src/features/*/README.md`

Documentation backend locale uniquement :

* endpoints ;
* modele de domaine local ;
* regles metier serveur ;
* acces donnees ;
* permissions ;
* tests back ;
* lien vers `docs/features.md` et `docs/data-model.md`.

Ces README ne doivent pas documenter les pages frontend ni lister de fichiers
`.tsx`.

## Task list

Cocher chaque item une fois termine.

### 1. Preparation

* [x] Relire `docs/architecture.md`.
* [x] Relire les templates existants dans `docs/templates/`.
* [x] Relire les README backend existants dans `backend/src/features/*/README.md`.
* [x] Identifier les pages frontend qui utilisent chaque feature.
* [x] Verifier qu'aucune modification de code applicatif n'est necessaire.

### 2. Templates

* [x] Creer `docs/templates/backend-feature-readme-template.md`.
* [x] Creer `docs/templates/features-map-template.md` pour `docs/features.md`.
* [x] Creer `docs/templates/data-model-template.md` pour `docs/data-model.md`.
* [x] Creer `docs/templates/README.md` comme index des templates utiles.
* [x] Supprimer les templates de l'ancienne structure trop lourde :
  * [x] `docs/templates/feature-overview-template.md`
  * [x] `docs/templates/frontend-feature-readme-template.md`

### 3. Carte des features

* [x] Creer `docs/features.md`.
* [x] Documenter `applications`.
* [x] Documenter `companies`.
* [x] Documenter `offers`.
* [x] Documenter `students`.
* [x] Pour chaque feature, verifier la presence de :
  * [x] `But metier`
  * [x] `Parcours utilisateur`
  * [x] `Regles principales`
  * [x] `Contrat front/back`
  * [x] `Pages frontend concernees`
  * [x] `Briques frontend concernees`
  * [x] `Backend lie`
  * [x] `Cas limites`

### 4. Modele de donnees

* [x] Creer `docs/data-model.md`.
* [x] Documenter le choix SQLite et SQL explicite.
* [x] Documenter les fichiers backend DB :
  * [x] `backend/src/db/schema.sql`
  * [x] `backend/src/db/db.connection.ts`
  * [x] `backend/src/db/db.migrate.ts`
* [x] Documenter les tables principales et leurs relations.
* [x] Documenter quelles features backend utilisent quelles tables.
* [x] Documenter les conventions SQL.
* [x] Documenter les limites connues et questions ouvertes sur la DB.

### 5. README backend

* [x] Refactoriser `backend/src/features/applications/README.md`.
* [x] Refactoriser `backend/src/features/companies/README.md`.
* [x] Refactoriser `backend/src/features/offers/README.md`.
* [x] Refactoriser `backend/src/features/students/README.md`.
* [x] Verifier que chaque README backend contient :
  * [x] `Endpoints`
  * [x] `Modele de domaine`
  * [x] `Regles metier`
  * [x] `Acces donnees`
  * [x] `Permissions`
  * [x] `Tests back`
  * [x] `Documents lies`
* [x] Ajouter un lien vers `docs/features.md`.
* [x] Ajouter un lien vers `docs/data-model.md`.
* [x] Verifier qu'aucun README backend ne liste de fichiers `.tsx`.
* [x] Verifier qu'aucun README backend ne documente les routes frontend.

### 6. Architecture

* [ ] Mettre a jour `docs/architecture.md` avec la structure documentaire legere.
* [ ] Mentionner `docs/features.md` comme carte produit front/back.
* [ ] Mentionner `docs/data-model.md` comme reference DB globale.
* [ ] Verifier que `docs/architecture.md` reste une vue globale courte.

### 7. Review

* [ ] Creer `docs/reviews/2026-06-20-feature-documentation-light-refactor.md`.
* [ ] Lister les fichiers crees.
* [ ] Lister les fichiers modifies.
* [ ] Lister les informations deplacees.
* [ ] Signaler les pertes potentielles d'information.
* [ ] Signaler les points restant a clarifier.

### 8. Verification finale

* [ ] Verifier avec `git status --short` que seuls des fichiers de documentation ont ete modifies ou crees.
* [ ] Verifier l'absence de marqueurs parasites (`TODO`, `FIXME`, `*** End Patch`) dans les fichiers modifies.
* [ ] Verifier que les chemins documentes utilisent la structure reelle :
  * [ ] `backend/src/features/`
  * [ ] `frontend/src/features/`
  * [ ] `frontend/src/pages/`
* [ ] Verifier que `backend/features/`, `frontend/features/`, le dossier `docs/features/` et `frontend/src/features/*/README.md` n'ont pas ete crees dans cette V1 legere.

## Notes de migration

Les informations frontend actuellement presentes dans les README backend doivent
etre deplacees vers `docs/features.md`, pas vers des README frontend.

Les informations DB actuellement dispersees dans les README backend doivent etre
resumees localement dans `Acces donnees`, puis reliees a `docs/data-model.md`.

Les anciens templates de la version en trois niveaux ne font plus partie de la
cible immediate. Le dossier `docs/templates/` doit rester limite aux templates
utiles pour cette V1 legere.

## Points d'attention

* Le statut `refusee` existe dans le code, mais reste a confirmer comme statut
  produit officiel.
* Le cycle de vie des pieces jointes reste minimal et doit etre signale comme
  limite connue.
* Les pages frontend composent parfois plusieurs features.
* Les README backend doivent rester independants du frontend.
* Le frontend est documente dans `docs/features.md` pour cette V1 legere.
