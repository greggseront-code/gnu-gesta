# Internships - Backend

## Responsabilité

Cette feature porte le dossier de stage, distinct de l'offre ou de la
proposition qui l'a créé. Elle orchestre sa préparation, ses conventions, son
cycle de vie et la vue annuelle des étudiants éligibles.

## Endpoints

Lecture `gestionnaire` et `lecteur` :

* `GET /api/internships/years` : années importées ;
* `GET /api/internships?academic_year=YYYY-YYYY` : suivi annuel ;
* `GET /api/internships/export/:academicYear` : même suivi en XLSX ;
* `GET /api/internships/:id` : détail du dossier ;
* `GET /api/internships/:id/documents/:kind` : convention `generated` ou
  `signed` via une URL protégée.

Mutations `gestionnaire` :

* `PATCH /api/internships/:id` : dates et contact signataire ;
* `POST /api/internships/:id/generate-convention` : génère ou remplace la
  convention vierge ;
* `POST /api/internships/:id/signed-convention` : téléverse ou remplace la
  convention signée ;
* `POST /api/internships/:id/confirm` : confirme après dépôt signé ;
* `POST /api/internships/:id/terminal-status` : `termine`, `interrompu` ou
  `echoue` ;
* `DELETE /api/internships/:id` : suppression simple avant démarrage.

## Création et origine

La création ne possède pas de route indépendante :

* `applications.selectCandidateAndCloseOffer()` crée le dossier d'origine
  `candidature` dans la transaction qui sélectionne et ferme l'offre ;
* `offers.validateOffer()` crée le dossier d'origine `proposition` dans la
  transaction qui passe la proposition étudiante de `soumise` à `prise`.

Une proposition acceptée ne devient jamais `validee_et_visible` et ne crée
aucune candidature artificielle.

## États et blocage

* `preparation` et `confirme` bloquent l'étudiant ;
* `termine`, `interrompu` et `echoue` sont terminaux, restent visibles et ne
  bloquent plus ;
* l'index partiel `idx_internships_one_blocking_per_student` garantit l'unicité
  face à deux sélections concurrentes ;
* candidater, proposer un stage et être sélectionné vérifient également ce
  blocage côté service.

La suppression simple est réservée à `preparation` tant que la date de début
n'est pas atteinte. Elle restaure atomiquement l'offre et la candidature, ou la
proposition privée à `soumise`.

## Préparation et documents

L'année académique est calculée depuis la date de début, avec bascule le
15 septembre. L'étudiant doit être éligible pour cette année. Le signataire
doit être un contact validé de l'entreprise et la fin ne peut précéder le
début.

Le modèle applicatif est `backend/assets/convention-template.docx`, dérivé de
`docs/annexes/convention.docx` par
`backend/scripts/build-convention-template.py`. Le générateur remplace toutes
les variables dans une copie en mémoire ; le modèle reste inchangé. Une
correction de préparation invalide l'ancienne convention générée pour éviter
un téléchargement obsolète.

Les documents PDF/DOCX sont limités à 5 Mio et stockés localement sous
`backend/internship-documents/` avec un nom technique. Ce stockage de
développement doit être remplacé avant production réelle.

## Suivi annuel et export

La liste part de `student_academic_year_eligibility`, donc conserve les
étudiants sans stage. Si plusieurs dossiers historiques existent pour le même
étudiant et la même année, la ligne montre le plus récent. L'export utilise le
même résultat, avec filtres, en-tête figé et cellules Excel de date.

## Tests

`backend/tests/internships.test.ts` couvre les transactions, blocages,
frontières annuelles, documents, confirmation, suppression, permissions,
liste et export.
