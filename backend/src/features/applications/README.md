# Applications - Backend

## Endpoints

* `POST /api/offers/:offerId/applications` : crée une candidature pour
  l'étudiant courant.
* `GET /api/offers/:offerId/applications` : liste les candidatures d'une offre.
* `POST /api/offers/:offerId/select-candidate` : sélectionne une candidature et
  passe l'offre à `prise`.

La route `GET /api/students/:studentId/applications` est exposée par la feature
`students`, mais utilise le service `applications`.

## Modèle de domaine

Une candidature relie un étudiant à une offre.

Champs principaux :

* `offer_id`
* `student_id`
* `selected`
* `created_at`

Cette feature ne possède pas de statut propre. Elle modifie le statut d'offre
vers `prise` lors de la sélection d'un candidat.

## Règles métier

* Une candidature n'est acceptée que pour une offre `validee_et_visible`.
* Le couple offre/étudiant est unique.
* Une entreprise ne peut consulter ou sélectionner que les candidatures de ses
  propres offres.
* La candidature sélectionnée doit appartenir à l'offre ciblée.
* Une offre déjà `prise` ne peut pas recevoir une nouvelle sélection.
* La sélection est transactionnelle : candidature sélectionnée, historique de
  statut et offre mise à jour.

## Accès données

Tables utilisées :

* `applications` : création, liste et sélection des candidatures.
* `offers` : vérification de l'offre et passage à `prise`.
* `offer_status_history` : historique du changement de statut.

Points d'attention :

* La contrainte SQL unique sur `(offer_id, student_id)` empêche les doublons.
* La sélection vérifie l'appartenance de la candidature à l'offre avant mise à
  jour.

Voir aussi : `docs/data-model.md`.

## Permissions

* `etudiant` : création d'une candidature.
* `gestionnaire`, `lecteur`, `entreprise` : lecture des candidatures d'une
  offre.
* `entreprise` : sélection d'un candidat sur ses propres offres.

## Tests back

Fichiers de tests :

* `backend/tests/applications.test.ts`
* `backend/tests/access-control.test.ts`

Scénarios importants :

* Candidature uniquement sur offre validée et visible.
* Rejet des candidatures dupliquées.
* Contrôle d'accès entreprise sur ses propres offres.
* Blocage IDOR lors de la sélection d'une candidature d'une autre offre.
* Passage à `prise` et rejet d'une double sélection.

## Documents liés

* Carte des features : `docs/features.md`
* Modèle de données : `docs/data-model.md`
