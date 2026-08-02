# Features

Ce document est la carte produit transversale des features. Il documente les
liens frontend utiles sans imposer une organisation frontend feature-first.

## Applications

### But métier

Enregistrer les candidatures des étudiants sur les offres et permettre à une
entreprise de sélectionner un candidat.

### Parcours utilisateur

* Un étudiant consulte une offre visible et dépose une candidature.
* L'entreprise consulte les candidatures reçues sur ses offres.
* L'entreprise sélectionne un candidat, ce qui clôt l'offre comme `prise`.
* L'équipe pédagogique peut consulter les candidatures.

### Règles principales

* Une candidature relie un étudiant à une offre.
* Un étudiant ne peut postuler qu'une seule fois à la même offre.
* Les candidatures ne sont acceptées que sur les offres `validee_et_visible`.
* Une entreprise ne peut sélectionner un candidat que sur ses propres offres.
* La sélection d'un candidat fait passer l'offre à `prise`.

### Contrat front/back

* `POST /api/offers/:offerId/applications` : créer une candidature.
* `GET /api/offers/:offerId/applications` : lister les candidatures d'une offre.
* `GET /api/students/:studentId/applications` : lister les candidatures d'un étudiant.
* `POST /api/offers/:offerId/select-candidate` : sélectionner une candidature.
* Type frontend principal : `Application`.
* La sélection retourne une `Offer` mise à jour.

### Pages frontend concernées

* `frontend/src/pages/student-applications.page.tsx`
* `frontend/src/pages/admin-applications.page.tsx`
* `frontend/src/pages/company-dashboard.page.tsx`

### Briques frontend concernées

* `frontend/src/features/applications/applications.api.ts`

### Backend lié

* `backend/src/features/applications/README.md`

### Cas limites

* `applyToOffer` envoie un `student_id`, mais le backend utilise l'identifiant
  étudiant issu du contexte d'authentification.
* Les réponses de candidatures ne joignent pas les détails enrichis de
  l'étudiant.
* Le champ d'historique `changed_by` n'est pas renseigné lors de la sélection.

## Auth

### But métier

Authentifier les utilisateurs de la Haute École Léonard de Vinci avec
Microsoft Entra, attribuer un rôle de base côté backend et permettre au seul
gestionnaire d'incarner temporairement un étudiant ou une entreprise pour
tester les parcours métier.

### Parcours utilisateur

* Un utilisateur non connecté arrive sur `/login` et se connecte avec
  Microsoft.
* Le retour transite par `/auth-check` puis rejoint directement l'accueil.
* Un étudiant authentifié mais absent du référentiel `students` est redirigé
  vers `/account-not-linked` et peut revérifier après un import gestionnaire.
* Le gestionnaire peut activer un mode « Voir comme un étudiant/une
  entreprise » depuis la barre latérale, puis le quitter à tout moment via un
  bandeau permanent.
* « Se déconnecter » supprime la session GNG sans déconnecter le compte
  Microsoft.

### Règles principales

* Rôle de base : `gregory.seront@vinci.be` exact → `gestionnaire` ; domaine
  exact `student.vinci.be` → `etudiant` ; tout autre compte du tenant →
  `lecteur`. Recalculé à chaque connexion.
* La liaison étudiante compare l'email vérifié (`userPrincipalName` puis
  `mail` en repli) à `students.email`, sans tenir compte de la casse. Aucune
  fiche n'est créée automatiquement.
* Seul un rôle de base `gestionnaire` peut activer une incarnation ; un seul
  mode actif à la fois ; le rôle de base reste disponible pendant
  l'incarnation.
* Toute mutation authentifiée par cookie exige un jeton CSRF
  (`x-csrf-token`, exposé par `GET /api/auth/me`).
* `401` = pas de session ; `403` = session insuffisante pour l'opération.

### Contrat front/back

* `GET /api/auth/login`, `GET /api/auth/callback` : flux Microsoft Entra.
* `GET /api/auth/me` : identité, `baseRole`, rôle effectif, `entityId`,
  `status`, incarnation active, `csrfToken`.
