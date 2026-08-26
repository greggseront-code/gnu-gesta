# Review — fix bandeau incarnation ne se ferme pas au clic

Date : 2026-08-02

## Documents liés

* Spec : `docs/history/phases/2026-07-31-authentification-microsoft-entra-v1-spec.md`
* README de feature : `backend/src/features/auth/README.md`
* Architecture : `docs/current/architecture.md`

## Objectif

Corriger un bug rapporté : en tant que gestionnaire en incarnation
(étudiant/entreprise), cliquer sur « Quitter le mode temporaire » ne fait
rien visuellement. Un rafraîchissement manuel de la page révèle que le rôle
gestionnaire est en fait bien restauré côté serveur.

## Travail réalisé

* Cause identifiée : `apiFetch` (`frontend/src/lib/api-client.ts`) appelait
  systématiquement `res.json()` sur toute réponse `ok`, y compris les `204
  No Content` renvoyés par `DELETE /api/auth/impersonation` et `POST
  /api/auth/logout`. Parser un corps vide comme JSON lève une exception, ce
  qui fait rejeter la promesse de `deactivateImpersonation()` avant que
  `handleExitImpersonation` (`app-layout.tsx`) n'exécute `await refresh()` /
  `navigate('/')`. Côté serveur, la session était pourtant déjà correctement
  mise à jour (d'où la correction visible après un F5).
* Fix : `apiFetch` retourne `undefined` sans tenter de parser le corps
  quand `res.status === 204`, au lieu d'appeler `res.json()`.
* Bénéfice collatéral : le même bug affectait silencieusement le bouton de
  déconnexion (`POST /api/auth/logout`, aussi en 204) — corrigé par le même
  changement.

## Écarts par rapport à la spec ou au plan

Aucun écart identifié — correction de bug, pas de changement de
comportement attendu.

## Fichiers impactés

* `frontend/src/lib/api-client.ts` — court-circuite `res.json()` sur 204.
* `frontend/src/lib/api-client.test.ts` — nouveau test de non-régression.

## Décisions prises

* Fix centralisé dans `apiFetch` plutôt que dans chaque appelant
  (`deactivateImpersonation`, `logout`) : tous les endpoints `204` actuels
  et futurs bénéficient de la correction sans traitement au cas par cas.

## Tests et vérifications

Tests automatisés exécutés :

* Commande : `npx vitest run` (dans `frontend/`)
* Résultat : 5 fichiers, 22 tests, tous passants (dont le nouveau test
  `apiFetch ne tente pas de parser le corps JSON d'une réponse 204`).

Vérifications manuelles effectuées :

* Aucune — nécessite une connexion Microsoft Entra réelle, indisponible
  dans cet environnement.

Non testé ou à vérifier :

* Vérification manuelle en environnement de staging/dev avec un vrai
  compte gestionnaire : cliquer sur « Quitter le mode temporaire » doit
  fermer le bandeau et restaurer la sidebar gestionnaire immédiatement,
  sans rafraîchissement.
* Vérifier que le bouton « Se déconnecter » redirige bien vers `/login`
  immédiatement (même classe de bug, corrigée par le même changement).

## Risques et limites

* Risque faible : le changement ne fait qu'éviter un throw sur un corps
  vide ; ne modifie aucun comportement pour les réponses avec corps JSON.

## Travail restant

* Vérification manuelle en conditions réelles (voir ci-dessus) à faire par
  l'utilisateur au prochain test de l'auth Entra.

## Incertitudes

Aucune.
