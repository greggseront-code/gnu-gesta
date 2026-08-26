# Review — pièces jointes des offres

Date : 2026-08-02

## Résumé

Le champ historique `offers.attachment_path` a été remplacé dans le schéma
frais par `offer_attachments`. L'API expose maintenant la liste, l'ajout d'un
fichier par appel, le téléchargement protégé et la suppression. Le frontend
sélectionne plusieurs fichiers, les envoie séquentiellement et conserve l'offre
si un upload échoue.

## Fichiers principaux modifiés

* `backend/src/db/schema.sql`, les types, requêtes, service et routes Offers.
* `backend/src/features/offers/offer-attachments.storage.ts` et
  `backend/src/middlewares/upload.middleware.ts`.
* `frontend/src/features/offers/offers.api.ts`, `offer-form.tsx`,
  `offer-upload-status.tsx`, `offer-attachments.tsx` et les pages de création,
  proposition et détail.
* Tests DB, stockage et API ; documentation de feature et modèle de données.

## Vérifications

* `npm run build` backend : OK.
* `npm run build` frontend : OK.
* Tests DB, stockage, offres, contrôle d'accès et candidatures : 110 tests OK
  en exécution séquentielle ; les tests de stockage utilisent une racine
  temporaire.
* Suite frontend complète : 50 tests OK.
* Une exécution backend complète parallèle reste sujette à des échecs
  intermittents de fixtures d'authentification (`csrfToken`/URL de login) ;
  les suites directement concernées passent séquentiellement.

### Validation manuelle complémentaire — 2026-08-26

Le parcours a été testé sur le VPS par l'utilisateur et est confirmé
fonctionnel. Le détail des rôles et des scénarios exécutés n'ayant pas été
précisé, cette validation confirme le fonctionnement global sur l'environnement
VPS sans cocher individuellement toute la matrice manuelle du plan.

## Observables

* Une offre peut avoir jusqu'à dix documents PDF/DOCX de 5 Mo.
* Les mutations sont réservées au gestionnaire, à l'entreprise propriétaire
  ou à l'étudiant auteur ; la lecture réutilise la visibilité de l'offre.
* Un retry frontend réutilise l'identifiant de l'offre et uniquement les
  fichiers en erreur.
* Aucun chemin absolu n'est persisté ou retourné par l'API.

## Limites restantes

Le stockage reste local au développement et n'est ni sauvegardé ni répliqué.
Il n'y a pas d'antivirus, d'aperçu, de versionnement ou de migration d'une
ancienne base ; la base fictive doit être recréée depuis `schema.sql` et
`seed.sql`.