* `POST /api/auth/logout` : déconnexion locale.
* `POST /api/auth/impersonation`, `DELETE /api/auth/impersonation` :
  activer/quitter un mode temporaire (gestionnaire uniquement).
* Type frontend principal : `CurrentAuthUser`.

### Pages frontend concernées

* `frontend/src/pages/login.page.tsx`
* `frontend/src/pages/auth-check.page.tsx`
* `frontend/src/pages/account-not-linked.page.tsx`
* `frontend/src/pages/impersonation-select.page.tsx`

### Briques frontend concernées

* `frontend/src/context/auth-context.tsx`
* `frontend/src/features/auth/auth.api.ts`
* `frontend/src/components/app-layout.tsx` (badge identité, bandeau
  d'incarnation, déconnexion)

### Backend lié

* `backend/src/features/auth/README.md`

### Cas limites

* Aucune authentification réelle des entreprises : le rôle effectif
  `entreprise` n'existe qu'en incarnation gestionnaire.
* Un seul gestionnaire possible (adresse figée en configuration), pas de
  gestion dynamique de plusieurs comptes gestionnaire.

## Companies

### But métier

Maintenir le référentiel des entreprises et de leurs contacts pour permettre le
dépôt d'offres, les propositions étudiantes et la consultation par les
étudiants.

### Parcours utilisateur

* Un utilisateur consulte ou recherche une entreprise.
* Un gestionnaire, un étudiant ou une entreprise crée une entreprise si besoin.
* Un gestionnaire ou l'entreprise propriétaire complète la fiche et les contacts.
* Les étudiants utilisent le référentiel pour rattacher une proposition à une
  entreprise existante quand c'est possible.

### Règles principales

* Une entreprise contient un nom, un email général et une adresse optionnelle.
* Une entreprise doit avoir au moins un contact à la création.
* Les contacts portent un ou plusieurs rôles.
* Les entreprises peuvent être recherchées pour limiter les doublons.
* Une entreprise ne modifie que sa propre fiche, sauf gestionnaire.

### Contrat front/back

* `GET /api/companies` : lister ou rechercher les entreprises.
* `GET /api/companies?duplicate_risk=true` : lister les risques de doublon.
* `GET /api/companies/:id` : lire une entreprise avec ses contacts.
* `POST /api/companies` : créer une entreprise.
* `PATCH /api/companies/:id` : modifier une entreprise.
* `POST /api/companies/:id/contacts` : ajouter un contact.
* Types frontend principaux : `Company`, `CompanyContact`,
  `CompanyWithContacts`, `CompanyInput`, `ContactInput`.

### Pages frontend concernées

* `frontend/src/pages/companies.page.tsx`
* `frontend/src/pages/admin-company-form.page.tsx`
* `frontend/src/pages/admin-company-detail.page.tsx`
* `frontend/src/pages/company-dashboard.page.tsx`
* `frontend/src/pages/impersonation-select.page.tsx`
* `frontend/src/pages/student-proposal.page.tsx`
* `frontend/src/pages/submit-offer.page.tsx`

### Briques frontend concernées

* `frontend/src/features/companies/companies.api.ts`
* `frontend/src/features/companies/companies.types.ts`

### Backend lié

* `backend/src/features/companies/README.md`

### Cas limites

* La détection de doublons est approximative.
* `GET /api/companies` exige une session authentifiée (n'importe quel rôle) ;
  utilisé comme référentiel de recherche par plusieurs écrans (admin offres,
  admin candidatures, accueil, proposition de stage étudiante).
* Les rôles de contacts sont stockés sous forme JSON texte côté SQLite.

## Offers

### But métier

Gérer le dépôt, la validation, la publication et le suivi des offres de stage et
des propositions étudiantes.

### Parcours utilisateur

* Une entreprise dépose une offre.
* Un étudiant peut proposer un stage en rattachant une entreprise.
* Un gestionnaire valide, refuse ou rend une offre indisponible.
* Les étudiants consultent les offres visibles et peuvent postuler.
* Une entreprise suit ses offres et les candidatures associées.

### Règles principales

* Une offre est rattachée à une entreprise.
* Une offre a un contact prioritaire et une liste de contacts.
* Les offres validées deviennent visibles aux étudiants.
* Les offres `prise` ou `non_disponible` ne sont plus ouvertes comme offres
  disponibles.
* Les gestionnaires pilotent les changements de statut pédagogiques.

### Contrat front/back

* `GET /api/offers` : lister les offres visibles selon le rôle.
* `POST /api/offers` : créer une offre ou une proposition.
* `GET /api/offers/:id` : lire une offre selon les droits.
* `POST /api/offers/:id/validate` : valider une offre.
* `POST /api/offers/:id/reject` : refuser une offre.
* `POST /api/offers/:id/mark-unavailable` : rendre une offre indisponible.
* `PATCH /api/offers/:id` : modifier une offre.
* `PATCH /api/offers/:id/company` : changer l'entreprise rattachée.
* `POST /api/offers/:id/attachment` : rattacher une pièce jointe.
* Types frontend principaux : `Offer`, `OfferInput`, `OfferStatus`,
  `OfferSourceType`.

### Pages frontend concernées

* `frontend/src/pages/offers.page.tsx`
* `frontend/src/pages/offer-details.page.tsx`
* `frontend/src/pages/submit-offer.page.tsx`
* `frontend/src/pages/student-proposal.page.tsx`
* `frontend/src/pages/admin-offers.page.tsx`
* `frontend/src/pages/company-dashboard.page.tsx`
* `frontend/src/pages/student-applications.page.tsx`

### Briques frontend concernées

* `frontend/src/features/offers/offers.api.ts`
* `frontend/src/features/offers/offers.types.ts`
* `frontend/src/features/offers/offer-card.tsx`
* `frontend/src/features/offers/offer-form.tsx`
* `frontend/src/components/status-badge.tsx`

### Backend lié

* `backend/src/features/offers/README.md`

### Cas limites

* Le statut `refusee` existe dans le code, mais reste à confirmer comme statut
  produit officiel.
* Le cycle de vie des pièces jointes est minimal.
* La création ne vérifie pas explicitement que les contacts appartiennent à
  l'entreprise cible.

## Students

### But métier

Maintenir le référentiel des étudiants pour permettre l'identification des
étudiants, leurs candidatures et leurs propositions.

### Parcours utilisateur

* Un gestionnaire importe une liste d'étudiants.
* Les étudiants sont disponibles pour la sélection de rôle en V1.
* Un étudiant consulte ses candidatures.
* L'équipe pédagogique peut consulter la liste des étudiants.

### Règles principales

* L'import se fait par liste structurée.
* L'email est obligatoire et unique.
* Un nouvel import met à jour les étudiants existants par email.
* Seul un gestionnaire peut importer des étudiants.
* Un étudiant ne consulte que ses propres candidatures.

### Contrat front/back

* `GET /api/students` : lister les étudiants.
* `POST /api/students/import` : importer des étudiants.
* `GET /api/students/:studentId/applications` : lister les candidatures d'un
  étudiant.
* Types frontend principaux : `Student`, `StudentInput`.

### Pages frontend concernées

* `frontend/src/pages/students.page.tsx`
* `frontend/src/pages/students-import.page.tsx`
* `frontend/src/pages/student-applications.page.tsx`
* `frontend/src/pages/impersonation-select.page.tsx`
* `frontend/src/pages/company-dashboard.page.tsx`

### Briques frontend concernées

* `frontend/src/features/students/students.api.ts`
* `frontend/src/features/students/students.types.ts`

### Backend lié

* `backend/src/features/students/README.md`

### Cas limites

* Le format exact du CSV n'est pas porté par cette feature backend : l'API reçoit
  déjà des lignes structurées.
* `GET /api/students` exige une session authentifiée
  (`gestionnaire`, `lecteur` ou `entreprise` — utilisé comme référentiel par
  admin candidatures et l'espace entreprise ; pas `etudiant`).
* Un compte étudiant Microsoft sans fiche `students` correspondante
  (`userPrincipalName`/`mail`) reste authentifié mais bloqué
  (`student_not_imported`) : aucune fiche n'est créée automatiquement.
* Le matricule est optionnel dans l'import, mais unique s'il est présent.
