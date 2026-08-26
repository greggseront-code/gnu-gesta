# Proposition — authentification locale sûre pour les tests

Date : 2026-08-26  
Statut : implémenté le 2026-08-26

## Objectif

Permettre les tests manuels dans le navigateur et les tests E2E sans dépendre
d’Entra, tout en conservant exactement les mêmes sessions, rôles, permissions,
CSRF et contrôles métier que sur le VPS.

## Recommandation

Utiliser une configuration explicite plutôt qu’un booléen permissif :

```env
AUTH_MODE=entra   # valeur par défaut
AUTH_MODE=dev     # uniquement pour le développement local
```

Le mode `dev` ne remplace pas les tests automatisés existants avec le faux
fournisseur Entra (`backend/tests/helpers/authenticated-agent.ts`). Il sert
aux scénarios navigateur/E2E qui ont besoin d’une vraie session applicative.

## Garde-fous obligatoires

- Refuser le démarrage si `AUTH_MODE=dev` et `NODE_ENV` n’est pas
  `development`.
- Refuser le démarrage si l’application n’est pas configurée pour écouter sur
  `localhost`/`127.0.0.1`. Le frontend de développement doit également rester
  lié à la boucle locale.
- Ne jamais activer ce mode sur le VPS, en staging ou en production ; la valeur
  par défaut reste `entra` et une valeur inconnue doit faire échouer le
  démarrage.
- Exposer une route de connexion locale uniquement en mode `dev`, protégée par
  un contrôle d’adresse loopback.
- Autoriser uniquement une liste fixe de fixtures (`manager`, `reader`,
  `student-alice`, `student-bob`, et le scénario entreprise), jamais un rôle ou
  un identifiant fourni librement par le navigateur.
- Créer une session Express normale avec le même format d’utilisateur et un
  vrai jeton CSRF. Les middleware d’authentification et d’autorisation ne
  doivent pas être contournés.
- Ne pas ajouter de faux comptes permanents dans le seed partagé. Les fixtures
  peuvent utiliser des identités synthétiques en mémoire/session et les entités
  déjà présentes dans la base locale.
- Afficher un bandeau visible `AUTH DEV — local uniquement` dans l’interface.

En cas de doute, le mode doit échouer fermé : aucune sélection automatique d’un
utilisateur et aucun fallback silencieux vers une identité de développement.

## Parcours proposé

Ajouter une page ou une route locale `/dev-login` proposant les fixtures
allowlistées. Le formulaire appelle par exemple `POST /api/auth/dev-login` avec
un nom de fixture, puis redirige vers l’application comme une connexion normale.

Les fixtures recommandées sont :

- `manager` : accès complet de gestion ;
- `reader` : lecture seule ;
- `student-alice` et `student-bob` : deux utilisateurs étudiants distincts ;
- `company` : réutilisation du mécanisme d’impersonation entreprise existant,
  afin de tester le même rôle effectif que sur le parcours réel.

Le endpoint doit ensuite permettre de vérifier `/api/auth/me`, le CSRF, les
permissions et les actions sur les pièces jointes sans code spécial côté métier.

## Tests à couvrir

1. En local, chaque fixture se connecte et conserve une session après
   rechargement.
2. Les rôles et restrictions sont identiques à ceux vérifiés avec Entra :
   visibilité, téléchargement, ajout, suppression et accès inter-offres.
3. Une requête sans session, une fixture inconnue ou une tentative d’accès par
   une IP non-loopback est refusée.
4. Le démarrage avec `AUTH_MODE=dev` hors développement échoue.
5. En `AUTH_MODE=entra`, la route de développement n’existe pas et le parcours
   Entra reste inchangé.

## Exemple de configuration locale

```env
NODE_ENV=development
AUTH_MODE=dev
APP_BASE_URL=http://localhost:5173
```

Ce mode simule l’identité et les permissions applicatives, mais ne teste pas
OAuth, le tenant Entra, PKCE ni la configuration de production. Ces éléments
restent validés par les tests d’authentification existants et par le test réel
sur le VPS.
