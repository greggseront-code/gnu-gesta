# Modèles d'écriture

La structure, les statuts et le cycle de vie sont décrits dans
`docs/README.md`. Ce document indique seulement quel modèle utiliser.

| Modèle | Pour |
| --- | --- |
| `spec-template.md` | `docs/work/active/<sujet>/spec.md` |
| `plan-template.md` | `docs/work/active/<sujet>/plan.md` |
| `review-template.md` | `docs/history/reviews/YYYY-MM-DD-sujet.md` |
| `features-map-template.md` | `docs/current/features.md` |
| `data-model-template.md` | `docs/current/data-model.md` |
| `backend-feature-readme-template.md` | `backend/src/features/<feature>/README.md` |

Le `README.md` d'un sujet actif reste libre et court : contexte minimal,
statut et lectures additionnelles justifiées.

Trois règles priment sur les modèles : une seule source de vérité ; un document
daté ne se réécrit pas après clôture ; ce qui reste vrai remonte dans un
document courant, une ADR ou un README local.
