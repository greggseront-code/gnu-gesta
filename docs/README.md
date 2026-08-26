# Documentation

Ce fichier est l'index documentaire. Les règles de lecture minimale des agents
sont dans `AGENT.md` afin de ne pas les dupliquer ici.

## Sources courantes

- `current/state.md` : instantané de reprise, uniquement pour coordonner un
  travail inachevé ou choisir la prochaine intervention.
- `current/architecture.md` : composants et invariants transversaux.
- `current/features.md` : carte produit et contrats front/back par feature.
- `current/data-model.md` : schéma SQLite et relations partagées.
- `backend/src/features/*/README.md` : contrat backend local, au plus près du
  code.

## Selon le besoin

- `operations/deployment.md` : déploiement, DNS, Nginx, HTTPS et exploitation.
- `operations/production-readiness.md` : décisions à reprendre avant du trafic
  réel.
- `decisions/` : ADR courtes pour les choix qui contraignent plusieurs
  features ; aucune ADR séparée n'est nécessaire actuellement.
- `current/backlog.md` : sujets identifiés mais non engagés.
- `work/active/README.md` : sujets ouverts et cycle de vie d'un travail non
  trivial.
- `templates/README.md` : modèles, à utiliser seulement si un artefact durable
  apporte une valeur réelle.
- `history/README.md` : specs, plans, propositions et reviews clos. Consultation
  volontaire uniquement.

## Cycle de vie

Un fait stable possède une seule source courante. Un travail complexe vit
temporairement dans `work/active/<sujet>/`, avec des liens vers les seules
sources nécessaires. À sa clôture, les faits encore vrais sont intégrés aux
documents courants ou aux README locaux, la spec et le plan vont dans
`history/phases/`, et la review dans `history/reviews/`.

Les chemins anciens conservés dans certains artefacts historiques décrivent la
structure au moment de leur rédaction ; l'index présent fait foi aujourd'hui.
