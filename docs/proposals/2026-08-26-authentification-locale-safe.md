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

## Procédure de test avec le navigateur intégré

### Démarrer l'application

Depuis la racine du dépôt, ouvrir deux terminaux.

Dans le premier :

```bash
cd backend
npm run dev
```

Dans le second :

```bash
cd frontend
npm run dev
```

Vérifier que le backend écoute sur le port `3000` et que Vite affiche l'URL
locale du frontend, généralement `http://127.0.0.1:5173/`.

### Parcours dans le navigateur

1. Ouvrir un nouvel onglet du navigateur intégré sur
   [http://127.0.0.1:5173/dev-login](http://127.0.0.1:5173/dev-login).
2. Attendre l'affichage du sélecteur de fixtures.
3. Choisir un profil autorisé.
4. Vérifier la redirection vers `/`, la bannière `AUTH DEV — local uniquement`
   et les menus correspondant au rôle choisi.
5. Pour tester un autre rôle, se déconnecter puis revenir directement sur
   `/dev-login`.
6. À la fin, se déconnecter et arrêter les deux processus avec `Ctrl+C`.

En mode `dev`, il ne faut pas utiliser le bouton Microsoft de `/login`. Cette
route reste volontairement réservée à Entra et renvoie `entra_auth_disabled`.
L'URL prévue pour l'authentification locale est `/dev-login`.

### Dépannage

- `ERR_CONNECTION_REFUSED` signifie que le navigateur ne trouve pas un serveur
  local. Vérifier les deux terminaux et redémarrer le backend ou le frontend si
  nécessaire.
- Après l'affichage d'une page d'erreur Chromium, ouvrir un nouvel onglet
  plutôt que de réutiliser l'onglet en erreur.
- Utiliser `127.0.0.1` dans l'URL plutôt que `localhost` si la résolution locale
  pose problème.
- Après une déconnexion, le retour sur `/login` est normal ; saisir à nouveau
  l'URL complète `/dev-login` pour changer de fixture.
- Changer de fixture nécessite de se déconnecter d'abord. Le changement de
  session reste protégé par le mécanisme CSRF normal.

## Tests réalisés dans le navigateur intégré

Validation effectuée le 26 août 2026 avec les serveurs backend et frontend
locaux démarrés :

- La page `/dev-login` affiche les fixtures disponibles.
- Le profil gestionnaire ouvre le tableau de bord et les liens d'administration.
- Le profil lecteur ouvre le tableau de bord lecteur sans les actions
  d'administration.
- Le profil étudiant ouvre la fiche locale et affiche `Mes candidatures` ainsi
  que `Proposer un stage`.
- Le profil entreprise ouvre l'espace entreprise avec le mode d'impersonation
  temporaire et l'action `Déposer une offre`.
- Depuis le profil entreprise, la navigation vers `/offers` fonctionne et la
  liste des offres s'affiche.
- La déconnexion revient sur `/login`, où l'absence d'Entra en mode dev est
  signalée comme prévu.

Le parcours navigateur des pièces jointes (dépôt, téléchargement et
suppression) n'a pas été rejoué pendant cette session ; il reste à valider
manuellement depuis l'espace offre avec un profil autorisé.
