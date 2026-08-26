# Créer un plan depuis une spec

```text
À partir de la spec fournie, crée ou utilise le dossier
`docs/work/active/<sujet>/`, puis écris son `plan.md`.

Utilise le template `docs/templates/plan-template.md`.

Contraintes :
- Ne recopie pas la spec ni la documentation de contexte.
- Lie seulement les documents de référence utiles.
- Le plan doit être un document d’exécution : ordre de travail, fichiers concernés, tâches, vérifications et observables.
- Garde le plan concret, mais générique dans sa structure.
- Chaque tâche doit être vérifiable et limitée à un résultat observable.
- Si une section optionnelle du template n’est pas utile, supprime-la ou indique clairement “Non applicable”.
- Respecte les conventions existantes du projet.

Avant d’écrire le plan :
1. Lis la spec.
2. Lis le `README.md` du sujet et les README de feature concernés.
3. N'ajoute `docs/current/architecture.md`, `docs/current/features.md` ou
   `docs/current/data-model.md` que si l'impact correspondant existe.
4. Identifie les impacts prévus :
   - Backend
   - Frontend
   - Données
   - Documentation
   - Tests

Ensuite :
1. Crée le fichier `plan.md` dans le dossier actif.
2. Structure les tâches avec des checkboxes.
3. Ajoute les commandes de vérification pertinentes.
4. Ajoute les observables humains attendus.
5. Termine par les points d’attention et la self-review.
6. Ne modifie pas le code applicatif.
```
