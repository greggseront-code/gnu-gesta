# Extensions futures

Ce document recense les évolutions produit identifiées mais volontairement
exclues des specs et plans actifs. Une extension doit faire l'objet de sa propre
spec avant d'être implémentée.

Il ne remplace pas `docs/production-readiness.md`, qui porte uniquement les
décisions temporaires et vérifications nécessaires avant une vraie mise en
production.

## Départements d'une entreprise

Statut : à étudier

### Besoin pressenti

Une entreprise peut regrouper plusieurs départements ou unités internes à une
même adresse. Ces départements pourraient avoir leurs propres contacts, offres
et responsables sans dupliquer la fiche de l'entreprise.

La contrainte actuelle et cible à court terme identifie une entreprise par la
combinaison normalisée de son nom et de son adresse. Elle autorise une même
organisation à plusieurs adresses, mais ne permet pas de représenter plusieurs
fiches de même nom à la même adresse. La notion de département devra donc être
modélisée comme une entité rattachée à l'entreprise, et non comme une entreprise
dupliquée servant de contournement.

### Piste de modèle

* Ajouter une entité `company_departments` liée à `companies`.
* Donner au département un nom et, si nécessaire, une adresse distincte ou un
  complément d'adresse.
* Permettre de rattacher les contacts et les offres à un département tout en
  conservant leur entreprise de référence.
* Déterminer si certains contacts restent communs à toute l'entreprise.
* Définir une clé métier propre aux départements, vraisemblablement basée sur
  l'entreprise et le nom du département.

### Questions à traiter dans une future spec

* Le département est-il facultatif pour les contacts et les offres existants ?
* Un contact peut-il appartenir à plusieurs départements ?
* Une offre peut-elle concerner plusieurs départements ?
* Un département possède-t-il une adresse, un email général ou des rôles
  d'accès distincts ?
* La validation d'une entreprise couvre-t-elle automatiquement ses départements
  ou chaque département suit-il son propre workflow ?
* Comment migrer les entreprises et contacts existants sans créer un
  département artificiel obligatoire ?

## Documents liés

* Architecture : `docs/architecture.md`
* Modèle de données : `docs/data-model.md`
* Spec de validation actuelle :
  `docs/specs/2026-08-02-validation-offres-entreprises-contacts.md`
* Plan de validation actuel :
  `docs/plans/2026-08-02-validation-offres-entreprises-contacts.md`
