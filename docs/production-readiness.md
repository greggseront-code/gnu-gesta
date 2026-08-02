# Points d'attention avant une vraie mise en production

Ce document liste les décisions prises "pour l'instant, en développement"
qu'il faudra reprendre explicitement avant que GNG serve du trafic réel
(vrais gestionnaires/étudiants/entreprises, vraies données de stage). Tant
qu'on est en période de développement, ces raccourcis sont acceptés
consciemment plutôt que subis. À mettre à jour à chaque décision de ce type ;
à revoir en bloc avant le premier déploiement réellement "en production".

## Décisions pendantes

### 1. Secrets Microsoft Entra partagés entre local et VPS

**État actuel** : `ENTRA_CLIENT_SECRET` et `SESSION_SECRET` sur le VPS
(`/etc/gnu-gesta/backend.env`) réutilisent les mêmes valeurs que
`backend/.env` en local. Décision explicite du 2026-08-02 : pas de secret
dédié tant qu'il n'y a pas de trafic réel à isoler du poste de
développement.

**À faire avant la mise en production réelle** :

* Créer un secret client Entra dédié au VPS dans le portail Azure
  (inscription d'application GNG, section "Certificats et secrets"), pour
  pouvoir le révoquer sans casser le développement local si le poste local
  est compromis.
* Générer un `SESSION_SECRET` distinct pour le VPS (`openssl rand -hex 32`).
* Mettre à jour `/etc/gnu-gesta/backend.env` avec les nouvelles valeurs et
  redémarrer le service.
* Voir `docs/deployment.md`, section "Secrets authentification Microsoft
  Entra", pour la procédure.

### 2. Expiration du secret client actuellement partagé

**État actuel** : le secret client Entra en cours d'utilisation a une date
d'expiration fixée à sa création dans le portail Azure. Comme il est
partagé (voir point 1), son expiration casserait **à la fois** le
développement local et le VPS en même temps.

**À faire** : vérifier la date d'expiration dans le portail Azure et la
noter ici, pour ne pas la découvrir par une panne :

* Date d'expiration : *(à renseigner)*
* Rappel calendaire à poser : *(à renseigner)*

### 3. Matrice de permissions `GET /api/students` / `GET /api/companies`

**État actuel** (voir `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md`,
section "Écarts") : élargie à "toute session authentifiée" plutôt que la
matrice plus étroite initialement discutée (gestionnaire+étudiant pour
`companies`, gestionnaire seul pour `students`), pour ne pas casser les
pages existantes (`admin-applications`, `admin-offers`, `home`,
`company-dashboard`) qui les utilisent comme référentiel de recherche.

**À faire avant la mise en production réelle** : confirmer si cette
ouverture est acceptable en usage réel, ou si les pages concernées doivent
être adaptées pour permettre une matrice plus stricte.

### 4. Données étudiantes de test et déduplication automatique

**État actuel** : `normalizeStudentEmails()` (`backend/src/db/db.migrate.ts`)
supprime automatiquement, au démarrage, les fiches `students` en doublon de
casse d'email qui ne sont référencées par aucune candidature/offre —
acceptable car les données actuelles sont fictives et seront remplacées.

**À faire avant un import réel d'étudiants** : reconsidérer ce comportement
de suppression automatique et silencieuse. Sur de vraies données, une
suppression automatique de fiche (même en doublon) est plus risquée
qu'un blocage explicite avec liste à traiter manuellement. Voir le
commentaire dans `db.migrate.ts` et la review du jalon 3.

### 5. Vérification manuelle contre le tenant Entra réel

**État actuel** : seul le compte gestionnaire (`gregory.seront@vinci.be`) a
été validé manuellement contre le vrai tenant (tâche 004 du plan). Aucun
compte étudiant (`@student.vinci.be`) ni lecteur réel n'a été testé ; la
forme exacte de `userPrincipalName`/`mail` retournée par Microsoft pour un
compte étudiant n'a jamais été observée.

**À faire avant la mise en production réelle** : connexion réelle d'au moins
un compte étudiant importé, un compte étudiant non importé, un compte
lecteur, et test des deux incarnations depuis le compte gestionnaire.

## Points d'attention (limitations connues, pas forcément bloquantes)

* **Un seul gestionnaire** : l'adresse est figée dans `GESTA_MANAGER_EMAIL`
  (configuration, pas base de données). Pas de gestion dynamique de
  plusieurs comptes gestionnaire (hors périmètre V1, voir spec).
* **Pas d'authentification réelle des entreprises** : le rôle effectif
  `entreprise` n'existe qu'en incarnation temporaire par le gestionnaire.
* **Pas de déconnexion Microsoft globale** : "Se déconnecter" ferme
  uniquement la session GNG, jamais le compte Microsoft ni les autres
  applications de la Haute École (comportement voulu, documenté dans la
  spec).
* **`users.role`/`users.entity_id`** ne sont qu'un instantané du dernier
  login (audit), jamais la source de vérité d'autorisation — à garder en
  tête si un futur écran d'administration les affiche tels quels.
* **`/etc/gnu-gesta/backend.env`** doit exister avec les permissions `600`
  avant tout démarrage en `NODE_ENV=production`/`staging` : sans lui, le
  service échoue au démarrage par conception (voir
  `docs/deployment.md`), ce qui est le comportement voulu mais à anticiper
  lors du tout premier déploiement.

## Documents liés

* Déploiement : `docs/deployment.md`
* Spec authentification : `docs/specs/2026-07-31-authentification-microsoft-entra-v1.md`
* Plan authentification : `docs/plans/2026-07-31-authentification-microsoft-entra-v1.md`
* Review jalons 2-7 : `docs/reviews/2026-07-31-authentification-microsoft-entra-v1.md`
* README de feature : `backend/src/features/auth/README.md`
